"use client";

import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DateRuler } from "@/components/date-ruler";
import { APPL_CLASS_LABEL, formatDate, formatDateOrDash } from "@/lib/patent-logic";
import type { PatentRow } from "@/lib/mock-data";

export function CaseDetailDialog({
  row,
  today,
  onOpenChange,
}: {
  row: PatentRow | null;
  today: Date;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      {row && (
        <>
          <DialogHeader>
            <p className="mb-1 font-mono text-xs tabular text-ink-muted">{row.applno}</p>
            <DialogTitle>{row.patentName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={row.status} />
              <span className="text-xs text-ink-muted">
                {row.applClass ? `專利類別：${APPL_CLASS_LABEL[row.applClass]}` : "專利類別：無法判定"}
              </span>
            </div>

            <div className="rounded-card border border-hairline bg-paper p-3">
              <p className="mb-2 text-xs font-medium text-ink-muted">日期尺 — 今日相對於法定期限的位置</p>
              {row.patentEdate && row.chargeExpirDate ? (
                <DateRuler input={{ today, patentEdate: row.patentEdate, chargeExpirDate: row.chargeExpirDate }} />
              ) : (
                <p className="text-xs text-ink-muted">
                  此案件尚未核准，智慧局目前僅提供公開資料，沒有專利權止日／年費有效日期，無法顯示日期尺。
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">專利權人</dt>
                <dd>{row.applicant}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">最後比對時間</dt>
                <dd className="font-mono tabular">{formatDate(today)}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-muted">
                TIPO API 回傳欄位（{row.patentEdate && row.chargeExpirDate ? "PatentRights · patent-right" : "PatentPub · 尚未核准，僅公開資料"}）
              </p>
              <pre className="max-h-40 overflow-auto rounded-card bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper-card">
{JSON.stringify(
  {
    "appl-no": row.applno,
    "appl-class": row.applClass,
    "patent-name-chinese": row.patentName,
    "charge-expir-date": formatDateOrDash(row.chargeExpirDate),
    "patent-edate": formatDateOrDash(row.patentEdate),
  },
  null,
  2
)}
              </pre>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
