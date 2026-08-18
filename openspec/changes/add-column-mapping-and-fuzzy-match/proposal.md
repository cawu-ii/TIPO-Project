# Change: Manual Column Mapping + Fuzzy Field Comparison

## Why
業主同事實際測試「資料比對」功能後，回報三個問題（2026-08-14）：

1. Excel 欄位順序不固定，甚至外國案件的標題可能是 `FN`（Filing Number）、`Applicant` 這類完全對不上 `GREEN_FIELD_DEFS` 中文標籤的縮寫或英文詞——現行「比對欄位標題文字」的自動判斷方式在這種情況下會直接判定「找不到欄位」，即使該欄位資料其實存在。原本規劃的「自動優先、猜不到才跳手動」也不成立：問題不是猜測演算法不夠聰明，而是欄位標題文字本身就沒有穩定對應關係可猜，包含 `applno` 目前用的固定別名清單（申請號／申請案號／applno／案號）也有同樣風險。
2. 比對時常出現「其實是同一筆資料，只是格式不同」卻被判定為異常的情況：英文大小寫、全形／半形、標點符號、多人名單排列順序、日期格式、專利號的國別碼與橫槓。
3. 「啓」與「啟」在智慧局資料與客戶／內部資料中常混用，實質上是同一個字，但程式現行的字串比對會判定為不同。

另外業主同事問到查詢紀錄的資料庫是否會多人互相干擾——已於對話中確認：目前架構沒有共用後端資料庫，查詢為無狀態單次請求，歷史紀錄僅存於使用者自己瀏覽器的 localStorage，不會有多人互相干擾的疑慮，此點不需要程式異動，僅作為背景記錄。

## What Changes

### 1. 欄位對應改為使用者手動指定（欄位字母 + 自動預先猜測）
- `lib/parse-upload.ts` 拆成兩層：
  - `detectExcelColumns(file)`：讀取 Excel 第一列，回傳每一欄的欄位字母（A/B/C…）與該欄實際文字內容，並沿用現行標題比對邏輯算出「預先猜測」的欄位對應（僅供預選，不強制採用）。
  - `parseWorkbookRows(rows, columnMapping)` / `parseUploadedExcelFile(file, columnMapping)`：改為依「呼叫端提供的欄位對應表」（`Record<GreenFieldKey | "applno", string /* 欄位字母 */>`）取值，不再自行判斷標題文字是否相符。
- 新增 `components/dashboard/column-mapping-panel.tsx`：上傳檔案後立即顯示，針對「申請案號」與 13 個綠底欄位，各自提供一個下拉選單，選項為「A 欄（該欄實際內容，例如 FN）」「B 欄（Applicant）」……，預設值採用自動猜測結果，使用者可自由覆寫。
- 「申請案號」對應為必填：未指定前「開始比對」按鈕停用（沿用現有 `MissingApplnoColumnError` 的錯誤語意，改為在按鈕層級預先擋下，而非等到解析階段才報錯）。
- 綠底欄位若使用者選擇「不比對」（留空/選擇該選項），視為該欄位無內部資料，行為等同目前找不到欄位時的空白值。
- 對應表僅存在於當次上傳的 React state，不做持久化；換一個檔案要重新確認。

### 2. 六種「忽略差異」正規化選項（依欄位類型自動套用，預設全關）
- `lib/field-compare.ts`：`FieldDef` 新增 `valueType: "text" | "date" | "patentNo" | "personList"` 分類：
  - `applDate` / `publicationDate` / `gazetteDate` → `date`
  - `certNo` → `patentNo`
  - `agentName` / `applicantNameZh` / `applicantNameEn` / `inventorNameZh` / `inventorNameEn` → `personList`
  - 其餘（`publicationNo`、`gazetteNo`、`patentNameZh`、`applicantAddress`）→ `text`
  - 假設：「忽略國別碼與橫槓」只套用在 `certNo`；`publicationNo`／`gazetteNo` 維持原樣比對。若業主回報這兩欄也常有國別碼/橫槓差異，可直接把 `valueType` 改成 `patentNo` 即可套用，不需改動比對邏輯本身。
- 新增 `NormalizationOptions` 型別（6 個 boolean，預設全 `false`）：`ignoreCase`、`ignoreWidth`、`ignorePunctuation`、`ignorePersonOrder`、`ignoreDateFormat`、`ignorePatentNoFormat`。
- `fieldsMatch(a, b, valueType, options)` 改為依 `valueType` 決定要套用哪些正規化步驟（例如 `ignoreDateFormat` 只在 `valueType === "date"` 時生效），其餘規則視需要對 `text`／`personList`／`patentNo` 生效。
- `buildCaseComparison(row, selectedKeys, normalizationOptions)` 新增第三參數，往下傳給 `fieldsMatch`。
- 新增 `components/dashboard/comparison-options.tsx`：「資料比對」頁籤新增「比對選項」區塊，6 個核取方塊，附業主提供的範例說明文字，狀態存於 `app/page.tsx`（單純 React state，不持久化，頁面重新整理後重置為全關）。

### 3. 異體字對照表（無條件套用，非勾選項）
- 新增 `lib/char-variants.ts`：`CHAR_VARIANTS` 對照表（收錄：啓/啟、臺/台、着/著、裡/裏、峰/峯），`canonicalizeVariants(s: string): string`。
- 於 `fieldsMatch` 的正規化流程中，對 `text`／`personList`／`patentNo` 三種類型「無條件」套用（不受任何核取方塊控制），因為這是「同一個字」的正確性問題，不是差異容忍度的取捨。
- 表格設計為可擴充：之後有新案例回報，直接在 `CHAR_VARIANTS` 增加一組 key-value 即可，不需改動呼叫端。

## Impact
- Affected specs: `field-comparison`（擴充）
- Affected code:
  - `lib/parse-upload.ts`（拆分為偵測欄位 + 依對應表解析兩層，含測試）
  - `lib/field-compare.ts`（`valueType` 分類、`fieldsMatch`／`buildCaseComparison` 簽章擴充，含測試）
  - `lib/char-variants.ts`（新增，含測試）
  - `components/dashboard/column-mapping-panel.tsx`（新增）
  - `components/dashboard/comparison-options.tsx`（新增）
  - `app/page.tsx`（欄位對應 state、正規化選項 state、串接「開始比對」按鈕的必填檢查）
- Out of scope（本次不做）：
  - 欄位對應設定的儲存／記憶（同一版型重複上傳仍需每次手動確認，YAGNI，若之後常態性重複使用同一版型再評估）
  - 查詢紀錄多人共用資料庫（目前為單機 localStorage 架構，此需求不在本次範圍，僅為前次業主提問的背景說明）
  - 異體字對照表以外的簡繁轉換（僅處理台灣專利／姓名常見異體字，不做完整簡繁轉換）
