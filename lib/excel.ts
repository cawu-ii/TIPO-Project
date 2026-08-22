import * as XLSX from "xlsx";
import { formatDate, formatDateOrDash, APPL_CLASS_LABEL } from "./patent-logic";
import {
  buildCaseComparison,
  DEFAULT_NORMALIZATION_OPTIONS,
  GREEN_FIELD_DEFS,
  YELLOW_FIELD_DEFS,
  type NormalizationOptions,
} from "./field-compare";
import { toComparableRow, type PatentRow } from "./mock-data";

/** 下載範例 Excel 範本：僅含 applno 欄位，供使用者依格式填入待查詢案號。 */
export function downloadTemplate() {
  const sample = [
    { applno: "111100123" },
    { applno: "110200456" },
    { applno: "108300789" },
  ];
  const worksheet = XLSX.utils.json_to_sheet(sample);
  worksheet["!cols"] = [{ wch: 16 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "applno範本");
  XLSX.writeFile(workbook, "TIPO專利查詢範本.xlsx");
}

/** 匯出整合分析報表，保持原始 applno 上傳順序。 */
export function exportAnalysisReport(rows: PatentRow[]) {
  const now = new Date();
  const data = rows.map((row) => ({
    申請案號: row.applno,
    專利類別: row.applClass ? APPL_CLASS_LABEL[row.applClass] : "無法判定",
    專利名稱: row.patentName,
    專利權人: row.applicant,
    年費有效日期: formatDateOrDash(row.chargeExpirDate),
    專利權止日: formatDateOrDash(row.patentEdate),
    系統判定狀態: row.status,
    最後比對時間: `${formatDate(now)} ${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`,
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 8 },
    { wch: 26 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "專利狀態分析報表");
  XLSX.writeFile(workbook, `TIPO專利狀態分析報表_${formatDate(now).replace(/\//g, "")}.xlsx`);
}

/**
 * 匯出「欄位比對差異報告」：案件總覽 + 差異明細兩個工作表，保持原始 applno 上傳順序。
 * 只根據使用者本次勾選的比對欄位計算，與畫面「資料比對」頁籤顯示的結果一致。
 */
export function exportComparisonReport(
  rows: PatentRow[],
  selectedKeys: Set<string>,
  normalizationOptions: NormalizationOptions = DEFAULT_NORMALIZATION_OPTIONS
) {
  const now = new Date();
  const results = rows.map((row) => buildCaseComparison(toComparableRow(row), selectedKeys, normalizationOptions));

  const overview = results.map((result) => ({
    申請案號: result.applno,
    中文專利名稱: result.patentName,
    已比對欄位數: result.comparedCount,
    比對狀態: result.mismatchCount === 0 ? "完全一致" : `✕ ${result.mismatchCount} 處異常`,
    異常欄位: result.mismatchedLabels.join("、"),
  }));

  const detail: Array<{
    申請案號: string;
    中文專利名稱: string;
    欄位名稱: string;
    內部系統資料: string;
    智慧局最新資料: string;
  }> = [];
  for (const result of results) {
    for (const field of result.fields) {
      if (field.category === "green" && field.compared && field.match === false) {
        detail.push({
          申請案號: result.applno,
          中文專利名稱: result.patentName,
          欄位名稱: field.label,
          內部系統資料: field.internalValue,
          智慧局最新資料: field.tipoValue,
        });
      }
    }
  }

  const overviewSheet = XLSX.utils.json_to_sheet(overview);
  overviewSheet["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 12 }, { wch: 16 }, { wch: 30 }];

  const detailSheet = XLSX.utils.json_to_sheet(detail);
  detailSheet["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 18 }, { wch: 30 }, { wch: 30 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "案件總覽");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "差異明細");
  XLSX.writeFile(workbook, `TIPO欄位比對差異報告_${formatDate(now).replace(/\//g, "")}.xlsx`);
}

/**
 * 匯出「智慧局完整資料」：欄位結構比照使用者原始上傳 Excel（申請號 + 全部綠底／黃底欄位），
 * 但內容全部改用本次向智慧局查得的最新資料重新產生一份，可直接取代內部系統的舊資料。
 */
export function exportTipoRawData(rows: PatentRow[]) {
  const now = new Date();
  const data = rows.map((row) => {
    const record: Record<string, string> = { 申請號: row.applno };
    for (const def of GREEN_FIELD_DEFS) {
      record[def.label] = row.tipo[def.key as keyof typeof row.tipo] ?? "";
    }
    for (const def of YELLOW_FIELD_DEFS) {
      record[def.label] = row.tipoYellow[def.key as keyof typeof row.tipoYellow] ?? "";
    }
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 14 },
    ...GREEN_FIELD_DEFS.map(() => ({ wch: 22 })),
    ...YELLOW_FIELD_DEFS.map(() => ({ wch: 16 })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "智慧局完整資料");
  XLSX.writeFile(workbook, `TIPO智慧局完整資料_${formatDate(now).replace(/\//g, "")}.xlsx`);
}
