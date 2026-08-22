import { describe, expect, it } from "vitest";
import { buildAnnotatedTable } from "./excel-annotated";
import type { GreenFields, PatentRow, YellowFields } from "./mock-data";

const BLANK_GREEN: GreenFields = {
  applDate: "",
  publicationNo: "",
  publicationDate: "",
  gazetteNo: "",
  gazetteDate: "",
  certNo: "",
  patentNameZh: "",
  agentName: "",
  applicantNameZh: "",
  applicantNameEn: "",
  applicantAddress: "",
  inventorNameZh: "",
  inventorNameEn: "",
};

const BLANK_YELLOW: YellowFields = {
  licenseNote: "無",
  pledgeNote: "無",
  transferNote: "無",
  inheritNote: "無",
  trustNote: "無",
  opposeNote: "無",
  invalidateNote: "無",
  extinguishDate: "",
  extinguishReason: "",
  revokeDate: "",
  revokeReason: "",
  patentStartDate: "",
  patentEndDate: "",
  chargeExpirDateLabel: "",
  chargeExpirYear: "",
};

function makeRow(overrides: Partial<PatentRow> = {}): PatentRow {
  return {
    applno: "102222085",
    patentName: "具有防轉元件與減低焊料流動的接觸器",
    applicant: "SAMTEC, LLC.",
    chargeExpirDate: new Date("2027-01-01T00:00:00Z"),
    patentEdate: new Date("2030-01-01T00:00:00Z"),
    internal: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, INC." },
    tipo: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, LLC.", patentNameZh: "具有防轉元件與減低焊料流動的接觸器" },
    tipoYellow: BLANK_YELLOW,
    applClass: 2,
    status: "案件存續",
    ...overrides,
  };
}

describe("buildAnnotatedTable", () => {
  const headerRow = ["FN", "Applicant", "Title"];
  const applnoIndex = 0; // "FN" 欄

  it("欄位比對相符時新欄位顯示「正確」", () => {
    // 比對邏輯依據 matchedRow.internal / matchedRow.tipo（來自欄位對應解析結果），
    // 不是這裡傳入的原始 Excel 顯示列——這裡讓 internal 與 tipo 的 applicantNameEn 相同來製造「相符」。
    const rows = [makeRow({ internal: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, LLC." } })];
    const dataRows = [["102222085", "SAMTEC, LLC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, new Set(["applicantNameEn"]));

    expect(table.originalHeaders).toEqual(["FN", "Applicant", "Title"]);
    expect(table.newHeaders).toEqual(["申請人英文姓名比對結果"]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.original).toEqual(["102222085", "SAMTEC, LLC.", "接觸器"]);
    expect(table.rows[0]?.annotated).toEqual([{ value: "正確", isRed: false }]);
  });

  it("欄位比對不符時，新欄位顯示智慧局的正確值並標紅", () => {
    const rows = [makeRow()];
    // internal.applicantNameEn = "SAMTEC, INC."，tipo.applicantNameEn = "SAMTEC, LLC." -> 不符
    const dataRows = [["102222085", "SAMTEC, INC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, new Set(["applicantNameEn"]));

    expect(table.rows[0]?.annotated).toEqual([{ value: "SAMTEC, LLC.", isRed: true }]);
  });

  it("原始 Excel 中查無對應 applno 時，新欄位一律顯示「查無資料」", () => {
    const rows = [makeRow()];
    const dataRows = [["999999999", "某公司", "某專利"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, new Set(["applicantNameEn"]));

    expect(table.rows[0]?.annotated).toEqual([{ value: "查無資料", isRed: false }]);
  });

  it("applno 欄位為空時視為查無資料，不拋錯", () => {
    const rows = [makeRow()];
    const dataRows = [["", "某公司", "某專利"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, new Set(["applicantNameEn"]));

    expect(table.rows[0]?.annotated).toEqual([{ value: "查無資料", isRed: false }]);
  });

  it("2026-08-21 業主回饋 3.：原始 Excel 的 applno 是未正規化的 8 碼，仍能對應到已正規化為 9 碼的查詢結果", () => {
    const rows = [
      makeRow({ applno: "091123456", internal: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, LLC." } }),
    ];
    const dataRows = [["91123456", "SAMTEC, LLC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, new Set(["applicantNameEn"]));

    expect(table.rows[0]?.annotated).toEqual([{ value: "正確", isRed: false }]);
  });

  it("原始列欄位數比標題列少時，自動補齊空字串，不影響新增欄位位置", () => {
    const rows = [makeRow({ internal: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, LLC." } })];
    const dataRows = [["102222085", "SAMTEC, LLC."]]; // 缺第三欄 Title
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, new Set(["applicantNameEn"]));

    expect(table.rows[0]?.original).toEqual(["102222085", "SAMTEC, LLC.", ""]);
    expect(table.rows[0]?.annotated).toEqual([{ value: "正確", isRed: false }]);
  });

  it("未選擇任何比對欄位時，不新增任何欄位", () => {
    const rows = [makeRow()];
    const dataRows = [["102222085", "SAMTEC, LLC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, rows, new Set());

    expect(table.newHeaders).toEqual([]);
    expect(table.rows[0]?.annotated).toEqual([]);
  });

  it("多個比對欄位時，各自獨立判定正確／標紅（新欄位順序依 GREEN_FIELD_DEFS 定義順序，patentNameZh 在 applicantNameEn 之前）", () => {
    const rows = [makeRow()]; // 預設 internal 與 tipo 的 applicantNameEn／patentNameZh 皆不同，兩欄都應標紅
    const dataRows = [["102222085", "SAMTEC, INC.", "錯誤的名稱"]];
    const table = buildAnnotatedTable(
      headerRow,
      dataRows,
      applnoIndex,
      rows,
      new Set(["applicantNameEn", "patentNameZh"])
    );

    expect(table.newHeaders).toEqual(["中文專利名稱比對結果", "申請人英文姓名比對結果"]);
    expect(table.rows[0]?.annotated).toEqual([
      { value: "具有防轉元件與減低焊料流動的接觸器", isRed: true },
      { value: "SAMTEC, LLC.", isRed: true },
    ]);
  });
});
