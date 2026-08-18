import { describe, expect, it } from "vitest";
import { detectColumns, MissingApplnoColumnError, parseRowsWithMapping } from "./parse-upload";

describe("detectColumns", () => {
  it("依欄位字母（A/B/C…）標出每一欄，並保留該欄第一列實際文字", () => {
    const rawRows = [["申請號", "中文專利名稱", "申請人英文姓名"]];
    const { columns } = detectColumns(rawRows);
    expect(columns).toEqual([
      { letter: "A", headerText: "申請號" },
      { letter: "B", headerText: "中文專利名稱" },
      { letter: "C", headerText: "申請人英文姓名" },
    ]);
  });

  it("標題文字與已知欄位標籤相符時，算出預先猜測的對應", () => {
    const rawRows = [["申請號", "中文專利名稱", "申請人英文姓名"]];
    const { guessedMapping } = detectColumns(rawRows);
    expect(guessedMapping.applno).toBe("A");
    expect(guessedMapping.patentNameZh).toBe("B");
    expect(guessedMapping.applicantNameEn).toBe("C");
  });

  it("標題是外國案件常見縮寫（例如 FN）時，猜不到就留空，不強行硬猜", () => {
    const rawRows = [["FN", "Applicant"]];
    const { guessedMapping } = detectColumns(rawRows);
    expect(guessedMapping.applno).toBeUndefined();
    expect(Object.keys(guessedMapping)).toHaveLength(0);
  });

  it("接受「applno」或「申請案號」作為 applno 別名標題", () => {
    expect(detectColumns([["applno"]]).guessedMapping.applno).toBe("A");
    expect(detectColumns([["申請案號"]]).guessedMapping.applno).toBe("A");
  });

  it("空工作表回傳空欄位清單，不拋錯", () => {
    const result = detectColumns([]);
    expect(result.columns).toEqual([]);
    expect(result.guessedMapping).toEqual({});
  });
});

describe("parseRowsWithMapping", () => {
  const rawRows = [
    ["FN", "Title", "Applicant"],
    ["100114238", "高效率的儲存及運送裝置及系統", "MAGALDI INDUSTRIE S. R. L."],
    ["101137580", "具可摺疊式桌面與可摺疊式桌腳之桌鋸", "ROBERT BOSCH GMBH"],
  ];

  it("依使用者指定的欄位對應（欄位字母）解析，不依賴標題文字", () => {
    const result = parseRowsWithMapping(rawRows, { applno: "A", patentNameZh: "B", applicantNameEn: "C" });
    expect(result.applnos).toEqual(["100114238", "101137580"]);
    expect(result.internalByApplno.get("100114238")?.patentNameZh).toBe("高效率的儲存及運送裝置及系統");
    expect(result.internalByApplno.get("101137580")?.applicantNameEn).toBe("ROBERT BOSCH GMBH");
  });

  it("未指定申請案號欄位對應時丟出明確錯誤", () => {
    expect(() => parseRowsWithMapping(rawRows, { patentNameZh: "B" })).toThrow(MissingApplnoColumnError);
  });

  it("略過 applno 為空的列，不影響其他列", () => {
    const rows = [["FN"], ["100114238"], [""], ["  "], ["101137580"]];
    expect(parseRowsWithMapping(rows, { applno: "A" }).applnos).toEqual(["100114238", "101137580"]);
  });

  it("使用者未對應到的綠底欄位保持空字串，不會是 undefined", () => {
    const result = parseRowsWithMapping(rawRows, { applno: "A" });
    expect(result.internalByApplno.get("100114238")?.applicantAddress).toBe("");
    expect(result.internalByApplno.get("100114238")?.patentNameZh).toBe("");
  });

  it("使用者可以把不同系統欄位對應到任意欄位字母，不受標題文字限制", () => {
    // 刻意把 applno 對應到寫著 "Title" 的 B 欄，驗證完全依欄位字母而非標題文字取值
    const result = parseRowsWithMapping(rawRows, { applno: "B" });
    expect(result.applnos).toEqual(["高效率的儲存及運送裝置及系統", "具可摺疊式桌面與可摺疊式桌腳之桌鋸"]);
  });

  it("空工作表（只有標題列或完全空白）回傳空結果而不拋錯", () => {
    const result = parseRowsWithMapping([["FN"]], { applno: "A" });
    expect(result.applnos).toEqual([]);
    expect(result.internalByApplno.size).toBe(0);
  });
});
