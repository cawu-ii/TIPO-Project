import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PatentRow } from "./mock-data";
import { appendHistoryEntry, clearHistory, loadHistory, summarizeStatusCounts } from "./history-store";

/**
 * vitest.config.ts 的 test environment 是 "node"，沒有全域 localStorage，
 * 這裡用最小的記憶體版 Storage 介面模擬瀏覽器行為，掛到 globalThis 供
 * lib/history-store.ts 內部的 window.localStorage 存取使用。
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function makeRow(status: PatentRow["status"]): PatentRow {
  return {
    applno: "100114238",
    patentName: "測試專利",
    applicant: "測試公司",
    chargeExpirDate: new Date(),
    patentEdate: new Date(),
    internal: {} as PatentRow["internal"],
    tipo: {} as PatentRow["tipo"],
    tipoYellow: {} as PatentRow["tipoYellow"],
    applClass: 1,
    status,
  };
}

describe("summarizeStatusCounts", () => {
  it("依狀態分類統計，補繳期內與可復權合併為 grace", () => {
    const rows: PatentRow[] = [
      makeRow("案件存續"),
      makeRow("案件存續"),
      makeRow("案件逾期但尚在補繳期內"),
      makeRow("案件逾補繳期但尚可復權"),
      makeRow("案件已消滅"),
    ];
    expect(summarizeStatusCounts(rows)).toEqual({ aliveCount: 2, graceCount: 2, deadCount: 1 });
  });

  it("空陣列回傳全部為 0", () => {
    expect(summarizeStatusCounts([])).toEqual({ aliveCount: 0, graceCount: 0, deadCount: 0 });
  });
});

describe("history-store 讀寫（localStorage）", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  it("尚未寫入任何紀錄時，loadHistory 回傳空陣列", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("appendHistoryEntry 寫入後可由 loadHistory 讀回，且新紀錄排在最前面", () => {
    appendHistoryEntry({
      fileName: "第一批.xlsx",
      totalApplnos: 10,
      mode: "success",
      aliveCount: 5,
      graceCount: 3,
      deadCount: 2,
      notFoundCount: 0,
    });
    appendHistoryEntry({
      fileName: "第二批.xlsx",
      totalApplnos: 20,
      mode: "sample",
      aliveCount: 0,
      graceCount: 0,
      deadCount: 0,
      notFoundCount: 0,
    });

    const entries = loadHistory();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.fileName).toBe("第二批.xlsx");
    expect(entries[1]!.fileName).toBe("第一批.xlsx");
    expect(entries[0]!.id).toBeTruthy();
    expect(typeof entries[0]!.timestamp).toBe("string");
  });

  it("最多只保留最新 50 筆", () => {
    for (let i = 0; i < 55; i++) {
      appendHistoryEntry({
        fileName: `批次-${i}.xlsx`,
        totalApplnos: 1,
        mode: "success",
        aliveCount: 1,
        graceCount: 0,
        deadCount: 0,
        notFoundCount: 0,
      });
    }
    const entries = loadHistory();
    expect(entries).toHaveLength(50);
    expect(entries[0]!.fileName).toBe("批次-54.xlsx");
  });

  it("clearHistory 清空後 loadHistory 回傳空陣列", () => {
    appendHistoryEntry({
      fileName: "會被清掉.xlsx",
      totalApplnos: 1,
      mode: "error",
      aliveCount: 0,
      graceCount: 0,
      deadCount: 0,
      notFoundCount: 0,
      errorMessage: "查詢失敗",
    });
    expect(loadHistory()).toHaveLength(1);
    const result = clearHistory();
    expect(result).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });

  it("localStorage 內容損毀（非合法 JSON）時，loadHistory 回傳空陣列而不拋錯", () => {
    localStorage.setItem("tipo-query-history-v1", "{not valid json");
    expect(loadHistory()).toEqual([]);
  });
});
