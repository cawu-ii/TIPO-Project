# Project Context

## Purpose
TIPO 專利狀態批次查詢與分析工具。使用者上傳 Excel（多筆專利申請案號 `applno`），系統向經濟部智慧財產局（TIPO）OpenData API 批次查詢，依日期邏輯判定案件狀態，輸出整合 Excel 報表與前端 UI 預覽。

Primary users: 事務所 / 企業內部專利承辦人員、法務。核心價值：避免年費繳納期限或復權期限被錯過。

## Tech Stack
- Next.js 14+ (App Router), React 18, TypeScript (strict)
- TailwindCSS + shadcn-style UI primitives (self-contained, no external UI runtime dependency required for the mockup phase)
- SheetJS (`xlsx`) for Excel parsing/export
- lucide-react for icons
- framer-motion for the upload/progress micro-interactions
- vitest for unit tests

## API Integration（已於 `add-tipo-api-integration` 串接完成，非 mockup）
- 經濟部智慧財產局 OpenData API，服務：`PatentRights`（專利權狀態異動資料）
- Base URL: `https://cloud.tipo.gov.tw/S220/opdataapi/api/{API服務名稱}`
- 查詢以 `applno`（申請案號）為主鍵，`applclass` 必填：由 `applno` 第 4 碼決定 → 1=發明、2=新型、3=設計（API 文件表 8 註 4）
- 需要的回傳欄位（來源：`patent-right` 節點）：`patent-edate`（專利權止日）、`charge-expir-date`（年費有效日期）、`patent-name-chinese`、`applicants[].chinese-name`
- `tk` 驗證碼絕不可出現在 client-side 程式碼，一律經由 Next.js API Route 代理查詢（避免 CORS 與金鑰外洩）

## Business Logic — Status Decision Tree (source of truth, confirmed with client 2026-08-06)
輸入：`patent-edate`（專利權止日）、`charge-expir-date`（年費有效日期）、`today`（台灣系統日）

1. `today > patent-edate` → **案件已消滅**
2. 否則，`today <= charge-expir-date` → **案件存續**
3. 否則，`today <= charge-expir-date + 6 個月` → **案件逾期但尚在補繳期內**
4. 否則，`today <= charge-expir-date + 18 個月` → **案件逾補繳期但尚可復權**
5. 否則 → **案件已消滅**

此邏輯必須完全隔離於 `/lib/patent-logic.ts`，並附單元測試涵蓋每個分支與邊界（含銜接日當天）。UI 元件僅能呼叫此函式，不得重複實作判斷邏輯。

## Output Contract
匯出 Excel **不得改變使用者輸入 `applno` 的原始順序**。每列至少包含：`申請案號`、`專利名稱`、`專利權人`、`年費有效日期`、`專利權止日`、`系統判定狀態`、最後比對時間。查無資料的案號需標註「查無資料」而非略過。

## Conventions
- Business logic (date math, status evaluation) isolated in `/lib/patent-logic.ts`, unit-tested.
- UI components are presentation-only — no fetch/date-math inline in components.
- All TIPO API calls go through Next.js Route Handlers (`app/api/**`), never called from client components.
- TypeScript strict mode; explicit interfaces for TIPO API response shapes.

## Strict Restrictions (Never Do)
- NEVER hardcode the TIPO API token (`tk`) in client-side code.
- NEVER alter the user's input `applno` order in the output Excel sheet.
- DO NOT call the TIPO API directly from client UI — always proxy through API Routes.
