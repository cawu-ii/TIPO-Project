"use client";

import * as React from "react";
import { Search, Eye, Inbox, CheckCircle2, FileDown, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CaseComparisonResult } from "@/lib/field-compare";
import type { PatentRow } from "@/lib/mock-data";

export function ComparisonPanel({
  rows,
  results,
  selectedKeys,
  onViewDetail,
  onExportDiff,
  onExportRawData,
}: {
  rows: PatentRow[] | null;
  results: CaseComparisonResult[];
  selectedKeys: Set<string>;
  onViewDetail: (row: PatentRow) => void;
  onExportDiff: () => void;
  onExportRawData: () => void;
}) {
  const [query, setQuery] = React.useState("");

  const rowByApplno = React.useMemo(() => {
    const map = new Map<string, PatentRow>();
    (rows ?? []).forEach((row) => map.set(row.applno, row));
    return map;
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return results;
    return results.filter(
      (r) => r.applno.toLowerCase().includes(q) || r.patentName.toLowerCase().includes(q)
    );
  }, [results, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋案號 / 專利名稱…"
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={onExportRawData} disabled={!rows || rows.length === 0}>
          <FileSpreadsheet className="h-4 w-4" /> 匯出智慧局完整資料 (.xlsx)
        </Button>
        <Button variant="primary" size="sm" onClick={onExportDiff} disabled={!rows || rows.length === 0}>
          <FileDown className="h-4 w-4" /> 匯出比對差異報告 (.xlsx)
        </Button>
      </div>

      {!rows ? (
        <EmptyState message="尚未有比對結果" hint="請先於「上傳比對」頁籤上傳 Excel 並執行批次比對。" />
      ) : selectedKeys.size === 0 ? (
        <EmptyState message="尚未選擇任何比對欄位" hint="請於上方勾選至少一個綠底欄位，系統將自動比對。" />
      ) : filtered.length === 0 ? (
        <EmptyState message="查無符合條件的案件" hint="請調整搜尋關鍵字。" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>申請案號</TableHead>
              <TableHead>中文專利名稱</TableHead>
              <TableHead>比對狀態</TableHead>
              <TableHead>異常欄位標示</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((result) => (
              <TableRow key={result.applno}>
                <TableCell className="whitespace-nowrap font-mono text-xs tabular">{result.applno}</TableCell>
                <TableCell className="max-w-[240px] truncate">{result.patentName}</TableCell>
                <TableCell>
                  {result.mismatchCount === 0 ? (
                    <Badge tone="match">
                      <CheckCircle2 className="h-3 w-3" /> 完全一致
                    </Badge>
                  ) : (
                    <Badge tone="mismatch">✕ {result.mismatchCount} 處異常</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[280px]">
                  {result.mismatchedLabels.length === 0 ? (
                    <span className="text-xs text-ink-muted">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {result.mismatchedLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-seal/25 bg-seal/[0.06] px-2 py-0.5 text-[11px] text-seal"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const row = rowByApplno.get(result.applno);
                      if (row) onViewDetail(row);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> 查看明細
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
