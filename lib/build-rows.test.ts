import { describe, expect, it } from "vitest";
import { buildRowsFromApi } from "./build-rows";
import type { GreenFields } from "./mock-data";
import type { TipoMappedRow } from "./tipo-api";

const today = new Date("2026-08-11T00:00:00Z");

function makeTipoRow(overrides: Partial<TipoMappedRow> = {}): TipoMappedRow {
  return {
    applno: "102222085",
    patentEdate: new Date("2030-01-01T00:00:00Z"),
    chargeExpirDate: new Date("2027-01-01T00:00:00Z"),
    green: {
      applDate: "2013/11/26",
      publicationNo: "",
      publicationDate: "",
      gazetteNo: "M485523",
      gazetteDate: "2014/09/01",
      certNo: "M485523",
      patentNameZh: "具有防轉元件與減低焊料流動的接觸器",
      agentName: "閻啟泰",
      applicantNameZh: "",
      applicantNameEn: "SAMTEC, LLC.",
      applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
      inventorNameZh: "",
      inventorNameEn: "MONGOLD, JOHN (US)",
    },
    yellow: {
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
      patentStartDate: "2014/09/01",
      patentEndDate: "2030/01/01",
      chargeExpirDateLabel: "2027/01/01",
      chargeExpirYear: "第 13 年",
    },
    ...overrides,
  };
}

describe("buildRowsFromApi", () => {
  it("有對應智慧局資料時組出完整 PatentRow，並依真實日期計算狀態", () => {
    const tipoByApplno = new Map([["102222085", makeTipoRow()]]);
    const { rows, notFound } = buildRowsFromApi({
      applnos: ["102222085"],
      internalByApplno: new Map(),
      tipoByApplno,
      today,
    });
    expect(notFound).toEqual([]);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row?.applno).toBe("102222085");
    expect(row?.applClass).toBe(2);
    expect(row?.status).toBe("案件存續");
    expect(row?.tipo.applicantNameEn).toBe("SAMTEC, LLC.");
  });

  it("查無資料的案號進入 notFound，且不影響其他案號的順序", () => {
    const tipoByApplno = new Map([["102222085", makeTipoRow()]]);
    const { rows, notFound } = buildRowsFromApi({
      applnos: ["999999999", "102222085"],
      internalByApplno: new Map(),
      tipoByApplno,
      today,
    });
    expect(notFound).toEqual(["999999999"]);
    expect(rows.map((r) => r.applno)).toEqual(["102222085"]);
  });

  it("內部資料存在時併入 internal 欄位供欄位比對使用", () => {
    const internal: GreenFields = {
      applDate: "2013/11/26",
      publicationNo: "",
      publicationDate: "",
      gazetteNo: "M485523",
      gazetteDate: "2014/09/01",
      certNo: "M485523",
      patentNameZh: "具有防轉元件與減低焊料流動的接觸器",
      agentName: "閻啟泰",
      applicantNameZh: "",
      applicantNameEn: "SAMTEC, INC.",
      applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
      inventorNameZh: "",
      inventorNameEn: "MONGOLD, JOHN (US)",
    };
    const tipoByApplno = new Map([["102222085", makeTipoRow()]]);
    const { rows } = buildRowsFromApi({
      applnos: ["102222085"],
      internalByApplno: new Map([["102222085", internal]]),
      tipoByApplno,
      today,
    });
    expect(rows[0]?.internal.applicantNameEn).toBe("SAMTEC, INC.");
    expect(rows[0]?.tipo.applicantNameEn).toBe("SAMTEC, LLC.");
  });

  it("缺少關鍵日期時視為查無資料", () => {
    const tipoByApplno = new Map([["102222085", makeTipoRow({ patentEdate: null })]]);
    const { rows, notFound } = buildRowsFromApi({
      applnos: ["102222085"],
      internalByApplno: new Map(),
      tipoByApplno,
      today,
    });
    expect(rows).toEqual([]);
    expect(notFound).toEqual(["102222085"]);
  });
});
