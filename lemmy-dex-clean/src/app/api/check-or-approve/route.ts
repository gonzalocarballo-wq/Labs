import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const ERC20_ABI = ["function approve(address spender, uint256 value) returns (bool)"];

export async function POST(req: Request) {
  try {
    const { walletAddress, token, amount } = await req.json();
    
    if (!walletAddress || !token) {
      throw new Error("Faltan parámetros requeridos: walletAddress, token");
    }

    // Paso 1: Llamar al endpoint de Uniswap para verificar approval
    const uniswapResponse = await fetch("https://trade-api.gateway.uniswap.org/v1/check_approval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.UNISWAP_API_KEY!,
      },
      body: JSON.stringify({
        walletAddress,
        token,
        amount
      }),
    });
    
    const uniswapData = await uniswapResponse.json();
    
    if (!uniswapResponse.ok) {
      throw new Error(JSON.stringify(uniswapData));
    }

    // Paso 2: Verificar si ya está aprobado
    if (uniswapData.approval === null) {
      // Ya está aprobado
      return NextResponse.json({
        ok: true,
        approved: true,
        tx: null,
        spender: PERMIT2
      });
    }

    // Paso 3: Si hay datos de approval, usar la transacción de Uniswap
    if (uniswapData.approval && uniswapData.approval.approve) {
      return NextResponse.json({
        ok: true,
        approved: false,
        tx: uniswapData.approval.approve,
        spender: PERMIT2
      });
    }

    // Paso 4: Fallback - generar approve manualmente si no hay datos
    const iface = new ethers.Interface(ERC20_ABI);
    const data = iface.encodeFunctionData("approve", [
      PERMIT2,
      ethers.MaxUint256,
    ]);

    const fallbackTx = {
      to: token,
      data,
      value: "0x0",
    };

    return NextResponse.json({
      ok: true,
      approved: false,
      tx: fallbackTx,
      spender: PERMIT2
    });

  } catch (err: any) {
    return NextResponse.json({ 
      ok: false, 
      error: err.message 
    }, { status: 400 });
  }
}
