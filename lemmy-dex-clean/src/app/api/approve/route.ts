import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const ERC20_ABI = ["function approve(address spender, uint256 value) returns (bool)"];

export async function POST(req: Request) {
  try {
    const { token, spender } = await req.json();
    if (!token) throw new Error("Falta 'token'");

    const iface = new ethers.Interface(ERC20_ABI);
    const data = iface.encodeFunctionData("approve", [
      (spender ?? PERMIT2) as string,
      ethers.MaxUint256,
    ]);

    return NextResponse.json({
      ok: true,
      tx: {
        to: token,
        data,
        value: "0x0",
      },
      note: "Firma/ejecuta esta tx desde tu Safe. Esto otorga allowance MaxUint256.",
      spender: spender ?? PERMIT2,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
