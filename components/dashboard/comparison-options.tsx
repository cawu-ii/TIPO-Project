"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_NORMALIZATION_OPTIONS,
  RECOMMENDED_NORMALIZATION_OPTIONS,
  type NormalizationOptions,
} from "@/lib/field-compare";

const RULES: Array<{ key: keyof NormalizationOptions; label: string }> = [
  { key: "ignoreCase", label: "忽略英文字母大小寫" },
  { key: "ignoreWidth", label: "忽略全形／半形差異" },
  { key: "ignorePunctuation", label: "忽略標點符號" },
  { key: "ignorePersonOrder", label: "忽略多人名單排列順序" },
  { key: "ignoreDateFormat", label: "忽略日期格式差異" },
  { key: "ignorePatentNoFormat", label: "忽略專利號國別碼與橫槓" },
];

/**
 * 比對選項面板 — 6 種「忽略差異」核取方塊，依欄位類型自動套用到有意義的欄位
 * （見 lib/field-compare.ts 的 valueType 分類），使用者只需勾選啟用，不需理解套用細節。
 * 預設全部開啟（RECOMMENDED_NORMALIZATION_OPTIONS），業主回饋純格式差異造成的誤判太多；
 * 異體字（啓/啟）正規化無條件套用，不受此清單控制。
 */
export function ComparisonOptions({
  options,
  onChange,
}: {
  options: NormalizationOptions;
  onChange: (options: NormalizationOptions) => void;
}) {
  function toggle(key: keyof NormalizationOptions) {
    onChange({ ...options, [key]: !options[key] });
  }

  const allEnabled = RULES.every((rule) => options[rule.key]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-ink">比對選項（忽略差異）</p>
            <p className="text-xs text-ink-muted">
              勾選後，系統會依欄位性質自動判斷要套用在哪些欄位（例如「日期格式」只作用於日期類欄位）。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(allEnabled ? DEFAULT_NORMALIZATION_OPTIONS : RECOMMENDED_NORMALIZATION_OPTIONS)}
            className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            {allEnabled ? "全部取消" : "全部套用"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {RULES.map((rule) => (
            <label
              key={rule.key}
              className="flex cursor-pointer items-center gap-2 rounded-card px-1.5 py-1 hover:bg-ink/[0.03]"
            >
              <Checkbox checked={options[rule.key]} onChange={() => toggle(rule.key)} />
              <span className="text-sm text-ink">{rule.label}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
