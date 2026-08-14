# Change: Wire Up Settings Panel

## Why
Header 的「設定」按鈕自最初 mockup 階段就只是裝飾性元件，沒有任何 `onClick`。業主在系統進入實際使用後回報「點下去沒反應」。既有的「設定」在這個系統裡最有意義的內容，是讓使用者能確認 TIPO API 是否已正確設定 tk（否則查詢會靜默落在範例模式，容易被誤以為是正式資料）。

## What Changes
- 新增 `app/api/settings/status/route.ts`：伺服器端 GET route，讀取 `process.env.TIPO_API_TOKEN` 並只回傳布林值 `{ tipoTokenConfigured }`，絕不將 tk 本身傳回前端（見 `CLAUDE.md` 限制）。
- 新增 `components/dashboard/settings-dialog.tsx`：
  - 開啟時呼叫 `/api/settings/status`，顯示「已連線／範例模式（未設定 tk）／無法確認」三種狀態。
  - 提供「將比對欄位重設為預設全選」按鈕（呼叫 `app/page.tsx` 傳入的 `onResetCompareFields`）。
- `app/page.tsx`：Header 的「設定」按鈕改為開啟 `SettingsDialog`；新增 `settingsOpen` state。

## Impact
- Affected specs: 無新 capability。
- Affected code: `app/api/settings/status/route.ts`（新增）、`components/dashboard/settings-dialog.tsx`（新增）、`app/page.tsx`
- Out of scope（本次不做）：tk 的線上設定/編輯（仍須透過 `.env.local` 或部署平台環境變數手動設定，避免密鑰經由表單傳輸/儲存於瀏覽器）、其他系統設定項目（例如比對欄位以外的偏好設定）。
