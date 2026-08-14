# Change: Add Extra Bibliographic Fields + Excel Export Suite

## Why
業主同事回饋兩點需求（2026-08-14）：
1. 抓回的資料需進一步包含「申請人中文姓名」「發明人中文姓名」（PDF 說明文件第 20 頁回傳值可查）。「申請人地址」欄位在 `add-field-comparison` 階段已存在，不在本次新增範圍。
2. 匯出方面除既有「比對差異報告」外，希望能「把從 TIPO 抓回的資料直接重寫到 Excel」，一方面可看出哪些欄位不同，一方面能取得一份完全呈現 TIPO 最新資料的檔案，可直接取代內部系統舊資料。

## What Changes
- 擴充 `GreenFields`（`lib/mock-data.ts`）新增 `applicantNameZh`、`inventorNameZh` 兩欄；`GREEN_FIELD_DEFS`（`lib/field-compare.ts`）同步新增對應欄位定義（共 13 欄）。
- `lib/tipo-api.ts` 的 `mapPatentContentToRow()` 新增這兩欄的映射（來源：`parties.applicants[].chinese-name`、`parties.inventors[].chinese-name`）。
- `lib/build-rows.ts`、`lib/parse-upload.ts` 的 `BLANK_GREEN` 常數同步更新，確保 Excel 上傳資料無此欄位時仍能安全併入比對流程（示範資料集本身沒有中文姓名欄位，內部資料留空是預期行為）。
- 新增 `lib/excel.ts` 兩個匯出函式：
  - `exportComparisonReport()`：「案件總覽」+「差異明細」兩個工作表，只根據使用者本次勾選的比對欄位計算。
  - `exportTipoRawData()`：欄位結構比照原始上傳 Excel（申請號 + 全部綠底／黃底欄位），內容全部改用本次向 TIPO 查得的最新資料重新產生。
- `components/dashboard/comparison-panel.tsx` 新增對應的兩個匯出按鈕（`onExportDiff` / `onExportRawData`）。

## Impact
- Affected specs: 無新 capability，屬於既有 `field-comparison` / `tipo-api-integration` 的擴充。
- Affected code: `lib/mock-data.ts`、`lib/field-compare.ts`、`lib/tipo-api.ts`（+ test）、`lib/build-rows.ts`（+ test）、`lib/parse-upload.ts`、`lib/excel.ts`、`components/dashboard/comparison-panel.tsx`、`app/page.tsx`
- 兩個既有的比對欄位 literal（`lib/build-rows.test.ts`）需同步補上新欄位，避免型別檢查失敗。
- Out of scope：`applicantAddress` 沿用既有欄位不變；匯出檔案的欄位順序固定，不提供使用者自訂排序。
