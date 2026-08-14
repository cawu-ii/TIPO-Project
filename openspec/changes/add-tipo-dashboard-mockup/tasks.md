# Tasks: Add TIPO Dashboard Mockup UI

## 1. Business logic
- [x] 1.1 Implement `parseApplClass(applno)` per API doc 表8 註4
- [x] 1.2 Implement `evaluatePatentStatus({ today, patentEdate, chargeExpirDate })` per 5-step decision tree
- [x] 1.3 Unit tests: 每個分支 + 邊界值（等於止日/等於年費有效日/等於+6mo/等於+18mo 當天）

## 2. Design system
- [x] 2.1 Define color/type/layout/signature tokens (design.md)
- [x] 2.2 Apply tokens to tailwind.config.ts (custom colors, fonts)

## 3. UI primitives (`components/ui/`)
- [x] 3.1 Card, Badge, Button, Input
- [x] 3.2 Table
- [x] 3.3 Progress
- [x] 3.4 Tabs
- [x] 3.5 Dialog

## 4. Dashboard page (`app/page.tsx`)
- [x] 4.1 Header + 4 stat cards（總解析筆數／案件存續／補繳復權中／案件已消滅）
- [x] 4.2 Upload dropzone（拖曳 + 選擇檔案）＋ 下載範本／開始批次比對按鈕
- [x] 4.3 模擬批次比對 Progress bar（處理中 N/100 筆）
- [x] 4.4 結果預覽 Table + 狀態 Badge 色彩對應
- [x] 4.5 搜尋 + 狀態篩選器
- [x] 4.6 匯出分析報表按鈕（mock）
- [x] 4.7 Tabs：上傳比對 / 歷史查詢紀錄
- [x] 4.8 Dialog：單筆案件完整回傳欄位 + date-ruler signature 視覺

## 5. Verification
- [x] 5.1 `tsc --noEmit` 無型別錯誤
- [x] 5.2 `vitest run` 全數通過
- [x] 5.3 `next build` 成功
