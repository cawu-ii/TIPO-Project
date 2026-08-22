/**
 * 解析使用者上傳的 Excel：偵測欄位、依「欄位對應表」抽出 applno 清單（保持原始列順序）
 * 與「綠底欄位」內部系統資料。
 *
 * 2026-08-14 業主補充回饋：外國案件的 Excel 標題可能是 "FN"（Filing Number）這類
 * 完全對不上 GREEN_FIELD_DEFS 中文標籤的縮寫，每次上傳的版型也不一定相同 —
 * 光靠「標題文字比對」本來就無法穩定判斷（不是演算法不夠聰明，而是標題文字本身
 * 沒有穩定對應關係可猜）。因此欄位對應改為「使用者手動指定」，以 Excel 欄位字母
 * （A/B/C…）而非標題文字為準；標題文字比對邏輯保留，但只用來做「預先猜測」的
 * 預選值，使用者可自由覆寫，不強制採用。
 *
 * 純解析邏輯（detectColumns / parseRowsWithMapping）與瀏覽器 File API 解耦，方便單元測試。
 */
import * as XLSX from "xlsx";
import { GREEN_FIELD_DEFS } from "./field-compare";
import { normalizeApplno } from "./patent-logic";
import type { GreenFields } from "./mock-data";

const APPLNO_HEADER_ALIASES = ["申請號", "申請案號", "applno", "案號"];

export type ColumnMappingKey = "applno" | (typeof GREEN_FIELD_DEFS)[number]["key"];

/** 系統欄位 → Excel 欄位字母（例如 "A"、"B"）。未列出／空字串視為「不比對」。 */
export type ColumnMapping = Partial<Record<ColumnMappingKey, string>>;

export interface DetectedColumn {
  /** Excel 欄位字母，例如 "A"、"B"。 */
  letter: string;
  /** 該欄第一列的實際文字內容，僅供使用者辨識用，不做為比對依據。 */
  headerText: string;
}

export interface DetectedColumns {
  columns: DetectedColumn[];
  /** 依現行標題文字比對邏輯算出的「預先猜測」對應，只用來預選下拉選單，使用者可自由覆寫。 */
  guessedMapping: ColumnMapping;
}

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, "").trim();
}

/** 核心偵測邏輯：輸入 SheetJS「header:1」模式讀出的原始列（含標題列），與檔案 I/O 無關，方便單元測試。 */
export function detectColumns(rawRows: unknown[][]): DetectedColumns {
  const headerRow = rawRows[0] ?? [];
  const columns: DetectedColumn[] = headerRow.map((cell, i) => ({
    letter: XLSX.utils.encode_col(i),
    headerText: cell === null || cell === undefined ? "" : String(cell).trim(),
  }));

  const guessedMapping: ColumnMapping = {};
  const applnoCol = columns.find((c) => APPLNO_HEADER_ALIASES.includes(normalizeHeader(c.headerText)));
  if (applnoCol) guessedMapping.applno = applnoCol.letter;

  for (const def of GREEN_FIELD_DEFS) {
    const matched = columns.find((c) => normalizeHeader(c.headerText) === normalizeHeader(def.label));
    if (matched) guessedMapping[def.key as ColumnMappingKey] = matched.letter;
  }

  return { columns, guessedMapping };
}

export class MissingApplnoColumnError extends Error {
  constructor() {
    super("尚未指定「申請案號」對應到 Excel 的哪一欄，請在欄位對應區塊選擇後再試一次");
    this.name = "MissingApplnoColumnError";
  }
}

const BLANK_GREEN: GreenFields = {
  applDate: "",
  publicationNo: "",
  publicationDate: "",
  gazetteNo: "",
  gazetteDate: "",
  certNo: "",
  patentNameZh: "",
  agentName: "",
  applicantNameZh: "",
  applicantNameEn: "",
  applicantAddress: "",
  inventorNameZh: "",
  inventorNameEn: "",
};

export interface ParsedUpload {
  /** 原始上傳順序，未去重（保留使用者輸入樣貌）。 */
  applnos: string[];
  internalByApplno: Map<string, GreenFields>;
}

/** 核心解析邏輯：依 columnMapping 從原始列（含標題列）取值，與檔案 I/O 無關，方便單元測試。 */
export function parseRowsWithMapping(rawRows: unknown[][], columnMapping: ColumnMapping): ParsedUpload {
  const applnoLetter = columnMapping.applno;
  if (!applnoLetter) {
    throw new MissingApplnoColumnError();
  }
  const applnoIndex = XLSX.utils.decode_col(applnoLetter);

  const fieldIndexes: Array<[keyof GreenFields, number]> = [];
  for (const def of GREEN_FIELD_DEFS) {
    const letter = columnMapping[def.key as ColumnMappingKey];
    if (letter) fieldIndexes.push([def.key as keyof GreenFields, XLSX.utils.decode_col(letter)]);
  }

  const dataRows = rawRows.slice(1);
  const applnos: string[] = [];
  const internalByApplno = new Map<string, GreenFields>();

  for (const row of dataRows) {
    const applnoRaw = row[applnoIndex];
    const rawApplno = applnoRaw === null || applnoRaw === undefined ? "" : String(applnoRaw).trim();
    if (!rawApplno) continue;
    // 2026-08-21 業主回饋 3.：8 碼補 0 湊 9 碼、10 碼西元年轉民國年，見 lib/patent-logic.ts。
    const applno = normalizeApplno(rawApplno);
    applnos.push(applno);

    const green: GreenFields = { ...BLANK_GREEN };
    for (const [key, idx] of fieldIndexes) {
      const raw = row[idx];
      const value = raw === null || raw === undefined ? "" : String(raw).trim();
      if (value) green[key] = value;
    }
    internalByApplno.set(applno, green);
  }

  return { applnos, internalByApplno };
}

/**
 * 2026-08-21 業主回饋 1.：日期欄位讀出來變成「年份在最後且少掉 20」的怪格式。
 * 根因：SheetJS 在 `raw:false` 模式下，是照儲存格 numFmt 代碼字面（例如 "mm-dd-yy"）
 * 做 locale-blind 的文字轉換，不是照 Excel 實際顯示（隨作業系統地區設定）的樣子轉，
 * 兩者可能完全不同。改用 `cellDates:true` + `raw:true` 讓 SheetJS 直接回傳真正的 JS
 * Date 物件，我們自己格式化為智慧局慣用的「20yy/m/d」（不補零），徹底避開文字轉換的
 * locale 歧義。SheetJS 以 UTC 建構這類 Date，所以要用 getUTC* 取值，避免時區把日期誤移一天。
 */
export function formatCellDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return `${y}/${m}/${d}`;
}

function normalizeCellValue(raw: unknown): unknown {
  if (raw instanceof Date) return formatCellDate(raw);
  return raw;
}

async function readRawRows(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  return rows.map((row) => row.map(normalizeCellValue));
}

/** 瀏覽器端：讀取使用者選取的 .xlsx File，偵測欄位字母／內容與預先猜測的對應（不解析資料列）。 */
export async function detectExcelColumns(file: File): Promise<DetectedColumns> {
  const rawRows = await readRawRows(file);
  return detectColumns(rawRows);
}

/** 瀏覽器端：讀取使用者選取的 .xlsx File，依使用者確認的欄位對應表解析資料。 */
export async function parseUploadedExcelFile(file: File, columnMapping: ColumnMapping): Promise<ParsedUpload> {
  const rawRows = await readRawRows(file);
  return parseRowsWithMapping(rawRows, columnMapping);
}

export interface OriginalWorkbookRows {
  /** 原始檔案的標題列（第一列），已套用同一套日期格式化，保留原始欄位順序。 */
  headerRow: unknown[];
  /** 標題列以外的所有資料列，保留原始上傳順序（見 CLAUDE.md：不可更動 applno 上傳順序）。 */
  dataRows: unknown[][];
}

/**
 * 瀏覽器端：重新讀取使用者上傳的原始 Excel 全部欄位（不只是欄位對應表指到的 13 個綠底欄位），
 * 供「匯出標註報表」（2026-08-21 業主回饋 4.）在原始版面旁邊插入新欄位使用。
 * 直接重用 readRawRows()，確保日期解析邏輯（見上方 formatCellDate 註解）與批次查詢用的解析
 * 完全一致，不會出現「查詢用的申請案號」與「匯出時讀到的申請案號」不同的情況。
 */
export async function readOriginalWorkbookRows(file: File): Promise<OriginalWorkbookRows> {
  const rawRows = await readRawRows(file);
  const [headerRow, ...dataRows] = rawRows;
  return { headerRow: headerRow ?? [], dataRows };
}
