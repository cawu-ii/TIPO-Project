# Tasks: Integrate Real TIPO OpenData API

- [x] `lib/tipo-api.ts`：分組、URL 組裝、回應映射、代碼對照表 + 單元測試
- [x] `app/api/tipo/patent-rights/route.ts`：伺服器端代理，讀取 `TIPO_API_TOKEN`
- [x] `lib/parse-upload.ts`：前端解析上傳 Excel（標題比對法）+ 單元測試
- [x] `app/page.tsx` / `upload-zone.tsx`：串接真實上傳→查詢流程，範例模式／錯誤橫幅
- [x] `.env.local.example`、`.gitignore` 更新
- [x] 驗證：`npm run test` / `npm run typecheck` / `npm run build`
- [x] 複製回工作資料夾、提供檔案、總結變更

狀態：已完成並經業主提供正式 tk 驗證（2026-08-14）。後續新增欄位／匯出功能見
`add-excel-export-and-extra-fields`；範例模式 bug 修正（sample 資料誤植入畫面）已於本次交付中一併修正，細節見 git 歷史。
