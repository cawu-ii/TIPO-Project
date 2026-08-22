# TIPO 專利狀態智動化分析系統

批次查詢專利狀態並自動判定案件現況的工具。使用者上傳含申請案號的 Excel 檔，系統自動向經濟部智慧財產局（TIPO）OpenData API 查詢最新資料，依日期邏輯判定每筆案件狀態，並提供欄位比對、Excel 報表匯出與歷史查詢紀錄。

## 主要功能

- **狀態批次查詢**：上傳 Excel，系統依申請案號第 4 碼自動判斷專利類別（發明／新型／設計），批次向 TIPO PatentRights API 查詢。Excel 中的日期欄位一律以儲存格實際日期值（而非顯示格式文字）解析，避免因地區設定不同造成日期讀取錯誤。
- **申請案號正規化**：查詢前自動修正兩種常見的案號碼數問題——8 碼案號自動補一個前導 0 湊成 9 碼；10 碼且前 4 碼為西元年份的案號，自動換算為民國年後組成正確的 9 碼申請案號（例如 `2021012522` → `110012522`），確保用來查詢 TIPO API 的案號是正確格式。
- **案件狀態判定**：依「專利權止日」「年費有效日期」比對今日日期，判定為存續／逾期補繳期內／逾補繳期但可復權／已消滅四種狀態。
- **欄位對應**：上傳後系統會先嘗試依標題文字自動猜測每個系統欄位對應到 Excel 的哪一欄，使用者可自行確認或調整（以欄位字母指定，例如 A 欄／B 欄），不受 Excel 版型或標題文字（含外國案件的英文縮寫，如 `FN`）影響。在此指定「不比對」的欄位，會自動同步套用到「欄位比對」頁籤，不需重複設定。
- **欄位比對**：逐案比對 Excel 內部資料與 TIPO 最新回傳資料是否一致，比對範圍以「欄位對應」頁籤的設定為準；並提供 6 種「忽略差異」選項（大小寫、全形半形、標點符號、多人姓名排列順序、日期格式、專利號國別碼與橫槓），依欄位性質自動套用，減少純格式差異造成的誤判。常見異體字（如「啓」／「啟」）一律視為同一字，不受選項控制。
- **Excel 匯出**：提供四種報表——狀態分析報表、欄位比對差異報告、TIPO 完整資料重寫檔，以及在原始上傳 Excel 版面旁邊新增欄位、以紅字標記智慧局正確值的標註比對報表。
- **PatentPub 查詢 fallback**：PatentRights（已核准案件）查無資料時，自動改查 PatentPub（發明公開案），找出已公開但尚未核准的申請案；這類案件因缺乏專利權止日／年費資料，會獨立標記為「尚未核准（僅公開）」狀態，不套用四階判定邏輯。
- **歷史查詢紀錄**：每次查詢的摘要（時間、檔名、筆數、狀態分布）會記錄於瀏覽器本機，供日後查閱。
- **設定面板**：顯示 TIPO API 連線狀態（是否已設定驗證碼），並可重設欄位比對預設勾選。

## 技術架構

| 項目 | 說明 |
|---|---|
| 框架 | Next.js 14（App Router）+ React 18 + TypeScript（strict mode） |
| 樣式 | TailwindCSS + 自製 shadcn 風格元件 |
| Excel 處理 | SheetJS (`xlsx`)；標註比對報表另用 `exceljs`（需要寫入儲存格顏色，SheetJS 免費版不支援） |
| 圖示 | lucide-react |
| 測試 | Vitest（`lib/*.ts` 業務邏輯皆有對應單元測試） |
| API 串接 | Next.js API Routes 代理 TIPO OpenData `PatentRights` API，避免瀏覽器直接呼叫（CORS + 驗證碼安全性） |

業務邏輯（日期判定、欄位比對、資料映射）皆獨立於 `/lib` 目錄，與 UI 完全解耦，方便單元測試，詳見 `CLAUDE.md`。

## 環境需求

- Node.js 18.17 以上（建議使用 Node 20 LTS）
- npm

## 安裝與本機開發

```bash
# 1. 安裝套件
npm install

# 2. 設定環境變數
cp .env.local.example .env.local
# 編輯 .env.local，填入向 TIPO 申請到的驗證碼（tk）：
# TIPO_API_TOKEN=你的36碼驗證碼

# 3. 啟動開發伺服器
npm run dev
```

啟動後開啟 `http://localhost:3000`。

**尚未申請到 tk 也能先行測試**：`TIPO_API_TOKEN` 留空時，系統會依 TIPO 官方行為自動切換為「範例模式」，畫面上會有明顯提示；申請到正式驗證碼後填入 `.env.local` 並重啟服務即可查詢正式資料。

## 測試與驗證

```bash
npm run test        # 執行 lib/ 底下所有單元測試（Vitest）
npm run typecheck   # TypeScript 型別檢查（tsc --noEmit）
npm run lint         # ESLint
npm run build        # 正式環境建置（會一併做型別檢查）
```

修改 `/lib` 內的業務邏輯後，建議至少跑過 `test` 與 `typecheck` 再提交。

## 部署

### 方式一：Vercel（建議，Next.js 官方託管平台）

1. 將專案推上 GitHub／GitLab 等版控平台。
2. 於 [vercel.com](https://vercel.com) 匯入該 repo。
3. 在 Vercel 專案的 **Settings → Environment Variables** 新增：
   - `TIPO_API_TOKEN` = 你的正式驗證碼
4. 部署後 Vercel 會自動執行 `npm run build`。

### 方式二：自架 Node 伺服器

```bash
npm install
npm run build
TIPO_API_TOKEN=你的驗證碼 npm run start
```

預設監聽 3000 埠，可搭配 nginx 等反向代理對外服務，或用 `PORT` 環境變數改埠。

### 部署注意事項

- `TIPO_API_TOKEN` **務必只設定在伺服器端環境變數**，絕不可寫進前端程式碼或 `.env` 以外會被打包進 client bundle 的地方（例如不可加 `NEXT_PUBLIC_` 前綴）。目前所有 TIPO API 呼叫都經由 `app/api/tipo/patent-rights/route.ts` 這個伺服器端 Route Handler 代理，前端不會接觸到 tk。
- 「歷史查詢紀錄」目前存放於瀏覽器 `localStorage`，屬於單一裝置／單一瀏覽器層級的紀錄，不會跨裝置同步，也不會因為換伺服器或重新部署而遺失或跑到別人電腦上（因為根本沒有送到伺服器）。若未來需要多人共用的查詢紀錄，需改為後端資料庫儲存。

## 專案結構

```
app/
  page.tsx                    # 主頁面（上傳比對／資料比對／歷史查詢紀錄 三個頁籤）
  api/tipo/patent-rights/     # TIPO API 代理路由
  api/settings/status/        # 設定面板用的連線狀態查詢
components/
  dashboard/                  # 各頁籤區塊元件
  ui/                         # 共用 UI 元件（shadcn 風格）
lib/
  patent-logic.ts             # 狀態判定核心邏輯（含單元測試）
  field-compare.ts            # 欄位比對邏輯，含正規化選項與 valueType 分類（含單元測試）
  char-variants.ts            # 異體字對照表（含單元測試）
  tipo-api.ts                 # TIPO API 請求組裝與回應映射（含單元測試）
  parse-upload.ts             # Excel 欄位偵測與依對應表解析（含單元測試）
  build-rows.ts               # 內部資料 + TIPO 資料整併（含單元測試）
  history-store.ts            # 歷史查詢紀錄持久化（含單元測試）
  excel.ts                    # 三種 Excel 匯出報表（分析報表／比對差異／智慧局完整資料）
  excel-annotated.ts          # 標註比對報表（exceljs，紅字標記正確值，含單元測試）
openspec/                     # 各階段功能的規格文件（proposal/design/tasks）
CLAUDE.md                     # 專案規格與開發限制（AI 協作用）
```

## 已知限制

- TIPO PatentRights API 單次查詢上限為 5000 筆，超過需自行分批上傳。
- 歷史查詢紀錄僅存於本機瀏覽器，清除瀏覽器資料或換裝置會遺失紀錄。
- 尚未設定 `TIPO_API_TOKEN` 時，查詢會回傳 TIPO 官方固定範例資料（與實際上傳的申請案號無關），僅供介面測試，不代表真實查詢結果。
- 欄位對應每次上傳都需重新確認，不會記住上次的設定（不同 Excel 版型可能完全不同）。
- 異體字對照表只收錄目前已知的常見案例（啓/啟、臺/台、着/著、裡/裏、峰/峯），非完整簡繁轉換，遇到新案例需手動擴充 `lib/char-variants.ts`。
- 「忽略專利號國別碼與橫槓」只套用在證書號欄位，公開號／公告號目前維持原樣比對。
- 申請案號正規化目前只處理「8 碼補 0」與「10 碼西元年轉民國年」兩種情形；其餘碼數或格式（例如含英文字母後綴的舊格式案號）不會被更動，維持原樣查詢。
- PatentPub 補查僅涵蓋發明專利的「已公開但尚未核准」案件；新型／設計專利本來就沒有公開階段，PatentRights 查無資料時 PatentPub 通常也查不到，仍會列入查無資料。
- 「尚未核准（僅公開）」狀態的案件沒有專利權止日／年費有效日期，畫面與匯出報表的對應欄位一律顯示「—」，日期尺也不會顯示。
- 標註比對報表只依「上傳比對」頁籤當下的欄位對應與「資料比對」頁籤當下勾選的比對欄位（含忽略差異選項）產生，變更設定後需重新匯出。
