"use client";

import { useState } from "react";

type Config = {
  id: string;
  treasuryAddress: string | null;
  leaderboardAddress: string | null;
  tokenAddress: string | null;
  tokenDecimals: number;
  currencySymbol: string;
  chainId: number | null;
  rpcUrl: string | null;
};

export default function SettingsClient({ initial }: { initial: Config }) {
  const [cfg, setCfg] = useState<Config>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const patch = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treasuryAddress: emptyToNull(cfg.treasuryAddress),
          leaderboardAddress: emptyToNull(cfg.leaderboardAddress),
          tokenAddress: emptyToNull(cfg.tokenAddress),
          tokenDecimals: cfg.tokenDecimals,
          currencySymbol: cfg.currencySymbol,
          chainId: cfg.chainId,
          rpcUrl: emptyToNull(cfg.rpcUrl),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to update settings");
      setCfg(j.config);
      setOk("Saved");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-lg mb-4">Platform Settings</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Treasury Address (receives subscriptions)</label>
          <input className="input" placeholder="0x..." value={cfg.treasuryAddress ?? ""} onChange={(e) => setCfg({ ...cfg, treasuryAddress: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Leaderboard Pool Address (distribution wallet)</label>
          <input className="input" placeholder="0x..." value={cfg.leaderboardAddress ?? ""} onChange={(e) => setCfg({ ...cfg, leaderboardAddress: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Token Address (USDT)</label>
          <input className="input" placeholder="0x..." value={cfg.tokenAddress ?? ""} onChange={(e) => setCfg({ ...cfg, tokenAddress: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Token Decimals</label>
          <input className="input" type="number" min={0} max={36} value={cfg.tokenDecimals} onChange={(e) => setCfg({ ...cfg, tokenDecimals: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Currency Symbol</label>
          <input className="input" placeholder="USDT" value={cfg.currencySymbol} onChange={(e) => setCfg({ ...cfg, currencySymbol: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">RPC URL</label>
          <input className="input" placeholder="https://..." value={cfg.rpcUrl ?? ""} onChange={(e) => setCfg({ ...cfg, rpcUrl: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Chain ID</label>
          <input className="input" type="number" placeholder="e.g. 11155111 (Sepolia)" value={cfg.chainId ?? "" as any} onChange={(e) => setCfg({ ...cfg, chainId: e.target.value ? Number(e.target.value) : null })} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn" onClick={patch} disabled={loading}>Save Settings</button>
        {ok && <span className="text-emerald-400 text-sm">{ok}</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </div>
  );
}

function emptyToNull(s: string | null): string | null {
  if (s == null) return null;
  return s.trim() === "" ? null : s;
}
