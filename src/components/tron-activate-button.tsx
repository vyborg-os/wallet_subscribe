"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    tronWeb?: any;
  }
}

export default function TronActivateButton({ label, usd }: { label: string; usd: number }) {
  const [status, setStatus] = useState<"idle" | "sending" | "confirming" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [tronAddress, setTronAddress] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ treasuryAddress: string | null; tokenAddress: string | null; tokenDecimals: number; currencySymbol: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/config", { cache: "no-store" });
        const j = await r.json();
        const c = j?.config;
        setCfg({
          treasuryAddress: c?.treasuryAddress ?? null,
          tokenAddress: c?.tokenAddress ?? null,
          tokenDecimals: c?.tokenDecimals ?? 6,
          currencySymbol: c?.currencySymbol ?? "USDT",
        });
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const checkTronWeb = () => {
      if (window.tronWeb && window.tronWeb.defaultAddress?.base58) {
        setTronAddress(window.tronWeb.defaultAddress.base58);
      }
    };
    
    checkTronWeb();
    const interval = setInterval(checkTronWeb, 1000);
    return () => clearInterval(interval);
  }, []);

  async function activate() {
    setError(null);
    if (!usd || usd <= 0) {
      setError("Select a valid quantity");
      return;
    }
    if (!window.tronWeb || !tronAddress) {
      setError("Connect TronLink wallet first");
      return;
    }
    if (!cfg?.treasuryAddress || !cfg?.tokenAddress) {
      setError("Server not configured");
      return;
    }

    // Require auth
    try {
      const me = await fetch("/api/me", { cache: "no-store" });
      if (me.status === 401) {
        window.location.href = "/login";
        return;
      }
    } catch {}

    try {
      setStatus("sending");
      
      // Convert USD to token units (USDT has 6 decimals)
      const tokenAmount = Math.round(usd * Math.pow(10, cfg.tokenDecimals));
      
      // Get TRC-20 contract instance
      const contract = await window.tronWeb.contract().at(cfg.tokenAddress);
      
      // Send transfer transaction
      const txResult = await contract.transfer(cfg.treasuryAddress, tokenAmount).send({
        feeLimit: 50_000_000, // 50 TRX fee limit
      });
      
      const txid = txResult;
      setStatus("confirming");
      
      // Notify server to record activation
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          label, 
          amountUsd: usd, 
          amountEth: String(usd), 
          txHash: txid 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record subscription");
      setStatus("done");
    } catch (e: any) {
      setError(e?.message || "Activation failed");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-2">
      <button className="btn w-full" onClick={activate} disabled={status === "sending" || status === "confirming"}>
        {status === "sending"
          ? "Sending..."
          : status === "confirming"
          ? "Confirming..."
          : `Activate — Send ${usd.toFixed(2)} ${cfg?.currencySymbol ?? "USDT"} (Tron)`}
      </button>
      {!tronAddress && (
        <p className="text-yellow-400 text-sm">Connect TronLink wallet to continue</p>
      )}
      {tronAddress && (
        <p className="text-green-400 text-sm">Connected: {tronAddress.slice(0, 6)}...{tronAddress.slice(-4)}</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {status === "done" && <p className="text-green-400 text-sm">Activation recorded!</p>}
    </div>
  );
}
