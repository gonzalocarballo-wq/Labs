import { NextResponse } from "next/server";
import { ethers } from "ethers";

const ERC20_ABI = ["function decimals() view returns (uint8)"];

const CHAIN_IDS: Record<string, number> = {
  polygon: 137,
};

const WRAPPED_TOKENS: Record<number, string> = {
  137: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", // WMATIC
};

export async function POST(req: Request) {
  try {
    const { sellToken, buyToken, amount, swapper, chain = "polygon" } = await req.json();

    if (!sellToken || !buyToken || !amount || !swapper) {
      throw new Error("Faltan parámetros: sellToken, buyToken, amount, swapper");
    }

    const chainId = CHAIN_IDS[chain] || 137;
    const rpc = process.env.RPC_URL_POLYGON || "https://polygon-rpc.com";
    const provider = new ethers.JsonRpcProvider(rpc);

    // 1) Normalizamos tokenIn: si viene MATIC nativo, lo envolvemos a WMATIC
    let tokenIn = sellToken;
    const MATIC_NATIVE = "0x0000000000000000000000000000000000001010".toLowerCase();
    if (sellToken.toLowerCase() === MATIC_NATIVE) {
      tokenIn = WRAPPED_TOKENS[chainId];
      console.log("🔁 MATIC nativo detectado → usando WMATIC:", tokenIn);
    }

    // 2) Obtenemos decimales de tokenIn para parsear amount en base units
    let decimals = 18;
    try {
      const c = new ethers.Contract(tokenIn, ERC20_ABI, provider);
      decimals = await c.decimals();
    } catch (e) {
      console.warn("⚠️ No se pudo leer 'decimals' de tokenIn; usando 18");
    }

    // 3) Convertimos amount (ej. "0.1") a base units (string sin punto)
    const amountWei = ethers.parseUnits(amount.toString(), decimals).toString();

    // 4) Armamos payload correcto para Trade API v1/quote
    const payload = {
      type: "EXACT_INPUT",
      tokenIn,
      tokenInChainId: chainId,
      tokenOut: buyToken,
      tokenOutChainId: chainId,
      amount: amountWei,
      swapper,
      routingPreference: "BEST_PRICE",
      enableUniversalRouter: true,
      includeGas: true,
    };

    console.log("📦 Payload /v1/quote:", payload);

    const res = await fetch("https://trade-api.gateway.uniswap.org/v1/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.UNISWAP_API_KEY!,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Trade API /quote error:", data);
      return NextResponse.json({ ok: false, error: data?.detail || `HTTP ${res.status}` }, { status: 400 });
    }

    // 5) Calculamos formattedAmountOut de forma robusta:
    //    prioridad: quote.buyAmountDecimal → output.amount + decs
    let formattedAmountOut = "0";
    try {
      if (data?.quote?.buyAmountDecimal) {
        formattedAmountOut = data.quote.buyAmountDecimal;
      } else if (data?.quote?.output?.amount) {
        // intentamos obtener decimales del tokenOut de la respuesta (si viniera)
        const outDecFromRoute =
          data?.quote?.route?.[0]?.[0]?.tokenOut?.decimals
            ? Number(data.quote.route[0][0].tokenOut.decimals)
            : undefined;
        const outDecFromOutput =
          data?.quote?.output?.token?.decimals
            ? Number(data.quote.output.token.decimals)
            : undefined;
        const outDec = outDecFromOutput ?? outDecFromRoute ?? 6; // fallback típico USDC.e

        formattedAmountOut = ethers.formatUnits(data.quote.output.amount, outDec);
      }
    } catch (e) {
      console.warn("⚠️ No se pudo formatear buyAmount:", e);
    }

    const hasMethodParameters = !!data?.quote?.methodParameters;
    const quoteId = data?.quote?.quoteId;

    console.log("✅ Quote OK → out:", formattedAmountOut, "quoteId:", quoteId, "methodParams?:", hasMethodParameters);

    return NextResponse.json({
      ok: true,
      quote: data.quote, // IMPORTANTE: incluye quoteId (lo usás luego en /api/swap)
      formattedAmountOut,
    });
  } catch (err: any) {
    console.error("❌ /api/quote error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
