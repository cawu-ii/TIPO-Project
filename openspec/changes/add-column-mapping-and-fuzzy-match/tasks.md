# Tasks: Manual Column Mapping + Fuzzy Field Comparison

- [x] `lib/parse-upload.ts`：拆成 `detectExcelColumns()`（欄位字母 + 內容 + 猜測結果）與依對應表解析兩層，`applno` 併入同一套邏輯 + 單元測試
- [x] `lib/field-compare.ts`：`FieldDef.valueType` 分類、`fieldsMatch()`／`buildCaseComparison()` 擴充正規化選項 + 單元測試（涵蓋業主提供的每個範例：大小寫、全形半形、標點、姓名排序、日期格式、專利號國別碼）
- [x] `lib/char-variants.ts`：異體字對照表 + `canonicalizeVariants()` + 單元測試（含 啓/啟）
- [x] `components/dashboard/column-mapping-panel.tsx`：欄位對應下拉選單面板
- [x] `components/dashboard/comparison-options.tsx`：6 個「忽略差異」核取方塊
- [x] `app/page.tsx`：欄位對應 state、正規化選項 state、「開始比對」按鈕的必填檢查（未指定申請案號欄位時停用）
- [x] 驗證：`npm run test`（77 tests pass）/ `npm run typecheck`（`npm run build` 因 sandbox I/O 限制未能於此環境跑完，已請業主本機確認通過）
- [x] 更新 `README.md`：功能說明段落補上「欄位對應」「模糊比對選項」「異體字處理」，已知限制段落補充三項
- [x] 複製回工作資料夾、提供檔案、總結變更
