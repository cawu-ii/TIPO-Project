# Change: 中文多人姓名清單分隔符修正

## Why
業主 8/28 回饋（案號 114103629「KRas G12D抑制劑」比對明細截圖）：

1. 代理人姓名比對出現「異常」，業主猜測是標點符號問題：內部系統資料為「閻啓泰, 林景郁」
   （逗號分隔），智慧局回傳為「閻啓泰; 林景郁」（分號分隔）——兩人、順序都相同，只是
   分隔符不同，卻被判定不符。
2. 申請人英文姓名／發明人英文姓名也出現「異常」，業主不確定原因，附上測試用 Excel
   （`TEST (2).xlsx`，同一案號用 5 種不同格式記錄共同申請人），並表示這部分**暫不優先
   處理**，代理人的部分處理完即可先告一段落。

## Root Cause
`lib/field-compare.ts` 的 `normalizePersonList()` 一律只用分號（`;`／`；`）辨識「多人姓名清單」
中人與人的邊界，不論中英文姓名欄位皆然。這對英文姓名（TIPO 固定用「LASTNAME, FIRSTNAME
(國別)」格式，姓名本身含逗號）是必要限制——若把逗號也當分隔符會把同一人的姓名拆成兩截。
但中文姓名（代理人／申請人／發明人中文姓名）本身不含逗號，內部系統的 Excel 卻常見用逗號或
頓號分隔多人，導致明明是同樣的兩個人，只因分隔符不同就被判定不符。

## What Changes
- `FieldValueType` 新增 `"personListZh"`，與既有 `"personList"`（改為英文姓名專用語意）
  並存：`personList` 僅以分號辨識邊界（維持原行為，避免拆散英文姓名）；`personListZh`
  額外把逗號（全形／半形）、頓號也當作邊界。
- `GREEN_FIELD_DEFS` 調整：`agentName`／`applicantNameZh`／`inventorNameZh` 的 `valueType`
  改為 `personListZh`；`applicantNameEn`／`inventorNameEn` 維持 `personList` 不變。
- 新增回歸測試：中文姓名清單分隔符不一致（逗號 vs 分號、頓號 vs 分號、全形逗號 vs 分號）
  皆判定相符；英文姓名清單（姓名本身含逗號）不會被逗號誤拆。

## 附帶調查（不涉及本次程式異動，業主已確認暫不處理）
用業主附上的 `TEST (2).xlsx`（案號 114103629 的 5 種共同申請人記錄格式）確認：申請人英文
姓名的「多人」問題與代理人不同，不是單純分隔符不一致，而是**沒有一致的分隔符可循**——
內部 Excel 出現過「只記一個申請人」「用斜線 / 分隔」「用 and 分隔」「用逗號分隔（但逗號同時
也是公司名稱本身的一部分，例如『MIRATI THERAPEUTICS, INC.』）」等多種寫法。其中逗號分隔
的寫法特別無法安全處理：若比照中文姓名把逗號當邊界，會把「MIRATI THERAPEUTICS, INC.」這
一個公司名稱誤拆成兩截。要正確處理，需要內部 Excel 也統一改用分號分隔多位共同申請人／
發明人，屬於資料填寫規範問題，不是單純的程式邏輯調整；已記錄於 README 已知限制，待業主
與同事確認需求後再評估是否處理。

## Impact
- Affected specs: 無新 spec（既有欄位比對邏輯的分隔符規則修正）
- Affected code:
  - `lib/field-compare.ts`（新增 `personListZh` valueType、`ZH_PERSON_LIST_SEPARATOR`）
  - `lib/field-compare.test.ts`（既有中文姓名測試改用 `personListZh`，新增回歸測試）
  - `README.md`（欄位比對功能說明、已知限制段落）
- Out of scope（本次不做，待業主確認需求後再評估）：
  - 申請人／發明人英文姓名清單的多種分隔慣例（逗號、斜線、and）自動判斷
