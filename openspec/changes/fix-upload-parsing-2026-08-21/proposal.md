# Change: Excel 日期解析修正 + 移除重複欄位選擇 UI + 申請案號正規化

## Why
業主 8/21 轉交同事實測後回報的 5 點回饋中，前 3 點已確認可直接處理（後 2 點——紅字標記匯出、PatentPub 查詢 fallback——涉及新依賴套件與案件狀態判定的資料落差，需另外與業主確認方向，不在本次範圍）：

1. 用業主提供的實測檔案（`TW_CE_TAI E_REC00002132_...xlsx`）重現：日期欄位讀出來變成「年份在最後且少掉 20」的怪格式（例如應為 `2001/1/19` 卻讀成 `1/19/01`），導致跟智慧局回傳的 `20yy/m/d` 格式比對失敗。根因是 `lib/parse-upload.ts` 用 `raw:false` 讀取 Excel 時，SheetJS 是照儲存格 numFmt 代碼字面（例如 `mm-dd-yy`）做 locale-blind 的文字轉換，不是照 Excel 實際顯示（隨作業系統地區設定）的樣子轉，兩者可能完全不同。
2. 「資料比對」頁籤的「選擇需比對欄位」與「上傳比對」頁籤的「欄位對應」功能重複——欄位對應裡設成「不比對」已經會自動同步到這裡（上一輪已修好），這個獨立勾選 UI 沒有存在必要。
3. 申請案號碼數問題：(a) 民國 99 年以前申請的案件，Excel 常見只存 8 碼，需自動補一個前導 0 湊成 9 碼；(b) 部分案件的申請號以西元年開頭變成 10 碼（例如 `2021012522`），需自動換算為民國年後組成正確的 9 碼申請案號（`110012522`），確保用來查詢 TIPO API 的案號是智慧局實際留存的格式。業主原提供的範例（`2011012522` → `110012522`）經確認為筆誤，已與業主核對，正確西元年應為 `2021`。

## What Changes

### 1. 修正日期欄位解析（`lib/parse-upload.ts`）
- `readRawRows()` 改用 `XLSX.read(buffer, { type: "array", cellDates: true })` + `sheet_to_json(sheet, { header: 1, defval: "", raw: true })`，讓 SheetJS 直接回傳真正的 JS `Date` 物件，不再依賴 numFmt 字面轉文字。
- 新增 `formatCellDate(date)`：以 `getUTC*` 取值（SheetJS 以 UTC 建構這類 Date，避免時區把日期誤移一天），格式化為智慧局慣用的 `20yy/m/d`（不補零）。
- `detectColumns()` / `parseRowsWithMapping()` 兩個純函式的介面與現有測試不受影響（日期物件在進入這兩層之前，已在 `readRawRows()` 這個檔案 I/O 邊界被轉成字串）。

### 2. 移除「選擇需比對欄位」重複 UI
- 刪除 `components/dashboard/field-selector.tsx`。
- `app/page.tsx`「資料比對」頁籤移除 `<FieldSelector>`，改為說明文字提示比對範圍以「欄位對應」頁籤設定為準。
- `selectedGreenKeys` 狀態與其由 `columnMapping` 自動同步的既有邏輯不變（上一輪 `useEffect` 已處理）。

### 3. 申請案號正規化（`lib/patent-logic.ts`）
- 新增純函式 `normalizeApplno(raw: string): string`：
  - 8 碼純數字 → 補一個前導 `0` 湊成 9 碼。
  - 10 碼純數字且前 4 碼可解讀為合理西元年（換算民國年介於 1~999）→ 換算為民國年（西元年 − 1911，補零至 3 碼）+ 後 6 碼，組成 9 碼。
  - 其餘長度或非純數字（例如含英文字母後綴的舊格式案號）原樣回傳，不強行轉換，避免把查詢用的案號轉壞。
- `lib/parse-upload.ts` 的 `parseRowsWithMapping()` 在抽出 `applno` 後立即呼叫 `normalizeApplno()`，`applnos` 陣列與 `internalByApplno` 的 key 皆使用正規化後的值，確保後續查詢 TIPO API、比對 API 回傳資料時用的是同一組正確案號。

## Impact
- Affected specs: `field-comparison`（移除重複 UI）、無新 spec（日期解析、申請案號正規化屬於既有解析／查詢流程的修正，非新增功能面）
- Affected code:
  - `lib/parse-upload.ts`（日期解析、申請案號正規化串接，含測試）
  - `lib/patent-logic.ts`（新增 `normalizeApplno()`，含測試）
  - `components/dashboard/field-selector.tsx`（刪除）
  - `app/page.tsx`（移除 `FieldSelector` 使用）
  - `README.md`（功能說明、已知限制段落更新）
- Out of scope（本次不做，待業主/業主同事確認方向後另開 change）：
  - 匯出報表在原始 Excel 版面插入紅字標記正確值的新欄位（需要保留完整原始欄位、且現行 `xlsx` 套件無法寫入儲存格顏色，可能需換用 `exceljs`）
  - `PatentRights` 查無資料時 fallback 查詢 `PatentPub`（發明公開案）：`PatentPub` 回傳資料不含「專利權止日」「年費有效日期」，現行 4 階段狀態判定邏輯無法直接套用，需先確認這類案件要顯示的狀態文字
