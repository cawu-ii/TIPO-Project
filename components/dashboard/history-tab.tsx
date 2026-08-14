"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearHistory, loadHistory, type HistoryEntry } from "@/lib/history-store";

const MODE_LABEL: Record<HistoryEntry["mode"], string> = {
  success: "正式查詢",
  sample: "範例模式（未設定 tk）",
  error: "查詢失敗",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

export function HistoryTab() {
  // 讀取 localStorage 屬於 client-only 副作用：先以空陣列初始化避免 SSR/CSR 內容不一致，
  // 再於掛載後（含每次切回此頁籤重新掛載時，見 components/ui/tabs.tsx 未啟用頁籤會整個卸載）讀取最新資料。
  const [entries, setEntries] = React.useState<HistoryEntry[]>([]);

  React.useEffect(() => {
    setEntries(loadHistory());
  }, []);

  function handleClear() {
    if (!window.confirm("確定要清空所有歷史查詢紀錄嗎？此動作無法復原。")) return;
    setEntries(clearHistory());
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-ink-muted">尚無歷史查詢紀錄，於「上傳比對」頁籤完成一次查詢後將自動記錄於此。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">紀錄保存於本機瀏覽器，最多保留最新 50 筆。</p>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <Trash2 className="h-4 w-4" /> 清空紀錄
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>比對時間</TableHead>
            <TableHead>檔案名稱</TableHead>
            <TableHead>模式</TableHead>
            <TableHead>總筆數</TableHead>
            <TableHead>存續</TableHead>
            <TableHead>補繳/復權</TableHead>
            <TableHead>已消滅</TableHead>
            <TableHead>查無資料</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap font-mono text-xs tabular">
                {formatTimestamp(entry.timestamp)}
              </TableCell>
              <TableCell>
                {entry.fileName}
                {entry.mode === "error" && entry.errorMessage && (
                  <p className="mt-0.5 text-[11px] text-status-dead">{entry.errorMessage}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge tone={entry.mode === "success" ? "alive" : entry.mode === "sample" ? "grace" : "dead"}>
                  {MODE_LABEL[entry.mode]}
                </Badge>
              </TableCell>
              <TableCell className="font-mono tabular">{entry.totalApplnos}</TableCell>
              <TableCell>
                <Badge tone="alive">{entry.aliveCount}</Badge>
              </TableCell>
              <TableCell>
                <Badge tone="grace">{entry.graceCount}</Badge>
              </TableCell>
              <TableCell>
                <Badge tone="dead">{entry.deadCount}</Badge>
              </TableCell>
              <TableCell className="font-mono tabular text-ink-muted">{entry.notFoundCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
