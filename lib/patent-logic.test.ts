import { describe, expect, it } from "vitest";
import {
  addMonthsUtc,
  evaluatePatentStatus,
  parseApplClass,
  formatDate,
} from "./patent-logic";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("parseApplClass", () => {
  it("第4碼為 1 -> 發明", () => {
    expect(parseApplClass("111100123456")).toBe(1);
  });
  it("第4碼為 2 -> 新型", () => {
    expect(parseApplClass("110200456789")).toBe(2);
  });
  it("第4碼為 3 -> 設計", () => {
    expect(parseApplClass("108300789012")).toBe(3);
  });
  it("第4碼不合法時回傳 null", () => {
    expect(parseApplClass("1119")).toBe(null); // 4th char '9'
    expect(parseApplClass("11")).toBe(null); // too short
  });
});

describe("addMonthsUtc", () => {
  it("正常月份遞增", () => {
    expect(formatDate(addMonthsUtc(d("2026-01-10"), 6))).toBe("2026/07/10");
  });
  it("跨年", () => {
    expect(formatDate(addMonthsUtc(d("2026-01-10"), 18))).toBe("2027/07/10");
  });
});

describe("evaluatePatentStatus — 5-step decision tree", () => {
  it("Step1: today 已逾專利權止日 -> 案件已消滅", () => {
    const status = evaluatePatentStatus({
      today: d("2026-08-06"),
      patentEdate: d("2025-01-01"),
      chargeExpirDate: d("2020-01-01"),
    });
    expect(status).toBe("案件已消滅");
  });

  it("Step2: today 未逾年費有效日期 -> 案件存續", () => {
    const status = evaluatePatentStatus({
      today: d("2026-08-06"),
      patentEdate: d("2032-01-15"),
      chargeExpirDate: d("2027-05-20"),
    });
    expect(status).toBe("案件存續");
  });

  it("Step2 邊界: today 恰等於年費有效日期 -> 案件存續（inclusive）", () => {
    const status = evaluatePatentStatus({
      today: d("2026-08-06"),
      patentEdate: d("2030-01-01"),
      chargeExpirDate: d("2026-08-06"),
    });
    expect(status).toBe("案件存續");
  });

  it("Step3: 逾年費有效日期但在 +6 個月內 -> 逾期但尚在補繳期內", () => {
    const status = evaluatePatentStatus({
      today: d("2026-08-06"),
      patentEdate: d("2028-08-30"),
      chargeExpirDate: d("2026-02-10"),
    });
    expect(status).toBe("案件逾期但尚在補繳期內");
  });

  it("Step3 邊界: today 恰等於 +6 個月截止日 -> 仍在補繳期內（inclusive）", () => {
    const status = evaluatePatentStatus({
      today: d("2026-08-10"),
      patentEdate: d("2028-08-30"),
      chargeExpirDate: d("2026-02-10"), // +6mo = 2026-08-10
    });
    expect(status).toBe("案件逾期但尚在補繳期內");
  });

  it("Step4: 逾 6 個月但在 18 個月內 -> 逾補繳期但尚可復權", () => {
    const status = evaluatePatentStatus({
      today: d("2026-08-06"),
      patentEdate: d("2031-01-01"),
      chargeExpirDate: d("2025-06-01"), // +6mo=2025-12-01, +18mo=2027-06-01
    });
    expect(status).toBe("案件逾補繳期但尚可復權");
  });

  it("Step4 邊界: today 恰等於 +18 個月截止日 -> 仍可復權（inclusive）", () => {
    const status = evaluatePatentStatus({
      today: d("2026-12-01"), // chargeExpirDate 2025-06-01 + 18 個月 = 2026-12-01
      patentEdate: d("2031-01-01"),
      chargeExpirDate: d("2025-06-01"),
    });
    expect(status).toBe("案件逾補繳期但尚可復權");
  });

  it("Step5: 逾 18 個月 -> 案件已消滅", () => {
    const status = evaluatePatentStatus({
      today: d("2026-08-06"),
      patentEdate: d("2029-03-01"),
      chargeExpirDate: d("2020-01-10"), // +18mo = 2021-07-10, 遠早於 today
    });
    expect(status).toBe("案件已消滅");
  });

  it("Step1 優先於其他步驟：即使年費未繳但止日未到才走年費判斷", () => {
    // patentEdate 早於 today -> 直接消滅，不看年費
    const status = evaluatePatentStatus({
      today: d("2026-08-06"),
      patentEdate: d("2026-08-05"),
      chargeExpirDate: d("2030-01-01"), // 年費其實還很久，但止日已過
    });
    expect(status).toBe("案件已消滅");
  });
});
