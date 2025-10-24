import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sellToken, buyToken, amount, swapper } = body;

    if (!sellToken || !buyToken || !amount || !swapper) {
      throw new Error("Faltan parámetros obligatorios: sellToken, buyToken, amount o swapper.");
    }

    const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY;
    if (!UNISWAP_API_KEY) throw new Error("Falta UNISWAP_API_KEY en el entorno.");

    // ============================================
    // 🔹 Detectar chains
    // ============================================
    const tokenInChainId = 137;  // Polygon mainnet
    const tokenOutChainId = 137;

    // ✅ Detectar token nativo (MATIC)
    const sellTokenForAPI =
      sellToken.toLowerCase() === "matic" ||
      sellToken.toLowerCase() === "0x0000000000000000000000000000000000001010"
        ? "NATIVE"
        : sellToken;

    const buyTokenForAPI =
      buyToken.toLowerCase() === "matic" ||
      buyToken.toLowerCase() === "0x0000000000000000000000000000000000001010"
        ? "NATIVE"
        : buyToken;

    // ============================================
    // 🔹 Convertir amount a base units
    // ============================================
    // ============================================
// 🔹 Obtener decimales reales del token
// ============================================
// ============================================
// 🔹 Obtener decimales reales del token (versión robusta)
// ============================================

const getTokenDecimals = async (tokenAddress: string): Promise<number> => {
  // Caso token nativo (MATIC)
  if (
    tokenAddress === "NATIVE" ||
    tokenAddress.toLowerCase() === "0x0000000000000000000000000000000000001010"
  ) {
    return 18;
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_POLYGON);
    const erc20 = new ethers.Contract(
      tokenAddress,
      ["function decimals() view returns (uint8)"],
      provider
    );

    // Leer decimales del contrato
    const decimals = await erc20.decimals();

    // Validar valor razonable (por seguridad)
    if (decimals < 2 || decimals > 36) {
      console.warn(`⚠️ Valor de decimales fuera de rango (${decimals}), usando 18 por defecto`);
      return 18;
    }

    return Number(decimals);
  } catch (err) {
    console.warn(`⚠️ Error al leer decimales de ${tokenAddress}, usando 18 por defecto.`);
    return 18;
  }
}

// Ejecutar función
const decimals = await getTokenDecimals(sellTokenForAPI);

// Convertir a base units
let amountInBaseUnits: string;
try {
  amountInBaseUnits = ethers.parseUnits(amount.toString(), decimals).toString();
} catch (err) {
  console.warn(`⚠️ Error al parsear amount con ${decimals} decimales. Reintentando como string.`);
  amountInBaseUnits = ethers.parseUnits(String(Number(amount)), decimals).toString();
}

console.log("💰 amountInBaseUnits:", amountInBaseUnits, "decimals:", decimals);


    // ============================================
    // 🔹 Payload exacto según documentación
    // ============================================
    const payload = {
      type: "EXACT_INPUT",
      amount: amountInBaseUnits,
      tokenInChainId,
      tokenOutChainId,
      tokenIn: sellTokenForAPI,
      tokenOut: buyTokenForAPI,
      swapper, // ✅ campo correcto según la doc actual
      routingPreference: "BEST_PRICE",
      includeGas: true,
      autoSlippage: "DEFAULT",
      enableUniversalRouter: true,
    };

    console.log("💰 amountInBaseUnits:", amountInBaseUnits, "decimals:", decimals);
    console.log("📤 Enviando payload a Uniswap /v1/quote:", JSON.stringify(payload, null, 2));
    
    // ============================================
    // 🔹 Llamar a la API
    // ============================================
    const res = await fetch("https://trade-api.gateway.uniswap.org/v1/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": UNISWAP_API_KEY,
        "x-universal-router-version": "2.0",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Error desde Trade API (detalle completo):", JSON.stringify(data, null, 2));
      return NextResponse.json({
        ok: false,
        error: "Error desde Trade API",
        details: data,
      });
    }

    // ============================================
    // 🔹 Parsear respuesta
    // ============================================
    const quoteOut =
      data?.quote?.output?.amount ||
      data?.quote?.aggregatedOutputs?.[0]?.amount ||
      "0";

    // Detectar correctamente los decimales del token de salida
let decimalsOut = 18;
try {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_POLYGON);
  const erc20Out = new ethers.Contract(
    buyTokenForAPI,
    ["function decimals() view returns (uint8)"],
    provider
  );
  decimalsOut = await erc20Out.decimals();
} catch {
  decimalsOut = 18;
}

// La API devuelve amount en base units reales, así que solo dividimos según los decimales correctos del tokenOut
const formattedAmountOut = ethers.formatUnits(quoteOut.toString(), decimalsOut);


    

    const hasMethodParameters =
      data?.quote?.methodParameters?.to && data?.quote?.methodParameters?.calldata;

    console.log("✅ Quote recibido:", {
      formattedAmountOut,
      hasMethodParameters,
      tokenInChainId,
      tokenOutChainId,
      sellTokenForAPI,
      buyTokenForAPI,
    });

    return NextResponse.json({
      ok: true,
      quote: data.quote,
      formattedAmountOut,
    });
  } catch (err: any) {
    console.error("❌ /api/quote error:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
