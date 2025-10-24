"use client";
import { useState, useEffect, useCallback } from "react";
import { concat, toBeHex, ethers, zeroPadBytes, AbiCoder } from "ethers";
import { authenticate, callSmartContract, TransactionResult,deposit, withdraw, isWebView } from "@lemoncash/mini-app-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet } from "lucide-react";
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
        className="flex items-center gap-3 bg-[#151A18] border border-[#1F2926] rounded-xl px-4 py-3 hover:bg-[#1A1F1D] transition-all duration-200"
      >
        <img src={selected.logo} className="w-6 h-6 rounded-full" alt="" />
        <span className="text-[#E8F6EF] font-semibold">{selected.symbol}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#101412] border border-[#1F2926] rounded-3xl shadow-[0_4px_20px_rgba(0,255,157,0.1)] w-[420px] max-h-[600px] p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#E8F6EF] mb-4">
              Seleccionar token
            </h2>
            <input
              type="text"
              placeholder="Buscar token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-4 px-4 py-3 bg-[#151A18] text-[#E8F6EF] rounded-xl border border-[#1F2926] focus:outline-none focus:ring-2 focus:ring-[#00FF9D] placeholder-[#A5BDB4]"
            />
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-[#1F2926]">
              {filtered.map((t) => (
                <div
                  key={t.address}
                  onClick={() => {
                    onSelect(t);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#151A18] rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-[#1F2926]"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={t.logo}
                      className="w-10 h-10 rounded-full"
                      alt={t.symbol}
                    />
                    <div className="flex flex-col">
                      <span className="text-[#E8F6EF] font-semibold text-sm">
                        {t.name}
                      </span>
                      <span className="text-xs text-[#A5BDB4]">{t.symbol}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#A5BDB4] font-mono">
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
// componente para el drawer de la wallet
function WalletDrawer({
  isOpen,
  onClose,
  balances,
  onDeposit,
  onWithdraw,
}: {
  isOpen: boolean;
  onClose: () => void;
  balances: any;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  // 🧮 Calcular total estimado (placeholder hasta que lleguen precios reales)
  const estimatedTotalUSD = Object.values(balances || {}).reduce((acc: number, b: any) => {
    const val = parseFloat(b?.formatted || "0");
    // Simulación temporal: multiplicamos por un precio estimado (luego se reemplaza con API real)
    const mockPrice = 1; // <- Cambiar por datos reales pronto
    return acc + val * mockPrice;
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Fondo oscuro */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel lateral */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 25 }}
            className="fixed top-0 right-0 w-80 h-full bg-[#101412] border-l border-[#1F2926] shadow-[0_4px_20px_rgba(0,255,157,0.1)] p-6 flex flex-col justify-between z-50"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#E8F6EF]">Wallet</h2>
                <button
                  onClick={onClose}
                  className="text-[#A5BDB4] hover:text-[#E8F6EF] transition-colors text-xl"
                >
                  ✖
                </button>
              </div>

              {/* Total estimado */}
              <div className="bg-[#151A18] border border-[#1F2926] rounded-3xl p-6 mb-6 text-center">
                <p className="text-sm text-[#4BD897] mb-2">Total estimado</p>
                <h3 className="text-3xl font-bold text-[#E8F6EF]">
                  ${estimatedTotalUSD.toFixed(2)} USD
                </h3>
                <p className="text-xs text-[#A5BDB4] mt-2">(estimado, sin precios reales aún)</p>
              </div>

              {/* Balances */}
              <div className="space-y-3 overflow-y-auto max-h-[60vh]">
                {Object.entries(balances || {}).length === 0 ? (
                  <p className="text-[#A5BDB4] text-sm text-center">Sin balances disponibles</p>
                ) : (
                  Object.entries(balances || {}).map(([symbol, b]: any) => (
                    <div
                      key={symbol}
                      className="flex items-center justify-between bg-[#151A18] border border-[#1F2926] rounded-xl px-4 py-3"
                    >
                      <span className="text-[#E8F6EF] font-semibold">{symbol}</span>
                      <span className="text-[#A5BDB4] font-mono text-sm">
                        {b.formatted ?? "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-4 mt-6">
              <button
                onClick={onDeposit}
                className="bg-[#00FF9D] hover:bg-[#29FFB4] text-black font-semibold py-3 rounded-3xl transition-all duration-200 shadow-[0_4px_20px_rgba(0,255,157,0.1)]"
              >
                Deposit
              </button>
              <button
                onClick={onWithdraw}
                className="bg-[#00D48F] hover:bg-[#1AF7A8] text-black font-semibold py-3 rounded-3xl transition-all duration-200 shadow-[0_4px_20px_rgba(0,255,157,0.1)]"
              >
                Withdraw
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

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

      // Verificar si necesita approval
      try {
        const approvalRes = await fetch("/api/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: wallet,
            token: sellToken.address,
            chainId: 137,
            amount: ethers.parseUnits(amount, sellToken.decimals).toString(),
            includeGasInfo: true
          })
        });
        const approvalData = await approvalRes.json();
        if (approvalData.ok && approvalData.approval) {
          setNeedsApproval(true);
        } else {
          setNeedsApproval(false);
        }
      } catch (approvalErr) {
        console.error("❌ Approval check error:", approvalErr);
        setNeedsApproval(false);
      }
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
    if (!wallet) throw new Error("Wallet no autenticada.");

    // 🚀 Convertimos el amount del input a base units según los decimales del token de venta
    const amountIn = ethers.parseUnits(amount, sellToken.decimals);

    // 💡 Por ahora usamos un mínimo de salida estimado al 98% del quote (2% de slippage)
    const minAmountOut = quote.formattedAmountOut
      ? ethers.parseUnits(
          (Number(quote.formattedAmountOut) * 0.98).toString(),
          buyToken.decimals
        )
      : BigInt(0);

    // ⚙️ Comando universal de swap V2 exact in
    const Commands = {
      V2_SWAP_EXACT_IN: 0x08,
    };

    const abi = new AbiCoder();
    const input = abi.encode(
      ["address", "address", "uint256", "uint256", "address"],
      [sellToken.address, buyToken.address, amountIn, minAmountOut, wallet]
    );

    const commands = [concat([zeroPadBytes(toBeHex(Commands.V2_SWAP_EXACT_IN), 1)])];
    const inputs = [input];

    // ⏰ Deadline de 10 minutos
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // 🚀 Ejecutamos el smart contract desde la Lemon wallet
    const result = await callSmartContract({
      contractAddress: "0xec7BE89e9d109e7e3Fec59c222CF297125FEFda2", // Universal Router Polygon
      functionName: "execute",
      functionParams: [commands, inputs],
      value: "0",
      chainId: 137,
    });

    if (result.result === TransactionResult.SUCCESS) {
      setTxHash(result.data.txHash);
      alert(`✅ Swap ejecutado correctamente: ${result.data.txHash}`);
      const bals = await fetchBalances();
      setBalances(bals);
    } else if (result.result === TransactionResult.FAILED) {
      throw new Error(result.error.message || "Swap fallido");
    } else {
      throw new Error("Swap cancelado por el usuario");
    }
  } catch (err: any) {
    console.error("❌ Error ejecutando swap:", err);
    alert(`Error: ${err.message}`);
  }
}


async function handleDeposit() {
  try {
    if (!isWebView()) {
      alert("⚠️ Deposit only works inside Lemon app");
      return;
    }

    if (!wallet) throw new Error("Wallet not authenticated");

    const result = await deposit({
      amount, // usa el valor del input actual
      tokenName: sellToken.symbol.replace(".e", "") as any, // Ej: "USDC.e" → "USDC"
    });

    if (result.result === TransactionResult.SUCCESS) {
      setTxHash(result.data.txHash);
      alert(`✅ Deposit success: ${result.data.txHash}`);
      const bals = await fetchBalances();
      setBalances(bals);
    } else if (result.result === TransactionResult.FAILED) {
      throw new Error(result.error.message || "Deposit failed");
    } else {
      throw new Error("Deposit cancelled");
    }
  } catch (err: any) {
    console.error("❌ Error in deposit:", err);
    alert(`Deposit error: ${err.message}`);
  }
}

async function handleWithdraw() {
  try {
    if (!isWebView()) {
      alert("⚠️ Withdraw only works inside Lemon app");
      return;
    }

    if (!wallet) throw new Error("Wallet not authenticated");

    const result = await withdraw({
      amount,
      tokenName: sellToken.symbol.replace(".e", "") as any, // mismo token de venta
    });

    if (result.result === TransactionResult.SUCCESS) {
      setTxHash(result.data.txHash);
      alert(`✅ Withdraw success: ${result.data.txHash}`);
      const bals = await fetchBalances();
      setBalances(bals);
    } else if (result.result === TransactionResult.FAILED) {
      throw new Error(result.error.message || "Withdraw failed");
    } else {
      throw new Error("Withdraw cancelled");
    }
  } catch (err: any) {
    console.error("❌ Error in withdraw:", err);
    alert(`Withdraw error: ${err.message}`);
  }
}

async function handleApproval() {
  try {
    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: wallet,
        token: sellToken.address,
        chainId: 137,
        amount: ethers.parseUnits(amount, sellToken.decimals).toString(),
        includeGasInfo: true
      })
    });
    const data = await res.json();
    if (data.ok && data.approval) {
      await callSmartContract({
        contractAddress: data.approval.to,
        functionName: "approve",
        functionParams: [data.approval.spender, data.approval.amount],
        chainId: 137
      });
      alert("✅ Token approved!");
      setNeedsApproval(false);
    } else {
      alert("✅ Token already approved!");
      setNeedsApproval(false);
    }
  } catch (err: any) {
    console.error("❌ Error in approval:", err);
    alert(`Approval error: ${err.message}`);
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0A0E0D] text-[#E8F6EF] p-8">
      {/* 🔹 Botón para abrir el panel lateral */}
      <div className="w-full flex justify-end mb-6">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-3 bg-[#101412] border border-[#1F2926] rounded-3xl px-4 py-3 hover:bg-[#151A18] transition-all duration-200 shadow-[0_4px_20px_rgba(0,255,157,0.1)]"
        >
          <Wallet className="w-5 h-5 text-[#4BD897]" />
          <span className="text-[#E8F6EF] font-semibold">Wallet</span>
        </button>
      </div>
  
      {/* 🔹 Título principal */}
      <h1 className="text-4xl font-bold mb-2 text-[#00FF9D]">🍋 Lemmy DEX</h1>
      <p className="text-sm text-[#4BD897] mb-8">
        Powered by Lemon Teso Crypto & Uniswap Trade API
      </p>
  
      <p className="text-xs text-[#A5BDB4] mb-2">{wallet}</p>
      <p className="text-xs text-[#A5BDB4] mb-8">{txHash}</p>
  
      {/* 🔹 Card principal del swap */}
      <div className="w-full max-w-md bg-[#101412] border border-[#1F2926] rounded-3xl shadow-[0_4px_20px_rgba(0,255,157,0.1)] p-8 flex flex-col gap-8">
        {/* VENDER */}
        <div>
          <label className="text-sm text-[#4BD897] mb-2 block font-semibold">Vender</label>
          <div className="flex items-center justify-between bg-[#151A18] border border-[#1F2926] rounded-xl px-4 py-3">
            <input
              className="bg-transparent text-[#E8F6EF] text-3xl font-bold w-32 focus:outline-none placeholder-[#A5BDB4]"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
            />
            <TokenSelector selected={sellToken} onSelect={setSellToken} />
          </div>
          <p className="text-right text-xs text-[#A5BDB4] mt-2">
            Balance: {formatAmt(balances[sellToken.symbol]?.formatted)}
          </p>
        </div>
  
        {/* BOTÓN GET QUOTE */}
        <button
          onClick={getQuote}
          disabled={loading}
          className={`${
            loading 
              ? "bg-[#00D48F] opacity-70 cursor-not-allowed" 
              : "bg-[#00FF9D] hover:bg-[#29FFB4] hover:shadow-[0_4px_20px_rgba(0,255,157,0.2)]"
          } text-black font-semibold rounded-3xl py-4 text-lg transition-all duration-200 shadow-[0_4px_20px_rgba(0,255,157,0.1)]`}
        >
          {loading ? "Obteniendo quote..." : "Get Quote"}
        </button>

        {/* RESULTADO DEL QUOTE */}
        {formattedAmountOut && (
          <div className="bg-[#151A18] border border-[#1F2926] rounded-xl p-4">
            <p className="text-center text-[#A5BDB4] text-sm">
              You will receive approximately{" "}
              <span className="font-bold text-[#E8F6EF] text-lg">
                {formattedAmountOut && !isNaN(Number(formattedAmountOut))
                  ? Number(formattedAmountOut).toFixed(6)
                  : "—"}{" "}
                {buyToken.symbol}
              </span>
            </p>
          </div>
        )}

        {/* BOTÓN APPROVAL */}
        {needsApproval && (
          <button
            onClick={handleApproval}
            className="bg-[#00D48F] hover:bg-[#1AF7A8] text-black font-semibold rounded-3xl py-4 text-lg transition-all duration-200 shadow-[0_4px_20px_rgba(0,255,157,0.1)]"
          >
            Approve {sellToken.symbol}
          </button>
        )}
  
        {/* COMPRAR */}
        <div>
          <label className="text-sm text-[#4BD897] mb-2 block font-semibold">Comprar</label>
          <div className="flex items-center justify-between bg-[#151A18] border border-[#1F2926] rounded-xl px-4 py-3">
            <input
              className="bg-transparent text-[#E8F6EF] text-3xl font-bold w-32 focus:outline-none placeholder-[#A5BDB4]"
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
          <p className="text-right text-xs text-[#A5BDB4] mt-2">
            Balance: {formatAmt(balances[buyToken.symbol]?.formatted)}
          </p>
        </div>
  
        {/* BOTÓN EXECUTE SWAP */}
        <button
          onClick={executeSwap}
          disabled={!quote}
          className={`${
            quote
              ? "bg-[#00FF9D] hover:bg-[#29FFB4] hover:shadow-[0_4px_20px_rgba(0,255,157,0.2)] text-black"
              : "bg-[#151A18] text-[#A5BDB4] cursor-not-allowed border border-[#1F2926]"
          } font-semibold rounded-3xl py-4 text-lg transition-all duration-200 shadow-[0_4px_20px_rgba(0,255,157,0.1)]`}
        >
          {quote ? "Execute Swap" : "Get quote first"}
        </button>
  
        {/* ERRORES */}
        {error && (
          <div className="bg-[#2D1B1B] border border-red-500 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">
              ❌ {error}
            </p>
          </div>
        )}
      </div>
  
      {/* 🔹 Drawer lateral (panel desplegable) */}
      <WalletDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        balances={balances}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
      />
    </main>
  );
}  