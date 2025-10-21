import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "lemmy-dex-panel", ts: Date.now() });
}
