"use client";

import { useState } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";

export default function SubscribeButton({ planId, priceEth }: { planId: string; priceEth: string }) {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<"idle" | "sending" | "confirming" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { sendTransactionAsync } = useSendTransaction();

  const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}` | undefined;

  async function subscribe() {
    setError(null);
    if (!isConnected || !address) {
      setError("Connect your wallet first");
      return;
    }
    if (!treasury) {
      setError("Treasury not configured");
      return;
    }
    // Ensure user is logged in, otherwise redirect to login
    try {
      const me = await fetch("/api/me", { cache: "no-store" });
      if (me.status === 401) {
        window.location.href = "/login";
        return;
      }
    } catch {}
    try {
      setStatus("sending");
      const hash = await sendTransactionAsync({
        to: treasury,
        value: parseEther(priceEth),
      });
      setStatus("confirming");
      // Notify server to record subscription and compute commissions
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, txHash: hash }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record subscription");
      setStatus("done");
    } catch (e: any) {
      setError(e?.message || "Subscription failed");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-2">
      <button className="btn w-full" onClick={subscribe} disabled={status === "sending" || status === "confirming"}>
        {status === "sending" ? "Sending..." : status === "confirming" ? "Confirming..." : "Subscribe with Wallet"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {status === "done" && <p className="text-green-400 text-sm">Subscription recorded!</p>}
    </div>
  );
}
