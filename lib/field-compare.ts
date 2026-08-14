/**
 * 欄位比對邏輯 — 與 UI 完全解耦，方便單元測試。
 *
 * 對應業主需求：Excel 上傳資料中，「綠底欄位」為使用者內部系統既有資料，
 * 使用者可自選其中幾欄，與智慧局最新回傳值進行逐欄比對；
 * 「黃底欄位」則僅需顯示智慧局回傳值，不做比對（通常是登記註記／狀態日期等
 * 只有智慧局才有的權威資料，內部系統本來就不會存有）。
 */

export type FieldCategory = "green" | "yellow";

export interface FieldDef {
  key: string;
  label: string;
  category: FieldCategory;
}

/** 綠底欄位 — 內部系統可能已存有資料，需與智慧局資料比對是否相符。 */
export const GREEN_FIELD_DEFS: FieldDef[] = [
  { key: "applDate", label: "申請日", category: "green" },
  { key: "publicationNo", label: "公開號", category: "green" },
  { key: "publicationDate", label: "公開日期", category: "green" },
  { key: "gazetteNo", label: "公告號", category: "green" },
  { key: "gazetteDate", label: "公告日期", category: "green" },
  { key: "certNo", label: "證書號（專利權數號）", category: "green" },
  { key: "patentNameZh", label: "中文專利名稱", category: "green" },
  { key: "agentName", label: "代理人姓名", category: "green" },
  { key: "applicantNameZh", label: "申請人中文姓名", category: "green" },
  { key: "applicantNameEn", label: "申請人英文姓名", category: "green" },
  { key: "applicantAddress", label: "申請人地址", category: "green" },
  { key: "inventorNameZh", label: "發明人中文姓名", category: "green" },
  { key: "inventorNameEn", label: "發明人英文姓名", category: "green" },
];

/** 黃底欄位 — 僅智慧局提供、供顯示用，不進行比對。 */
export const YELLOW_FIELD_DEFS: FieldDef[] = [
  { key: "licenseNote", label: "授權註記", category: "yellow" },
  { key: "pledgeNote", label: "質權註記", category: "yellow" },
  { key: "transferNote", label: "讓與註記", category: "yellow" },
  { key: "inheritNote", label: "繼承註記", category: "yellow" },
  { key: "trustNote", label: "信託註記", category: "yellow" },
  { key: "opposeNote", label: "異議註記", category: "yellow" },
  { key: "invalidateNote", label: "舉發註記", category: "yellow" },
  { key: "extinguishDate", label: "消滅日期", category: "yellow" },
  { key: "extinguishReason", label: "消滅原因", category: "yellow" },
  { key: "revokeDate", label: "撤銷日期", category: "yellow" },
  { key: "revokeReason", label: "撤銷原因", category: "yellow" },
  { key: "patentStartDate", label: "專利權始日", category: "yellow" },
  { key: "patentEndDate", label: "專利權止日", category: "yellow" },
  { key: "chargeExpirDateLabel", label: "年費有效日期", category: "yellow" },
  { key: "chargeExpirYear", label: "年費有效年", category: "yellow" },
];

export type GreenFieldKey = (typeof GREEN_FIELD_DEFS)[number]["key"];

export const DEFAULT_COMPARE_KEYS: string[] = GREEN_FIELD_DEFS.map((f) => f.key);

/** 忽略多餘空白／斷行差異後再比對，避免 Excel 儲存格常見的格式雜訊造成誤判。 */
function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function fieldsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalize(a) === normalize(b);
}

export interface FieldComparisonEntry {
  key: string;
  label: string;
  category: FieldCategory;
  internalValue: string;
  tipoValue: string;
  /** 是否為使用者本次勾選需要比對的欄位（僅綠底欄位可為 true）。 */
  compared: boolean;
  /** compared 為 false 時一律為 null（不比對、不判定）。 */
  match: boolean | null;
}

export interface CaseComparisonResult {
  applno: string;
  patentName: string;
  comparedCount: number;
  mismatchCount: number;
  mismatchedLabels: string[];
  fields: FieldComparisonEntry[];
}

export interface ComparableRow {
  applno: string;
  internal: Record<string, string>;
  tipo: Record<string, string>;
  tipoYellow: Record<string, string>;
}

export function buildCaseComparison(row: ComparableRow, selectedKeys: Set<string>): CaseComparisonResult {
  const greenEntries: FieldComparisonEntry[] = GREEN_FIELD_DEFS.map((def) => {
    const internalValue = row.internal[def.key] ?? "";
    const tipoValue = row.tipo[def.key] ?? "";
    const compared = selectedKeys.has(def.key);
    const match = compared ? fieldsMatch(internalValue, tipoValue) : null;
    return { key: def.key, label: def.label, category: "green" as const, internalValue, tipoValue, compared, match };
  });

  const yellowEntries: FieldComparisonEntry[] = YELLOW_FIELD_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    category: "yellow" as const,
    internalValue: "",
    tipoValue: row.tipoYellow[def.key] ?? "",
    compared: false,
    match: null,
  }));

  const compared = greenEntries.filter((f) => f.compared);
  const mismatched = compared.filter((f) => f.match === false);

  return {
    applno: row.applno,
    patentName: row.tipo.patentNameZh || row.internal.patentNameZh || "",
    comparedCount: compared.length,
    mismatchCount: mismatched.length,
    mismatchedLabels: mismatched.map((f) => f.label),
    fields: [...greenEntries, ...yellowEntries],
  };
}
