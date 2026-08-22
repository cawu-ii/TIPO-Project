/**
 * Patent status decision logic — the single source of truth for this project.
 *
 * Per CLAUDE.md / openspec/project.md (confirmed with client 2026-08-06):
 *   1. today > patent-edate                      -> 案件已消滅
 *   2. today <= charge-expir-date                 -> 案件存續
 *   3. today <= charge-expir-date + 6 個月         -> 案件逾期但尚在補繳期內
 *   4. today <= charge-expir-date + 18 個月        -> 案件逾補繳期但尚可復權
 *   5. else                                        -> 案件已消滅
 *
 * This file must stay UI-free (no React, no fetch). Components only call these
 * functions; they must never re-implement the date comparisons themselves.
 */

export type ApplClass = 1 | 2 | 3;

export const APPL_CLASS_LABEL: Record<ApplClass, string> = {
  1: "發明",
  2: "新型",
  3: "設計",
};

/**
 * 從申請案號第 4 碼推導 applclass。回傳 null 表示案號格式不足以判斷
 * （例如長度不足 4 碼，或第 4 碼不屬於 1/2/3）。
 */
export function parseApplClass(applno: string): ApplClass | null {
  const normalized = applno.trim();
  const fourthChar = normalized.charAt(3);
  if (fourthChar === "1" || fourthChar === "2" || fourthChar === "3") {
    return Number(fourthChar) as ApplClass;
  }
  return null;
}

/**
 * 正規化申請案號的碼數（2026-08-21 業主回饋 3.）：
 *   - 8 碼 -> 補一個前導 0 湊成 9 碼（民國 99 年以前申請案，頭三碼民國年不足三碼時
 *     Excel 常見只存 8 碼）。
 *   - 10 碼且前 4 碼可解讀為西元年 -> 轉換為民國年（西元年 - 1911），與後 6 碼組成 9 碼，
 *     即智慧局實際留存的申請號格式（例如 2021012522 -> 110012522）。
 *     業主原提供的範例（2011012522 -> 110012522）經確認為筆誤，
 *     正確西元年應為 2021（已與業主確認）。
 *   - 其餘長度／非純數字（例如舊格式含英文字母後綴的案號）原樣回傳，不強行轉換，
 *     避免把查詢用的 applno 轉壞。
 */
export function normalizeApplno(raw: string): string {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;

  if (trimmed.length === 8) {
    return `0${trimmed}`;
  }

  if (trimmed.length === 10) {
    const adYear = Number(trimmed.slice(0, 4));
    const rocYear = adYear - 1911;
    if (rocYear >= 1 && rocYear <= 999) {
      return `${String(rocYear).padStart(3, "0")}${trimmed.slice(4)}`;
    }
  }

  return trimmed;
}

export type PatentStatus =
  | "案件存續"
  | "案件逾期但尚在補繳期內"
  | "案件逾補繳期但尚可復權"
  | "案件已消滅"
  /**
   * 2026-08-21 業主回饋 5.：PatentRights 查無資料、改用 PatentPub（發明公開案）查到的
   * 案件——這類案件根本還沒核准，沒有「專利權止日」「年費有效日期」，既有四階判定邏輯
   * 無套用的基礎，因此獨立為一個狀態，不硬套進存續／逾期／消滅任何一種。
   */
  | "尚未核准（僅公開）";

export const STATUS_TONE: Record<PatentStatus, "alive" | "grace" | "revival" | "dead" | "neutral"> = {
  案件存續: "alive",
  案件逾期但尚在補繳期內: "grace",
  案件逾補繳期但尚可復權: "revival",
  案件已消滅: "dead",
  "尚未核准（僅公開）": "neutral",
};

export interface EvaluatePatentStatusInput {
  /** 台灣系統日（比對基準日） */
  today: Date;
  /** 專利權止日 */
  patentEdate: Date;
  /** 年費有效日期 */
  chargeExpirDate: Date;
}

/** 將日期正規化為 UTC 午夜的時間戳，避免時區/時分秒造成的比較誤差。 */
function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** a 是否嚴格晚於 b（僅比較年月日）。 */
function isAfter(a: Date, b: Date): boolean {
  return toUtcMidnight(a) > toUtcMidnight(b);
}

/** 在指定日期基礎上加上 N 個月（處理月底進位，例如 1/31 + 1mo -> 3/3 由 JS Date 自動進位）。 */
export function addMonthsUtc(date: Date, months: number): Date {
  const base = toUtcMidnight(date);
  const d = new Date(base);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

export function evaluatePatentStatus({
  today,
  patentEdate,
  chargeExpirDate,
}: EvaluatePatentStatusInput): PatentStatus {
  // Step 1: 已逾專利權止日 -> 案件已消滅
  if (isAfter(today, patentEdate)) return "案件已消滅";

  // Step 2: 未逾年費有效日期 -> 案件存續
  if (!isAfter(today, chargeExpirDate)) return "案件存續";

  // Step 3: 未逾「年費有效日期 + 6 個月」-> 逾期但尚在補繳期內
  const graceDeadline = addMonthsUtc(chargeExpirDate, 6);
  if (!isAfter(today, graceDeadline)) return "案件逾期但尚在補繳期內";

  // Step 4: 未逾「年費有效日期 + 18 個月」-> 逾補繳期但尚可復權
  const revivalDeadline = addMonthsUtc(chargeExpirDate, 18);
  if (!isAfter(today, revivalDeadline)) return "案件逾補繳期但尚可復權";

  // Step 5: 其餘 -> 案件已消滅
  return "案件已消滅";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export interface DateRulerPoint {
  key: "chargeExpir" | "grace6" | "revival18" | "patentEdate";
  label: string;
  date: Date;
}

export interface DateRuler {
  points: DateRulerPoint[];
  /** 今日在時間軸上的位置，0~1，供 UI 繪製「今日」標記使用。 */
  todayRatio: number;
}

/**
 * 把決策邏輯本身轉成可繪製的時間軸資料（日期尺 signature 元件）：
 * 年費有效日期 / +6個月 / +18個月 / 專利權止日 四個刻度，加上今日座標。
 */
export function buildDateRuler({ today, patentEdate, chargeExpirDate }: EvaluatePatentStatusInput): DateRuler {
  const grace6 = addMonthsUtc(chargeExpirDate, 6);
  const revival18 = addMonthsUtc(chargeExpirDate, 18);

  const points: DateRulerPoint[] = [
    { key: "chargeExpir", label: "年費有效日期", date: chargeExpirDate },
    { key: "grace6", label: "+6個月", date: grace6 },
    { key: "revival18", label: "+18個月", date: revival18 },
    { key: "patentEdate", label: "專利權止日", date: patentEdate },
  ];

  const timestamps = points.map((p) => toUtcMidnight(p.date));
  const domainStart = Math.min(...timestamps);
  const domainEnd = Math.max(...timestamps);
  const span = domainEnd - domainStart || 1;
  const todayRatio = clamp((toUtcMidnight(today) - domainStart) / span, 0, 1);

  return { points, todayRatio };
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/**
 * 2026-08-21 業主回饋 5.：PatentPub 來源的案件沒有專利權止日／年費有效日期，
 * 這兩個欄位在 PatentRow 上會是 null——UI／匯出報表顯示日期時一律改用這個函式，
 * 避免直接呼叫 formatDate(null) 噴錯。
 */
export function formatDateOrDash(date: Date | null): string {
  return date ? formatDate(date) : "—";
}
