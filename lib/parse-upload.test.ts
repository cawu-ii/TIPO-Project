import { describe, expect, it } from "vitest";
import { MissingApplnoColumnError, parseWorkbookRows } from "./parse-upload";

describe("parseWorkbookRows", () => {
  it("以「申請號」為 applno 欄位標題時可正確解析", () => {
    const rows = [
      { 申請號: "100114238", 中文專利名稱: "高效率的儲存及運送裝置及系統", 申請人英文姓名: "MAGALDI INDUSTRIE S. R. L." },
      { 申請號: "101137580", 中文專利名稱: "具可摺疊式桌面與可摺疊式桌腳之桌鋸", 申請人英文姓名: "ROBERT BOSCH GMBH" },
    ];
    const result = parseWorkbookRows(rows);
    expect(result.applnos).toEqual(["100114238", "101137580"]);
    expect(result.internalByApplno.get("100114238")?.patentNameZh).toBe("高效率的儲存及運送裝置及系統");
    expect(result.internalByApplno.get("101137580")?.applicantNameEn).toBe("ROBERT BOSCH GMBH");
    expect(result.matchedGreenLabels).toContain("中文專利名稱");
    expect(result.matchedGreenLabels).toContain("申請人英文姓名");
  });

  it("接受「applno」或「申請案號」作為別名標題", () => {
    expect(parseWorkbookRows([{ applno: "111100123" }]).applnos).toEqual(["111100123"]);
    expect(parseWorkbookRows([{ 申請案號: "111100123" }]).applnos).toEqual(["111100123"]);
  });

  it("找不到 applno 欄位時丟出明確錯誤", () => {
    expect(() => parseWorkbookRows([{ 專利名稱: "測試" }])).toThrow(MissingApplnoColumnError);
  });

  it("略過 applno 為空的列，不影響其他列", () => {
    const rows = [{ 申請號: "100114238" }, { 申請號: "" }, { 申請號: "  " }, { 申請號: "101137580" }];
    expect(parseWorkbookRows(rows).applnos).toEqual(["100114238", "101137580"]);
  });

  it("未知欄位（不在綠底欄位清單中的標題）會被忽略，不報錯", () => {
    const rows = [{ 申請號: "100114238", 備註: "內部用" }];
    const result = parseWorkbookRows(rows);
    expect(result.applnos).toEqual(["100114238"]);
    expect(result.matchedGreenLabels).toEqual([]);
  });

  it("Excel 缺少的綠底欄位保持空字串，不會是 undefined", () => {
    const result = parseWorkbookRows([{ 申請號: "100114238" }]);
    expect(result.internalByApplno.get("100114238")?.applicantAddress).toBe("");
  });

  it("空白工作表回傳空結果而不拋錯", () => {
    const result = parseWorkbookRows([]);
    expect(result.applnos).toEqual([]);
    expect(result.internalByApplno.size).toBe(0);
  });
});
