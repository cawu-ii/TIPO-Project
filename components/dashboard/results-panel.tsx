"use client";

import * as React from "react";
import { Search, FileDown, Eye, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DateRuler } from "@/components/date-ruler";
import { formatDate, type PatentStatus } from "@/lib/patent-logic";
import type { PatentRow } from "@/lib/mock-data";

const STATUS_OPTIONS: Array<{ value: "all" | PatentStatus; label: string }> = [
  { value: "all", label: "全部狀態" },
  { value: "案件存續", label: "案件存續" },
  { value: "案件逾期但尚在補繳期內", label: "逾期但尚在補繳期內" },
  { value: "案件逾補繳期但尚可復權", label: "逾補繳期但尚可復權" },
  { value: "案件已消滅", label: "案件已消滅" },
];

export function ResultsPanel({
  rows,
  today,
  onExport,
  onViewDetail,
}: {
  rows: PatentRow[] | null;
  today: Date;
  onExport: () => void;
  onViewDetail: (row: PatentRow) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | PatentStatus>("all");

  const filtered = React.useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        q.length === 0 ||
        row.applno.toLowerCase().includes(q) ||
        row.patentName.toLowerCase().includes(q) ||
        row.applicant.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋案號 / 名稱 / 專利權人…"
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | PatentStatus)}
          className="h-9 rounded-card border border-hairline bg-paper-card px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button variant="primary" size="sm" onClick={onExport} disabled={!rows || rows.length === 0}>
          <FileDown className="h-4 w-4" /> 匯出分析報表 (.xlsx)
        </Button>
      </div>

      {!rows ? (
        <EmptyState message="尚未有比對結果" hint="上傳 Excel 並開始批次比對後，結果將顯示於此。" />
      ) : filtered.length === 0 ? (
        <EmptyState message="查無符合條件的案件" hint="請調整搜尋關鍵字或狀態篩選條件。" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>申請案號</TableHead>
              <TableHead>專利名稱</TableHead>
              <TableHead>專利權人</TableHead>
              <TableHead>年費有效日期</TableHead>
              <TableHead>專利權止日</TableHead>
              <TableHead>系統判定狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.applno}>
                <TableCell className="whitespace-nowrap font-mono text-xs tabular">{row.applno}</TableCell>
                <TableCell className="max-w-[220px] truncate">{row.patentName}</TableCell>
                <TableCell className="max-w-[160px] truncate text-ink-muted">{row.applicant}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs tabular">
                  {formatDate(row.chargeExpirDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs tabular">
                  {formatDate(row.patentEdate)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.status} />
                    <DateRuler
                      compact
                      input={{ today, patentEdate: row.patentEdate, chargeExpirDate: row.chargeExpirDate }}
                      className="hidden md:flex"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(row)}>
                    <Eye className="h-3.5 w-3.5" /> 詳情
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline py-12 text-center">
      <Inbox className="h-6 w-6 text-ink-muted" />
      <p className="text-sm font-medium text-ink">{message}</p>
      <p className="text-xs text-ink-muted">{hint}</p>
    </div>
  );
}
