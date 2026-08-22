import { NextRequest, NextResponse } from "next/server";
import {
  buildPatentPubUrl,
  buildPatentRightsUrl,
  extractPatentContents,
  extractPatentPubContents,
  groupApplnosByClass,
  mapPatentContentToRow,
  mapPatentPubContentToRow,
  type ApplClass,
  type TipoApiEnvelope,
  type TipoMappedRow,
} from "@/lib/tipo-api";

/**
 * 伺服器端代理 TIPO PatentRights API，並在查無資料時 fallback 到 PatentPub（發明公開案）。
 *
 * 為什麼要走 API Route 而不是前端直接呼叫（見 CLAUDE.md 強制限制）：
 * - `tk` 驗證碼絕不能出現在瀏覽器可見的程式碼或網路請求中
 * - TIPO API 本身也未開放瀏覽器端 CORS，前端直接呼叫會被瀏覽器阻擋
 *
 * 尚未設定 TIPO_API_TOKEN 時，比照 TIPO 官方行為：帶空字串 tk 呼叫，
 * TIPO 會回傳 status="sample" 及官方範例資料，而不是報錯 —
 * 讓整條串接邏輯在正式核發 tk 之前就能被完整測試。
 *
 * 2026-08-21 業主回饋 5.：PatentRights 只涵蓋已核准案件，對於已公開但尚未核准的申請案，
 * 查詢會回傳查無資料。因此在 PatentRights 查完之後，把「原本要查但沒查到」的 applno
 * 集合起來，再打一次 PatentPub（發明公開案）API 補查——PatentPub 不分 applclass，
 * 一次查完即可。兩邊查到的結果合併回傳，前端 lib/build-rows.ts 會依有無
 * patentEdate/chargeExpirDate 判斷是走既有四階狀態判定、還是標記為「尚未核准（僅公開）」。
 */
export const dynamic = "force-dynamic";

interface GroupError {
  applclass: number;
  message: string;
}

export async function POST(request: NextRequest) {
  let body: { applnos?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤，需為 JSON" }, { status: 400 });
  }

  const applnos = Array.isArray(body.applnos)
    ? body.applnos.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    : [];

  if (applnos.length === 0) {
    return NextResponse.json({ error: "applnos 不可為空" }, { status: 400 });
  }

  const tk = process.env.TIPO_API_TOKEN ?? "";
  const { groups, invalid } = groupApplnosByClass(applnos);

  const rows: TipoMappedRow[] = [];
  const groupErrors: GroupError[] = [];
  let sampleMode = false;

  const classEntries = Object.entries(groups) as [string, string[]][];

  await Promise.all(
    classEntries.map(async ([classKey, list]) => {
      const applclass = Number(classKey) as ApplClass;
      const url = buildPatentRightsUrl({ applclass, applnos: list, tk });
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          groupErrors.push({ applclass, message: `TIPO 服務回應 HTTP ${res.status}` });
          return;
        }
        const json = (await res.json()) as TipoApiEnvelope;
        if (json.status === "error") {
          groupErrors.push({ applclass, message: json.message || "TIPO 回傳參數錯誤" });
          return;
        }
        if (json.status === "sample") {
          sampleMode = true;
        }
        for (const item of extractPatentContents(json)) {
          const mapped = mapPatentContentToRow(item);
          if (mapped.applno) rows.push(mapped);
        }
      } catch (err) {
        groupErrors.push({
          applclass,
          message: err instanceof Error ? err.message : "呼叫 TIPO API 時發生網路錯誤",
        });
      }
    })
  );

  // PatentRights 查完後，找出「原本要查、但這批結果裡沒有」的 applno，
  // 補打一次 PatentPub（發明公開案）——這些多半是已公開但尚未核准的案件。
  const foundApplnos = new Set(rows.map((r) => r.applno));
  const stillMissing = applnos.filter((a) => !invalid.includes(a) && !foundApplnos.has(a));

  if (stillMissing.length > 0) {
    const url = buildPatentPubUrl({ applnos: stillMissing, tk });
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        groupErrors.push({ applclass: 0, message: `PatentPub 服務回應 HTTP ${res.status}` });
      } else {
        const json = (await res.json()) as TipoApiEnvelope;
        if (json.status === "error") {
          groupErrors.push({ applclass: 0, message: json.message || "PatentPub 回傳參數錯誤" });
        } else {
          if (json.status === "sample") sampleMode = true;
          for (const item of extractPatentPubContents(json)) {
            const mapped = mapPatentPubContentToRow(item);
            if (mapped.applno) rows.push(mapped);
          }
        }
      }
    } catch (err) {
      groupErrors.push({
        applclass: 0,
        message: err instanceof Error ? err.message : "呼叫 PatentPub API 時發生網路錯誤",
      });
    }
  }

  return NextResponse.json({
    rows,
    sampleMode,
    groupErrors,
    invalidApplnos: invalid,
  });
}
