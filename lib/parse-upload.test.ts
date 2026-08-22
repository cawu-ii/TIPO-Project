import { describe, expect, it } from "vitest";
import { detectColumns, formatCellDate, MissingApplnoColumnError, parseRowsWithMapping } from "./parse-upload";

describe("formatCellDate", () => {
  it("格式化為智慧局慣用的 20yy/m/d（不補零），以 UTC 取值避免時區把日期誤移一天", () => {
    // 2026-08-21 業主回饋 1. 的實際案例：Excel 日期格式儲存格 -> 修法後應正確還原為 2001/1/19，
    // 而不是舊版 raw:false 產生的 "1/19/01"。
    expect(formatCellDate(new Date(Date.UTC(2001, 0, 19)))).toBe("2001/1/19");
  });

  it("即使建構時分秒非 0，仍只取日期部分（UTC）", () => {
    expect(formatCellDate(new Date(Date.UTC(2026, 7, 21, 23, 59, 59)))).toBe("2026/8/21");
  });
});

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

  it("標題是無法辨識的縮寫（例如 FN、XYZ）時，猜不到就留空，不強行硬猜", () => {
    const rawRows = [["FN", "XYZ Code"]];
    const { guessedMapping } = detectColumns(rawRows);
    expect(guessedMapping.applno).toBeUndefined();
    expect(Object.keys(guessedMapping)).toHaveLength(0);
  });

  it("接受「applno」或「申請案號」作為 applno 別名標題", () => {
    expect(detectColumns([["applno"]]).guessedMapping.applno).toBe("A");
    expect(detectColumns([["申請案號"]]).guessedMapping.applno).toBe("A");
  });

  it("2026-08-22 業主回饋：常見完整英文專利欄位標題（非縮寫）也能自動猜出對應，不限中文標題", () => {
    const rawRows = [
      [
        "Case Ref.",
        "Filing Date",
        "Filing Number",
        "Publication Date",
        "Publication Number",
        "Grant Date",
        "Grant Number",
        "Registered Owner Name",
        "Registered Owner Address",
      ],
    ];
    const { guessedMapping } = detectColumns(rawRows);
    expect(guessedMapping.applno).toBe("C"); // Filing Number
    expect(guessedMapping.applDate).toBe("B"); // Filing Date
    expect(guessedMapping.publicationDate).toBe("D");
    expect(guessedMapping.publicationNo).toBe("E");
    expect(guessedMapping.gazetteDate).toBe("F"); // Grant Date
    expect(guessedMapping.certNo).toBe("G"); // Grant Number
    expect(guessedMapping.applicantNameEn).toBe("H"); // Registered Owner Name
    expect(guessedMapping.applicantAddress).toBe("I"); // Registered Owner Address
    // "Case Ref." 沒有對應別名，不會被誤猜成任何欄位
    expect(Object.values(guessedMapping)).not.toContain("A");
  });

  it("英文別名比對不分大小寫、不受欄位內多餘空白影響", () => {
    const rawRows = [["  filing number  ", "FILING DATE", "inventor name"]];
    const { guessedMapping } = detectColumns(rawRows);
    expect(guessedMapping.applno).toBe("A");
    expect(guessedMapping.applDate).toBe("B");
    expect(guessedMapping.inventorNameEn).toBe("C");
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

  it("2026-08-21 業主回饋 3.：解析時會正規化申請案號碼數（8碼補0、10碼西元年轉民國年）", () => {
    const rows = [["FN"], ["91123456"], ["2021012522"]];
    const result = parseRowsWithMapping(rows, { applno: "A" });
    expect(result.applnos).toEqual(["091123456", "110012522"]);
    // internalByApplno 的 key 也要用正規化後的案號，才能跟 API 回傳的案號對上
    expect(result.internalByApplno.has("091123456")).toBe(true);
    expect(result.internalByApplno.has("110012522")).toBe(true);
  });
});
