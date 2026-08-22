import { describe, expect, it } from "vitest";
import {
  buildPatentPubUrl,
  buildPatentRightsUrl,
  decodeReasonCode,
  extractPatentContents,
  extractPatentPubContents,
  formatNoteCount,
  groupApplnosByClass,
  mapPatentContentToRow,
  mapPatentPubContentToRow,
  parseSlashDateOrNull,
  type TipoApiEnvelope,
} from "./tipo-api";

describe("groupApplnosByClass", () => {
  it("依第4碼分組為 1/2/3", () => {
    const { groups, invalid } = groupApplnosByClass(["111100123", "110200456", "108300789"]);
    expect(groups[1]).toEqual(["111100123"]);
    expect(groups[2]).toEqual(["110200456"]);
    expect(groups[3]).toEqual(["108300789"]);
    expect(invalid).toEqual([]);
  });

  it("無法判定類別的案號歸入 invalid，不影響其他分組", () => {
    const { groups, invalid } = groupApplnosByClass(["111100123", "abc", ""]);
    expect(groups[1]).toEqual(["111100123"]);
    expect(invalid).toEqual(["abc"]);
  });
});

describe("buildPatentRightsUrl", () => {
  it("組出正確的查詢參數，applno 以 | 分隔", () => {
    const url = buildPatentRightsUrl({ applclass: 1, applnos: ["100114238", "101137580"], tk: "TESTTOKEN" });
    expect(url).toContain("https://cloud.tipo.gov.tw/S220/opdataapi/api/PatentRights?");
    expect(url).toContain("format=json");
    expect(url).toContain("applclass=1");
    expect(url).toContain("applno=100114238%7C101137580");
    expect(url).toContain("tk=TESTTOKEN");
    expect(url).toContain("top=2");
  });

  it("top 上限為 5000，避免帶入超量筆數", () => {
    const many = Array.from({ length: 6000 }, (_, i) => String(100000000 + i));
    const url = buildPatentRightsUrl({ applclass: 1, applnos: many, tk: "x" });
    expect(url).toContain("top=5000");
  });
});

const SAMPLE_ENVELOPE: TipoApiEnvelope = {
  version: "1.0",
  status: "ok",
  message: "",
  "total-count": 613,
  "tw-patent-rightsI": {
    "-page-count": 1,
    "-create-date": "2023/06/02",
    patentcontent: {
      "-sequence": 1,
      "publication-reference": {
        "notice-no": 200806726,
        "notice-date": "2008/02/01",
        "publish-no": "I498367",
        "publish-date": "2015/09/01",
      },
      "application-reference": {
        "appl-no": "096110624",
        "appl-date": "2007/03/27",
        "appl-class": "1",
        "appl-class-desc": "發明",
      },
      "patent-title": {
        "patent-name-chinese": "含分散有奈米黏土的聚合物組成物之安裝基板",
        "patent-name-english": "Mounting substrate containing polymer composition with nanoclays dispersed therein",
      },
      "patent-right": {
        "patent-no": "I498367",
        "patent-bdate": "2015/09/01",
        "patent-edate": "2027/03/26",
        "charge-expir-date": "2018/08/31",
        "charge-expir-year": "3",
        "rent-status": 0,
        "mortgage-status": 0,
        "transfer-status": 0,
        "inherit-status": 0,
        "trust-status": 0,
        "opposition-status": 0,
        "nullity-status": 0,
        "cancel-date": "2018/09/01",
        "cancel-result": "48105",
        "revoke-date": null,
        "revoke-code": null,
      },
      parties: {
        applicants: [
          {
            "-sequence": 1,
            "chinese-name": "英特爾股份有限公司",
            "english-name": "INTEL CORPORATION",
            address: "美國",
            "english-country": "US",
            "chinese-country": "美國",
            "english-address": "2200 MISSION COLLEGE BLVD., SANTA CLARA, CA 95052, USA",
          },
        ],
        inventors: [
          {
            "-sequence": 1,
            "chinese-name": "普拉維恩 比瑪拉傑",
            "english-name": "BHIMARAJ, PRAVEEN",
            "english-country": "IN",
            "chinese-country": "印度",
          },
          {
            "-sequence": 2,
            "chinese-name": "歐瑪 比海爾",
            "english-name": "BCHIR, OMAR J.",
            "english-country": "US",
            "chinese-country": "美國",
          },
        ],
        agents: [
          {
            "-sequence": 1,
            "chinese-name": "林志剛",
            "english-name": null,
            address: "臺北市中山區南京東路2段125號7樓",
            "english-country": "TW",
            "chinese-country": "中華民國",
          },
        ],
      },
    },
  },
};

describe("extractPatentContents", () => {
  it("找出 tw-patent-rightsI 包裹欄位，單筆物件正規化為陣列", () => {
    const items = extractPatentContents(SAMPLE_ENVELOPE);
    expect(items).toHaveLength(1);
    const [first] = items;
    expect((first?.["application-reference"] as Record<string, unknown>)["appl-no"]).toBe("096110624");
  });

  it("wrapper key 為 tw-patent-rightsM/D 時同樣能抓到（不寫死發明版）", () => {
    const envelope: TipoApiEnvelope = { "tw-patent-rightsD": { patentcontent: [{ foo: "bar" }] } };
    const items = extractPatentContents(envelope);
    expect(items).toEqual([{ foo: "bar" }]);
  });

  it("查無資料時回傳空陣列", () => {
    expect(extractPatentContents({ status: "ok" })).toEqual([]);
  });
});

describe("mapPatentContentToRow — 以官方文件範例 JSON 為 fixture", () => {
  const [item] = extractPatentContents(SAMPLE_ENVELOPE);
  if (!item) throw new Error("fixture 缺少 patentcontent");
  const row = mapPatentContentToRow(item);

  it("正確映射綠底欄位", () => {
    expect(row.applno).toBe("096110624");
    expect(row.green.applDate).toBe("2007/03/27");
    expect(row.green.publicationNo).toBe("200806726");
    expect(row.green.gazetteNo).toBe("I498367");
    expect(row.green.certNo).toBe("I498367");
    expect(row.green.patentNameZh).toBe("含分散有奈米黏土的聚合物組成物之安裝基板");
    expect(row.green.agentName).toBe("林志剛");
    expect(row.green.applicantNameZh).toBe("英特爾股份有限公司");
    expect(row.green.applicantNameEn).toBe("INTEL CORPORATION");
    expect(row.green.applicantAddress).toBe("2200 MISSION COLLEGE BLVD., SANTA CLARA, CA 95052, USA");
    expect(row.green.inventorNameZh).toBe("普拉維恩 比瑪拉傑; 歐瑪 比海爾");
    expect(row.green.inventorNameEn).toBe("BHIMARAJ, PRAVEEN (IN); BCHIR, OMAR J. (US)");
  });

  it("正確映射黃底欄位，註記次數與消滅原因代碼皆解碼", () => {
    expect(row.yellow.licenseNote).toBe("無");
    expect(row.yellow.patentStartDate).toBe("2015/09/01");
    expect(row.yellow.patentEndDate).toBe("2027/03/26");
    expect(row.yellow.chargeExpirDateLabel).toBe("2018/08/31");
    expect(row.yellow.chargeExpirYear).toBe("第 3 年");
    expect(row.yellow.extinguishDate).toBe("2018/09/01");
    expect(row.yellow.extinguishReason).toBe("未依限繳費（代碼 48105）");
    expect(row.yellow.revokeDate).toBe("");
  });

  it("正確解析日期欄位供狀態判定使用", () => {
    expect(row.patentEdate?.toISOString().slice(0, 10)).toBe("2027-03-26");
    expect(row.chargeExpirDate?.toISOString().slice(0, 10)).toBe("2018-08-31");
  });
});

describe("formatNoteCount", () => {
  it("0 或缺值顯示為「無」", () => {
    expect(formatNoteCount(0)).toBe("無");
    expect(formatNoteCount(null)).toBe("無");
    expect(formatNoteCount(undefined)).toBe("無");
  });
  it("大於 0 顯示次數", () => {
    expect(formatNoteCount(2)).toBe("有（2 次）");
    expect(formatNoteCount("3")).toBe("有（3 次）");
  });
});

describe("decodeReasonCode", () => {
  it("已知代碼附上中文說明", () => {
    expect(decodeReasonCode("48105")).toBe("未依限繳費（代碼 48105）");
  });
  it("未知代碼原樣顯示", () => {
    expect(decodeReasonCode("99999")).toBe("99999");
  });
  it("空值回傳空字串", () => {
    expect(decodeReasonCode(null)).toBe("");
    expect(decodeReasonCode(undefined)).toBe("");
  });
});

describe("parseSlashDateOrNull", () => {
  it("正確解析 YYYY/MM/DD", () => {
    expect(parseSlashDateOrNull("2027/03/26")?.toISOString().slice(0, 10)).toBe("2027-03-26");
  });
  it("空值或無法解析回傳 null", () => {
    expect(parseSlashDateOrNull("")).toBe(null);
    expect(parseSlashDateOrNull(null)).toBe(null);
    expect(parseSlashDateOrNull("not-a-date")).toBe(null);
  });
});

describe("buildPatentPubUrl", () => {
  it("組出正確的查詢參數，不需 applclass（見官方文件表 40）", () => {
    const url = buildPatentPubUrl({ applnos: ["111142934"], tk: "TESTTOKEN" });
    expect(url).toContain("https://cloud.tipo.gov.tw/S220/opdataapi/api/PatentPub?");
    expect(url).toContain("format=json");
    expect(url).toContain("applno=111142934");
    expect(url).toContain("tk=TESTTOKEN");
    expect(url).not.toContain("applclass");
  });
});

// fixture 取自官方文件表 43（發明公開案-JSON 格式範例，第 71~72 頁）
const PATENT_PUB_ENVELOPE: TipoApiEnvelope = {
  version: "1.0",
  status: "ok",
  message: "",
  "total-count": 3816,
  "tw-patent-pub": {
    "-page-count": 1,
    "-create-date": "2023/06/02",
    patentcontent: {
      "-sequence": 1,
      "publication-reference": {
        "notice-no": 201500001,
        "notice-volno": 13,
        "notice-isuno": 1,
        "notice-date": "2015/01/01",
      },
      "application-reference": {
        "appl-no": "102122330",
        "appl-date": "2013/06/24",
        "first-date": "2013/06/24",
        "foreign-language": null,
      },
      "patent-title": {
        "patent-name-chinese": "一種可供植栽後盆菜保鮮維生之植栽方法及其容器",
        "patent-name-english": null,
      },
      parties: {
        applicants: [
          {
            "-sequence": 1,
            "chinese-name": "華楙生技股份有限公司",
            "english-name": null,
            address: "桃園市蘆竹區蘆興街 93 號",
            "english-country": "TW",
            "chinese-country": "中華民國",
            "english-address": null,
          },
        ],
        inventors: [
          {
            "-sequence": 1,
            "chinese-name": "宋家嚴",
            "english-name": null,
            "english-country": "TW",
            "chinese-country": "中華民國",
          },
        ],
        agents: [
          {
            "-sequence": 1,
            "chinese-name": "洪振雄",
            "english-name": "HORNG, JENN SHYONG",
            address: "新北市新莊區昌隆街 88 號 4 樓",
            "english-country": "TW",
            "chinese-country": "中華民國",
          },
        ],
      },
    },
  },
};

describe("extractPatentPubContents", () => {
  it("找出 tw-patent-pub 包裹欄位，單筆物件正規化為陣列", () => {
    const items = extractPatentPubContents(PATENT_PUB_ENVELOPE);
    expect(items).toHaveLength(1);
    expect((items[0]?.["application-reference"] as Record<string, unknown>)["appl-no"]).toBe("102122330");
  });

  it("查無資料時回傳空陣列", () => {
    expect(extractPatentPubContents({ status: "ok" })).toEqual([]);
  });
});

describe("mapPatentPubContentToRow — 以官方文件表 43 範例 JSON 為 fixture", () => {
  const [item] = extractPatentPubContents(PATENT_PUB_ENVELOPE);
  if (!item) throw new Error("fixture 缺少 patentcontent");
  const row = mapPatentPubContentToRow(item);

  it("正確映射可取得的書目欄位", () => {
    expect(row.applno).toBe("102122330");
    expect(row.green.applDate).toBe("2013/06/24");
    expect(row.green.publicationNo).toBe("201500001");
    expect(row.green.publicationDate).toBe("2015/01/01");
    expect(row.green.patentNameZh).toBe("一種可供植栽後盆菜保鮮維生之植栽方法及其容器");
    expect(row.green.applicantNameZh).toBe("華楙生技股份有限公司");
    expect(row.green.agentName).toBe("洪振雄");
    expect(row.green.inventorNameZh).toBe("宋家嚴");
  });

  it("2026-08-21 業主回饋 5.：沒有 patent-right 物件，patentEdate/chargeExpirDate 一律為 null，證書號/公告號等欄位留空", () => {
    expect(row.patentEdate).toBe(null);
    expect(row.chargeExpirDate).toBe(null);
    expect(row.green.certNo).toBe("");
    expect(row.green.gazetteNo).toBe("");
    expect(row.yellow.licenseNote).toBe("無");
    expect(row.yellow.chargeExpirDateLabel).toBe("");
  });
});

describe("回歸測試：mapPatentContentToRow 的結果經過 API Route 的 JSON 序列化後仍可還原日期", () => {
  // 這個測試記錄一個真實踩過的坑：NextResponse.json() 會把 Date 物件序列化成 ISO
  // 字串，前端 fetch().then(r => r.json()) 拿到的 patentEdate/chargeExpirDate 其實是
  // 字串而非 Date 實例；若沒有 new Date(...) 還原就直接丟進 evaluatePatentStatus()，
  // 會在呼叫 .getFullYear() 等方法時噴出 "date.getFullYear is not a function"。
  it("JSON 往返後日期欄位會變成字串，需要 new Date() 還原", () => {
    const [item] = extractPatentContents(SAMPLE_ENVELOPE);
    if (!item) throw new Error("fixture 缺少 patentcontent");
    const row = mapPatentContentToRow(item);

    const wireRow = JSON.parse(JSON.stringify(row));
    expect(typeof wireRow.patentEdate).toBe("string");

    const revived = wireRow.patentEdate ? new Date(wireRow.patentEdate) : null;
    expect(revived).toBeInstanceOf(Date);
    expect(revived?.toISOString().slice(0, 10)).toBe(row.patentEdate?.toISOString().slice(0, 10));
  });
});
