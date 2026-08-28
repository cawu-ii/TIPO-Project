# Tasks: 中文多人姓名清單分隔符修正

- [x] 用業主截圖案例（案號 114103629，代理人「閻啓泰, 林景郁」vs「閻啓泰; 林景郁」）
      定位根因：`normalizePersonList()` 只認分號，不認逗號／頓號
- [x] `lib/field-compare.ts`：新增 `personListZh` valueType，`ZH_PERSON_LIST_SEPARATOR`
      （分號／逗號／頓號），`EN_PERSON_LIST_SEPARATOR`（僅分號，維持原行為）
- [x] `GREEN_FIELD_DEFS`：`agentName`／`applicantNameZh`／`inventorNameZh` 改為 `personListZh`
- [x] `lib/field-compare.test.ts`：既有測試改用 `personListZh`；新增逗號／頓號／全形逗號的
      回歸測試；新增英文姓名清單不被逗號誤拆的回歸測試
- [x] 驗證：`npm run test`（112 tests pass）／`npx tsc --noEmit`（無錯誤）
- [x] 用業主附上的 `TEST (2).xlsx` 調查申請人英文姓名多人問題根因（僅調查，不修復）
- [x] 更新 `README.md`：欄位比對功能說明、新增英文姓名多人分隔慣例的已知限制
- [ ] 複製回工作資料夾、提供檔案、總結變更、提醒業主本機 push
