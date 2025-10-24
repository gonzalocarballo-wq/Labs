"use client";
import { useState, useEffect, useCallback } from "react";
import { concat, toBeHex, ethers, zeroPadBytes, AbiCoder } from "ethers";
import { authenticate, callSmartContract, TransactionResult, deposit, withdraw, isWebView, ChainId } from "@lemoncash/mini-app-sdk";
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
  onDeposit: (token: string, amount: string) => void;
  onWithdraw: () => void;
}) {
  const [depositAmount, setDepositAmount] = useState("");
  const [depositToken, setDepositToken] = useState("USDC"); // 👈 default

  const estimatedTotalUSD = Object.values(balances || {}).reduce(
    (acc: number, b: any) => acc + parseFloat(b?.formatted || "0"),
    0
  );

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
              </div>

              {/* Balances */}
              <div className="space-y-3 overflow-y-auto max-h-[40vh] mb-6">
                {Object.entries(balances || {}).length === 0 ? (
                  <p className="text-[#A5BDB4] text-sm text-center">
                    Sin balances disponibles
                  </p>
                ) : (
                  Object.entries(balances || {}).map(([symbol, b]: any) => (
                    <div
                      key={symbol}
                      className="flex items-center justify-between bg-[#151A18] border border-[#1F2926] rounded-xl px-4 py-3"
                    >
                      <span className="text-[#E8F6EF] font-semibold">
                        {symbol}
                      </span>
                      <span className="text-[#A5BDB4] font-mono text-sm">
                        {b.formatted ?? "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* NUEVO BLOQUE: depósito manual */}
              <div className="bg-[#151A18] border border-[#1F2926] rounded-3xl p-4 mb-6">
                <h3 className="text-[#E8F6EF] font-semibold mb-3">
                  Depósito manual
                </h3>

                {/* Input de monto */}
                <input
                  type="number"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Monto a depositar"
                  className="w-full px-4 py-3 mb-3 bg-[#101412] text-[#E8F6EF] rounded-xl border border-[#1F2926] focus:outline-none focus:ring-2 focus:ring-[#00FF9D]"
                />

                {/* Selector de token (solo USDC o POL) */}
                <select
                  value={depositToken}
                  onChange={(e) => setDepositToken(e.target.value)}
                  className="w-full px-4 py-3 bg-[#101412] text-[#E8F6EF] rounded-xl border border-[#1F2926] focus:outline-none focus:ring-2 focus:ring-[#00FF9D]"
                >
                  <option value="USDC">USDC</option>
                  <option value="POL">POL</option>
                </select>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => onDeposit(depositToken, depositAmount)}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className={`${
                  !depositAmount || parseFloat(depositAmount) <= 0
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } bg-[#00FF9D] hover:bg-[#29FFB4] text-black font-semibold py-3 rounded-3xl transition-all duration-200 shadow-[0_4px_20px_rgba(0,255,157,0.1)]`}
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

// 🧩 Función para resolver claves de balance
function balanceKeyFor(token: { address: string; symbol: string }) {
  const a = (token.address || "").toLowerCase();

  // 🔹 Nativo POL/MATIC
  if (a === "native" || a === "0x0000000000000000000000000000000000001010") {
    return "POL"; // el backend guarda el nativo como POL
  }

  // 🔹 WMATIC (token ERC-20)
  if (a === "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270") {
    return "WMATIC";
  }

  // 🔹 Por defecto, usar el símbolo tal cual
  return token.symbol;
}

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

  const [amount, setAmount] = useState("");
  const [balances, setBalances] = useState<Balances>({});
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formattedAmountOut, setFormattedAmountOut] = useState("");
  const [wallet, setWallet] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approved, setApproved] = useState(false);

  async function fetchBalances() {
    try {
      if (!wallet) return {};
  
      const tokensToCheck = [
        "native", // POL
        sellToken.address,
        buyToken.address,
      ];
  
      // Mostramos visualmente qué está por hacer
      alert("📤 Enviando request a /api/balances con: " + JSON.stringify({
        wallet,
        tokensToCheck
      }));
  
      const res = await fetch("/api/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, tokens: tokensToCheck }),
      });
  
      const data = await res.json();
      alert("📥 Respuesta de /api/balances: " + JSON.stringify(data));
  
      if (!data.ok) throw new Error(data.error || "Error en balances");
      return data.balances || {};
    } catch (err: any) {
      alert("❌ Error en fetchBalances: " + err.message);
      return {};
    }
  }
  
  
  

  useEffect(() => {
    if (!wallet) {
      console.log("⏳ Esperando wallet...");
      return;
    }
  
    (async () => {
      console.log("🔍 Ejecutando fetchBalances con wallet:", wallet);
      const bals = await fetchBalances();
      console.log("💰 Balances seteados en estado:", bals);
      setBalances(bals);
    })();
  }, [wallet]); // solo depende de wallet
  
  
  // Reset approval state when token or amount changes
  useEffect(() => {
    setApproved(false);
  }, [sellToken, amount]);

  // ✅ Quote con MetaMask como taker
  async function getQuote() {
    try {
      setError("");
      setLoading(true);
  
      //if (!window.ethereum) throw new Error("MetaMask no detectado");
      //const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      //const swapper = accounts[0];
      if (!wallet) throw new Error("Wallet no autenticada");
const swapper = wallet;

  
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

      // Reset approval state when getting new quote
      setApproved(false);

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

  // ✅ Check approval function
  const checkApproval = async () => {
    try {
      if (!wallet) throw new Error("Wallet no autenticada");
const swapper = wallet;
      const amountInBaseUnits = ethers.parseUnits(amount, sellToken.decimals).toString();
      
      const res = await fetch("/api/check-or-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: swapper,
          token: sellToken.address,
          amount: amountInBaseUnits,
        }),
      });

      const data = await res.json();

      if (data.ok && data.approved) {
        console.log("✅ Token ya aprobado");
        setApproved(true);
      } else if (data.ok && data.tx) {
        console.log("🟡 Falta aprobar, generando tx:", data.tx);

        // Si estás usando Safe o relayer, ejecutá esta transacción:
        await callSmartContract({
          contractAddress: data.tx.to,
          functionName: "approve",
          functionParams: [data.tx.data],
          value: data.tx.value,
          chainId: 137,
        });

        setApproved(true);
      } else {
        console.error("❌ Error en check-or-approve:", data.error);
      }
    } catch (err) {
      console.error("❌ Error ejecutando checkApproval:", err);
    }
  };
  
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


async function handleDeposit(token: string, amount: string) {
  try {
    if (!isWebView()) {
      alert("⚠️ Deposit only works inside Lemon app");
      return;
    }

    if (!wallet) throw new Error("Wallet not authenticated");

    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const result = await deposit({
      amount,
      tokenName: token as any, // "USDC" o "POL"
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
      const result = await authenticate({ chainId: ChainId.POLYGON });

      if (result.result === TransactionResult.SUCCESS) {
        setWallet(result.data.wallet);
        console.log("✅ Lemon SDK auth on POLYGON (137). Wallet:", result.data.wallet);
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

      <div className="text-xs text-[#A5BDB4] mb-4 bg-[#151A18] border border-[#1F2926] rounded-xl p-3">
        <p>Wallet: {wallet ?? "undefined"}</p>
        <p>
          Balances:{" "}
          {balances
            ? Object.keys(balances).length > 0
              ? Object.keys(balances).join(", ")
              : "vacío"
            : "sin datos"}
        </p>
      </div>
  
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
            Balance: {formatAmt(balances[balanceKeyFor(sellToken)]?.formatted)}
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
            Balance: {formatAmt(balances[balanceKeyFor(buyToken)]?.formatted)}
          </p>
        </div>
  
        {/* BOTÓN CONDICIONAL: APPROVE O EXECUTE SWAP */}
        {!approved ? (
          <button
            onClick={checkApproval}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-2 px-4 rounded-xl font-semibold"
          >
            Approve Token
          </button>
        ) : (
          <button
            onClick={executeSwap}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-xl font-semibold"
          >
            Execute Swap
          </button>
        )}
  
        {/* ERRORES */}
        {error && (
          <div className="bg-[#2D1B1B] border border-red-500 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">
              ❌ {error}
            </p>
          </div>
        )}
      </div>
  
      {/* 🔹 Debug de balances */}
      {wallet && (
        <div className="w-full max-w-md bg-[#151A18] border border-[#1F2926] rounded-xl p-4 mt-6">
          <p className="text-[#4BD897] text-sm font-semibold mb-2">
            Debug de Balances (visible solo para diagnóstico)
          </p>

          {/* Wallet visible */}
          <p className="text-xs text-[#A5BDB4] break-words mb-2">
            Wallet: {wallet}
          </p>

          {/* JSON de balances */}
          <pre className="text-[#E8F6EF] text-[10px] whitespace-pre-wrap break-words bg-[#101412] p-2 rounded-xl max-h-[200px] overflow-y-auto">
            {JSON.stringify(balances, null, 2)}
          </pre>

          {/* Botón manual para volver a ejecutar fetchBalances */}
          <button
            onClick={async () => {
              const b = await fetchBalances();
              setBalances(b);
            }}
            className="mt-2 bg-[#00FF9D] text-black px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#29FFB4] transition-all duration-200"
          >
            🔄 Refrescar balances
          </button>
        </div>
      )}

      {/* 🔹 Debug de /api/balances */}
      {wallet && (
        <div className="w-full max-w-md bg-[#151A18] border border-[#1F2926] rounded-xl p-4 mt-6">
          <p className="text-[#4BD897] text-sm font-semibold mb-2">
            Debug de /api/balances
          </p>

          {/* Wallet */}
          <p className="text-xs text-[#A5BDB4] mb-1">
            Wallet: {wallet}
          </p>

          {/* Tokens enviados */}
          <p className="text-xs text-[#A5BDB4] mb-1">
            Tokens enviados:{" "}
            {JSON.stringify([
              "native",
              sellToken.address,
              buyToken.address,
            ])}
          </p>

          {/* Respuesta completa del backend */}
          <pre className="text-[10px] text-[#E8F6EF] whitespace-pre-wrap bg-[#101412] p-2 rounded-xl max-h-[250px] overflow-y-auto">
            {balances && Object.keys(balances).length > 0
              ? JSON.stringify(balances, null, 2)
              : "🕳️ El backend respondió vacío ({}) o no se pudo leer ningún balance."}
          </pre>

          {/* Botón para volver a pedir balances manualmente */}
          <button
            onClick={async () => {
              const b = await fetchBalances();
              setBalances(b);
            }}
            className="mt-2 bg-[#00FF9D] text-black px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#29FFB4] transition-all duration-200"
          >
            🔄 Volver a consultar balances
          </button>
        </div>
      )}

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