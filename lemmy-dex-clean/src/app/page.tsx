"use client";
import { useState, useEffect, useCallback } from "react";
import { concat, toBeHex, ethers, zeroPadBytes, AbiCoder } from "ethers";
import { authenticate, callSmartContract, TransactionResult } from "@lemoncash/mini-app-sdk";

/* ===========================
   Tipos
=========================== */
interface Token {
  name: string;
  symbol: string;
  address: string;
  logo: string;
  decimals: number;
}

interface QuoteResponse {
  formattedAmountOut: string;
  methodParameters: {
    to: string;
    calldata: string;
    value: string;
  };
}

interface Balances {
  [symbol: string]: {
    formatted: string;
  };
}

/* ===========================
   COMPONENTE: TokenSelector
=========================== */
function TokenSelector({
  selected,
  onSelect,
}: {
  selected: Token;
  onSelect: (token: Token) => void;
}) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setTokens(d.tokens);
      });
  }, []);

  const filtered = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-[#0D1212] border border-lime-700 rounded-xl px-3 py-2 hover:bg-[#121a12] transition-colors"
      >
        <img src={selected.logo} className="w-5 h-5 rounded-full" alt="" />
        <span className="text-lime-200 font-bold">{selected.symbol}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#141A14] border border-lime-600 rounded-2xl shadow-2xl w-[400px] max-h-[500px] p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-lime-300 mb-3">
              Seleccionar token
            </h2>
            <input
              type="text"
              placeholder="Buscar token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-[#1A211A] text-lime-300 rounded-xl border border-lime-700 focus:outline-none"
            />
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-[#1a2b1a]">
              {filtered.map((t) => (
                <div
                  key={t.address}
                  onClick={() => {
                    onSelect(t);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#1A211A] rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={t.logo}
                      className="w-8 h-8 rounded-full"
                      alt={t.symbol}
                    />
                    <div className="flex flex-col">
                      <span className="text-lime-100 font-semibold text-sm">
                        {t.name}
                      </span>
                      <span className="text-xs text-lime-500">{t.symbol}</span>
                    </div>
                  </div>
                  <span className="text-xs text-lime-600">
                    {t.address.slice(0, 6)}...{t.address.slice(-4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===========================
   COMPONENTE PRINCIPAL
=========================== */
export default function LemmyDexPanel() {
  const [sellToken, setSellToken] = useState<Token>({
    symbol: "USDC.e",
    name: "USD Coin (Bridged)",
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    logo: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    decimals: 6,
  });

  const [buyToken, setBuyToken] = useState<Token>({
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    decimals: 18,
  });

  const [amount, setAmount] = useState("0.1");
  const [balances, setBalances] = useState<Balances>({});
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formattedAmountOut, setFormattedAmountOut] = useState("");
  const [wallet, setWallet] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  async function fetchBalances() {
    try {
      
  
      // 🔹 Envía la dirección al backend
      const res = await fetch("/api/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
  
      const data = await res.json();
      if (!data.ok) return {};
      return data.balances || {};
    } catch (err) {
      console.error("Error obteniendo balances:", err);
      return {};
    }
  }

  useEffect(() => {
    fetchBalances().then((bals) => setBalances(bals));
  }, []);

  // ✅ Quote con MetaMask como taker
  async function getQuote() {
    try {
      setError("");
      setLoading(true);
  
      //if (!window.ethereum) throw new Error("MetaMask no detectado");
      //const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      //const swapper = accounts[0];
      const swapper = "0x48C27F7548cEE894b06c11F380130A1C05129949";
  
      const payload = {
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        amount,          // "0.1" por ej — el backend lo convierte a base units
        swapper,
        chain: "polygon"
      };
  
      console.log("📤 /api/quote payload:", payload);
  
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      const data = await res.json();
      console.log("📥 /api/quote resp:", data);
  
      if (!data.ok) throw new Error(data.error || "Quote failed");
  
      // Guarda TODO el objeto quote (trae quoteId que usará /api/swap)
      setQuote(data.quote);
  
      // Muestra el estimado
      setFormattedAmountOut(data.formattedAmountOut || "0");
    } catch (err: any) {
      console.error("❌ Quote error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  // ✅ Ejecutar swap con MetaMask directamente
  // === Ejecutar swap con MetaMask ===
  // ===============================
// 🚀 EXECUTE SWAP
// ===============================

async function executeSwap() {
  try {
    if (!quote) throw new Error("No hay quote válido. Obtené un quote primero.");

    

   

    
    //const sentTx = await signer.sendTransaction(txRequest);
    const amountIn = ethers.parseUnits("0.01", 18); // por ejemplo 1 WETH
const minAmountOut = ethers.parseUnits("0.0000005", 18); // por ejemplo mínimo 0.5 WPOL como tolerancia

// — Construí el comando para V2 exact in swap:
const Commands = {
  V2_SWAP_EXACT_IN: 0x08
};

// Encoded "commands" bytes:


// Encode single byte command (V2 swap)
const commands = [concat([zeroPadBytes(toBeHex(Commands.V2_SWAP_EXACT_IN), 1)])];

// Encoded "inputs" para el comando:
// Según docs: para V2_SWAP_EXACT_IN el esquema es: (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient)
const tokenIn = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const tokenOut = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

// === Input encoding ===
const abi = new AbiCoder();
const input = abi.encode(
  ["address", "address", "uint256", "uint256", "address"],
  [tokenIn, tokenOut, amountIn, minAmountOut, wallet]
);
const inputs = [input];


// Deadline (timestamp UNIX):
const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hora    
const result = await callSmartContract({
      contractAddress: "0xec7BE89e9d109e7e3Fec59c222CF297125FEFda2",
      functionName: "execute",
      functionParams: [commands, inputs],
      value: "0",
      chainId: 137,
    });
    if (result.result === TransactionResult.SUCCESS) {
      setTxHash(result.data.txHash);
    } else if (result.result === TransactionResult.FAILED) {
      throw new Error(result.error.message || "Authentication failed");
    } else {
      throw new Error("Authentication cancelled");
    }
  } catch (err: any) {
    console.error("❌ Error ejecutando swap:", err);
    alert(`Error: ${err.message}`);
  }
}


  
  
 
  const authenticateWallet = useCallback(async () => {
    try {
      const result = await authenticate();

      if (result.result === TransactionResult.SUCCESS) {
        setWallet(result.data.wallet);
      } else if (result.result === TransactionResult.FAILED) {
        throw new Error(result.error.message || "Authentication failed");
      } else {
        throw new Error("Authentication cancelled");
      }
    } catch (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!wallet) {
      authenticateWallet().catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  

  function formatAmt(str?: string) {
    if (!str) return "0.000000";
    const n = parseFloat(str);
    if (!isFinite(n) || n === 0) return "0.000000";
    if (n < 0.000001) return "<0.000001";
    return n.toFixed(6).replace(/\.?0+$/, "");
  }
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0D1212] text-lime-400 p-8">
      <h1 className="text-3xl font-bold mb-1">🍋 Lemmy DEX — MetaMask Panel</h1>
      <p className="text-sm text-lime-500 mb-8">
        Powered by Lemon & Uniswap Trade API
        </p>
      <p className="text-sm text-lime-500 mb-8">
      {wallet}
      </p>
      <p className="text-sm text-lime-500 mb-8">
      {txHash}
      </p>
      <div className="w-full max-w-md bg-[#141A14] border border-lime-600 rounded-2xl shadow-xl p-6 flex flex-col gap-6">
        {/* VENDER */}
        <div>
          <label className="text-sm text-lime-500 mb-1 block">Vender</label>
          <div className="flex items-center justify-between bg-[#1A211A] border border-lime-700 rounded-xl px-3 py-2">
            <input
              className="bg-transparent text-lime-100 text-3xl font-bold w-28 focus:outline-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <TokenSelector selected={sellToken} onSelect={setSellToken} />
          </div>
          <p className="text-right text-xs text-lime-500 mt-1">
            Balance: {formatAmt(balances[sellToken.symbol]?.formatted)}
          </p>
        </div>

        {/* BOTÓN GET QUOTE */}
        <button
          onClick={getQuote}
          disabled={loading}
          className={`${
            loading ? "bg-lime-700" : "bg-lime-500 hover:bg-lime-400"
          } text-black font-bold rounded-xl py-3 text-lg transition-colors`}
        >
          {loading ? "Obteniendo quote..." : "Get Quote"}
        </button>

        {/* RESULTADO DEL QUOTE */}
        {formattedAmountOut && (
          <p className="text-center text-lime-400 text-sm">
            You will receive approximately{" "}
            <span className="font-bold text-lime-200">
              {formattedAmountOut && !isNaN(Number(formattedAmountOut))
                ? Number(formattedAmountOut).toFixed(6)
                : "—"}{" "}
              {buyToken.symbol}
            </span>
          </p>
        )}

        {/* COMPRAR */}
        <div>
          <label className="text-sm text-lime-500 mb-1 block">Comprar</label>
          <div className="flex items-center justify-between bg-[#1A211A] border border-lime-700 rounded-xl px-3 py-2">
            <input
              className="bg-transparent text-lime-100 text-3xl font-bold w-28 focus:outline-none"
              placeholder="—"
              value={
                formattedAmountOut && !isNaN(Number(formattedAmountOut))
                  ? Number(formattedAmountOut).toFixed(6)
                  : ""
              }
              readOnly
            />
            <TokenSelector selected={buyToken} onSelect={setBuyToken} />
          </div>
          <p className="text-right text-xs text-lime-500 mt-1">
            Balance: {formatAmt(balances[buyToken.symbol]?.formatted)}
          </p>
        </div>

        {/* BOTÓN EXECUTE SWAP */}
        <button
          onClick={executeSwap}
          disabled={!quote}
          className={`${
            quote
              ? "bg-lime-500 hover:bg-lime-400 text-black"
              : "bg-[#1A211A] text-lime-700 cursor-not-allowed"
          } font-bold rounded-xl py-3 text-lg transition-colors`}
        >
          {quote ? "Execute Swap" : "Get quote first"}
        </button>

        {/* ERRORES */}
        {error && (
          <p className="text-red-400 text-sm mt-2 bg-[#1A211A] border border-red-500 rounded-md px-3 py-2">
            ❌ {error}
          </p>
        )}
      </div>
    </main>
  );
}
