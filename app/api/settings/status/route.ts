import { NextResponse } from "next/server";

/**
 * 提供「設定」面板顯示用的連線狀態，僅回傳布林值 —— 絕不可把 tk 本身
 * 傳回前端（見 CLAUDE.md「NEVER hardcode TIPO API token in client-side code」）。
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const tk = process.env.TIPO_API_TOKEN ?? "";
  return NextResponse.json({ tipoTokenConfigured: tk.trim().length > 0 });
}
