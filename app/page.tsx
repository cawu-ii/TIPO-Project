"use client";

import * as React from "react";
import { Settings, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCards } from "@/components/dashboard/stat-cards";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { ResultsPanel } from "@/components/dashboard/results-panel";
import { CaseDetailDialog } from "@/components/dashboard/case-detail-dialog";
import { HistoryTab } from "@/components/dashboard/history-tab";
import { FieldSelector } from "@/components/dashboard/field-selector";
import { ComparisonStats } from "@/components/dashboard/comparison-stats";
import { ComparisonPanel } from "@/components/dashboard/comparison-panel";
import { ComparisonDetailDialog } from "@/components/dashboard/comparison-detail-dialog";
import { ColumnMappingPanel } from "@/components/dashboard/column-mapping-panel";
import { ComparisonOptions } from "@/components/dashboard/comparison-options";
import { QueryBanners, type GroupErrorInfo } from "@/components/dashboard/query-banners";
import { toComparableRow, type PatentRow } from "@/lib/mock-data";
import { buildCaseComparison, DEFAULT_COMPARE_KEYS, RECOMMENDED_NORMALIZATION_OPTIONS } from "@/lib/field-compare";
import { downloadTemplate, exportAnalysisReport, exportComparisonReport, exportTipoRawData } from "@/lib/excel";
import { detectExcelColumns, parseUploadedExcelFile, type ColumnMapping, type DetectedColumn } from "@/lib/parse-upload";
import { buildRowsFromApi } from "@/lib/build-rows";
import { appendHistoryEntry, summarizeStatusCounts } from "@/lib/history-store";
import { SettingsDialog } from "@/components/dashboard/settings-dialog";
import type { TipoMappedRow } from "@/lib/tipo-api";

/** API Route 回傳經過 JSON 序列化，Date 欄位會變成 ISO 字串，需另外還原。 */
interface TipoMappedRowWire extends Omit<TipoMappedRow, "patentEdate" | "chargeExpirDate"> {
  patentEdate: string | null;
  chargeExpirDate: string | null;
}

interface PatentRightsApiResponse {
  rows: TipoMappedRowWire[];
  sampleMode: boolean;
  groupErrors: GroupErrorInfo[];
  invalidApplnos: string[];
  error?: string;
}

export default function Page() {
  // 固定於本次載入的比對基準日，避免畫面在互動過程中因時間流逝而跳動。
  const [today] = React.useState(() => new Date());

  const [activeTab, setActiveTab] = React.useState("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<PatentRow[] | null>(null);
  const [comparing, setComparing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [parsedCount, setParsedCount] = React.useState<number | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [selectedRow, setSelectedRow] = React.useState<PatentRow | null>(null);

  // 查詢結果的橫幅狀態：解析錯誤、範例模式、查無資料、各類別查詢錯誤。
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [sampleMode, setSampleMode] = React.useState(false);
  const [notFound, setNotFound] = React.useState<string[]>([]);
  const [groupErrors, setGroupErrors] = React.useState<GroupErrorInfo[]>([]);

  // 欄位對應：每次上傳新檔案都重新偵測／重設，不跨檔案記憶（不同版型欄位可能完全不同）。
  const [detectedColumns, setDetectedColumns] = React.useState<DetectedColumn[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<ColumnMapping>({});

  // 欄位比對頁籤：預設全選綠底欄位，讓對方一開啟就能看到比對結果。
  const [selectedGreenKeys, setSelectedGreenKeys] = React.useState<Set<string>>(
    () => new Set(DEFAULT_COMPARE_KEYS)
  );
  // 比對選項（忽略差異）：預設全部忽略純格式差異（業主回饋），session 層級狀態，不隨上傳檔案重設。
  const [normalizationOptions, setNormalizationOptions] = React.useState(RECOMMENDED_NORMALIZATION_OPTIONS);
  const [comparisonDetailRow, setComparisonDetailRow] = React.useState<PatentRow | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const comparisonResults = React.useMemo(() => {
    if (!rows) return [];
    return rows.map((row) => buildCaseComparison(toComparableRow(row), selectedGreenKeys, normalizationOptions));
  }, [rows, selectedGreenKeys, normalizationOptions]);

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setFileName(selected.name);
    setRows(null);
    setProgress(0);
    setParsedCount(null);
    setStatusMessage(null);
    setParseError(null);
    setSampleMode(false);
    setNotFound([]);
    setGroupErrors([]);
    setDetectedColumns([]);
    setColumnMapping({});

    try {
      const { columns, guessedMapping } = await detectExcelColumns(selected);
      setDetectedColumns(columns);
      setColumnMapping(guessedMapping);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "讀取 Excel 欄位時發生未知錯誤");
    }
  }

  async function handleStartCompare() {
    if (!file || comparing) return;
    setComparing(true);
    setRows(null);
    setProgress(8);
    setParsedCount(null);
    setStatusMessage("正在解析 Excel…");
    setParseError(null);
    setSampleMode(false);
    setNotFound([]);
    setGroupErrors([]);

    // 平滑推進進度條，直到真實查詢完成再跳到 100%（實際筆數/耗時無法預先得知）。
    const trickle = window.setInterval(() => {
      setProgress((p) => (p < 85 ? p + (85 - p) * 0.15 : p));
    }, 200);

    // 供 catch 區塊寫入歷史紀錄使用：不能讀取 parsedCount state（同一次呼叫中的 setState
    // 不會立即反映在閉包變數上），改用區域變數追蹤目前已知的解析筆數。
    let parsedApplnoCount = 0;

    try {
      const parsed = await parseUploadedExcelFile(file, columnMapping);
      if (parsed.applnos.length === 0) {
        throw new Error("Excel 中找不到任何申請案號，請確認「欄位對應」是否指到正確的欄位");
      }
      parsedApplnoCount = parsed.applnos.length;
      setParsedCount(parsed.applnos.length);
      setStatusMessage("正在向智慧局查詢…");

      const uniqueApplnos = Array.from(new Set(parsed.applnos));
      const res = await fetch("/api/tipo/patent-rights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applnos: uniqueApplnos }),
      });
      const data = (await res.json()) as PatentRightsApiResponse;
      if (!res.ok) {
        throw new Error(data.error ?? `查詢失敗（HTTP ${res.status}）`);
      }

      setSampleMode(data.sampleMode);
      setGroupErrors(data.groupErrors ?? []);

      if (data.sampleMode) {
        // 尚未設定 tk：TIPO 回傳的是官方固定範例資料，applno、書目內容都跟使用者上傳的
        // 案號無關。先前的版本曾嘗試把這批不相干的範例資料硬套進畫面（applno 對不上、
        // 又拿空白的內部資料去跟範例資料比對），結果是「解析筆數」跟畫面筆數對不起來、
        // 欄位比對整批顯示不一致、案件年期久遠導致狀態全部落在「已消滅」—— 一次踩了三個坑。
        // 修正後：sample 模式下不再假裝有查詢結果，只顯示提示橫幅，等設定好 tk 再顯示真資料。
        setRows(null);
        setNotFound([]);
        appendHistoryEntry({
          fileName: fileName ?? file.name,
          totalApplnos: parsed.applnos.length,
          mode: "sample",
          aliveCount: 0,
          graceCount: 0,
          deadCount: 0,
          notFoundCount: 0,
        });
      } else {
        // JSON 沒有 Date 型別：patentEdate/chargeExpirDate 經過 NextResponse.json() 序列化後
        // 會變成 ISO 字串，這裡要還原成真正的 Date 物件，狀態判定的日期運算才能正常運作。
        const revivedRows: TipoMappedRow[] = data.rows.map((r) => ({
          ...r,
          patentEdate: r.patentEdate ? new Date(r.patentEdate) : null,
          chargeExpirDate: r.chargeExpirDate ? new Date(r.chargeExpirDate) : null,
        }));
        const tipoByApplno = new Map(revivedRows.map((r) => [r.applno, r]));
        const { rows: realRows, notFound: missing } = buildRowsFromApi({
          applnos: parsed.applnos,
          internalByApplno: parsed.internalByApplno,
          tipoByApplno,
          today,
        });
        setRows(realRows);
        setNotFound(missing);
        const counts = summarizeStatusCounts(realRows);
        appendHistoryEntry({
          fileName: fileName ?? file.name,
          totalApplnos: parsed.applnos.length,
          mode: "success",
          ...counts,
          notFoundCount: missing.length,
        });
      }
      setStatusMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "查詢時發生未知錯誤";
      setParseError(message);
      setRows(null);
      appendHistoryEntry({
        fileName: fileName ?? file.name,
        totalApplnos: parsedApplnoCount,
        mode: "error",
        aliveCount: 0,
        graceCount: 0,
        deadCount: 0,
        notFoundCount: 0,
        errorMessage: message,
      });
    } finally {
      window.clearInterval(trickle);
      setProgress(100);
      setComparing(false);
    }
  }

  function handleExport() {
    if (!rows) return;
    exportAnalysisReport(rows);
  }

  function handleExportComparisonDiff() {
    if (!rows) return;
    exportComparisonReport(rows, selectedGreenKeys, normalizationOptions);
  }

  function handleExportTipoRawData() {
    if (!rows) return;
    exportTipoRawData(rows);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 overflow-hidden rounded-full ring-1 ring-ink/10">
            {/* 客戶提供標誌，裁切為圓形；圓形印記本身也呼應本系統「印泥朱紅」的設計語彙 */}
            <img src="/logo.png" alt="客戶標誌" className="h-full w-full object-cover" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">01 總覽</p>
            <h1 className="font-display text-xl font-semibold leading-tight text-ink">TIPO 專利狀態智動化分析系統</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> 下載範本
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" /> 設定
          </Button>
        </div>
      </header>

      {/* Stat cards */}
      <section className="mb-8">
        <StatCards rows={rows} />
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList>
          <TabsTrigger value="upload">上傳比對</TabsTrigger>
          <TabsTrigger value="fields">資料比對</TabsTrigger>
          <TabsTrigger value="history">歷史查詢紀錄</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div className="space-y-8">
            <section>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">02 上傳比對</p>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">專利清單 Excel 上傳</h2>
              <div className="space-y-3">
                <UploadZone
                  fileName={fileName}
                  onFileSelected={handleFileSelected}
                  onDownloadTemplate={downloadTemplate}
                  onStartCompare={handleStartCompare}
                  comparing={comparing}
                  progress={progress}
                  parsedCount={parsedCount}
                  statusMessage={statusMessage}
                  startDisabled={detectedColumns.length > 0 && !columnMapping.applno}
                />
                {detectedColumns.length > 0 && (
                  <ColumnMappingPanel columns={detectedColumns} mapping={columnMapping} onChange={setColumnMapping} />
                )}
                <QueryBanners
                  parseError={parseError}
                  sampleMode={sampleMode}
                  notFound={notFound}
                  groupErrors={groupErrors}
                />
              </div>
            </section>

            <section>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">03 結果總覽</p>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">結果預覽</h2>
              <ResultsPanel rows={rows} today={today} onExport={handleExport} onViewDetail={setSelectedRow} />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="fields">
          <div className="space-y-8">
            <section>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">04 欄位比對</p>
              <h2 className="mb-1 font-display text-base font-semibold text-ink">Excel 內部資料 vs. 智慧局最新資料</h2>
              <p className="mb-3 text-xs text-ink-muted">
                沿用「上傳比對」頁籤抓回的同一批資料；勾選欄位後，系統將逐案比對 Excel 原有資料與智慧局最新回傳值是否相符。
              </p>
              <FieldSelector selectedKeys={selectedGreenKeys} onChange={setSelectedGreenKeys} />
            </section>

            <section>
              <ComparisonOptions options={normalizationOptions} onChange={setNormalizationOptions} />
            </section>

            <section>
              <ComparisonStats results={comparisonResults} />
            </section>

            <section>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">05 比對結果</p>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">案件比對清單</h2>
              <ComparisonPanel
                rows={rows}
                results={comparisonResults}
                selectedKeys={selectedGreenKeys}
                onViewDetail={setComparisonDetailRow}
                onExportDiff={handleExportComparisonDiff}
                onExportRawData={handleExportTipoRawData}
              />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>

      <CaseDetailDialog row={selectedRow} today={today} onOpenChange={(open) => !open && setSelectedRow(null)} />
      <ComparisonDetailDialog
        row={comparisonDetailRow}
        selectedKeys={selectedGreenKeys}
        normalizationOptions={normalizationOptions}
        onOpenChange={(open) => !open && setComparisonDetailRow(null)}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onResetCompareFields={() => setSelectedGreenKeys(new Set(DEFAULT_COMPARE_KEYS))}
      />
    </main>
  );
}
