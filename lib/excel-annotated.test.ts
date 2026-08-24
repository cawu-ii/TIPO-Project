import { describe, expect, it } from "vitest";
import {
  buildAnnotatedTable,
  FIELD_NO_TIPO_DATA,
  TIPO_STATUS_FOUND,
  TIPO_STATUS_HEADER,
  TIPO_STATUS_NOT_FOUND,
} from "./excel-annotated";
import type { ColumnMapping } from "./parse-upload";
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

// headerRow: FN(0) | Applicant(1) | Title(2)
const headerRow = ["FN", "Applicant", "Title"];
const applnoIndex = 0;
const baseMapping: ColumnMapping = { applno: "A", applicantNameEn: "B", patentNameZh: "C" };

describe("buildAnnotatedTable", () => {
  it("2026-08-24 業主回饋 1.：比對結果欄位插在被比對的原始欄位緊接的下一欄，而不是全部附加在最後", () => {
    const rows = [makeRow({ internal: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, LLC." } })];
    const dataRows = [["102222085", "SAMTEC, LLC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set(["applicantNameEn"]));

    // A=FN, B=TIPO查詢狀態(緊接申請號), C=Applicant, D=申請人英文姓名比對結果(緊接B對應的Applicant), E=Title
    expect(table.headers).toEqual(["FN", TIPO_STATUS_HEADER, "Applicant", "申請人英文姓名比對結果", "Title"]);
    expect(table.rows[0]).toEqual([
      { value: "102222085", isRed: false },
      { value: TIPO_STATUS_FOUND, isRed: false },
      { value: "SAMTEC, LLC.", isRed: false },
      { value: "正確", isRed: false },
      { value: "接觸器", isRed: false },
    ]);
  });

  it("2026-08-24 業主回饋 2.：申請案號欄位右邊新增查詢狀態欄，查到顯示已從TIPO獲取資訊", () => {
    const rows = [makeRow()];
    const dataRows = [["102222085", "SAMTEC, INC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set());

    expect(table.headers).toEqual(["FN", TIPO_STATUS_HEADER, "Applicant", "Title"]);
    expect(table.rows[0]?.[1]).toEqual({ value: TIPO_STATUS_FOUND, isRed: false });
  });

  it("2026-08-24 業主回饋 2.：查無此案號時，查詢狀態欄顯示查無資料或非台灣案", () => {
    const rows = [makeRow()];
    const dataRows = [["999999999", "某公司", "某專利"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set());

    expect(table.rows[0]?.[1]).toEqual({ value: TIPO_STATUS_NOT_FOUND, isRed: false });
  });

  it("欄位比對不符時，顯示紅字的智慧局正確值", () => {
    const rows = [makeRow()]; // internal="SAMTEC, INC." vs tipo="SAMTEC, LLC." -> 不符
    const dataRows = [["102222085", "SAMTEC, INC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set(["applicantNameEn"]));

    const resultCell = table.rows[0]?.[3]; // B(狀態) 後面接 C(Applicant)，再下一個才是比對結果
    expect(resultCell).toEqual({ value: "SAMTEC, LLC.", isRed: true });
  });

  it("2026-08-24 業主回饋 1.：TIPO 有查到案件、但該欄位本身沒有值時，顯示紅字「TIPO無資料」", () => {
    const rows = [
      makeRow({
        internal: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, INC." },
        tipo: { ...BLANK_GREEN, applicantNameEn: "" }, // TIPO 該欄位為空
      }),
    ];
    const dataRows = [["102222085", "SAMTEC, INC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set(["applicantNameEn"]));

    const resultCell = table.rows[0]?.[3];
    expect(resultCell).toEqual({ value: FIELD_NO_TIPO_DATA, isRed: true });
  });

  it("查無此案號時，比對結果欄位顯示「查無資料」（黑字，與查詢狀態欄的紅字語意分開）", () => {
    const rows = [makeRow()];
    const dataRows = [["999999999", "某公司", "某專利"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set(["applicantNameEn"]));

    const resultCell = table.rows[0]?.[3];
    expect(resultCell).toEqual({ value: "查無資料", isRed: false });
  });

  it("applno 欄位為空時視為查無資料，不拋錯", () => {
    const rows = [makeRow()];
    const dataRows = [["", "某公司", "某專利"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set());

    expect(table.rows[0]?.[1]).toEqual({ value: TIPO_STATUS_NOT_FOUND, isRed: false });
  });

  it("2026-08-21 業主回饋 3.：原始 Excel 的 applno 是未正規化的 8 碼，仍能對應到已正規化為 9 碼的查詢結果", () => {
    const rows = [makeRow({ applno: "091123456" })];
    const dataRows = [["91123456", "SAMTEC, INC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set());

    expect(table.rows[0]?.[1]).toEqual({ value: TIPO_STATUS_FOUND, isRed: false });
  });

  it("原始列欄位數比標題列少時，自動補齊空字串，不影響新欄位插入位置", () => {
    const rows = [makeRow({ internal: { ...BLANK_GREEN, applicantNameEn: "SAMTEC, LLC." } })];
    const dataRows = [["102222085", "SAMTEC, LLC."]]; // 缺第三欄 Title
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set(["applicantNameEn"]));

    expect(table.headers).toEqual(["FN", TIPO_STATUS_HEADER, "Applicant", "申請人英文姓名比對結果", "Title"]);
    expect(table.rows[0]).toEqual([
      { value: "102222085", isRed: false },
      { value: TIPO_STATUS_FOUND, isRed: false },
      { value: "SAMTEC, LLC.", isRed: false },
      { value: "正確", isRed: false },
      { value: "", isRed: false }, // 補齊的 Title 欄
    ]);
  });

  it("未選擇任何比對欄位時，只新增查詢狀態欄，不新增任何比對結果欄", () => {
    const rows = [makeRow()];
    const dataRows = [["102222085", "SAMTEC, LLC.", "接觸器"]];
    const table = buildAnnotatedTable(headerRow, dataRows, applnoIndex, baseMapping, rows, new Set());

    expect(table.headers).toEqual(["FN", TIPO_STATUS_HEADER, "Applicant", "Title"]);
  });

  it("多個比對欄位時，各自插在對應的原始欄位後面（B 欄結果插在 B 後、C 欄結果插在 C 後）", () => {
    const rows = [makeRow()]; // 預設 internal 與 tipo 的 applicantNameEn／patentNameZh 皆不同，兩欄都應標紅
    const dataRows = [["102222085", "SAMTEC, INC.", "錯誤的名稱"]];
    const table = buildAnnotatedTable(
      headerRow,
      dataRows,
      applnoIndex,
      baseMapping,
      rows,
      new Set(["applicantNameEn", "patentNameZh"])
    );

    expect(table.headers).toEqual([
      "FN",
      TIPO_STATUS_HEADER,
      "Applicant",
      "申請人英文姓名比對結果",
      "Title",
      "中文專利名稱比對結果",
    ]);
    expect(table.rows[0]).toEqual([
      { value: "102222085", isRed: false },
      { value: TIPO_STATUS_FOUND, isRed: false },
      { value: "SAMTEC, INC.", isRed: false },
      { value: "SAMTEC, LLC.", isRed: true },
      { value: "錯誤的名稱", isRed: false },
      { value: "具有防轉元件與減低焊料流動的接觸器", isRed: true },
    ]);
  });

  it("比對欄位沒有在欄位對應表中指定對應欄位字母時，不會插入結果欄（避免 decode_col 拿到 undefined）", () => {
    const rows = [makeRow()];
    const dataRows = [["102222085", "SAMTEC, LLC.", "接觸器"]];
    // mapping 沒有 inventorNameEn，但 selectedKeys 卻選了它 —— 應該安全略過，不拋錯
    const table = buildAnnotatedTable(
      headerRow,
      dataRows,
      applnoIndex,
      baseMapping,
      rows,
      new Set(["inventorNameEn"])
    );
    expect(table.headers).toEqual(["FN", TIPO_STATUS_HEADER, "Applicant", "Title"]);
  });
});
