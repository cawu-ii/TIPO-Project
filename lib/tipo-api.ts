/**
 * TIPO OpenData「專利權狀態異動資料 PatentRights」API — 純函式模組。
 *
 * 刻意與 fetch/網路呼叫解耦：URL 組裝、回應解析、欄位映射都是可單獨測試的純函式，
 * 實際的 fetch() 呼叫只發生在 app/api/tipo/patent-rights/route.ts（伺服器端，
 * 因為 tk 驗證碼絕不可出現在前端程式碼或瀏覽器網路請求中，見 CLAUDE.md 限制）。
 *
 * 官方文件：經濟部智慧財產局《專利權及關聯案件資料開放 API 說明文件》
 * 第 9~26 頁（API 共同參數 + PatentRights 服務說明）。
 */

import { parseApplClass } from "./patent-logic";
import type { GreenFields, YellowFields } from "./mock-data";

export const TIPO_PATENT_RIGHTS_URL = "https://cloud.tipo.gov.tw/S220/opdataapi/api/PatentRights";
/**
 * 發明公開案 PatentPub（官方文件第 65~68 頁）—— 2026-08-21 業主回饋 5.：
 * PatentRights 查無資料時的 fallback，可查到「已公開但尚未核准」的發明專利申請案。
 * 與 PatentRights 不同，查詢參數不需要 applclass（文件表 40 未列出此參數）。
 */
export const TIPO_PATENT_PUB_URL = "https://cloud.tipo.gov.tw/S220/opdataapi/api/PatentPub";

export type ApplClass = 1 | 2 | 3;

/** 官方文件「代碼說明」節錄 — 與消滅(cancel-result)/撤銷(revoke-code)相關的常用案由代碼。 */
export const REASON_CODE_LABELS: Record<string, string> = {
  "48101": "專利權期滿",
  "48103": "無人繼承",
  "48105": "未依限繳費",
  "48107": "自行放棄",
  "48111": "專利權業依職權撤銷",
  "48113": "專利權因舉發成立撤銷",
  "48119": "專利權復原",
  "48123": "一案二請，專利權自始不存在",
};

export function decodeReasonCode(code: string | number | null | undefined): string {
  if (code === null || code === undefined) return "";
  const trimmed = String(code).trim();
  if (!trimmed) return "";
  const label = REASON_CODE_LABELS[trimmed];
  return label ? `${label}（代碼 ${trimmed}）` : trimmed;
}

/** 註記次數 → 顯示文字，例如 rent-status=2 → "有（2 次）"；0 或缺值 → "無"。 */
export function formatNoteCount(count: number | string | null | undefined): string {
  const n = typeof count === "string" ? parseInt(count, 10) : count;
  if (!n || Number.isNaN(n) || n <= 0) return "無";
  return `有（${n} 次）`;
}

/** 依 applno 第 4 碼分組；無法判定類別的案號歸入 invalid，不會被查詢。 */
export function groupApplnosByClass(applnos: string[]): {
  groups: Partial<Record<ApplClass, string[]>>;
  invalid: string[];
} {
  const groups: Partial<Record<ApplClass, string[]>> = {};
  const invalid: string[] = [];
  for (const raw of applnos) {
    const applno = raw.trim();
    if (!applno) continue;
    const cls = parseApplClass(applno);
    if (!cls) {
      invalid.push(applno);
      continue;
    }
    (groups[cls] ??= []).push(applno);
  }
  return { groups, invalid };
}

/** 組出單一 applclass 分組的 PatentRights 查詢 URL。 */
export function buildPatentRightsUrl({
  applclass,
  applnos,
  tk,
}: {
  applclass: ApplClass;
  applnos: string[];
  tk: string;
}): string {
  const params = new URLSearchParams();
  params.set("format", "json");
  params.set("applclass", String(applclass));
  params.set("applno", applnos.join("|"));
  // top 預設僅 25 筆，需明確帶入實際查詢筆數（上限 5000）避免結果被截斷。
  params.set("top", String(Math.min(Math.max(applnos.length, 1), 5000)));
  params.set("tk", tk);
  return `${TIPO_PATENT_RIGHTS_URL}?${params.toString()}`;
}

/** 組出 PatentPub 查詢 URL（不需 applclass，見官方文件表 40）。 */
export function buildPatentPubUrl({ applnos, tk }: { applnos: string[]; tk: string }): string {
  const params = new URLSearchParams();
  params.set("format", "json");
  params.set("applno", applnos.join("|"));
  params.set("top", String(Math.min(Math.max(applnos.length, 1), 5000)));
  params.set("tk", tk);
  return `${TIPO_PATENT_PUB_URL}?${params.toString()}`;
}

export interface TipoApiEnvelope {
  version?: string;
  status?: "ok" | "sample" | "error" | string;
  message?: string;
  "total-count"?: number;
  [wrapperKey: string]: unknown;
}

/**
 * 從回應中找出 tw-patent-rightsI/M/D 包裹欄位並取出 patentcontent 陣列。
 * 只回傳 0 或 1 筆時，部分 API 會回傳物件而非陣列，這裡一律正規化為陣列。
 */
export function extractPatentContents(response: TipoApiEnvelope): Record<string, unknown>[] {
  const wrapperKey = Object.keys(response).find((k) => /^tw-patent-rights/i.test(k));
  if (!wrapperKey) return [];
  const wrapper = response[wrapperKey] as Record<string, unknown> | undefined;
  const content = wrapper?.["patentcontent"];
  if (!content) return [];
  return Array.isArray(content) ? (content as Record<string, unknown>[]) : [content as Record<string, unknown>];
}

/** 從回應中找出 tw-patent-pub 包裹欄位並取出 patentcontent 陣列，邏輯同 extractPatentContents。 */
export function extractPatentPubContents(response: TipoApiEnvelope): Record<string, unknown>[] {
  const wrapperKey = Object.keys(response).find((k) => /^tw-patent-pub/i.test(k));
  if (!wrapperKey) return [];
  const wrapper = response[wrapperKey] as Record<string, unknown> | undefined;
  const content = wrapper?.["patentcontent"];
  if (!content) return [];
  return Array.isArray(content) ? (content as Record<string, unknown>[]) : [content as Record<string, unknown>];
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function joinPersons(list: unknown, nameKey: string, withCountry = false): string {
  if (!Array.isArray(list)) return "";
  return list
    .map((p) => {
      const rec = p as Record<string, unknown>;
      const name = str(rec[nameKey]);
      if (!name) return "";
      const country = withCountry ? str(rec["english-country"]) : "";
      return country ? `${name} (${country})` : name;
    })
    .filter(Boolean)
    .join("; ");
}

/** 解析 "YYYY/MM/DD" 字串為 UTC Date；無法解析或空值回傳 null。 */
export function parseSlashDateOrNull(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split("/").map((n) => parseInt(n, 10));
  const [y, m, d] = parts;
  if (!y || !m || !d || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export interface TipoMappedRow {
  applno: string;
  patentEdate: Date | null;
  chargeExpirDate: Date | null;
  green: GreenFields;
  yellow: YellowFields;
}

/**
 * 將 PatentRights API 單筆 patentcontent 映射為專案共用的 GreenFields / YellowFields 形狀，
 * 讓既有的 lib/patent-logic.ts（狀態判定）與 lib/field-compare.ts（欄位比對）可直接沿用，
 * 不需要因為換成真實資料而修改任何業務邏輯。
 */
export function mapPatentContentToRow(item: Record<string, unknown>): TipoMappedRow {
  const pub = (item["publication-reference"] ?? {}) as Record<string, unknown>;
  const appl = (item["application-reference"] ?? {}) as Record<string, unknown>;
  const title = (item["patent-title"] ?? {}) as Record<string, unknown>;
  const right = (item["patent-right"] ?? {}) as Record<string, unknown>;
  const parties = (item["parties"] ?? {}) as Record<string, unknown>;

  const applicants = parties["applicants"];
  const applicantAddress =
    joinPersons(applicants, "english-address") || joinPersons(applicants, "address");

  const green: GreenFields = {
    applDate: str(appl["appl-date"]),
    publicationNo: str(pub["notice-no"]),
    publicationDate: str(pub["notice-date"]),
    gazetteNo: str(pub["publish-no"]),
    gazetteDate: str(pub["publish-date"]),
    certNo: str(right["patent-no"]),
    patentNameZh: str(title["patent-name-chinese"]),
    agentName: joinPersons(parties["agents"], "chinese-name"),
    applicantNameZh: joinPersons(applicants, "chinese-name"),
    applicantNameEn: joinPersons(applicants, "english-name"),
    applicantAddress,
    inventorNameZh: joinPersons(parties["inventors"], "chinese-name"),
    inventorNameEn: joinPersons(parties["inventors"], "english-name", true),
  };

  const patentEdate = parseSlashDateOrNull(str(right["patent-edate"]));
  const chargeExpirDate = parseSlashDateOrNull(str(right["charge-expir-date"]));
  const chargeExpirYear = str(right["charge-expir-year"]);

  const yellow: YellowFields = {
    licenseNote: formatNoteCount(right["rent-status"] as number | string),
    pledgeNote: formatNoteCount(right["mortgage-status"] as number | string),
    transferNote: formatNoteCount(right["transfer-status"] as number | string),
    inheritNote: formatNoteCount(right["inherit-status"] as number | string),
    trustNote: formatNoteCount(right["trust-status"] as number | string),
    opposeNote: formatNoteCount(right["opposition-status"] as number | string),
    invalidateNote: formatNoteCount(right["nullity-status"] as number | string),
    extinguishDate: str(right["cancel-date"]),
    extinguishReason: decodeReasonCode(right["cancel-result"] as string),
    revokeDate: str(right["revoke-date"]),
    revokeReason: decodeReasonCode(right["revoke-code"] as string),
    patentStartDate: str(right["patent-bdate"]),
    patentEndDate: str(right["patent-edate"]),
    chargeExpirDateLabel: str(right["charge-expir-date"]),
    chargeExpirYear: chargeExpirYear ? `第 ${chargeExpirYear} 年` : "",
  };

  return {
    applno: str(appl["appl-no"]),
    patentEdate,
    chargeExpirDate,
    green,
    yellow,
  };
}

const BLANK_YELLOW: YellowFields = {
  licenseNote: "無",
  pledgeNote: "無",
  transferNote: "無",
  inheritNote: "無",
  trustNote: "無",
  opposeNote: "無",
  invalidateNote: "無",
  extinguishDate: "",
  extinguishReason: "",
  revokeDate: "",
  revokeReason: "",
  patentStartDate: "",
  patentEndDate: "",
  chargeExpirDateLabel: "",
  chargeExpirYear: "",
};

/**
 * 將 PatentPub（發明公開案）API 單筆 patentcontent 映射為 TipoMappedRow —— 2026-08-21 業主
 * 回饋 5.：PatentRights 查無資料時的 fallback。與 mapPatentContentToRow() 的關鍵差異：
 * PatentPub 只有「已公開但尚未核准」的書目資料，沒有 patent-right 物件，因此沒有「專利權止日」
 * 「年費有效日期」等核准後才會產生的欄位 —— patentEdate/chargeExpirDate 一律為 null，
 * lib/patent-logic.ts 既有的四階狀態判定邏輯無法套用，呼叫端（lib/build-rows.ts）需改判定為
 * 「尚未核准（僅公開）」這個獨立狀態，而不是當成查無資料。
 */
export function mapPatentPubContentToRow(item: Record<string, unknown>): TipoMappedRow {
  const pub = (item["publication-reference"] ?? {}) as Record<string, unknown>;
  const appl = (item["application-reference"] ?? {}) as Record<string, unknown>;
  const title = (item["patent-title"] ?? {}) as Record<string, unknown>;
  const parties = (item["parties"] ?? {}) as Record<string, unknown>;

  const applicants = parties["applicants"];
  const applicantAddress = joinPersons(applicants, "english-address") || joinPersons(applicants, "address");

  const green: GreenFields = {
    applDate: str(appl["appl-date"]),
    publicationNo: str(pub["notice-no"]),
    publicationDate: str(pub["notice-date"]),
    gazetteNo: "",
    gazetteDate: "",
    certNo: "",
    patentNameZh: str(title["patent-name-chinese"]),
    agentName: joinPersons(parties["agents"], "chinese-name"),
    applicantNameZh: joinPersons(applicants, "chinese-name"),
    applicantNameEn: joinPersons(applicants, "english-name"),
    applicantAddress,
    inventorNameZh: joinPersons(parties["inventors"], "chinese-name"),
    inventorNameEn: joinPersons(parties["inventors"], "english-name", true),
  };

  return {
    applno: str(appl["appl-no"]),
    patentEdate: null,
    chargeExpirDate: null,
    green,
    yellow: { ...BLANK_YELLOW },
  };
}
