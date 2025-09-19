"use client";

import { useState } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";

export default function ActivateButton({ label, usd }: { label: string; usd: number }) {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [status, setStatus] = useState<"idle" | "sending" | "confirming" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}` | undefined;
  const USD_PER_ETH = Number(process.env.NEXT_PUBLIC_USD_PER_ETH || 3000);

  async function activate() {
    setError(null);
    if (!isConnected || !address) {
      setError("Connect your wallet first");
      return;
    }
    if (!treasury) {
      setError("Treasury not configured");
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

    const eth = usd / USD_PER_ETH;
    const ethStr = eth.toFixed(6); // 6 decimals precision is plenty for USD conversion

    try {
      setStatus("sending");
      const hash = await sendTransactionAsync({
        to: treasury,
        value: parseEther(ethStr),
      });
      setStatus("confirming");
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, amountUsd: usd, amountEth: ethStr, txHash: hash }),
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
        {status === "sending" ? "Sending..." : status === "confirming" ? "Confirming..." : "Activate"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {status === "done" && <p className="text-green-400 text-sm">Activation recorded!</p>}
    </div>
  );
}
