"use client";

import { AlertTriangle, Info, XCircle } from "lucide-react";

export interface GroupErrorInfo {
  applclass: number;
  message: string;
}

// applclass 0 為 PatentPub（發明公開案）fallback 查詢的錯誤標記，不對應實際專利類別。
const APPL_CLASS_LABEL: Record<number, string> = { 0: "PatentPub 補查", 1: "發明", 2: "新型", 3: "設計" };

export function QueryBanners({
  parseError,
  sampleMode,
  notFound,
  groupErrors,
}: {
  parseError: string | null;
  sampleMode: boolean;
  notFound: string[];
  groupErrors: GroupErrorInfo[];
}) {
  if (!parseError && !sampleMode && notFound.length === 0 && groupErrors.length === 0) return null;

  return (
    <div className="space-y-2">
      {parseError && (
        <div className="flex items-start gap-2 rounded-card border border-seal/25 bg-seal/[0.06] px-3 py-2 text-xs text-seal">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {sampleMode && (
        <div className="flex items-start gap-2 rounded-card border border-status-grace/25 bg-status-grace-bg px-3 py-2 text-xs text-status-grace">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            尚未設定正式 TIPO API 驗證碼（tk），本次查詢已成功連上智慧局 API，但智慧局在未驗證通過時僅會回傳與您上傳案號無關的官方固定範例資料，因此下方暫不顯示比對結果。設定
            <code className="mx-1 rounded bg-ink/10 px-1 py-0.5 font-mono">TIPO_API_TOKEN</code>
            環境變數後，重新執行批次比對即可看到您上傳案號的真實查詢結果，無須修改任何程式碼。
          </span>
        </div>
      )}

      {groupErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-card border border-seal/25 bg-seal/[0.06] px-3 py-2 text-xs text-seal">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="space-y-0.5">
            {groupErrors.map((e, i) => (
              <p key={i}>
                {APPL_CLASS_LABEL[e.applclass] ?? `類別 ${e.applclass}`} 案件查詢失敗：{e.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {notFound.length > 0 && (
        <div className="flex items-start gap-2 rounded-card border border-hairline bg-paper px-3 py-2 text-xs text-ink-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            智慧局查無以下 {notFound.length} 筆申請案號的公告資料：
            <span className="font-mono tabular">{notFound.join("、")}</span>
          </span>
        </div>
      )}
    </div>
  );
}
