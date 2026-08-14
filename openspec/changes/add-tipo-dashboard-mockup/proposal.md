# Change: Add TIPO Dashboard Mockup UI (v1)

## Why
案主需要一個可展示給老闆看的單頁 Dashboard mockup，證明「上傳 Excel → 自動判別發明/新型/設計 → 批次比對 TIPO 開放資料 → 依日期邏輯判定案件狀態 → 匯出報表」的完整體驗，且要在 3 秒內讓法務人員看出哪些案件面臨過期風險。此階段先交付前端 UI 與可信的業務邏輯（date decision tree），暫不串接真實 TIPO API（見 `openspec/project.md` Phase 2）。

## What Changes
- 新增 `app/page.tsx`：單頁 Dashboard，含 Header/統計卡片、上傳區、結果預覽表、匯出與篩選區。
- 新增 `lib/patent-logic.ts`：`applno` → `applclass` 解析、5 步驟狀態判定純函式，與 `lib/patent-logic.test.ts` 單元測試。
- 新增自製 shadcn 風格 UI primitives（Card / Badge / Table / Progress / Tabs / Dialog / Button / Input）於 `components/ui/`，套用專案設計系統（見 `design.md`）。
- 上傳與批次比對流程以 `useState` + 模擬進度（無真實網路請求）驅動，示範資料以 `lib/patent-logic.ts` 的真實邏輯計算狀態徽章，避免 demo 與正式邏輯脫節。
- 這是新增功能（greenfield），無既有 spec 需要修改。

## Impact
- Affected specs: `dashboard-ui`（新增）
- Affected code: `app/`, `lib/`, `components/ui/`（全新建立）
- Out of scope（本次不做）：Next.js API Routes 代理 TIPO API、真實 Excel 上傳解析寫入、歷史查詢紀錄的持久化儲存。這些列為 Phase 2 change。
