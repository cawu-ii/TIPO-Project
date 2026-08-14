# CLAUDE.md - TIPO Patent Status Analyzer

## Project Overview
建立一個專利狀態批次查詢與分析工具。使用者可上傳 Excel 檔（包含多筆專利申請案號 `applno`），系統自動向經濟部智慧財產局 (TIPO) OpenData API 抓取資料，依據日期邏輯判定案件狀態，並輸出整合後的 Excel 報表與前端 UI 預覽。

## Tech Stack
- Frontend: Next.js (App Router), React, TailwindCSS, Shadcn UI
- Data Handling: SheetJS (xlsx), Lucide Icons
- API Handling: Axios / Fetch (Proxy API Routes to prevent CORS)

## Core Business Logic Rules
1. **API Parameter Matching**:
   - Parse `applno` (12-digit / string). Extract the **4th digit** for `applclass`:
     - 4th digit = '1' -> `applclass=1` (發明)
     - 4th digit = '2' -> `applclass=2` (新型)
     - 4th digit = '3' -> `applclass=3` (設計)
2. **Patent Status Decision Tree** (Current Date = Taiwan System Date):
   - Step 1: Current Date > `專利權止日` (`patent-edate`) ? -> **「案件已消滅」**
   - Step 2: Current Date <= `年費有效日期` (`charge-expir-date`) ? -> **「案件存續」**
   - Step 3: Current Date <= `年費有效日期 + 6 Months` ? -> **「案件逾期但尚在補繳期內」**
   - Step 4: Current Date <= `年費有效日期 + 18 Months` ? -> **「案件逾補繳期但尚可復權」**
   - Step 5: Else -> **「案件已消滅」**

## Code Conventions
- Use Typescript strict mode. Explicit interface for TIPO API response.
- Business logic (date calculations, status evaluation) MUST be isolated in `/lib/patent-logic.ts` with unit tests.
- UI components must remain clean and presentation-focused.

## Strict Restrictions (Never Do)
- NEVER hardcode TIPO API token (`tk`) in client-side code.
- NEVER alter user's input `applno` order in the output Excel sheet.
- DO NOT handle API calls directly from client UI (use Next.js API Routes to bypass CORS).