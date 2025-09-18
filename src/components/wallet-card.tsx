"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { getAddress } from "viem";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Wallet, BadgeCheck } from "lucide-react";

export default function WalletCard() {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: me, refetch, isFetching } = useQuery<{ user: { walletAddress: string | null } }>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    staleTime: 30_000,
  });

  const save = async () => {
    setError(null);
    if (!isConnected || !address) {
      setError("Connect your wallet first");
      return;
    }
    try {
      setStatus("saving");
      const res = await fetch("/api/me/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save wallet");
      setStatus("saved");
      refetch();
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Save failed");
    }
  };

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="card p-6 glow">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-brand" />
        <h3 className="font-semibold text-lg">Connected Wallet</h3>
      </div>
      <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
        <div className="text-white/80">
          {isConnected ? truncateAddress(getAddress(address as `0x${string}`)) : "Not connected"}
        </div>
        <button onClick={copy} className="text-white/60 hover:text-white" disabled={!isConnected} title="Copy address">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-4 text-sm text-white/70">
        Saved payout wallet: {isFetching ? <span>Loading…</span> : (me?.user.walletAddress || <span className="text-white/50">None</span>)}
        {me?.user.walletAddress && isConnected && me.user.walletAddress.toLowerCase() === address?.toLowerCase() && (
          <span className="inline-flex items-center gap-1 text-green-400 ml-2"><BadgeCheck className="w-4 h-4" /> synced</span>
        )}
      </div>

      <button className="btn mt-4" onClick={save} disabled={!isConnected || status === "saving"}>
        {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save as Payout Wallet"}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}

function truncateAddress(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}
