"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";

export default function ActivateButton({ label, usd }: { label: string; usd: number }) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<"idle" | "sending" | "confirming" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ treasuryAddress: `0x${string}` | null; tokenAddress: `0x${string}` | null; tokenDecimals: number; currencySymbol: string } | null>(null);

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

  async function activate() {
    setError(null);
    if (!usd || usd <= 0) {
      setError("Select a valid quantity");
      return;
    }
    if (!isConnected || !address) {
      setError("Connect your wallet first");
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
      // For USDT, send 'usd' amount in token units
      const value = parseUnits(String(usd), cfg.tokenDecimals);
      if (value === BigInt(0)) {
        setStatus("idle");
        setError("Amount is zero");
        return;
      }
      const hash = await writeContractAsync({
        address: cfg.tokenAddress,
        abi: [
          {
            type: "function",
            name: "transfer",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
            ],
            outputs: [{ type: "bool" }],
          },
        ] as const,
        functionName: "transfer",
        args: [cfg.treasuryAddress, value],
      });
      setStatus("confirming");
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, amountUsd: usd, amountEth: String(usd), txHash: hash }),
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
          : `Activate — Send ${usd.toFixed(2)} ${cfg?.currencySymbol ?? "USDT"}`}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {status === "done" && <p className="text-green-400 text-sm">Activation recorded!</p>}
    </div>
  );
}
