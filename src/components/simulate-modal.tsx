"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import ActivateButton from "./activate-button";

export default function SimulateModal({ open, onClose, name, usd, l1, l2 }: { open: boolean; onClose: () => void; name: string; usd: number; l1: number; l2: number }) {
  const [qty, setQty] = useState(1);
  const totals = useMemo(() => {
    const totalUsd = usd * qty;
    return {
      totalUsd,
      l1Usd: l1 * qty,
      l2Usd: l2 * qty,
      poolUsd: Math.round(totalUsd * 0.15 * 100) / 100, // optional 15% pool accrual visualization
    };
  }, [usd, l1, l2, qty]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md glow">
        <button onClick={onClose} className="absolute right-3 top-3 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        <h3 className="text-xl font-semibold mb-2">Simulate • {name}</h3>
        <p className="text-white/70 mb-4">Estimate commissions for multiple activations.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Quantity</label>
            <input
              className="input"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value || "1", 10);
                setQty(Number.isFinite(v) ? Math.max(1, v) : 1);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-white/60">Total</div>
              <div className="text-lg font-semibold">${totals.totalUsd.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-white/60">Pool (15%)</div>
              <div className="text-lg font-semibold">${totals.poolUsd.toFixed(2)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-white/60">To L1</div>
              <div className="text-lg font-semibold">${totals.l1Usd.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-white/60">To L2</div>
              <div className="text-lg font-semibold">${totals.l2Usd.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 text-white/60 text-sm">
          This simulation is for planning only. Final on-chain values depend on the selected payment method.
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <button className="btn-outline" onClick={onClose}>Close</button>
          <ActivateButton label={`${name} x${qty}`} usd={usd * qty} />
        </div>
      </div>
    </div>
  );
}
