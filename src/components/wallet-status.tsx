"use client";

import { useAccount, useChainId } from "wagmi";

function shortAddr(a?: string | null) {
  if (!a) return "—";
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default function WalletStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const network = chainId === 11155111 ? "Sepolia" : chainId ? `Chain ${chainId}` : "—";

  return (
    <div className="mt-3 space-y-3">
      <div className="text-white/70 text-sm">Network</div>
      <div className="text-lg font-semibold">{network}</div>

      <div className="text-white/70 text-sm mt-3">Address</div>
      <div className="font-mono">{isConnected ? shortAddr(address) : "—"}</div>

      <div className="text-white/70 text-sm mt-3">USDC Balance (mock)</div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-emerald-400" style={{ width: "17%" }} />
      </div>
      <div className="text-sm text-white/60">$0.00</div>
    </div>
  );
}
