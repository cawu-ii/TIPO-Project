/**
 * 解析使用者上傳的 Excel：抽出 applno 清單（保持原始列順序）與「綠底欄位」內部系統資料。
 *
 * 綠底／黃底欄位的判斷改用「欄位標題文字比對」而非讀取儲存格底色 ——
 * 專案目前使用的 xlsx（SheetJS 社群版）無法可靠讀出 cell 填色，
 * 標題比對對照的是 lib/field-compare.ts 的 GREEN_FIELD_DEFS（與業主附件 Excel 實際欄名一致），
 * 效果相同但更穩定。純解析邏輯（parseWorkbookRows）與瀏覽器 File API 解耦，方便單元測試。
 */
import * as XLSX from "xlsx";
import { GREEN_FIELD_DEFS } from "./field-compare";
import type { GreenFields } from "./mock-data";

const APPLNO_HEADER_ALIASES = ["申請號", "申請案號", "applno", "案號"];

export interface ParsedUpload {
  /** 原始上傳順序，未去重（保留使用者輸入樣貌）。 */
  applnos: string[];
  internalByApplno: Map<string, GreenFields>;
  /** 本次在 Excel 中實際比對到的綠底欄位標題（供 UI 顯示「已從 Excel 讀到哪些欄位」）。 */
  matchedGreenLabels: string[];
}

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, "").trim();
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

export class MissingApplnoColumnError extends Error {
  constructor() {
    super("找不到申請案號欄位，欄位標題須為「申請號」、「申請案號」或「applno」其中之一");
    this.name = "MissingApplnoColumnError";
  }
}

/** 核心解析邏輯：輸入已由 SheetJS 轉為「一列一物件」的資料，與 File I/O 無關，方便單元測試。 */
export function parseWorkbookRows(rows: Record<string, unknown>[]): ParsedUpload {
  if (rows.length === 0) {
    return { applnos: [], internalByApplno: new Map(), matchedGreenLabels: [] };
  }

  const [firstRow] = rows;
  const headers = Object.keys(firstRow ?? {});
  const applnoHeader = headers.find((h) => APPLNO_HEADER_ALIASES.includes(normalizeHeader(h)));
  if (!applnoHeader) {
    throw new MissingApplnoColumnError();
  }

  // 只在 Excel 欄位標題與已知綠底欄位標籤完全相符時，才視為該欄位存在。
  const headerToFieldKey = new Map<string, keyof GreenFields>();
  for (const def of GREEN_FIELD_DEFS) {
    const matched = headers.find((h) => normalizeHeader(h) === normalizeHeader(def.label));
    if (matched) headerToFieldKey.set(matched, def.key as keyof GreenFields);
  }

  const applnos: string[] = [];
  const internalByApplno = new Map<string, GreenFields>();

  for (const row of rows) {
    const applno = String(row[applnoHeader] ?? "").trim();
    if (!applno) continue;
    applnos.push(applno);

    const green: GreenFields = { ...BLANK_GREEN };
    for (const [header, key] of headerToFieldKey.entries()) {
      const raw = row[header];
      const value = raw === null || raw === undefined ? "" : String(raw).trim();
      if (value) green[key] = value;
    }
    internalByApplno.set(applno, green);
  }

  return { applnos, internalByApplno, matchedGreenLabels: Array.from(headerToFieldKey.keys()) };
}

/** 瀏覽器端：讀取使用者選取的 .xlsx File 並解析。 */
export async function parseUploadedExcelFile(file: File): Promise<ParsedUpload> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { applnos: [], internalByApplno: new Map(), matchedGreenLabels: [] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return { applnos: [], internalByApplno: new Map(), matchedGreenLabels: [] };
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return parseWorkbookRows(rows);
}
