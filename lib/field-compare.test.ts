import { describe, expect, it } from "vitest";
import {
  buildCaseComparison,
  DEFAULT_NORMALIZATION_OPTIONS,
  fieldsMatch,
  GREEN_FIELD_DEFS,
  YELLOW_FIELD_DEFS,
  type NormalizationOptions,
} from "./field-compare";
import type { ComparableRow } from "./field-compare";

function opts(overrides: Partial<NormalizationOptions>): NormalizationOptions {
  return { ...DEFAULT_NORMALIZATION_OPTIONS, ...overrides };
}

describe("fieldsMatch — 基本行為（沿用舊測試，預設 valueType=text、選項全關）", () => {
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

describe("fieldsMatch — 異體字（無條件套用，不受選項控制）", () => {
  it("啓／啟視為同一字，即使所有正規化選項都關閉", () => {
    expect(fieldsMatch("閻啓泰", "閻啟泰", "text")).toBe(true);
    expect(fieldsMatch("林景郁; 閻啓泰", "林景郁; 閻啟泰", "personListZh")).toBe(true);
  });
});

describe("fieldsMatch — 六種忽略差異選項（業主提供範例）", () => {
  it("忽略大小寫：The Boeing = THE BOEING", () => {
    expect(fieldsMatch("The Boeing", "THE BOEING", "text")).toBe(false);
    expect(fieldsMatch("The Boeing", "THE BOEING", "text", opts({ ignoreCase: true }))).toBe(true);
  });

  it("忽略全形半形：Ｉ７７５ = I775", () => {
    expect(fieldsMatch("Ｉ７７５", "I775", "text")).toBe(false);
    expect(fieldsMatch("Ｉ７７５", "I775", "text", opts({ ignoreWidth: true }))).toBe(true);
  });

  it("忽略標點符號：King, R. (US) = KingR(US)", () => {
    expect(fieldsMatch("King, R. (US)", "KingR(US)", "text")).toBe(false);
    expect(fieldsMatch("King, R. (US)", "KingR(US)", "text", opts({ ignorePunctuation: true }))).toBe(true);
  });

  it("忽略多人名單排列順序：林景郁; 閻啟泰 = 閻啟泰;林景郁", () => {
    expect(fieldsMatch("林景郁; 閻啟泰", "閻啟泰;林景郁", "personListZh")).toBe(false);
    expect(
      fieldsMatch("林景郁; 閻啟泰", "閻啟泰;林景郁", "personListZh", opts({ ignorePersonOrder: true }))
    ).toBe(true);
  });

  it("2026-08-28 業主回饋：中文姓名清單分隔符不一致（內部用逗號、智慧局用分號）時仍判定相符", () => {
    // 業主實際案例（案號 114103629）：內部系統代理人欄「閻啓泰, 林景郁」（逗號分隔），
    // 智慧局回傳「閻啓泰; 林景郁」（分號分隔）——兩人、順序都相同，只是分隔符不同，不應判定不符。
    expect(fieldsMatch("閻啓泰, 林景郁", "閻啓泰; 林景郁", "personListZh")).toBe(true);
    // 頓號、全形逗號也視為分隔符
    expect(fieldsMatch("閻啓泰、林景郁", "閻啓泰; 林景郁", "personListZh")).toBe(true);
    expect(fieldsMatch("閻啓泰，林景郁", "閻啓泰; 林景郁", "personListZh")).toBe(true);
  });

  it("英文姓名清單（LASTNAME, FIRSTNAME 格式）不可把逗號當人與人的分隔符，否則會拆散單一姓名", () => {
    // 姓名本身「WANG, XIAOLUN」含逗號；若逗號被當成分隔符會誤拆成兩個人，導致原本相符的清單被判定不符。
    const list = "WANG, XIAOLUN (US); MARX, MATTHEW ARNOLD (US)";
    expect(fieldsMatch(list, list, "personList")).toBe(true);
  });

  it("忽略日期格式：2022/09/01 = 2022/9/1 = 20220901", () => {
    expect(fieldsMatch("2022/09/01", "2022/9/1", "date")).toBe(false);
    expect(fieldsMatch("2022/09/01", "2022/9/1", "date", opts({ ignoreDateFormat: true }))).toBe(true);
    expect(fieldsMatch("2022/09/01", "20220901", "date", opts({ ignoreDateFormat: true }))).toBe(true);
  });

  it("忽略專利號國別碼與橫槓：TWI775123 = TW-I775123（只比對數字）", () => {
    expect(fieldsMatch("TWI775123", "TW-I775123", "patentNo")).toBe(false);
    expect(fieldsMatch("TWI775123", "TW-I775123", "patentNo", opts({ ignorePatentNoFormat: true }))).toBe(true);
    expect(fieldsMatch("TWI775123", "I775123", "patentNo", opts({ ignorePatentNoFormat: true }))).toBe(true);
  });

  it("未勾選任何選項時，格式差異一律視為不符（維持嚴謹比對）", () => {
    expect(fieldsMatch("2022/09/01", "2022/9/1", "date", DEFAULT_NORMALIZATION_OPTIONS)).toBe(false);
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

  it("傳入正規化選項時，會依欄位 valueType 套用（例：日期欄位忽略格式差異）", () => {
    const row = makeRow({
      internal: { applDate: "2022/09/01" },
      tipo: { applDate: "2022/9/1" },
    });
    const withoutOptions = buildCaseComparison(row, new Set(["applDate"]));
    expect(withoutOptions.mismatchCount).toBe(1);

    const withDateOption = buildCaseComparison(
      row,
      new Set(["applDate"]),
      { ...DEFAULT_NORMALIZATION_OPTIONS, ignoreDateFormat: true }
    );
    expect(withDateOption.mismatchCount).toBe(0);
  });
});
