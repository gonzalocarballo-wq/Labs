import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const tokens = [
    {
      name: "USD Coin (Bridged)",
      symbol: "USDC.e",
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      logo: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
      decimals: 6,
    },
    {
      name: "Wrapped Ether",
      symbol: "WETH",
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      decimals: 18,
    },
    {
      name: "Wrapped Matic",
      symbol: "WMATIC",
      address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      logo: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png",
      decimals: 18,
    },
    {
      name: "Matic Token",
      symbol: "MATIC",
      address: "0x0000000000000000000000000000000000001010",
      logo: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png",
      decimals: 18,
    },
    {
      name: "Aave",
      symbol: "AAVE",
      address: "0xd6df932a45c0f255f85145f286ea0b292b21c90b",
      logo: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
      decimals: 18,
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
      logo: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
      decimals: 18,
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      address: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f",
      logo: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
      decimals: 18,
    },
    {
      name: "Tether USD",
      symbol: "USDT",
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      logo: "https://assets.coingecko.com/coins/images/325/large/Tether-logo.png",
      decimals: 6,
    },
    {
      name: "Dai Stablecoin",
      symbol: "DAI",
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      logo: "https://assets.coingecko.com/coins/images/9956/large/4943.png",
      decimals: 18,
    },
  ];

  return NextResponse.json({ ok: true, tokens });
}
