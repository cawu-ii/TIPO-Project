# Change: Add Query History Persistence

## Why
`add-tipo-dashboard-mockup` 階段的「歷史查詢紀錄」頁籤原本是展示用的靜態假資料，明確標註「Phase 2 將串接持久化儲存」。業主確認正式查詢流程可正常運作後，要求把這個頁籤換成真實紀錄。

## What Changes
- 新增 `lib/history-store.ts`：
  - `summarizeStatusCounts(rows)`：依 `PatentRow.status` 統計存續／補繳復權／已消滅筆數的純函式（分類方式與 `stat-cards.tsx` 一致，補繳期內與可復權合併為一類），與瀏覽器 API 完全解耦，方便單元測試。
  - `loadHistory()` / `appendHistoryEntry()` / `clearHistory()`：以瀏覽器 `localStorage` 儲存查詢摘要（時間、檔名、總筆數、狀態分布、查無資料筆數、模式），最多保留最新 50 筆；只存摘要不存完整 `PatentRow[]`，避免 Date 欄位跨 JSON/localStorage 邊界失去型別（同一個坑已在 TIPO API 回應序列化上踩過一次）。
  - 附 `lib/history-store.test.ts`：`summarizeStatusCounts` 直接測試；`localStorage` 讀寫以記憶體版 `Storage` mock 驗證（因 `vitest.config.ts` 的 test environment 是 `"node"`，無全域 `localStorage`）。
- `app/page.tsx` 的 `handleStartCompare()` 於查詢完成的三種結果（成功／範例模式／錯誤）都呼叫 `appendHistoryEntry()`。
- 重寫 `components/dashboard/history-tab.tsx`：改為掛載時讀取 `loadHistory()`（頁籤切換時會整個卸載重掛，因此切回歷史頁籤即可看到最新紀錄），並提供清空紀錄按鈕。

## Impact
- Affected specs: 無新 capability，補齊 `add-tipo-dashboard-mockup` 遺留的 Phase 2 項目。
- Affected code: `lib/history-store.ts`（新增，含測試）、`components/dashboard/history-tab.tsx`（重寫）、`app/page.tsx`
- 已知限制：紀錄僅存於單一瀏覽器本機，不跨裝置同步；清除瀏覽器資料會遺失紀錄。若未來需要多人共用，須改為後端資料庫儲存，屆時 `loadHistory`/`appendHistoryEntry`/`clearHistory` 的函式簽章可維持不變，只需替換內部實作。
- Out of scope（本次不做）：伺服器端／多人共用的查詢紀錄、紀錄匯出、紀錄搜尋與篩選。
