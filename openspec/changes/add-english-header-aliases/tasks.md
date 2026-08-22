# Tasks: 欄位對應自動猜測支援常見英文標題

- [x] `lib/parse-upload.ts`：新增 `FIELD_HEADER_ALIASES`、擴充 `APPLNO_HEADER_ALIASES`、`normalizeHeader()` 改為不分大小寫、`detectColumns()` 改用別名清單比對
- [x] 單元測試：常見英文標題自動猜測（Filing Number/Date、Publication Number/Date、Grant Number/Date、Registered Owner Name/Address）、大小寫不敏感、確認 `FN` 等無語意縮寫仍不強猜、既有中文標籤測試維持通過
- [x] 驗證：`npm run test`（105 tests pass）／`npx tsc --noEmit`（無錯誤）
- [x] 更新 `README.md`：欄位對應功能說明、已知限制段落
- [x] 複製回工作資料夾、提供檔案、總結變更
