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
 * 2026-08-22 業主回饋：純英文標題的 Excel（例如國外事務所常見的 Filing Number／
 * Publication Date／Grant Date／Registered Owner Name 這類完整英文詞彙，而非像 "FN"
 * 那種猜不到的縮寫）目前完全猜不到，體感不夠智慧。因此擴充別名清單納入常見英文
 * 專利欄位用語 —— 這仍然只是「預先猜測」的便利機制，猜錯或猜不到使用者都能自行
 * 於下拉選單覆寫，不影響「以欄位字母為準」的核心設計。
 *
 * 純解析邏輯（detectColumns / parseRowsWithMapping）與瀏覽器 File API 解耦，方便單元測試。
 */
import * as XLSX from "xlsx";
import { GREEN_FIELD_DEFS } from "./field-compare";
import { normalizeApplno } from "./patent-logic";
import type { GreenFields } from "./mock-data";

const APPLNO_HEADER_ALIASES = [
  "申請號",
  "申請案號",
  "applno",
  "案號",
  "Filing Number",
  "Application Number",
  "Application No",
  "App No",
  "Serial Number",
];

/**
 * 各欄位的常見英文標題別名，補充在 GREEN_FIELD_DEFS 中文標籤之外的猜測依據。
 * 刻意避免使用過於單一／容易誤判的詞（例如單獨的 "Date"、"Number"、"Name"），
 * 只收錄業界慣用、語意明確的完整詞彙。
 */
const FIELD_HEADER_ALIASES: Partial<Record<string, string[]>> = {
  applDate: ["Filing Date", "Application Date", "Filed Date"],
  publicationNo: ["Publication Number", "Publication No", "Pub No"],
  publicationDate: ["Publication Date", "Pub Date"],
  gazetteDate: ["Grant Date", "Registration Date", "Issue Date"],
  certNo: ["Grant Number", "Patent Number", "Certificate Number", "Patent No"],
  patentNameZh: ["Patent Title", "Invention Title", "Title"],
  agentName: ["Agent", "Agent Name", "Attorney", "Attorney Name", "Recordal Agent"],
  applicantNameEn: ["Applicant", "Applicant Name", "Owner", "Assignee", "Registered Owner Name"],
  applicantAddress: ["Address", "Applicant Address", "Registered Owner Address", "Owner Address"],
  inventorNameEn: ["Inventor", "Inventor Name", "Inventors"],
};

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

/** 移除空白並轉小寫，讓英文別名比對不分大小寫／全形半形空白差異；中文字不受影響。 */
function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, "").trim().toLowerCase();
}

function headerMatchesAny(headerText: string, aliases: string[]): boolean {
  const normalized = normalizeHeader(headerText);
  return aliases.some((alias) => normalizeHeader(alias) === normalized);
}

/** 核心偵測邏輯：輸入 SheetJS「header:1」模式讀出的原始列（含標題列），與檔案 I/O 無關，方便單元測試。 */
export function detectColumns(rawRows: unknown[][]): DetectedColumns {
  const headerRow = rawRows[0] ?? [];
  const columns: DetectedColumn[] = headerRow.map((cell, i) => ({
    letter: XLSX.utils.encode_col(i),
    headerText: cell === null || cell === undefined ? "" : String(cell).trim(),
  }));

  const guessedMapping: ColumnMapping = {};
  const applnoCol = columns.find((c) => headerMatchesAny(c.headerText, APPLNO_HEADER_ALIASES));
  if (applnoCol) guessedMapping.applno = applnoCol.letter;

  for (const def of GREEN_FIELD_DEFS) {
    const aliases = [def.label, ...(FIELD_HEADER_ALIASES[def.key] ?? [])];
    const matched = columns.find((c) => headerMatchesAny(c.headerText, aliases));
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
 * locale 歧義。
 *
 * 2026-08-24 業主回饋（差一天）：原先這裡用 getUTC* 取值，理由是「SheetJS 以 UTC 建構
 * 這類 Date」——實際用業主提供的檔案＋本專案實際依賴的 xlsx 套件版本重現後發現這個假設
 * 是錯的：SheetJS 的 `cellDates:true` 其實是用「執行環境的本地時區」建構 Date 物件
 * （相當於 `new Date(y, m, d)`，不是 `Date.UTC(y, m, d)`）。在正時區（例如台灣 UTC+8）
 * 下，這會讓建構出來的 Date 物件的 UTC 時間點落在前一天的 16:00，所以用 getUTC* 取值
 * 會誤讀成前一天；反而是用本地時區的 get*（getFullYear/getMonth/getDate）才能正確
 * 還原（因為讀取當下也是在同一個本地環境執行，寫入與讀取用同一套時區基準，天然互相
 * 抵消，不受瀏覽器所在時區影響）。這也是先前用 TZ=America/Los_Angeles（負時區）測試
 * 沒踩到雷的原因——負時區的本地建構不會跨到前一個 UTC 日，掩蓋了問題。
 */
export function formatCellDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
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
