# Change: 標註比對報表匯出（紅字標記）+ PatentPub 查詢 Fallback

## Why
業主 8/21 轉交同事實測後回饋的 5 點中，第 4、5 點是新需求（前 3 點已在
`openspec/changes/fix-upload-parsing-2026-08-21` 處理）：

4. 匯出的報表，希望能依「上傳比對」頁籤所選要比對的欄位，在原始上傳 Excel 版面旁邊新增欄位：
   資訊正確則顯示「正確」，不正確則以紅字標記智慧局的正確值。
5. 目前只查詢「專利權狀態異動資料 PatentRights」，尚未核准的案件查不到。同一份官方文件第 66 頁
   的「發明公開案 PatentPub」可查到已公開但尚未核准的案件（測試案號：`111142934`）。查詢邏輯應
   調整為：先查 PatentRights，查無資料時再查 PatentPub，兩者都查無資料才是真的「查無資料」。

實作前已與使用者確認兩個技術決定：
- 第 4 點要真的用紅色字型標記（而非文字註記代替），因此改用 `exceljs`（現行 `xlsx` 為 SheetJS
  免費版，無法寫入儲存格樣式）。
- 第 5 點中，PatentPub 查到但尚未核准的案件，因為沒有「專利權止日」「年費有效日期」（這兩個欄位
  只有核准後的 PatentRights 資料才有），無法套用既有四階狀態判定，獨立標記為新狀態
  「尚未核准（僅公開）」。

## What Changes

### 1. PatentPub 查詢 Fallback（`lib/tipo-api.ts` + API route + 狀態判定）
- `lib/tipo-api.ts`：新增 `buildPatentPubUrl()`（不需 applclass，見官方文件表 40）、
  `extractPatentPubContents()`、`mapPatentPubContentToRow()`——回傳 `TipoMappedRow`，但
  `patentEdate`/`chargeExpirDate` 一律為 `null`（PatentPub 沒有 patent-right 物件）。
- `app/api/tipo/patent-rights/route.ts`：PatentRights 查完後，找出「原本要查、但這批結果裡沒有」
  的 applno，補打一次 PatentPub，結果合併進同一個 `rows` 陣列回傳。
- `lib/patent-logic.ts`：`PatentStatus` 新增 `"尚未核准（僅公開）"`；`STATUS_TONE` 對應
  `neutral`（沿用既有 Badge 樣式，不新增設計 token）；新增 `formatDateOrDash()`，日期為 `null`
  時顯示 `—`。
- `lib/mock-data.ts`：`RawPatentRow.chargeExpirDate`/`patentEdate` 型別放寬為 `Date | null`。
- `lib/build-rows.ts`：查到 `tipo` 但 `patentEdate`/`chargeExpirDate` 為 `null` 時，不再視為
  查無資料（`notFound`），改為推入狀態為「尚未核准（僅公開）」的 `PatentRow`。
- UI（`results-panel.tsx`、`case-detail-dialog.tsx`）：日期欄位改用 `formatDateOrDash()`；
  只有兩個日期皆非 null 時才渲染 `DateRuler`，否則顯示提示文字；狀態篩選清單新增此狀態選項。

### 2. 標註比對報表匯出（`lib/excel-annotated.ts`，新依賴 `exceljs`）
- 新增 `lib/parse-upload.ts` 的 `readOriginalWorkbookRows(file)`：重新讀取使用者上傳檔案的
  「全部欄位」（不只是欄位對應表指到的 13 個綠底欄位），供重建原始版面使用。
- 新增 `lib/excel-annotated.ts`：
  - `buildAnnotatedTable()`（純函式，含單元測試）：依欄位對應表定位 applno 欄，比對本次選擇
    比對的欄位，逐列判定每個新欄位要顯示「正確」還是（標紅的）智慧局正確值；原始 Excel 查無
    對應 applno 的列，新欄位一律顯示「查無資料」。
  - `exportAnnotatedOriginalReport()`：組出 `exceljs` 工作簿（原始欄位 + 新增比對結果欄位，
    不符欄位標紅 `#C23B2E`，即專案設計系統的 seal 紅）並觸發瀏覽器下載。
- `components/dashboard/comparison-panel.tsx`：「資料比對」頁籤新增「匯出標註報表」按鈕。
- `app/page.tsx`：新增 `handleExportAnnotated()`，呼叫上述匯出函式（需要 `file`、
  `columnMapping`、`rows`、`selectedGreenKeys`、`normalizationOptions`，皆已是既有 state）。

## Impact
- Affected specs: 無新 spec（查詢 fallback、狀態判定屬於既有流程擴充；標註匯出屬於既有匯出功能
  的第四種報表）
- Affected code:
  - `lib/tipo-api.ts`（PatentPub 支援，含測試）
  - `app/api/tipo/patent-rights/route.ts`（fallback 查詢）
  - `lib/patent-logic.ts`（新狀態、`formatDateOrDash()`，含測試）
  - `lib/mock-data.ts`（日期欄位型別放寬為可 null）
  - `lib/build-rows.ts`（PatentPub 來源案件的分流邏輯，含測試更新）
  - `components/dashboard/results-panel.tsx`、`case-detail-dialog.tsx`、
    `components/dashboard/query-banners.tsx`（nullable 日期的 UI 處理）
  - `lib/excel.ts`（`exportAnalysisReport` 改用 `formatDateOrDash`）
  - `lib/parse-upload.ts`（`readOriginalWorkbookRows()`）
  - `lib/excel-annotated.ts`（新增，含測試）
  - `components/dashboard/comparison-panel.tsx`、`app/page.tsx`（新增匯出按鈕與 handler）
  - `package.json`（新依賴 `exceljs`）
- Out of scope（本次不做）：
  - PatentPub 補查目前只依 applno 查詢，不額外處理新型／設計專利（本來就沒有公開階段，查不到
    屬預期行為）
  - 標註比對報表不支援自訂顏色或匯出格式，紅色固定為專案設計系統的 seal 色
