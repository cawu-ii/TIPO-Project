# dashboard-ui Spec Delta

## ADDED Requirements

### Requirement: applclass 解析
系統 SHALL 從 `applno`（申請案號）第 4 碼推導 `applclass`：`1`→發明、`2`→新型、`3`→設計，供後續查詢與顯示使用，使用者不需手動選擇專利類別。

#### Scenario: 12 碼申請案號含第 4 碼為 2
- **WHEN** 使用者上傳的 `applno` 為 `110200456...`（第 4 碼為 `2`）
- **THEN** 系統標註該案 `applclass = 2`（新型）

### Requirement: 狀態判定邏輯
系統 SHALL 依 `today`、`patent-edate`、`charge-expir-date` 依序套用 5 步驟判定，輸出五種狀態之一：案件已消滅、案件存續、案件逾期但尚在補繳期內、案件逾補繳期但尚可復權、案件已消滅（逾 18 個月）。

#### Scenario: 已逾專利權止日
- **WHEN** `today > patent-edate`
- **THEN** 狀態為「案件已消滅」

#### Scenario: 年費仍在有效期內
- **WHEN** `today <= patent-edate` 且 `today <= charge-expir-date`
- **THEN** 狀態為「案件存續」

#### Scenario: 逾年費有效日但在 6 個月補繳期內
- **WHEN** `today > charge-expir-date` 且 `today <= charge-expir-date + 6 個月`
- **THEN** 狀態為「案件逾期但尚在補繳期內」

#### Scenario: 逾 6 個月但在 18 個月復權期內
- **WHEN** `today > charge-expir-date + 6 個月` 且 `today <= charge-expir-date + 18 個月`
- **THEN** 狀態為「案件逾補繳期但尚可復權」

#### Scenario: 逾 18 個月
- **WHEN** `today > charge-expir-date + 18 個月`
- **THEN** 狀態為「案件已消滅」

### Requirement: 結果表格保序
匯出/預覽表格 SHALL 保持使用者原始上傳 `applno` 的順序，不得因排序、篩選或非同步抓取而改變基準順序。

#### Scenario: 篩選後仍可還原原始順序
- **WHEN** 使用者套用狀態篩選器後又清除篩選
- **THEN** 表格列順序回到與原始上傳檔案一致的順序

### Requirement: 統計卡片即時反映表格資料
Header 統計卡片（總解析筆數／案件存續／補繳復權中／已消滅）SHALL 由當前表格資料即時聚合計算，不得為靜態寫死數字。

#### Scenario: 模擬比對完成後卡片更新
- **WHEN** 模擬批次比對進度達 100%
- **THEN** 四張統計卡片數字更新為聚合後的表格資料統計結果
