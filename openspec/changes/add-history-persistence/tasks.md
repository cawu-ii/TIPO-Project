# Tasks: Add Query History Persistence

- [x] `lib/history-store.ts`：`summarizeStatusCounts` / `loadHistory` / `appendHistoryEntry` / `clearHistory`
- [x] `lib/history-store.test.ts`：純函式測試 + localStorage mock 讀寫測試（含 50 筆上限、損毀資料防呆）
- [x] `app/page.tsx`：`handleStartCompare()` 三種結果分支都寫入歷史紀錄
- [x] `components/dashboard/history-tab.tsx`：改讀真實紀錄、清空按鈕
- [x] 驗證：`npm run test`（59 tests pass）/ `npm run typecheck`
- [x] 提供檔案
