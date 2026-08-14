import { describe, expect, it } from "vitest";
import { buildCaseComparison, fieldsMatch, GREEN_FIELD_DEFS, YELLOW_FIELD_DEFS } from "./field-compare";
import type { ComparableRow } from "./field-compare";

describe("fieldsMatch", () => {
  it("完全相同的字串視為相符", () => {
    expect(fieldsMatch("SAMTEC, INC.", "SAMTEC, INC.")).toBe(true);
  });
  it("忽略多餘空白與斷行差異", () => {
    expect(fieldsMatch("台北市;  信義區", "台北市; 信義區\n")).toBe(true);
  });
  it("內容不同視為不符", () => {
    expect(fieldsMatch("SAMTEC, INC.", "SAMTEC, LLC.")).toBe(false);
  });
  it("null/undefined 視為空字串比對", () => {
    expect(fieldsMatch(null, "")).toBe(true);
    expect(fieldsMatch(undefined, "有值")).toBe(false);
  });
});

function makeRow(overrides: Partial<ComparableRow> = {}): ComparableRow {
  return {
    applno: "102222085",
    internal: {
      applicantNameEn: "SAMTEC, INC.",
      applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
      patentNameZh: "具有防轉元件與減低焊料流動的接觸器",
    },
    tipo: {
      applicantNameEn: "SAMTEC, LLC.",
      applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
      patentNameZh: "具有防轉元件與減低焊料流動的接觸器",
    },
    tipoYellow: {
      transferNote: "無",
      patentEndDate: "2034/09/01",
    },
    ...overrides,
  };
}

describe("buildCaseComparison", () => {
  it("僅計入使用者勾選的綠底欄位；未勾選欄位 match 為 null", () => {
    const row = makeRow();
    const result = buildCaseComparison(row, new Set(["applicantNameEn"]));
    const applicantField = result.fields.find((f) => f.key === "applicantNameEn");
    const addressField = result.fields.find((f) => f.key === "applicantAddress");

    expect(applicantField?.compared).toBe(true);
    expect(applicantField?.match).toBe(false);
    expect(addressField?.compared).toBe(false);
    expect(addressField?.match).toBe(null);
    expect(result.comparedCount).toBe(1);
    expect(result.mismatchCount).toBe(1);
    expect(result.mismatchedLabels).toEqual(["申請人英文姓名"]);
  });

  it("勾選多欄且全部相符時 mismatchCount 為 0", () => {
    const row = makeRow({
      tipo: {
        applicantNameEn: "SAMTEC, INC.",
        applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
        patentNameZh: "具有防轉元件與減低焊料流動的接觸器",
      },
    });
    const result = buildCaseComparison(row, new Set(["applicantNameEn", "applicantAddress", "patentNameZh"]));
    expect(result.comparedCount).toBe(3);
    expect(result.mismatchCount).toBe(0);
    expect(result.mismatchedLabels).toEqual([]);
  });

  it("黃底欄位一律 compared=false、match=null，僅供顯示", () => {
    const row = makeRow();
    const result = buildCaseComparison(row, new Set());
    const yellowField = result.fields.find((f) => f.key === "transferNote");
    expect(yellowField?.category).toBe("yellow");
    expect(yellowField?.compared).toBe(false);
    expect(yellowField?.match).toBe(null);
    expect(yellowField?.tipoValue).toBe("無");
  });

  it("欄位總數涵蓋所有已定義的綠底與黃底欄位", () => {
    const row = makeRow();
    const result = buildCaseComparison(row, new Set());
    expect(result.fields.length).toBe(GREEN_FIELD_DEFS.length + YELLOW_FIELD_DEFS.length);
  });
});
