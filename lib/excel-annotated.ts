/**
 * 「標註比對報表」匯出 —— 2026-08-21 業主回饋 4.：
 * 依「上傳比對」頁籤選擇要比對的欄位，在使用者原始上傳的 Excel 版面旁邊新增欄位，
 * 逐案顯示「正確」或（不正確時）以紅字標記智慧局的正確值。
 *
 * 為什麼獨立一個檔案、用 exceljs 而不是沿用 lib/excel.ts 既有的 xlsx（SheetJS 免費版）：
 * SheetJS 免費版無法寫入儲存格樣式（例如紅色字型），只有付費版才支援。這個匯出需求的核心
 * 就是「顏色標記」，因此改用支援樣式寫入的 exceljs。其餘既有匯出（分析報表／比對差異報告／
 * 智慧局完整資料）不涉及樣式需求，維持用 xlsx，降低變動範圍。
 *
 * 與既有匯出的另一個差異：這個匯出需要「原始 Excel 的全部欄位」（不只是 13 個綠底欄位），
 * 才能在原始版面基礎上插入新欄位，因此直接重新讀取使用者上傳的 File（見
 * lib/parse-upload.ts 的 readOriginalWorkbookRows），而不是沿用畫面上已經精簡過的 PatentRow[]。
 *
 * 純邏輯（buildAnnotatedTable：決定每個新欄位要顯示什麼值、要不要標紅）與瀏覽器 File/下載
 * 邊界解耦，比照 lib/parse-upload.ts 的 detectColumns / parseRowsWithMapping 慣例，方便單元測試。
 */
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { formatDate, normalizeApplno } from "./patent-logic";
import {
  buildCaseComparison,
  DEFAULT_NORMALIZATION_OPTIONS,
  GREEN_FIELD_DEFS,
  type NormalizationOptions,
} from "./field-compare";
import { readOriginalWorkbookRows, type ColumnMapping } from "./parse-upload";
import { toComparableRow, type PatentRow } from "./mock-data";

export class MissingApplnoMappingError extends Error {
  constructor() {
    super("尚未指定「申請案號」對應到 Excel 的哪一欄，無法產生標註報表");
    this.name = "MissingApplnoMappingError";
  }
}

/** 專案設計系統的紅色（tailwind.config.ts 的 seal.DEFAULT #C23B2E），供不正確欄位標紅使用。 */
export const RED_ARGB = "FFC23B2E";

function cellText(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

export interface AnnotatedCell {
  value: string;
  isRed: boolean;
}

export interface AnnotatedDataRow {
  /** 原始欄位的值（已轉字串、補齊到與標題列同寬），順序與原始 Excel 完全一致。 */
  original: string[];
  /** 新增欄位的值，順序對應 compareFields（即 GREEN_FIELD_DEFS 中被選取比對的欄位）。 */
  annotated: AnnotatedCell[];
}

export interface AnnotatedTable {
  originalHeaders: string[];
  newHeaders: string[];
  rows: AnnotatedDataRow[];
}

/**
 * 核心純邏輯：決定每一列、每個新增欄位要顯示「正確」還是紅字的智慧局正確值。
 * 不觸碰任何瀏覽器 API，方便單元測試。
 */
export function buildAnnotatedTable(
  headerRow: unknown[],
  dataRows: unknown[][],
  applnoIndex: number,
  rows: PatentRow[],
  selectedKeys: Set<string>,
  normalizationOptions: NormalizationOptions = DEFAULT_NORMALIZATION_OPTIONS
): AnnotatedTable {
  const compareFields = GREEN_FIELD_DEFS.filter((f) => selectedKeys.has(f.key));
  const rowByApplno = new Map(rows.map((r) => [r.applno, r]));
  const originalColCount = headerRow.length;

  const outRows: AnnotatedDataRow[] = dataRows.map((dataRow) => {
    const original = dataRow.map(cellText);
    while (original.length < originalColCount) original.push("");

    const rawApplno = cellText(dataRow[applnoIndex]).trim();
    const applno = rawApplno ? normalizeApplno(rawApplno) : "";
    const matchedRow = applno ? rowByApplno.get(applno) : undefined;
    const comparison = matchedRow
      ? buildCaseComparison(toComparableRow(matchedRow), selectedKeys, normalizationOptions)
      : null;

    const annotated: AnnotatedCell[] = compareFields.map((field) => {
      if (!matchedRow || !comparison) return { value: "查無資料", isRed: false };
      const fieldResult = comparison.fields.find((f) => f.key === field.key);
      if (!fieldResult || fieldResult.match !== false) return { value: "正確", isRed: false };
      return { value: fieldResult.tipoValue || "（智慧局查無此欄位值）", isRed: true };
    });

    return { original, annotated };
  });

  return {
    originalHeaders: headerRow.map(cellText),
    newHeaders: compareFields.map((f) => `${f.label}比對結果`),
    rows: outRows,
  };
}

/** 觸發瀏覽器下載——比照 lib/excel.ts 其他匯出函式的使用體驗，呼叫端不需處理 Blob/URL 細節。 */
function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 依欄位對應表與比對結果，在原始上傳 Excel 的版面旁邊插入標註欄位並觸發下載。
 * - 每個「本次選擇比對」的欄位各新增一欄：比對相符顯示「正確」；不符則以紅字顯示智慧局的正確值。
 * - 保留原始檔案的欄位順序與資料列順序（不重新排序、不篩選列），符合 CLAUDE.md 的 applno 順序限制。
 * - 原始檔案裡沒有查到 TIPO 資料的列（例如 applno 格式錯誤或查無資料），新增欄位一律顯示「查無資料」。
 */
export async function exportAnnotatedOriginalReport(
  file: File,
  columnMapping: ColumnMapping,
  rows: PatentRow[],
  selectedKeys: Set<string>,
  normalizationOptions: NormalizationOptions = DEFAULT_NORMALIZATION_OPTIONS
): Promise<void> {
  const applnoLetter = columnMapping.applno;
  if (!applnoLetter) throw new MissingApplnoMappingError();
  const applnoIndex = XLSX.utils.decode_col(applnoLetter);

  const { headerRow, dataRows } = await readOriginalWorkbookRows(file);
  const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, selectedKeys, normalizationOptions);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("標註比對結果");

  const headerExcelRow = sheet.addRow([...table.originalHeaders, ...table.newHeaders]);
  headerExcelRow.font = { bold: true };
  headerExcelRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEEE7" } };
  });

  const originalColCount = table.originalHeaders.length;
  for (const row of table.rows) {
    const excelRow = sheet.addRow([...row.original, ...row.annotated.map((c) => c.value)]);
    row.annotated.forEach((cell, i) => {
      if (!cell.isRed) return;
      excelRow.getCell(originalColCount + i + 1).font = { color: { argb: RED_ARGB } };
    });
  }

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const now = new Date();
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, `TIPO標註比對報表_${formatDate(now).replace(/\//g, "")}.xlsx`);
}
