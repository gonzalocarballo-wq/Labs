"use client";
import { useState, useEffect } from "react";

interface Token {
  name: string;
  symbol: string;
  address: string;
  logo: string;
  decimals: number;
}

export default function TokenSelector({
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
        if (d.ok && Array.isArray(d.tokens)) {
          console.log("✅ Tokens cargados:", d.tokens.length);
          setTokens(d.tokens);
        } else {
          console.error("❌ Error cargando tokens:", d);
        }
      });
  }, []);

  const filtered = tokens.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Botón del token actual */}
      <button
        onClick={() => {
          setIsOpen(true);
          setSearch(""); // 🔁 Limpia búsqueda al abrir
        }}
        className="flex items-center gap-2 bg-[#0D1212] border border-lime-700 rounded-xl px-3 py-2 hover:bg-[#121a12] transition-colors"
      >
        <img src={selected.logo} className="w-5 h-5 rounded-full" alt="" />
        <span className="text-lime-200 font-bold">{selected.symbol}</span>
      </button>

      {/* MODAL CENTRAL */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#141A14] border border-lime-600 rounded-2xl shadow-2xl w-[420px] max-h-[600px] p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-lime-300 mb-3">
              Seleccionar token ({tokens.length})
            </h2>

            {/* Buscar */}
            <input
              type="text"
              placeholder="Buscar token por nombre, símbolo o dirección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-[#1A211A] text-lime-300 rounded-xl border border-lime-700 focus:outline-none"
            />

            {/* Lista scrollable */}
            <div className="flex-1 overflow-y-scroll scrollbar-thin scrollbar-thumb-[#1a2b1a] scrollbar-track-transparent space-y-1">
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

              {filtered.length === 0 && (
                <div className="text-center text-lime-600 text-sm py-8">
                  No se encontraron tokens
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
