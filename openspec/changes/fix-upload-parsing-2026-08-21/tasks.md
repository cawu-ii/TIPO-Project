# Tasks: 日期解析修正 + 移除重複欄位選擇 UI + 申請案號正規化

- [x] `lib/parse-upload.ts`：`readRawRows()` 改用 `cellDates:true` + `raw:true`，新增 `formatCellDate()` 以 UTC 取值格式化為 `20yy/m/d` + 單元測試
- [x] `lib/patent-logic.ts`：新增 `normalizeApplno()`（8 碼補 0、10 碼西元年轉民國年）+ 單元測試（含與業主確認過的範例、邊界情形）
- [x] `lib/parse-upload.ts`：`parseRowsWithMapping()` 串接 `normalizeApplno()`，`applnos`／`internalByApplno` key 皆用正規化後案號 + 單元測試
- [x] 刪除 `components/dashboard/field-selector.tsx`，`app/page.tsx` 移除對應 import／使用，改為說明文字
- [x] 驗證：`npm run test`（86 tests pass）／`npx tsc --noEmit`（無錯誤）
- [x] 更新 `README.md`：主要功能段落補上「申請案號正規化」「日期解析穩健性」說明，欄位比對段落改為「以欄位對應設定為準」，已知限制補充申請案號正規化的適用範圍
- [x] 複製回工作資料夾、提供檔案、總結變更
