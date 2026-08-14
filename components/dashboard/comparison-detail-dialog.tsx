"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { buildCaseComparison } from "@/lib/field-compare";
import { toComparableRow, type PatentRow } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ComparisonDetailDialog({
  row,
  selectedKeys,
  onOpenChange,
}: {
  row: PatentRow | null;
  selectedKeys: Set<string>;
  onOpenChange: (open: boolean) => void;
}) {
  const [diffOnly, setDiffOnly] = React.useState(false);

  const result = React.useMemo(() => (row ? buildCaseComparison(toComparableRow(row), selectedKeys) : null), [
    row,
    selectedKeys,
  ]);

  const greenFields = result?.fields.filter((f) => f.category === "green" && f.compared) ?? [];
  const yellowFields = result?.fields.filter((f) => f.category === "yellow") ?? [];
  const visibleGreenFields = diffOnly ? greenFields.filter((f) => f.match === false) : greenFields;

  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      {row && result && (
        <>
          <DialogHeader>
            <p className="mb-1 font-mono text-xs tabular text-ink-muted">{row.applno}</p>
            <DialogTitle>{result.patentName}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {result.mismatchCount === 0 ? (
                <Badge tone="match">
                  <CheckCircle2 className="h-3 w-3" /> 完全一致（已比對 {result.comparedCount} 欄）
                </Badge>
              ) : (
                <Badge tone="mismatch">
                  ✕ {result.mismatchCount} 處異常（已比對 {result.comparedCount} 欄）
                </Badge>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
                <Checkbox checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} />
                只顯示差異欄位
              </label>
            </div>

            <section>
              <p className="mb-2 text-xs font-medium text-ink-muted">欄位比對（綠底欄位 — 內部系統 vs. 智慧局最新資料）</p>
              {visibleGreenFields.length === 0 ? (
                <p className="rounded-card border border-dashed border-hairline px-3 py-6 text-center text-xs text-ink-muted">
                  {greenFields.length === 0 ? "尚未選擇任何比對欄位" : "本案所有已比對欄位皆一致"}
                </p>
              ) : (
                <div className="overflow-hidden rounded-card border border-hairline">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-ink text-paper-card">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium">欄位名稱</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">內部系統資料</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">智慧局最新資料</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">狀態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline bg-paper-card">
                      {visibleGreenFields.map((field) => (
                        <tr key={field.key} className={cn(field.match === false && "bg-seal/[0.05]")}>
                          <td className="px-3 py-2 align-top text-xs font-medium text-ink-muted">{field.label}</td>
                          <td className="max-w-[200px] px-3 py-2 align-top text-xs text-ink">
                            {field.internalValue || <span className="text-ink-muted">（無資料）</span>}
                          </td>
                          <td
                            className={cn(
                              "max-w-[200px] px-3 py-2 align-top text-xs",
                              field.match === false ? "font-medium text-seal" : "text-ink"
                            )}
                          >
                            {field.tipoValue || <span className="text-ink-muted">（無資料）</span>}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {field.match ? (
                              <CheckCircle2 className="h-4 w-4 text-status-alive" aria-label="相符" />
                            ) : (
                              <XCircle className="h-4 w-4 text-seal" aria-label="不符" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <p className="mb-2 text-xs font-medium text-ink-muted">智慧局提供資料（黃底欄位 — 僅顯示，無須比對）</p>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-card border border-hairline bg-paper p-3 text-sm sm:grid-cols-2">
                {yellowFields.map((field) => (
                  <div key={field.key} className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-0.5">
                    <dt className="shrink-0 text-xs text-ink-muted">{field.label}</dt>
                    <dd className="truncate text-xs text-ink">{field.tipoValue || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      )}
    </Dialog>
  );
}
