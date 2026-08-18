/**
 * 欄位比對邏輯 — 與 UI 完全解耦，方便單元測試。
 *
 * 對應業主需求：Excel 上傳資料中，「綠底欄位」為使用者內部系統既有資料，
 * 使用者可自選其中幾欄，與智慧局最新回傳值進行逐欄比對；
 * 「黃底欄位」則僅需顯示智慧局回傳值，不做比對（通常是登記註記／狀態日期等
 * 只有智慧局才有的權威資料，內部系統本來就不會存有）。
 *
 * 2026-08-14 業主同事實測回饋：許多「異常」其實只是格式差異（大小寫、全形半形、
 * 標點、姓名排列順序、日期格式、專利號國別碼與橫槓），或是異體字（啓/啟）被誤判為
 * 不同字。因此比對邏輯依欄位的「值型別」（valueType）套用對應的正規化規則，
 * 使用者可透過 NormalizationOptions 決定要忽略哪些差異；異體字正規化則無條件套用，
 * 不受任何選項控制（見 lib/char-variants.ts）。
 */

import { canonicalizeVariants } from "./char-variants";

export type FieldCategory = "green" | "yellow";

/**
 * 欄位的「值型別」，決定 fieldsMatch() 要套用哪些正規化規則：
 * - text：一般文字欄位，套用大小寫／全形半形／標點正規化（依選項）
 * - date：日期欄位，只有「忽略日期格式」選項有意義
 * - patentNo：專利號類欄位（證書號），只有「忽略國別碼與橫槓」選項有意義
 * - personList：分號分隔的多人姓名欄位，額外支援「忽略排列順序」
 */
export type FieldValueType = "text" | "date" | "patentNo" | "personList";

export interface FieldDef {
  key: string;
  label: string;
  category: FieldCategory;
  valueType: FieldValueType;
}

/** 綠底欄位 — 內部系統可能已存有資料，需與智慧局資料比對是否相符。 */
export const GREEN_FIELD_DEFS: FieldDef[] = [
  { key: "applDate", label: "申請日", category: "green", valueType: "date" },
  { key: "publicationNo", label: "公開號", category: "green", valueType: "text" },
  { key: "publicationDate", label: "公開日期", category: "green", valueType: "date" },
  { key: "gazetteNo", label: "公告號", category: "green", valueType: "text" },
  { key: "gazetteDate", label: "公告日期", category: "green", valueType: "date" },
  // 假設：國別碼／橫槓正規化只套用在證書號；若公開號／公告號也常有此差異，
  // 把對應項目的 valueType 改成 "patentNo" 即可套用，不需改動比對邏輯本身。
  { key: "certNo", label: "證書號（專利權數號）", category: "green", valueType: "patentNo" },
  { key: "patentNameZh", label: "中文專利名稱", category: "green", valueType: "text" },
  { key: "agentName", label: "代理人姓名", category: "green", valueType: "personList" },
  { key: "applicantNameZh", label: "申請人中文姓名", category: "green", valueType: "personList" },
  { key: "applicantNameEn", label: "申請人英文姓名", category: "green", valueType: "personList" },
  { key: "applicantAddress", label: "申請人地址", category: "green", valueType: "text" },
  { key: "inventorNameZh", label: "發明人中文姓名", category: "green", valueType: "personList" },
  { key: "inventorNameEn", label: "發明人英文姓名", category: "green", valueType: "personList" },
];

/** 黃底欄位 — 僅智慧局提供、供顯示用，不進行比對，valueType 一律為 text（未實際使用）。 */
export const YELLOW_FIELD_DEFS: FieldDef[] = [
  { key: "licenseNote", label: "授權註記", category: "yellow", valueType: "text" },
  { key: "pledgeNote", label: "質權註記", category: "yellow", valueType: "text" },
  { key: "transferNote", label: "讓與註記", category: "yellow", valueType: "text" },
  { key: "inheritNote", label: "繼承註記", category: "yellow", valueType: "text" },
  { key: "trustNote", label: "信託註記", category: "yellow", valueType: "text" },
  { key: "opposeNote", label: "異議註記", category: "yellow", valueType: "text" },
  { key: "invalidateNote", label: "舉發註記", category: "yellow", valueType: "text" },
  { key: "extinguishDate", label: "消滅日期", category: "yellow", valueType: "date" },
  { key: "extinguishReason", label: "消滅原因", category: "yellow", valueType: "text" },
  { key: "revokeDate", label: "撤銷日期", category: "yellow", valueType: "date" },
  { key: "revokeReason", label: "撤銷原因", category: "yellow", valueType: "text" },
  { key: "patentStartDate", label: "專利權始日", category: "yellow", valueType: "date" },
  { key: "patentEndDate", label: "專利權止日", category: "yellow", valueType: "date" },
  { key: "chargeExpirDateLabel", label: "年費有效日期", category: "yellow", valueType: "date" },
  { key: "chargeExpirYear", label: "年費有效年", category: "yellow", valueType: "text" },
];

export type GreenFieldKey = (typeof GREEN_FIELD_DEFS)[number]["key"];

export const DEFAULT_COMPARE_KEYS: string[] = GREEN_FIELD_DEFS.map((f) => f.key);

/** 六種「忽略差異」正規化選項，預設全部關閉（維持最嚴謹的逐字比對）。 */
export interface NormalizationOptions {
  /** 忽略英文字母大小寫。例：The Boeing = THE BOEING */
  ignoreCase: boolean;
  /** 忽略全形／半形差異。例：Ｉ７７５ = I775 */
  ignoreWidth: boolean;
  /** 忽略標點符號與空白以外的符號差異。例：King, R. (US) = KingR(US) */
  ignorePunctuation: boolean;
  /** 忽略多人姓名清單（以分號分隔）的排列順序。例：林景郁; 閻啟泰 = 閻啟泰; 林景郁 */
  ignorePersonOrder: boolean;
  /** 忽略日期格式差異。例：2022/09/01 = 2022/9/1 = 20220901 */
  ignoreDateFormat: boolean;
  /** 忽略專利號的國別碼與橫槓，只比對數字。例：TWI775123 = TW-I775123 */
  ignorePatentNoFormat: boolean;
}

/** 最嚴謹的比對基準（全部不忽略）；fieldsMatch/buildCaseComparison 省略選項參數時的預設值。 */
export const DEFAULT_NORMALIZATION_OPTIONS: NormalizationOptions = {
  ignoreCase: false,
  ignoreWidth: false,
  ignorePunctuation: false,
  ignorePersonOrder: false,
  ignoreDateFormat: false,
  ignorePatentNoFormat: false,
};

/** UI 畫面載入時的建議預設值（全部忽略），業主回饋純格式差異誤判太多，改以此為起始狀態。 */
export const RECOMMENDED_NORMALIZATION_OPTIONS: NormalizationOptions = {
  ignoreCase: true,
  ignoreWidth: true,
  ignorePunctuation: true,
  ignorePersonOrder: true,
  ignoreDateFormat: true,
  ignorePatentNoFormat: true,
};

/** 忽略多餘空白／斷行差異後再比對，避免 Excel 儲存格常見的格式雜訊造成誤判。一律套用。 */
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** 全形字元轉半形（含全形空白），供「忽略全形半形」選項使用。 */
function toHalfWidth(s: string): string {
  return s
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

const PUNCT_CHARS =
  "，。、；：？！「」『』（）()【】〈〉《》〔〕‘’“”…—－–-·・,.;:?!'\"()[]{}<>/\\|@#$%^&*_+=~`";

/**
 * 移除常見中英文標點符號，「連帶」移除因標點消失而產生／原有的空白差異，供「忽略標點符號」選項使用。
 * 業主範例 King, R. (US) = KingR(US) 需要同時忽略標點與其造成的空白落差，
 * 否則移除標點後仍會因為「King, R.」多一個空白而判定不符。
 */
function stripPunctuationAndSpacing(s: string): string {
  let out = "";
  for (const ch of s) {
    if (PUNCT_CHARS.includes(ch) || /\s/.test(ch)) continue;
    out += ch;
  }
  return out;
}

/** 一般文字欄位的正規化管線：異體字（無條件）→ 全形半形 → 大小寫 → 標點（含空白）→ 空白收斂。 */
function normalizeGenericText(value: string, options: NormalizationOptions): string {
  let v = canonicalizeVariants(value);
  if (options.ignoreWidth) v = toHalfWidth(v);
  if (options.ignoreCase) v = v.toUpperCase();
  if (options.ignorePunctuation) return stripPunctuationAndSpacing(v);
  return normalizeWhitespace(v);
}

/** 多人姓名清單：先逐一正規化每個姓名，「忽略排列順序」開啟時再排序後比對。 */
function normalizePersonList(value: string, options: NormalizationOptions): string {
  const names = value
    .split(/[;；]/)
    .map((n) => normalizeGenericText(n, options))
    .filter((n) => n.length > 0);
  if (options.ignorePersonOrder) names.sort();
  return names.join(";");
}

/** 從字串中擷取數字群組，嘗試辨識為年/月/日並補零為 YYYY-MM-DD；無法辨識則原樣返回。 */
function normalizeDateForCompare(value: string): string {
  const digitGroups = value.match(/\d+/g);
  if (!digitGroups) return value;

  let y: string, m: string, d: string;
  if (digitGroups.length === 3) {
    y = digitGroups[0] ?? "";
    m = digitGroups[1] ?? "";
    d = digitGroups[2] ?? "";
  } else if (digitGroups.length === 1 && (digitGroups[0]?.length ?? 0) === 8) {
    const only = digitGroups[0] ?? "";
    y = only.slice(0, 4);
    m = only.slice(4, 6);
    d = only.slice(6, 8);
  } else {
    return value;
  }
  return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function normalizeDateValue(value: string, options: NormalizationOptions): string {
  const v = normalizeWhitespace(canonicalizeVariants(value));
  if (!v) return v;
  return options.ignoreDateFormat ? normalizeDateForCompare(v) : v;
}

/** 只保留數字字元，供「忽略專利號國別碼與橫槓」選項使用（業主要求：只比對數字，不比對英文字）。 */
function digitsOnly(value: string): string {
  return (value.match(/\d/g) ?? []).join("");
}

function normalizePatentNoValue(value: string, options: NormalizationOptions): string {
  if (options.ignorePatentNoFormat) return digitsOnly(value);
  return normalizeGenericText(value, options);
}

export function fieldsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
  valueType: FieldValueType = "text",
  options: NormalizationOptions = DEFAULT_NORMALIZATION_OPTIONS
): boolean {
  const rawA = a ?? "";
  const rawB = b ?? "";

  let na: string;
  let nb: string;
  switch (valueType) {
    case "date":
      na = normalizeDateValue(rawA, options);
      nb = normalizeDateValue(rawB, options);
      break;
    case "patentNo":
      na = normalizePatentNoValue(rawA, options);
      nb = normalizePatentNoValue(rawB, options);
      break;
    case "personList":
      na = normalizePersonList(rawA, options);
      nb = normalizePersonList(rawB, options);
      break;
    default:
      na = normalizeGenericText(rawA, options);
      nb = normalizeGenericText(rawB, options);
  }
  return na === nb;
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

export function buildCaseComparison(
  row: ComparableRow,
  selectedKeys: Set<string>,
  normalizationOptions: NormalizationOptions = DEFAULT_NORMALIZATION_OPTIONS
): CaseComparisonResult {
  const greenEntries: FieldComparisonEntry[] = GREEN_FIELD_DEFS.map((def) => {
    const internalValue = row.internal[def.key] ?? "";
    const tipoValue = row.tipo[def.key] ?? "";
    const compared = selectedKeys.has(def.key);
    const match = compared ? fieldsMatch(internalValue, tipoValue, def.valueType, normalizationOptions) : null;
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
