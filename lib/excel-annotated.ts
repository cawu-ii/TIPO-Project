/**
 * 「標註比對報表」匯出 —— 2026-08-21 業主回饋 4.（2026-08-24 依業主實測回饋調整版面）：
 * 依「上傳比對」頁籤選擇要比對的欄位，在使用者原始上傳的 Excel 版面「緊接在每個被比對欄位
 * 的下一欄」插入標註欄位，逐案顯示「正確」或（不正確時）以紅字標記智慧局的正確值；並在
 * 申請案號欄位後方新增一欄，標示這筆案號是否有從 TIPO 查到資料。
 *
 * 2026-08-24 業主回饋調整重點（相對於 8/21 版）：
 * 1. 標註欄位原本統一附加在最後面（例如附加到 AL 欄），業主反映不好對照，希望改成插在
 *    「被比對的原始欄位」右邊緊鄰的下一欄（例如比對 D 欄 Filing Date，結果就放在 E 欄），
 *    讓對照更直覺。因此欄位順序不再是「原始欄位 + 新增欄位」兩段式，而是逐欄位插入。
 * 2. 比對結果新增第三種情況：TIPO 有查到這筆案號、但該欄位本身沒有值（例如設計專利沒有
 *    公開號），顯示紅字「TIPO無資料」，與「比對不符（紅字顯示正確值）」區分開來。
 * 3. 申請案號欄位右邊新增一欄「TIPO 查詢狀態」：有查到顯示「已從TIPO獲取資訊」，查無資料
 *    （或非台灣案、格式錯誤等任何查不到的情況）顯示「查無資料或非台灣案」。
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
 * 純邏輯（buildAnnotatedTable：決定每欄要插在哪裡、要顯示什麼值、要不要標紅）與瀏覽器
 * File/下載邊界解耦，比照 lib/parse-upload.ts 的 detectColumns / parseRowsWithMapping 慣例，
 * 方便單元測試。
 */
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { formatDate, normalizeApplno } from "./patent-logic";
import {
  buildCaseComparison,
  DEFAULT_NORMALIZATION_OPTIONS,
  GREEN_FIELD_DEFS,
  type FieldDef,
  type NormalizationOptions,
} from "./field-compare";
import { readOriginalWorkbookRows, type ColumnMapping, type ColumnMappingKey } from "./parse-upload";
import { toComparableRow, type PatentRow } from "./mock-data";

export class MissingApplnoMappingError extends Error {
  constructor() {
    super("尚未指定「申請案號」對應到 Excel 的哪一欄，無法產生標註報表");
    this.name = "MissingApplnoMappingError";
  }
}

/** 專案設計系統的紅色（tailwind.config.ts 的 seal.DEFAULT #C23B2E），供不正確／無資料欄位標紅使用。 */
export const RED_ARGB = "FFC23B2E";

/** 2026-08-24 業主回饋 2.：申請案號欄位右邊新增的查詢狀態欄位固定文字。 */
export const TIPO_STATUS_FOUND = "已從TIPO獲取資訊";
export const TIPO_STATUS_NOT_FOUND = "查無資料或非台灣案";
export const TIPO_STATUS_HEADER = "TIPO 查詢狀態";

/** 2026-08-24 業主回饋 1.：TIPO 有查到案件、但該欄位本身沒有值時顯示的文字（紅字）。 */
export const FIELD_NO_TIPO_DATA = "TIPO無資料";

function cellText(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

export interface AnnotatedCell {
  value: string;
  isRed: boolean;
}

export interface AnnotatedTable {
  /** 完整標題列（原始欄位 + 插入的查詢狀態／比對結果欄位），與每筆 rows 的欄位順序一一對應。 */
  headers: string[];
  rows: AnnotatedCell[][];
}

/**
 * 核心純邏輯：依欄位對應表，決定新欄位要插在原始版面的哪個位置、每一格要顯示什麼值、
 * 要不要標紅。不觸碰任何瀏覽器 API，方便單元測試。
 */
export function buildAnnotatedTable(
  headerRow: unknown[],
  dataRows: unknown[][],
  applnoIndex: number,
  columnMapping: ColumnMapping,
  rows: PatentRow[],
  selectedKeys: Set<string>,
  normalizationOptions: NormalizationOptions = DEFAULT_NORMALIZATION_OPTIONS
): AnnotatedTable {
  const compareFields = GREEN_FIELD_DEFS.filter((f) => selectedKeys.has(f.key));
  const rowByApplno = new Map(rows.map((r) => [r.applno, r]));
  const originalColCount = headerRow.length;
  const originalHeaderTexts = headerRow.map(cellText);

  // 反查：每個原始欄位 index 對應到哪些「本次選擇比對」的欄位定義（一般是 0 或 1 個，
  // 但不強行限制使用者把兩個系統欄位對應到同一欄，多個時依 GREEN_FIELD_DEFS 順序都插入）。
  const fieldsByColumnIndex = new Map<number, FieldDef[]>();
  for (const field of compareFields) {
    const letter = columnMapping[field.key as ColumnMappingKey];
    if (!letter) continue;
    const idx = XLSX.utils.decode_col(letter);
    const list = fieldsByColumnIndex.get(idx) ?? [];
    list.push(field);
    fieldsByColumnIndex.set(idx, list);
  }

  // ---- 標題列：逐一原始欄位，插入緊接在後的新欄位 ----
  const headers: string[] = [];
  for (let i = 0; i < originalColCount; i++) {
    headers.push(originalHeaderTexts[i] ?? "");
    if (i === applnoIndex) headers.push(TIPO_STATUS_HEADER);
    for (const field of fieldsByColumnIndex.get(i) ?? []) {
      headers.push(`${field.label}比對結果`);
    }
  }

  // ---- 資料列：邏輯與標題列插入順序完全一致 ----
  const outRows: AnnotatedCell[][] = dataRows.map((dataRow) => {
    const originalValues = dataRow.map(cellText);
    while (originalValues.length < originalColCount) originalValues.push("");

    const rawApplno = cellText(dataRow[applnoIndex]).trim();
    const applno = rawApplno ? normalizeApplno(rawApplno) : "";
    const matchedRow = applno ? rowByApplno.get(applno) : undefined;
    const comparison = matchedRow
      ? buildCaseComparison(toComparableRow(matchedRow), selectedKeys, normalizationOptions)
      : null;

    const out: AnnotatedCell[] = [];
    for (let i = 0; i < originalColCount; i++) {
      out.push({ value: originalValues[i] ?? "", isRed: false });

      if (i === applnoIndex) {
        out.push({ value: matchedRow ? TIPO_STATUS_FOUND : TIPO_STATUS_NOT_FOUND, isRed: false });
      }

      for (const field of fieldsByColumnIndex.get(i) ?? []) {
        if (!matchedRow || !comparison) {
          out.push({ value: "查無資料", isRed: false });
          continue;
        }
        const fieldResult = comparison.fields.find((f) => f.key === field.key);
        if (!fieldResult || fieldResult.match !== false) {
          out.push({ value: "正確", isRed: false });
        } else if (!fieldResult.tipoValue) {
          out.push({ value: FIELD_NO_TIPO_DATA, isRed: true });
        } else {
          out.push({ value: fieldResult.tipoValue, isRed: true });
        }
      }
    }
    return out;
  });

  return { headers, rows: outRows };
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
 * 依欄位對應表與比對結果，在原始上傳 Excel 的版面中插入標註欄位並觸發下載。
 * - 申請案號欄位右邊新增查詢狀態欄；每個「本次選擇比對」的欄位右邊各插入一個比對結果欄。
 * - 保留原始檔案的欄位相對順序與資料列順序（不重新排序、不篩選列），符合 CLAUDE.md 的
 *   applno 順序限制——新增欄位只會「插入」，不會移動或覆蓋任何原始欄位。
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
  const table = buildAnnotatedTable(
    headerRow,
    dataRows,
    applnoIndex,
    columnMapping,
    rows,
    selectedKeys,
    normalizationOptions
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("標註比對結果");

  const headerExcelRow = sheet.addRow(table.headers);
  headerExcelRow.font = { bold: true };
  headerExcelRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEEE7" } };
  });

  for (const row of table.rows) {
    const excelRow = sheet.addRow(row.map((c) => c.value));
    row.forEach((cell, i) => {
      if (!cell.isRed) return;
      excelRow.getCell(i + 1).font = { color: { argb: RED_ARGB } };
    });
  }

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const now = new Date();
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, `TIPO標註比對報表_${formatDate(now).replace(/\//g, "")}.xlsx`);
}
