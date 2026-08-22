# Tasks: 標註比對報表匯出（紅字標記）+ PatentPub 查詢 Fallback

- [x] `lib/tipo-api.ts`：`buildPatentPubUrl()` / `extractPatentPubContents()` / `mapPatentPubContentToRow()` + 單元測試（fixture 取自官方文件表 43）
- [x] `app/api/tipo/patent-rights/route.ts`：PatentRights 查完後，對剩餘查無資料的 applno 補打 PatentPub，合併結果
- [x] `lib/patent-logic.ts`：新增「尚未核准（僅公開）」狀態、`STATUS_TONE` 對應、`formatDateOrDash()` + 單元測試
- [x] `lib/mock-data.ts` / `lib/build-rows.ts`：日期欄位型別放寬為可 null，PatentPub 來源案件分流為新狀態而非 notFound + 單元測試更新
- [x] `components/dashboard/results-panel.tsx` / `case-detail-dialog.tsx` / `query-banners.tsx`：nullable 日期的 UI 處理（formatDateOrDash、DateRuler 條件渲染、狀態篩選選項、PatentPub 補查錯誤標籤）
- [x] `lib/excel.ts`：`exportAnalysisReport` 改用 `formatDateOrDash`
- [x] 安裝 `exceljs` 依賴
- [x] `lib/parse-upload.ts`：新增 `readOriginalWorkbookRows()`
- [x] `lib/excel-annotated.ts`：`buildAnnotatedTable()`（純函式）+ `exportAnnotatedOriginalReport()` + 單元測試
- [x] `components/dashboard/comparison-panel.tsx` / `app/page.tsx`：新增「匯出標註報表」按鈕與 handler
- [x] 驗證：`npm run test`（103 tests pass）／`npx tsc --noEmit`（無錯誤）
- [x] 更新 `README.md`：功能說明、技術架構、專案結構、已知限制段落
- [x] 複製回工作資料夾、提供檔案、總結變更
