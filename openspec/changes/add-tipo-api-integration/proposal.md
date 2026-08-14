# Change: Integrate Real TIPO OpenData API (Phase 2)

## Why
前兩階段（狀態判定 mockup、欄位比對 mockup）都使用示範資料。業主尚未核發 API 驗證碼(tk)，但決定先把真實串接做完、以「範例模式」運作，待日後取得 tk 後只需設定環境變數即可切換為正式資料，不需再改程式碼。

## What Changes
- 新增 `lib/tipo-api.ts`：純函式模組，負責
  - 依 `applno` 第 4 碼將案號分組為 applclass 1/2/3（重用 `parseApplClass`）
  - 組出 `PatentRights` API 請求 URL（`applno` 以 `|` 分隔、`format=json`、`applclass`、`tk`）
  - 將 TIPO 回傳的 JSON（`tw-patent-rightsI/M/D` → `patentcontent[]`）映射為既有的 `GreenFields` / `YellowFields` 形狀，供 `lib/field-compare.ts` 與 `lib/mock-data.ts` 沿用的比對邏輯直接使用
  - `cancel-result` / `revoke-code` 案由代碼對照表（節錄官方文件「代碼說明」中與消滅/撤銷相關的常見代碼）
  - 附 `lib/tipo-api.test.ts`，以官方文件範例 JSON 作為 fixture 驗證映射正確性
- 新增 `app/api/tipo/patent-rights/route.ts`（Next.js Route Handler，伺服器端）：
  - 從 `process.env.TIPO_API_TOKEN` 讀取 tk（未設定時比照官方行為，改用範例模式，回傳仍為 `status: "sample"`）
  - 依 applclass 分組後平行呼叫 TIPO，合併結果並保持使用者原始上傳的 applno 順序
  - `tk` 僅存在伺服器端，不會出現在回應內容或任何前端程式碼中
- 新增 `lib/parse-upload.ts`：前端解析上傳 Excel（沿用既有 `xlsx` 套件），依「欄位標題文字」比對 `GREEN_FIELD_DEFS` 清單取出內部系統既有資料，並抽出 `applno` 清單（保持原始列順序）
  - 決策：改用欄位標題比對取代讀取儲存格底色，因專案目前使用的 SheetJS 免費版無法可靠讀取 cell 填色，標題比對更穩定、也已在對話中與業主口頭確認
- 修改 `app/page.tsx` / `components/dashboard/upload-zone.tsx`：上傳流程改為「解析 Excel → 呼叫 `/api/tipo/patent-rights` → 合併 internal/tipo 資料 → 產生 `PatentRow[]`」，取代目前的假進度條 + 罐頭示範資料
- UI 新增狀態橫幅：`status=sample`（未設定 tk）時顯示「⚠ 目前為範例資料模式」；`status=error` 或網路失敗時顯示可重試的錯誤訊息
- 新增 `.env.local.example`，`.gitignore` 加入 `.env*.local`

## Impact
- Affected specs: `tipo-api-integration`（新增）
- Affected code: `lib/tipo-api.ts`（新增）、`app/api/tipo/patent-rights/route.ts`（新增）、`lib/parse-upload.ts`（新增）、`app/page.tsx`、`components/dashboard/upload-zone.tsx`、`.gitignore`
- 沿用不變：`lib/patent-logic.ts`（5 步驟判定邏輯）、`lib/field-compare.ts`（欄位比對邏輯）— 這兩個模組本來就是純函式、與資料來源無關，Mock 資料與真實 API 資料都能直接餵入使用
- Out of scope（本次不做，後續狀態見下）：
  - 其餘 8 支 TIPO API（優先權案、分割案、改請案等）— 仍未做
  - 比對結果匯出 Excel、TIPO 完整資料重寫匯出 — 已於 `add-excel-export-and-extra-fields` 完成
  - 案由代碼完整對照表（僅節錄消滅/撤銷相關常用代碼）— 仍未做
  - 伺服器端 rate limit / 快取 — 仍未做
  - 歷史查詢紀錄持久化 — 已於 `add-history-persistence` 完成
