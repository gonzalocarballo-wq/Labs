import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const res = await fetch("https://trade-api.gateway.uniswap.org/v1/check_approval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.UNISWAP_API_KEY!,
      },
      body: JSON.stringify(body),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }
    
    return NextResponse.json({ ok: true, approval: data.approval, cancel: data.cancel });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
