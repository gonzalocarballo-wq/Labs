import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    // 1️⃣ Fetch lista principal
    const res = await fetch("https://tokens.uniswap.org/");
    const mainData = await res.json();

    // 2️⃣ Fetch desde IPFS (más extendida)
    const ipfsRes = await fetch("https://gateway.ipfs.io/ipns/tokens.uniswap.org");
    const ipfsData = await ipfsRes.json();

    // 3️⃣ Combinar ambas listas
    const combined = [...(mainData.tokens || []), ...(ipfsData.tokens || [])];

    // 4️⃣ 🔹 Filtrar SOLO tokens de Polygon (chainId = 137)
    const polygonTokens = combined.filter((t) => t.chainId === 137);

    // 5️⃣ Eliminar duplicados por address
    const unique = polygonTokens.reduce((acc, token) => {
      if (!acc.find((t) => t.address === token.address)) {
        acc.push(token);
      }
      return acc;
    }, []);

    // 6️⃣ Simplificar formato
    const tokens = unique.map((t) => ({
      name: t.name,
      symbol: t.symbol,
      address: t.address,
      logo: t.logoURI,
      decimals: t.decimals,
    }));

    return NextResponse.json({ ok: true, tokens });
  } catch (error) {
    console.error("❌ Error fetching Uniswap tokens:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch tokens" });
  }
}
