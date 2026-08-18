"use client";

import * as React from "react";
import { FileSpreadsheet, UploadCloud, Download, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  fileName: string | null;
  onFileSelected: (file: File) => void;
  onDownloadTemplate: () => void;
  onStartCompare: () => void;
  comparing: boolean;
  progress: number;
  /** 已解析出的申請案號筆數（Excel 解析完成後才會有值）。 */
  parsedCount: number | null;
  /** 目前執行階段的說明文字，例如「正在向智慧局查詢…」。 */
  statusMessage: string | null;
  /** 額外的「開始比對」停用條件（例如欄位對應尚未指定申請案號）。 */
  startDisabled?: boolean;
}

export function UploadZone({
  fileName,
  onFileSelected,
  onDownloadTemplate,
  onStartCompare,
  comparing,
  progress,
  parsedCount,
  statusMessage,
  startDisabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!/\.xlsx?$/i.test(file.name)) return;
    onFileSelected(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging ? "border-seal bg-seal/5" : "border-hairline bg-paper/60 hover:border-ink/30"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        {fileName ? (
          <>
            <FileSpreadsheet className="h-8 w-8 text-seal" />
            <p className="text-sm font-medium text-ink">{fileName}</p>
            <p className="text-xs text-ink-muted">已就緒，可開始批次比對，或重新拖曳檔案以取代</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-ink-muted" />
            <p className="text-sm font-medium text-ink">拖曳 .xlsx 檔案至此，或點擊選擇檔案</p>
            <p className="text-xs text-ink-muted">
              系統將讀取「申請號」欄位並自動抓取第 4 碼判斷專利類別；若同時包含書目欄位，將一併用於欄位比對
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDownloadTemplate}>
          <Download className="h-4 w-4" /> 下載範例 Excel 檔
        </Button>
        <Button variant="seal" size="sm" onClick={onStartCompare} disabled={!fileName || comparing || startDisabled}>
          <PlayCircle className="h-4 w-4" /> {comparing ? "查詢中…" : "開始批次比對"}
        </Button>
      </div>

      {comparing && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-mono tabular">
              {parsedCount !== null ? `已解析 ${parsedCount} 筆申請案號` : "正在解析 Excel…"}
              {statusMessage ? ` · ${statusMessage}` : ""}
            </span>
            <span className="font-mono tabular">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
}
