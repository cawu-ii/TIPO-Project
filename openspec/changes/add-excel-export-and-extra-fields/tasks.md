# Tasks: Add Extra Bibliographic Fields + Excel Export Suite

- [x] `GreenFields` / `GREEN_FIELD_DEFS` 新增 `applicantNameZh`、`inventorNameZh`
- [x] `lib/tipo-api.ts` 映射新欄位 + 單元測試斷言
- [x] `lib/build-rows.ts` / `lib/parse-upload.ts` 的 `BLANK_GREEN` 同步更新
- [x] `lib/excel.ts`：`exportComparisonReport()`、`exportTipoRawData()`
- [x] `comparison-panel.tsx` 新增匯出按鈕
- [x] 驗證：`npm run test` / `npm run typecheck`（`npm run build` 因 sandbox I/O 限制未能於此環境跑完，已請業主本機確認通過）
- [x] 複製回工作資料夾、提供檔案
