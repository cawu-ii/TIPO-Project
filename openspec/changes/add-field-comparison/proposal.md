# Change: Add Field-Level Comparison (Excel 內部資料 vs. 智慧局最新資料)

## Why
業主新增需求：除了既有的「日期邏輯判定案件狀態」外，使用者上傳的 Excel 內部系統資料本身可能與智慧局最新資料有落差（例如專利權人名稱、地址、代理人異動）。需要讓使用者自選欲比對的欄位，逐案抓出不一致，供法務/智財人員快速確認哪些案件的內部紀錄需要更新。介面沿用既有設計系統，僅補上「介面設計要用我們自己原本的」這項限制，不套用業主提供之參考截圖的視覺風格，只複製其功能行為。

## What Changes
- 新增 `lib/field-compare.ts`：定義綠底（可比對）／黃底（僅顯示）欄位清單、`fieldsMatch` 正規化比對、`buildCaseComparison` 純函式，並附 `lib/field-compare.test.ts` 單元測試。
- 擴充 `lib/mock-data.ts`：`RawPatentRow` 新增 `internal` / `tipo`（綠底欄位）與 `tipoYellow`（黃底欄位）資料；示範資料集改為業主提供之附件 Excel（複本 (20260810) 大批run TIPO資料.xlsx）中 15 筆真實案號與書目欄位，其中 5 筆刻意讓 `tipo` 與 `internal` 出現落差以展示比對效果。
- 新增 `app/page.tsx` 第三個頁籤「資料比對」，內含：
  - `components/dashboard/field-selector.tsx` — 綠底欄位勾選器（全選/取消全選）。
  - `components/dashboard/comparison-stats.tsx` — 總比對案件數／完全一致／有差異需確認統計卡片。
  - `components/dashboard/comparison-panel.tsx` — 比對結果清單（比對狀態徽章 + 異常欄位標籤 + 查看明細）。
  - `components/dashboard/comparison-detail-dialog.tsx` — 個案明細對話框：綠底欄位比對表（內部系統資料 vs. 智慧局最新資料 + 只顯示差異欄位開關）、黃底欄位顯示區。
- `components/ui/badge.tsx` 新增 `match` / `mismatch` 兩種語意色階；新增 `components/ui/checkbox.tsx`。
- 沿用「上傳比對」頁籤同一批已抓回資料，不另外重新上傳/查詢。

## Impact
- Affected specs: `field-comparison`（新增）
- Affected code: `lib/field-compare.ts`（新增）、`lib/mock-data.ts`（擴充）、`components/dashboard/*`（新增 4 檔）、`components/ui/badge.tsx`、`components/ui/checkbox.tsx`（新增）、`app/page.tsx`
- Out of scope（本次不做）：真實 TIPO API 串接（仍在 Phase 2）、比對結果匯出 Excel、比對欄位選擇的持久化儲存。
