import { NextResponse } from "next/server";
import { ethers, isAddress } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_URL = process.env.RPC_URL_POLYGON || "https://polygon.drpc.org";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// 🧠 Convierte BigInt a string para evitar error de serialización
function safeJson(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

export async function POST(req: Request) {
  try {
    const { wallet, tokens } = await req.json();

    if (!wallet) throw new Error("Falta 'wallet'");

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const tokenList =
      tokens && Array.isArray(tokens) && tokens.length > 0
        ? tokens
        : [
            "native", // POL nativo
            "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC
            "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH
          ];

    const balances: Record<string, any> = {};

    for (const token of tokenList) {
      const addr = String(token).toLowerCase();

      // 🔹 Detectar nativo (POL / MATIC)
      const isNative =
        addr === "native" ||
        addr === "pol" ||
        addr === "matic" ||
        addr === "0x0000000000000000000000000000000000001010";

      if (isNative) {
        const balance = await provider.getBalance(wallet);
        balances["POL"] = {
          symbol: "POL",
          formatted: ethers.formatUnits(balance, 18),
          raw: balance.toString(),
          decimals: 18,
        };
        continue;
      }

      if (!isAddress(addr)) {
        balances[token] = { error: "Token inválido" };
        continue;
      }

      try {
        const contract = new ethers.Contract(addr, ERC20_ABI, provider);
        const [symbol, decimals, raw] = await Promise.all([
          contract.symbol(),
          contract.decimals(),
          contract.balanceOf(wallet),
        ]);
        balances[symbol] = {
          address: addr,
          formatted: ethers.formatUnits(raw, decimals),
          raw: raw.toString(),
          decimals,
        };
      } catch (err: any) {
        balances[token] = { error: err.message || "Error leyendo token" };
      }
    }

    // ✅ Serializamos con safeJson para evitar BigInt error
    return NextResponse.json(safeJson({ ok: true, balances }));
  } catch (err: any) {
    console.error("❌ /api/balances error:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
