import { describe, expect, it } from "vitest";
import { canonicalizeVariants, CHAR_VARIANTS } from "./char-variants";

describe("canonicalizeVariants", () => {
  it("啓／啟視為同一字", () => {
    expect(canonicalizeVariants("閻啓泰")).toBe(canonicalizeVariants("閻啟泰"));
    expect(canonicalizeVariants("閻啓泰")).toBe("閻啟泰");
  });

  it("表中未收錄的字元原樣保留", () => {
    expect(canonicalizeVariants("林景郁")).toBe("林景郁");
  });

  it("空字串／空值安全處理", () => {
    expect(canonicalizeVariants("")).toBe("");
  });

  it("混合異體字與一般字元的字串", () => {
    expect(canonicalizeVariants("臺灣啓示錄")).toBe("台灣啟示錄");
  });

  it("CHAR_VARIANTS 表中每一組 key 與 value 都不同（避免無意義項目）", () => {
    for (const [k, v] of Object.entries(CHAR_VARIANTS)) {
      expect(k).not.toBe(v);
    }
  });
});
