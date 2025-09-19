"use client";

import { useState } from "react";
import { Crown, Wallet } from "lucide-react";
import SimulateModal from "@/components/simulate-modal";

type Pkg = { id: string; name: string; usd: number; l1: number; l2: number };

const PACKAGES: Pkg[] = [
  { id: "starter", name: "$10 Starter", usd: 10, l1: 5, l2: 2 },
  { id: "foundation", name: "$20 Foundation", usd: 20, l1: 10, l2: 4 },
  { id: "builder", name: "$50 Builder", usd: 50, l1: 25, l2: 10 },
  { id: "pro", name: "$100 Pro", usd: 100, l1: 50, l2: 20 },
  { id: "elite", name: "$200 Elite", usd: 200, l1: 100, l2: 40 },
];

export default function PlansPage() {
  const [open, setOpen] = useState<null | Pkg>(null);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-brand" />
          <h1 className="text-3xl font-bold">Independent Packages</h1>
        </div>
        <p className="text-white/70 mt-2">Choose any combination. Each package is independent and generates its own commission stream.</p>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {PACKAGES.map((p) => (
          <div key={p.id} className="card p-6 glow flex flex-col">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand" />
              <h3 className="text-xl font-semibold">{p.name}</h3>
            </div>
            <div className="text-3xl font-bold mt-3">${p.usd.toFixed(0)}</div>
            <div className="mt-3 text-white/70 text-sm">${p.l1.toFixed(0)} to L1 • ${p.l2.toFixed(0)} to L2</div>
            <button className="btn mt-5" onClick={() => setOpen(p)}>Simulate</button>
          </div>
        ))}
      </div>

      {open && (
        <SimulateModal
          open={!!open}
          onClose={() => setOpen(null)}
          name={open.name}
          usd={open.usd}
          l1={open.l1}
          l2={open.l2}
        />
      )}
    </div>
  );
}
