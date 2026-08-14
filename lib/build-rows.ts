/**
 * 將「Excel 內部資料」與「TIPO API 回傳資料」合併為畫面共用的 PatentRow[]。
 * 純函式、與資料來源（真實 API／mock）無關 — 這正是 lib/mock-data.ts、
 * lib/patent-logic.ts、lib/field-compare.ts 一開始就被設計成互相解耦的原因，
 * 換成真實資料時，這些既有邏輯完全不用改。
 */
import { evaluatePatentStatus, parseApplClass } from "./patent-logic";
import type { GreenFields, PatentRow } from "./mock-data";
import type { TipoMappedRow } from "./tipo-api";

const BLANK_GREEN: GreenFields = {
  applDate: "",
  publicationNo: "",
  publicationDate: "",
  gazetteNo: "",
  gazetteDate: "",
  certNo: "",
  patentNameZh: "",
  agentName: "",
  applicantNameZh: "",
  applicantNameEn: "",
  applicantAddress: "",
  inventorNameZh: "",
  inventorNameEn: "",
};

export interface BuildRowsResult {
  rows: PatentRow[];
  /** 使用者要求查詢、但智慧局回傳資料中查無此案號（或關鍵日期缺漏）的申請案號，保持原始上傳順序。 */
  notFound: string[];
}

export function buildRowsFromApi({
  applnos,
  internalByApplno,
  tipoByApplno,
  today,
}: {
  /** 原始上傳的 applno 清單，保持順序（見 CLAUDE.md：不可更動 applno 上傳順序）。 */
  applnos: string[];
  internalByApplno: Map<string, GreenFields>;
  tipoByApplno: Map<string, TipoMappedRow>;
  today: Date;
}): BuildRowsResult {
  const rows: PatentRow[] = [];
  const notFound: string[] = [];

  for (const applno of applnos) {
    const tipo = tipoByApplno.get(applno);
    if (!tipo || !tipo.patentEdate || !tipo.chargeExpirDate) {
      notFound.push(applno);
      continue;
    }
    const internal = internalByApplno.get(applno) ?? BLANK_GREEN;
    const status = evaluatePatentStatus({
      today,
      patentEdate: tipo.patentEdate,
      chargeExpirDate: tipo.chargeExpirDate,
    });

    rows.push({
      applno,
      patentName: tipo.green.patentNameZh || internal.patentNameZh || "",
      applicant: tipo.green.applicantNameEn || internal.applicantNameEn || "",
      chargeExpirDate: tipo.chargeExpirDate,
      patentEdate: tipo.patentEdate,
      internal,
      tipo: tipo.green,
      tipoYellow: tipo.yellow,
      applClass: parseApplClass(applno),
      status,
    });
  }

  return { rows, notFound };
}
