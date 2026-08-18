"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { GREEN_FIELD_DEFS } from "@/lib/field-compare";
import type { ColumnMapping, ColumnMappingKey, DetectedColumn } from "@/lib/parse-upload";

const APPLNO_ROW = { key: "applno" as ColumnMappingKey, label: "申請案號" };

/**
 * 欄位對應面板 — 上傳檔案後立即顯示，讓使用者明確指定每個系統欄位對應到 Excel 的哪一欄。
 *
 * 2026-08-14 業主補充：外國案件標題可能是 "FN"、"Applicant" 這類完全對不上中文標籤的
 * 縮寫，光靠標題文字自動判斷不可靠。所以這裡改用「欄位字母 + 該欄實際內容」讓使用者
 * 自行指定，系統只提供「預先猜測」的預選值（由呼叫端在偵測完成時算好、寫進 mapping），
 * 不強迫使用者接受。
 */
export function ColumnMappingPanel({
  columns,
  mapping,
  onChange,
}: {
  columns: DetectedColumn[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}) {
  function setField(key: ColumnMappingKey, letter: string) {
    const next = { ...mapping };
    if (letter) next[key] = letter;
    else delete next[key];
    onChange(next);
  }

  function columnLabel(col: DetectedColumn) {
    return `${col.letter} 欄（${col.headerText || "空白"}）`;
  }

  const applnoMissing = !mapping.applno;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-medium text-ink">欄位對應</p>
          <p className="text-xs text-ink-muted">
            請確認每個系統欄位對應到 Excel 的哪一欄；已依標題文字預先猜測，猜錯或猜不到請自行調整。
            {applnoMissing && <span className="ml-1 text-seal">尚未指定「申請案號」對應欄位，無法開始比對。</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-sm text-ink">
              {APPLNO_ROW.label}
              <span className="ml-0.5 text-seal">*</span>
            </span>
            <Select
              value={mapping.applno ?? ""}
              onChange={(e) => setField(APPLNO_ROW.key, e.target.value)}
              aria-label={`${APPLNO_ROW.label}對應欄位`}
            >
              <option value="">請選擇</option>
              {columns.map((col) => (
                <option key={col.letter} value={col.letter}>
                  {columnLabel(col)}
                </option>
              ))}
            </Select>
          </div>

          {GREEN_FIELD_DEFS.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-sm text-ink" title={field.label}>
                {field.label}
              </span>
              <Select
                value={mapping[field.key as ColumnMappingKey] ?? ""}
                onChange={(e) => setField(field.key as ColumnMappingKey, e.target.value)}
                aria-label={`${field.label}對應欄位`}
              >
                <option value="">不比對</option>
                {columns.map((col) => (
                  <option key={col.letter} value={col.letter}>
                    {columnLabel(col)}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
