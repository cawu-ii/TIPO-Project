import { NextRequest, NextResponse } from "next/server";
import {
  buildPatentRightsUrl,
  extractPatentContents,
  groupApplnosByClass,
  mapPatentContentToRow,
  type ApplClass,
  type TipoApiEnvelope,
  type TipoMappedRow,
} from "@/lib/tipo-api";

/**
 * 伺服器端代理 TIPO PatentRights API。
 *
 * 為什麼要走 API Route 而不是前端直接呼叫（見 CLAUDE.md 強制限制）：
 * - `tk` 驗證碼絕不能出現在瀏覽器可見的程式碼或網路請求中
 * - TIPO API 本身也未開放瀏覽器端 CORS，前端直接呼叫會被瀏覽器阻擋
 *
 * 尚未設定 TIPO_API_TOKEN 時，比照 TIPO 官方行為：帶空字串 tk 呼叫，
 * TIPO 會回傳 status="sample" 及官方範例資料，而不是報錯 —
 * 讓整條串接邏輯在正式核發 tk 之前就能被完整測試。
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

  return NextResponse.json({
    rows,
    sampleMode,
    groupErrors,
    invalidApplnos: invalid,
  });
}
