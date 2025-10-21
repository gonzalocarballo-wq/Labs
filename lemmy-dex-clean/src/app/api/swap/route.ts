import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📦 Body recibido en /api/swap:", body);

    const { quote, swapper, recipient } = body;
    const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY;
    if (!UNISWAP_API_KEY) throw new Error("Falta UNISWAP_API_KEY en el entorno.");

    if (!quote) throw new Error('"quote" es requerido.');
    if (!swapper) throw new Error('"swapper" es requerido.');

    // 🔹 Armar payload para Uniswap /v1/swap
    const payload = {
      quote,
      swapper,
      recipient: recipient || swapper,
      simulate: false, // no simulamos, queremos la tx real
    };

    console.log("📤 Enviando payload a Uniswap /v1/swap:", payload);

    // 🔹 Llamar al endpoint oficial de Trade API
    const res = await fetch("https://trade-api.gateway.uniswap.org/v1/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": UNISWAP_API_KEY,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Trade API /swap error:", data);
      return NextResponse.json({ ok: false, error: "Error en Uniswap /swap", details: data });
    }

    console.log("✅ Respuesta completa de Trade API /swap:", JSON.stringify(data, null, 2));

    // 🔹 Buscar la transacción dentro de la respuesta (Uniswap cambia la estructura según el tipo)
    const tx =
      data?.swap ||
      data?.tx ||
      data?.transactions?.[0] ||
      data?.txs?.[0] ||
      data?.permitTransaction ||
      null;

    if (!tx || !tx.to) {
      console.error("⚠️ No se encontró un objeto válido de transacción en la respuesta Uniswap:", data);
      throw new Error("No se recibieron transacciones válidas para ejecutar.");
    }

    // 🔹 Normalizar campos (algunos vienen con 'data', otros 'calldata', 'value', etc.)
    const normalizedTx = {
      to: tx.to,
      data: tx.data || tx.calldata,
      value: tx.value || "0x0",
      chainId: tx.chainId || 137,
    };

    console.log("📦 Transacción normalizada lista para el front:", normalizedTx);

    return NextResponse.json({
      ok: true,
      swap: normalizedTx,
    });
  } catch (err: any) {
    console.error("❌ /api/swap error:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
