/**
 * 歷史查詢紀錄 — 純邏輯 + localStorage 持久化。
 *
 * 設計取捨（對應「Phase 2：歷史查詢紀錄持久化」需求）：
 * - 僅儲存「本次查詢摘要」（時間、檔名、總筆數、三種狀態筆數、查無資料筆數），
 *   不儲存完整 PatentRow 明細 —— 一方面畫面本來就只需要摘要式的列表，
 *   一方面也避開 Date 欄位跨 JSON/localStorage 邊界後失去型別的問題（同一個坑
 *   已經在 TIPO API 回應那邊踩過一次，見 lib/tipo-api.ts 的序列化註解）。
 * - 存放於瀏覽器 localStorage，單機示範用途已足夠；之後若要多人共用可再換成
 *   後端資料庫，不影響本檔案以外的呼叫端（loadHistory/appendHistoryEntry/clearHistory
 *   的函式簽章維持不變即可）。
 * - summarizeStatusCounts 刻意寫成不碰 localStorage 的純函式，方便單元測試；
 *   實際讀寫 localStorage 的部分則在測試檔案中以最小的記憶體版 Storage mock 驗證
 *   （vitest.config.ts 的 test environment 是 "node"，沒有全域 localStorage）。
 */

import type { PatentRow } from "./mock-data";

export type HistoryMode = "success" | "sample" | "error";

export interface HistoryEntry {
  id: string;
  /** ISO 字串（非 Date），避免 localStorage JSON 序列化後失去型別。 */
  timestamp: string;
  fileName: string;
  totalApplnos: number;
  mode: HistoryMode;
  aliveCount: number;
  graceCount: number;
  deadCount: number;
  notFoundCount: number;
  errorMessage?: string;
}

const STORAGE_KEY = "tipo-query-history-v1";
const MAX_ENTRIES = 50;

/**
 * 依 lib/patent-logic.ts 的狀態分類統計筆數，分類方式與 components/dashboard/stat-cards.tsx
 * 一致（「逾期但尚在補繳期內」與「逾補繳期但尚可復權」合併為 grace 一類）。
 */
export function summarizeStatusCounts(rows: PatentRow[]): {
  aliveCount: number;
  graceCount: number;
  deadCount: number;
} {
  let aliveCount = 0;
  let graceCount = 0;
  let deadCount = 0;
  for (const row of rows) {
    if (row.status === "案件存續") aliveCount += 1;
    else if (row.status === "案件逾期但尚在補繳期內" || row.status === "案件逾補繳期但尚可復權") graceCount += 1;
    else deadCount += 1;
  }
  return { aliveCount, graceCount, deadCount };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // 部分瀏覽器在無痕模式或關閉儲存權限時，存取 localStorage 會直接拋錯。
    return null;
  }
}

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.timestamp === "string" &&
    typeof r.fileName === "string" &&
    typeof r.totalApplnos === "number" &&
    (r.mode === "success" || r.mode === "sample" || r.mode === "error") &&
    typeof r.aliveCount === "number" &&
    typeof r.graceCount === "number" &&
    typeof r.deadCount === "number" &&
    typeof r.notFoundCount === "number"
  );
}

/** 讀取所有歷史紀錄，新到舊排序。損毀或無法解析的資料一律視為空清單，不拋錯。 */
export function loadHistory(): HistoryEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // 儲存空間已滿等情況：略過寫入，不影響查詢本身的主流程。
  }
}

/** 新增一筆歷史紀錄（自動產生 id/timestamp），最多保留最新 50 筆。回傳寫入後的完整清單。 */
export function appendHistoryEntry(input: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry[] {
  const entry: HistoryEntry = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  const next = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);
  writeHistory(next);
  return next;
}

/** 清空所有歷史紀錄。回傳空清單，方便呼叫端直接更新畫面狀態。 */
export function clearHistory(): HistoryEntry[] {
  writeHistory([]);
  return [];
}
