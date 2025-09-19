"use client";

import { useState } from "react";
import SimulateModal from "./simulate-modal";

export default function QuickActions() {
  const [open, setOpen] = useState<null | { usd: number; name: string; l1: number; l2: number }>(null);

  const trigger = (usd: number) => {
    // For demo, assume 50/20 split for commissions, 15% pool
    const l1 = usd * 0.5;
    const l2 = usd * 0.2;
    setOpen({ usd, name: `$${usd.toFixed(0)} Package`, l1, l2 });
  };

  return (
    <div className="card p-6 glow md:col-span-2">
      <h3 className="font-semibold text-lg">Quick Actions</h3>
      <p className="text-white/60 text-sm mt-1">Instant split 50/20/15/15</p>
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
        {[50, 100, 200].map((v) => (
          <button key={v} className="btn btn-sm w-full sm:w-auto" onClick={() => trigger(v)}>${v}</button>
        ))}
      </div>
      <div className="mt-3 grid sm:grid-cols-2 gap-2">
        <button className="btn-outline btn-sm w-full">Add 5 Random Referrals</button>
        <button className="btn-outline btn-sm w-full">Seed Demo Data</button>
      </div>

      {open && (
        <SimulateModal open={!!open} onClose={() => setOpen(null)} name={open.name} usd={open.usd} l1={open.l1} l2={open.l2} />
      )}
    </div>
  );
}
