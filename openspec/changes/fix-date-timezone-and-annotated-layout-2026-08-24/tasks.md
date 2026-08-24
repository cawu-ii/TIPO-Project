# Tasks: 日期時區根因修正 + 標註比對報表版面重新設計

- [x] `lib/parse-upload.ts`：用業主提供的實測檔案 + 專案實際依賴的 `xlsx` 套件版本，直接在 Node
      重現 bug，確認 SheetJS `cellDates:true` 是用本地時區建構 Date（非 `Date.UTC`）
- [x] `lib/parse-upload.ts`：`formatCellDate()` 改用本地時區 `getFullYear()/getMonth()/getDate()`
- [x] `lib/parse-upload.test.ts`：測試輸入改用本地建構子模擬 SheetJS 真實行為，新增正時區回歸測試
- [x] `lib/excel-annotated.ts`：`buildAnnotatedTable()` 新增 `columnMapping` 參數，回傳型別改為
      `AnnotatedTable { headers, rows }`，欄位依原始欄位 index 插入而非附加在最後
- [x] `lib/excel-annotated.ts`：申請案號欄位右邊新增「TIPO 查詢狀態」欄
      （`TIPO_STATUS_FOUND` / `TIPO_STATUS_NOT_FOUND`）
- [x] `lib/excel-annotated.ts`：比對結果新增第三種情況 `FIELD_NO_TIPO_DATA`（紅字「TIPO無資料」）
- [x] `lib/excel-annotated.ts`：`exportAnnotatedOriginalReport()` 改用新的 `AnnotatedTable` 形狀寫入
- [x] `lib/excel-annotated.test.ts`：重寫全部測試，涵蓋欄位插入位置、三種比對結果狀態、
      查詢狀態欄、多欄位插入、applno 正規化對應、原始列補齊、mapping 缺對應欄位的安全略過
- [x] 驗證：`npm run test`（110 tests pass）／`npx tsc --noEmit`（無錯誤）
- [x] 更新 `README.md`：Excel 匯出功能說明改寫為新版面描述，新增多工作表／多表格已知限制
- [x] 回覆業主多工作表提問（僅回答，不動作）
- [ ] 複製回工作資料夾、提供檔案、總結變更、提醒業主本機 push
