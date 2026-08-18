/**
 * 常見異體字對照表 — 純函式，與 UI／比對邏輯完全解耦。
 *
 * 業主回報：「啓」與「啟」在智慧局資料與客戶／內部資料中常混用，實質上是同一個字，
 * 但目前的字串比對會判定為不同。這屬於「正確性」問題，不是差異容忍度的取捨，
 * 所以在 lib/field-compare.ts 中一律無條件套用，不受任何「忽略差異」核取方塊控制。
 *
 * 表格刻意保持精簡、可擴充：只收錄台灣專利／姓名紀錄常見的異體字組合，
 * 不做完整簡繁轉換（範圍過大，容易誤判非異體字的簡繁詞彙）。
 * 之後遇到新案例，直接在 CHAR_VARIANTS 增加一組 key-value 即可。
 *
 * 每組以「智慧局慣用字」為 canonical（key 的 value），非智慧局慣用的異體字作為 key，
 * 兩個方向都會被正規化為同一個 canonical 字，比對時互不影響順序。
 */

/** key: 異體字 → value: 正規化後的 canonical 字（以智慧局資料慣用寫法為準）。 */
export const CHAR_VARIANTS: Record<string, string> = {
  啓: "啟",
  臺: "台",
  着: "著",
  裡: "裏",
  峰: "峯",
};

/** 將字串中每個字元依 CHAR_VARIANTS 轉換為 canonical 字；不在表中的字元原樣保留。 */
export function canonicalizeVariants(s: string): string {
  if (!s) return s;
  let result = "";
  for (const ch of s) {
    result += CHAR_VARIANTS[ch] ?? ch;
  }
  return result;
}
