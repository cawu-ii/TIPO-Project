# Change: 欄位對應自動猜測支援常見英文標題

## Why
使用者上傳純英文標題的 Excel（例如國外事務所常見的 `Filing Number`、`Filing Date`、
`Publication Date`、`Grant Date`、`Registered Owner Name` 等完整英文詞彙）時，「欄位對應」的
自動猜測目前只認得中文標籤與極少數別名（`applno`），猜不到任何欄位，體感不夠智慧。

這與 2026-08-14 已確認的設計原則（`FN` 這類縮寫猜不到、需使用者手動指定欄位字母）並不衝突：
`FN` 之所以猜不到，是因為縮寫本身沒有穩定語意可猜；但 `Filing Number`、`Grant Date` 這類完整、
業界慣用的英文詞彙是有穩定語意的，值得收錄進自動猜測的別名清單，讓猜測「盡力而為」，同時仍保留
使用者可隨時覆寫、欄位字母才是唯一權威依據的核心設計不變。

## What Changes
- `lib/parse-upload.ts`：
  - 新增 `FIELD_HEADER_ALIASES`：13 個綠底欄位中，10 個收錄常見英文別名（`applDate`／
    `publicationNo`／`publicationDate`／`gazetteDate`／`certNo`／`patentNameZh`／`agentName`／
    `applicantNameEn`／`applicantAddress`／`inventorNameEn`）。中文專屬欄位（`applicantNameZh`、
    `inventorNameZh`）不收錄英文別名，避免英文標題被誤猜成中文姓名欄位。
  - `APPLNO_HEADER_ALIASES` 擴充英文別名（`Filing Number`／`Application Number`／`Application No`
    ／`App No`／`Serial Number`）。
  - `normalizeHeader()` 改為同時轉小寫，讓英文別名比對不分大小寫。
  - `detectColumns()` 的比對邏輯從「只比對 def.label 單一字串」改為「比對別名清單中任一項」。
- 別名選字原則：只收錄語意明確、業界慣用的完整詞彙（例如 `Grant Date`），刻意避免過於單一、
  容易誤判的詞（例如單獨的 `Date`、`Number`、`Name`），維持猜測的精準度。

## Impact
- Affected specs: 無新 spec（既有「欄位對應自動猜測」功能的別名擴充）
- Affected code:
  - `lib/parse-upload.ts`（別名清單、`normalizeHeader()`、`detectColumns()`，含測試）
- Out of scope（本次不做）：
  - 別名清單非窮舉所有國外事務所命名慣例，遇到猜不到的標題屬預期行為（README 已知限制已註明）
  - 不新增「使用者自訂別名」功能（YAGNI，若之後常態性遇到特定客戶固定版型，再評估是否要讓使用者
    儲存自己的別名對照表）
