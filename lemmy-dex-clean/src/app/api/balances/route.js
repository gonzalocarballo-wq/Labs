import { NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-rpc.com";

// Direcciones conocidas
const TOKENS = {
  MATIC: {
    symbol: "MATIC",
    address: "0x0000000000000000000000000000000000001010",
    decimals: 18,
  },
  USDCe: {
    symbol: "USDC.e",
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6,
  },
  WETH: {
    symbol: "WETH",
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18,
  },
};

// ABI mínima de ERC20
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export async function POST(req) {
  try {
    const { wallet } = await req.json();
    if (!wallet) throw new Error("Falta wallet");

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const balances = {};

    // ✅ Balance MATIC (nativo)
    const maticBal = await provider.getBalance(wallet);
    balances["MATIC"] = {
      formatted: ethers.formatUnits(maticBal, 18),
    };

    // ✅ Balance USDC.e
    const usdc = new ethers.Contract(TOKENS.USDCe.address, ERC20_ABI, provider);
    const usdcBal = await usdc.balanceOf(wallet);
    balances["USDC.e"] = {
      formatted: ethers.formatUnits(usdcBal, 6),
    };

    // ✅ Balance WETH
    const weth = new ethers.Contract(TOKENS.WETH.address, ERC20_ABI, provider);
    const wethBal = await weth.balanceOf(wallet);
    balances["WETH"] = {
      formatted: ethers.formatUnits(wethBal, 18),
    };

    return NextResponse.json({ ok: true, balances });
  } catch (error) {
    console.error("❌ Error /api/balances:", error);
    return NextResponse.json({ ok: false, error: error.message });
  }
}
