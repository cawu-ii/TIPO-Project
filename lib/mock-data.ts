import { addMonthsUtc, evaluatePatentStatus, formatDate, parseApplClass, type PatentStatus } from "./patent-logic";
import type { ComparableRow } from "./field-compare";

/**
 * 綠底欄位 — Excel 上傳資料中，使用者內部系統可能已存有的書目資料，
 * 可與智慧局最新回傳值逐欄比對是否相符。
 */
export interface GreenFields {
  applDate: string;
  publicationNo: string;
  publicationDate: string;
  gazetteNo: string;
  gazetteDate: string;
  certNo: string;
  patentNameZh: string;
  agentName: string;
  applicantNameZh: string;
  applicantNameEn: string;
  applicantAddress: string;
  inventorNameZh: string;
  inventorNameEn: string;
}

/** 黃底欄位 — 僅智慧局提供、供顯示用的登記註記與狀態日期，不進行比對。 */
export interface YellowFields {
  licenseNote: string;
  pledgeNote: string;
  transferNote: string;
  inheritNote: string;
  trustNote: string;
  opposeNote: string;
  invalidateNote: string;
  extinguishDate: string;
  extinguishReason: string;
  revokeDate: string;
  revokeReason: string;
  patentStartDate: string;
  patentEndDate: string;
  chargeExpirDateLabel: string;
  chargeExpirYear: string;
}

export interface RawPatentRow {
  applno: string;
  patentName: string;
  applicant: string;
  /** 2026-08-21 業主回饋 5.：PatentPub 來源（尚未核准，僅公開）的案件沒有這兩個欄位，為 null。 */
  chargeExpirDate: Date | null;
  patentEdate: Date | null;
  /** Excel 上傳資料中的綠底欄位原始值（使用者內部系統既有資料）。 */
  internal: GreenFields;
  /** 智慧局最新回傳的綠底欄位值（可能與 internal 有落差，需比對）。 */
  tipo: GreenFields;
  /** 智慧局回傳的黃底欄位值（僅顯示，不比對）。 */
  tipoYellow: YellowFields;
}

export interface PatentRow extends RawPatentRow {
  applClass: 1 | 2 | 3 | null;
  status: PatentStatus;
}

/** 相對於「今日」的日期位移，讓示範資料無論何時開啟都維持一致、有說服力的狀態分佈。 */
function offset(today: Date, { months = 0, days = 0 }: { months?: number; days?: number }): Date {
  const shifted = addMonthsUtc(today, months);
  const withDays = new Date(shifted);
  withDays.setUTCDate(withDays.getUTCDate() + days);
  return withDays;
}

/** 將 "YYYY/MM/DD" 字串解析為 UTC Date，供年費有效年等相對計算使用。 */
function parseSlashDate(s: string): Date {
  const parts = s.split("/").map((n) => parseInt(n, 10));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, d));
}

function yearsBetween(from: Date, to: Date): number {
  const years = (to.getTime() - from.getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.max(1, Math.round(years));
}

const NO_NOTE = "無";

interface SeedRow {
  applno: string;
  chargeExpirOffset: { months?: number; days?: number };
  patentEdateOffset: { months?: number; days?: number };
  /**
   * applicantNameZh / inventorNameZh 為選填 —— 業主提供的範例 Excel 本來就沒有中文姓名欄位，
   * 大部分示範案件維持留空（如實反映「Excel 沒這欄，比對時內部資料本來就是空的」的真實情境）。
   */
  green: Omit<GreenFields, "applicantNameZh" | "inventorNameZh"> &
    Partial<Pick<GreenFields, "applicantNameZh" | "inventorNameZh">>;
  /** 刻意製造與 internal 不同的欄位，用於示範欄位比對抓出落差。 */
  tipoOverrides?: Partial<GreenFields>;
  /** 覆寫預設「無」的登記註記，展示黃底欄位仍有內容可顯示。 */
  yellowNoteOverrides?: Partial<
    Pick<
      YellowFields,
      "licenseNote" | "pledgeNote" | "transferNote" | "inheritNote" | "trustNote" | "opposeNote" | "invalidateNote"
    >
  >;
  /** 已消滅案件的原因說明；若留空則依系統判定狀態自動留白。 */
  extinguishReason?: string;
}

/**
 * 示範資料集（15 筆）—— 案號、書目欄位皆取自業主提供之附件 Excel
 * 「複本 (20260810) 大批run TIPO資料.xlsx」（申請號等綠底欄位為真實資料）。
 * 該檔案的年費 / 專利權止日等黃底欄位尚未填入（即上傳當下的常態），
 * 因此以「今日」為基準做相對位移合成，涵蓋四種狀態；
 * 並在其中 5 筆刻意讓「智慧局最新資料」與「內部系統資料」出現落差，
 * 用於示範欄位比對抓出不一致的核心功能。狀態一律由 evaluatePatentStatus() 即時計算。
 */
function buildSeedRows(): SeedRow[] {
  return [
    {
      applno: "100114238",
      chargeExpirOffset: { months: 8 },
      patentEdateOffset: { months: 72 },
      green: {
        applDate: "2011/04/25",
        publicationNo: "201207330",
        publicationDate: "2012/02/16",
        gazetteNo: "I558961",
        gazetteDate: "2016/11/21",
        certNo: "I558961",
        patentNameZh: "高效率的儲存及運送裝置及系統",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "MAGALDI INDUSTRIE S. R. L.",
        applicantAddress: "VIA IRNO 219, 84135 SALERNO SA, ITALY",
        inventorNameEn: "MAGALDI, MARIO (IT); DE MICHELE, GENNARO (IT); SALATINO, PIERO (IT)",
      },
      tipoOverrides: {
        applicantAddress: "VIA GIACOMO LEOPARDI 4, 84131 SALERNO SA, ITALY",
      },
    },
    {
      applno: "101137580",
      chargeExpirOffset: { days: 20 },
      patentEdateOffset: { months: 36 },
      green: {
        applDate: "2012/10/12",
        publicationNo: "201325775",
        publicationDate: "2013/07/01",
        gazetteNo: "I600486",
        gazetteDate: "2017/10/01",
        certNo: "I600486",
        patentNameZh: "具可摺疊式桌面與可摺疊式桌腳之桌鋸",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "ROBERT BOSCH GMBH",
        applicantAddress: "POSTFACH 30 02 20, 70442 STUTTGART, GERMANY",
        inventorNameEn: "WIKER, JUERGEN (DE); DAMMERTZ, RALPH (DE)",
      },
    },
    {
      applno: "102141391",
      chargeExpirOffset: { months: -2 },
      patentEdateOffset: { months: 48 },
      green: {
        applDate: "2013/11/14",
        publicationNo: "201431691",
        publicationDate: "2014/08/16",
        gazetteNo: "I607871",
        gazetteDate: "2017/12/11",
        certNo: "I607871",
        patentNameZh: "附有保護塗層之膜",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "SONY CHEMICALS CORP.",
        applicantAddress: "GATE CITY OSAKI, EAST TOWER 8TH FLOOR, 11-2, OSAKI 1-CHOME, SHINAGAWA-KU, TOKYO, JAPAN",
        inventorNameEn: "ISHIKAWA, KENTARO (JP); YANAGIDA, SATOSHI (JP)",
      },
      tipoOverrides: {
        agentName: "林景郁",
      },
    },
    {
      applno: "102143608",
      chargeExpirOffset: { months: -6, days: 3 },
      patentEdateOffset: { months: 24 },
      green: {
        applDate: "2007/12/07",
        publicationNo: "201419562",
        publicationDate: "2014/05/16",
        gazetteNo: "I514607",
        gazetteDate: "2015/12/21",
        certNo: "I514607",
        patentNameZh: "具紅外線抑制之光感測器及用於背光控制之感測器用法",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "INTERSIL AMERICAS INC.",
        applicantAddress: "1001 MURPHY RANCH ROAD, MILPITAS, CA 95035, U. S. A.",
        inventorNameEn:
          "KALNITSKY, ALEXANDER (US); ZHENG, DONG (CN); JONES, JOY (US); LIN, XIJIAN (US); CESTRA, GREGORY (US)",
      },
      yellowNoteOverrides: { invalidateNote: "有" },
    },
    {
      applno: "104122892",
      chargeExpirOffset: { months: -10 },
      patentEdateOffset: { months: 36 },
      green: {
        applDate: "2015/07/15",
        publicationNo: "201603858",
        publicationDate: "2016/02/01",
        gazetteNo: "I659764",
        gazetteDate: "2019/05/21",
        certNo: "I659764",
        patentNameZh: "用於在繩索上上升的上升器",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "ZEDEL",
        applicantAddress: "ZONE INDUSTRIELLE DE CROLLES, CIDEX 105A, F-38920 CROLLES, FRANCE",
        inventorNameEn: "MAURICE, ALAIN (FR); PLAZE, PIERRE (FR)",
      },
    },
    {
      applno: "104119683",
      chargeExpirOffset: { months: -18, days: 5 },
      patentEdateOffset: { months: 24 },
      green: {
        applDate: "2015/06/18",
        publicationNo: "201631744",
        publicationDate: "2016/09/01",
        gazetteNo: "I658571",
        gazetteDate: "2019/05/01",
        certNo: "I658571",
        patentNameZh: "電荷捕獲非揮發性記憶體裝置、製造其之方法及操作其之方法",
        agentName: "桂齊恆; 閻啟泰",
        applicantNameEn: "SK HYNIX INC",
        applicantAddress: "2091, GYEONGCHUNG-DAERO, BUBAL-EUB, ICHEON-SI, GYEONGGI-DO 467-734, KOREA",
        inventorNameEn: "KWON, YOUNG JOON (KR)",
      },
    },
    {
      applno: "105135708",
      chargeExpirOffset: { months: -36 },
      patentEdateOffset: { months: -1 },
      green: {
        applDate: "2016/11/03",
        publicationNo: "201722834",
        publicationDate: "2017/07/01",
        gazetteNo: "I704099",
        gazetteDate: "2020/09/11",
        certNo: "I704099",
        patentNameZh: "安全可移除錨定裝置",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "ZEDEL",
        applicantAddress: "ZONE INDUSTRIELLE DE CROLLES, CIDEX 105A, F-38920 CROLLES, FRANCE",
        inventorNameEn: "MAURICE, ALAIN (FR); MATHE, OLIVIER (FR); CHABOD, PIERRE-OLIVIER (FR)",
      },
      extinguishReason: "專利權期滿",
    },
    {
      applno: "107144679",
      chargeExpirOffset: { months: -20 },
      patentEdateOffset: { months: 60 },
      green: {
        applDate: "2018/12/12",
        publicationNo: "201930986",
        publicationDate: "2019/08/01",
        gazetteNo: "I839339",
        gazetteDate: "2024/04/21",
        certNo: "I839339",
        patentNameZh: "製造光學裝置的方法和產生的光學裝置",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "SIHTO N.V.",
        applicantAddress: "TECHNOLOGIEPARK 19, 9052 ZWIJNAARDE, BELGIUM",
        inventorNameEn: "MARCHAL, PAUL CECILE (BE); DE SMET, JELLE (BE); LIPS, WILBERT EDUARD MARIE (NL)",
      },
      extinguishReason: "年費逾期未繳，已逾復權期限",
    },
    {
      applno: "107142903",
      chargeExpirOffset: { months: 24 },
      patentEdateOffset: { months: 120 },
      green: {
        applDate: "2018/11/30",
        publicationNo: "201925515",
        publicationDate: "2019/07/01",
        gazetteNo: "I784098",
        gazetteDate: "2022/11/21",
        certNo: "I784098",
        patentNameZh: "用於氣相沈積含鈦膜的形成含鈦膜之組成物",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "L'AIR LIQUIDE, SOCIETE ANONYME POUR L'ETUDE ET L'EXPLOITATION DES PROCEDES GEORGES CLAUDE",
        applicantAddress: "75 QUAI D'ORSAY, F-75007 PARIS, FRANCE",
        inventorNameEn:
          "SANCHEZ, ANTONIO (ES); GIRARD, JEAN-MARC (FR); NIKIFOROV, GRIGORY (CA); BLASCO, NICOLAS (FR)",
      },
      tipoOverrides: {
        applicantAddress: "6 RUE COGNACQ-JAY, F-75007 PARIS, FRANCE",
      },
      yellowNoteOverrides: { licenseNote: "有" },
    },
    {
      applno: "102222085",
      chargeExpirOffset: { months: 18 },
      patentEdateOffset: { months: 84 },
      green: {
        applDate: "2013/11/26",
        publicationNo: "",
        publicationDate: "",
        gazetteNo: "M485523",
        gazetteDate: "2014/09/01",
        certNo: "M485523",
        patentNameZh: "具有防轉元件與減低焊料流動的接觸器",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "SAMTEC, INC.",
        applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
        inventorNameEn: "MONGOLD, JOHN (US); MUSSER, RANDALL (US); VICICH, BRIAN (US); PATTERSON, NEAL (US)",
      },
      tipoOverrides: {
        applicantNameEn: "SAMTEC, LLC.",
      },
    },
    {
      applno: "102142954",
      chargeExpirOffset: { months: -1 },
      patentEdateOffset: { months: 60 },
      green: {
        applDate: "2013/11/26",
        publicationNo: "201424172",
        publicationDate: "2014/06/16",
        gazetteNo: "I562482",
        gazetteDate: "2016/12/11",
        certNo: "I562482",
        patentNameZh: "順應銷連接器安裝系統與方法",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "SAMTEC, INC.",
        applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
        inventorNameEn: "MONGOLD, JOHN (US); MUSSER, RANDALL (US)",
      },
    },
    {
      applno: "102139516",
      chargeExpirOffset: { months: -12 },
      patentEdateOffset: { months: 48 },
      green: {
        applDate: "2013/10/31",
        publicationNo: "201421822",
        publicationDate: "2014/06/01",
        gazetteNo: "I569531",
        gazetteDate: "2017/02/01",
        certNo: "I569531",
        patentNameZh: "用於纜線外罩之樞轉式閂鎖",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "SAMTEC, INC.",
        applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
        inventorNameEn: "SCHMELZ, DALE FRANCIS (US); FAITH, CHADRICK PAUL (US); OUYANG, WILLIAM CHIENG (US)",
      },
    },
    {
      applno: "102306978",
      chargeExpirOffset: { months: -24 },
      patentEdateOffset: { months: -6 },
      green: {
        applDate: "2013/10/24",
        publicationNo: "",
        publicationDate: "",
        gazetteNo: "D161931",
        gazetteDate: "2014/07/21",
        certNo: "D161931",
        patentNameZh: "移動式馬桶",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "RICHELL CORPORATION",
        applicantAddress: "136 MIZUHASHI SAKURAGI, TOYAMA 939-0592 JAPAN (JP)",
        inventorNameEn: "MATSUDA, YOICHI (JP)",
      },
      tipoOverrides: {
        patentNameZh: "可移動式馬桶",
      },
      extinguishReason: "專利權期滿",
    },
    {
      applno: "103303803",
      chargeExpirOffset: { months: 36 },
      patentEdateOffset: { months: 108 },
      green: {
        applDate: "2014/06/27",
        publicationNo: "",
        publicationDate: "",
        gazetteNo: "D172199",
        gazetteDate: "2015/12/01",
        certNo: "D172199",
        patentNameZh: "連接件之部分",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "SAMTEC, INC.",
        applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
        inventorNameEn:
          "MCCARTIN, DOUGLAS EDWARD (US); BORGELT, JAMES EDWARD (US); SCHMELZ, DALE FRANCIS (US); NEWTON, JOSEPH TRAVIS (US); FAITH, CHADRICK PAUL (US)",
      },
    },
    {
      applno: "107307068",
      chargeExpirOffset: { days: -10 },
      patentEdateOffset: { months: 48 },
      green: {
        applDate: "2018/12/04",
        publicationNo: "",
        publicationDate: "",
        gazetteNo: "D202276",
        gazetteDate: "2020/01/21",
        certNo: "D202276",
        patentNameZh: "接觸端子",
        agentName: "閻啟泰; 林景郁",
        applicantNameEn: "SAMTEC, INC.",
        applicantAddress: "520 PARK EAST BOULEVARD, NEW ALBANY, IN 47151-1147, U. S. A.",
        inventorNameEn: "MUSSER, RANDALL E. (US); BUCK, JONATHAN E. (US)",
      },
      yellowNoteOverrides: { pledgeNote: "有" },
    },
  ];
}

export function buildRawRows(today: Date): RawPatentRow[] {
  return buildSeedRows().map((seed) => {
    const chargeExpirDate = offset(today, seed.chargeExpirOffset);
    const patentEdate = offset(today, seed.patentEdateOffset);
    const status = evaluatePatentStatus({ today, patentEdate, chargeExpirDate });
    const isExtinguished = status === "案件已消滅";

    const green: GreenFields = { applicantNameZh: "", inventorNameZh: "", ...seed.green };
    const tipo: GreenFields = { ...green, ...seed.tipoOverrides };

    const tipoYellow: YellowFields = {
      licenseNote: NO_NOTE,
      pledgeNote: NO_NOTE,
      transferNote: NO_NOTE,
      inheritNote: NO_NOTE,
      trustNote: NO_NOTE,
      opposeNote: NO_NOTE,
      invalidateNote: NO_NOTE,
      ...seed.yellowNoteOverrides,
      extinguishDate: isExtinguished
        ? formatDate(patentEdate.getTime() <= today.getTime() ? patentEdate : offset(chargeExpirDate, { months: 18 }))
        : "",
      extinguishReason: isExtinguished ? seed.extinguishReason ?? "案件已消滅" : "",
      revokeDate: "",
      revokeReason: "",
      patentStartDate: green.gazetteDate,
      patentEndDate: formatDate(patentEdate),
      chargeExpirDateLabel: formatDate(chargeExpirDate),
      chargeExpirYear: `第 ${yearsBetween(parseSlashDate(green.gazetteDate), chargeExpirDate)} 年`,
    };

    return {
      applno: seed.applno,
      patentName: tipo.patentNameZh,
      applicant: tipo.applicantNameEn,
      chargeExpirDate,
      patentEdate,
      internal: green,
      tipo,
      tipoYellow,
    };
  });
}

export function buildMockRows(today: Date = new Date()): PatentRow[] {
  return buildRawRows(today).map((row) => ({
    ...row,
    applClass: parseApplClass(row.applno),
    // buildRawRows() 一律填入非 null 的日期（示範資料無 PatentPub-only 情境），
    // 非 null 斷言僅用於滿足型別（RawPatentRow 因真實 API 可能為 null 而放寬）。
    status: evaluatePatentStatus({
      today,
      patentEdate: row.patentEdate!,
      chargeExpirDate: row.chargeExpirDate!,
    }),
  }));
}

/** 轉換為 lib/field-compare.ts 所需的比對輸入格式。 */
export function toComparableRow(row: PatentRow): ComparableRow {
  return {
    applno: row.applno,
    internal: row.internal as unknown as Record<string, string>,
    tipo: row.tipo as unknown as Record<string, string>,
    tipoYellow: row.tipoYellow as unknown as Record<string, string>,
  };
}
