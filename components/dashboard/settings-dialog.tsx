"use client";

import * as React from "react";
import { CheckCircle2, CircleAlert, RotateCcw } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StatusResponse {
  tipoTokenConfigured: boolean;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onResetCompareFields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 將「資料比對」頁籤的欄位勾選重設為預設全選。 */
  onResetCompareFields: () => void;
}) {
  const [status, setStatus] = React.useState<"loading" | "connected" | "sample" | "error">("loading");

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("loading");
    fetch("/api/settings/status")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<StatusResponse>;
      })
      .then((data) => {
        if (!cancelled) setStatus(data.tipoTokenConfigured ? "connected" : "sample");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>設定</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">智慧局 TIPO API 連線狀態</p>
          <div className="flex items-center gap-2 rounded-card border border-hairline bg-paper p-3">
            {status === "loading" && <span className="text-sm text-ink-muted">檢查中…</span>}
            {status === "connected" && (
              <>
                <CheckCircle2 className="h-4 w-4 text-status-alive" />
                <span className="text-sm text-ink">已設定 tk，可查詢正式資料</span>
                <Badge tone="alive">已連線</Badge>
              </>
            )}
            {status === "sample" && (
              <>
                <CircleAlert className="h-4 w-4 text-status-grace" />
                <div className="flex-1">
                  <p className="text-sm text-ink">尚未設定 TIPO_API_TOKEN</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    請於伺服器環境變數 .env.local 加入 TIPO_API_TOKEN=your-tk 後重新啟動服務。
                  </p>
                </div>
                <Badge tone="grace">範例模式</Badge>
              </>
            )}
            {status === "error" && (
              <>
                <CircleAlert className="h-4 w-4 text-status-dead" />
                <span className="text-sm text-ink">無法確認連線狀態，請稍後再試</span>
              </>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">資料比對頁籤</p>
          <div className="flex items-center justify-between rounded-card border border-hairline bg-paper p-3">
            <p className="text-sm text-ink">將綠底欄位勾選重設為預設（全選）</p>
            <Button variant="outline" size="sm" onClick={onResetCompareFields}>
              <RotateCcw className="h-4 w-4" /> 重設
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-ink-muted">歷史查詢紀錄的清除功能請至「歷史查詢紀錄」頁籤操作。</p>
      </div>
    </Dialog>
  );
}
