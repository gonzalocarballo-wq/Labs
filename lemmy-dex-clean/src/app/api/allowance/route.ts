import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Uniswap usa Permit2 como spender por defecto en Universal Router
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export async function POST(req: Request) {
  try {
    const { token, owner, amount, spender } = await req.json();

    if (!token || !owner || !amount) {
      throw new Error("Faltan parámetros: token, owner, amount");
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_POLYGON);
    const erc20 = new ethers.Contract(token, ERC20_ABI, provider);

    const [dec] = await Promise.all([erc20.decimals()]);
    // amount viene en “human units” (ej: "1.23")
    const amountWei = ethers.parseUnits(String(amount), dec);

    const useSpender = (spender ?? PERMIT2) as string;
    const current = await erc20.allowance(owner, useSpender);

    return NextResponse.json({
      ok: true,
      token,
      owner,
      spender: useSpender,
      decimals: Number(dec),
      allowance: current.toString(),
      allowanceFormatted: ethers.formatUnits(current, dec),
      required: amountWei.toString(),
      requiredFormatted: amount,
      enough: current >= amountWei,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
