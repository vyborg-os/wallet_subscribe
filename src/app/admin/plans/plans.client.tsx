"use client";

import { useEffect, useMemo, useState } from "react";

type Plan = {
  id: string;
  name: string;
  description: string;
  priceEth: string; // decimal string
  durationDays: number;
  active: boolean;
  createdAt: string;
};

export default function PlansClient({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [newPlan, setNewPlan] = useState({ name: "", description: "", priceEth: "", durationDays: 30, active: true });

  const refresh = async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/plans", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load plans");
      setPlans(j.plans.map((p: any) => ({ ...p, priceEth: p.priceEth }))); // priceEth is serialized already
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPlan, durationDays: Number(newPlan.durationDays) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to create plan");
      setNewPlan({ name: "", description: "", priceEth: "", durationDays: 30, active: true });
      await refresh();
    } catch (e: any) {
      setError(e.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const onUpdate = async (id: string, patch: Partial<Plan>) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to update plan");
      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...serializePlan(j.plan) } : p)));
    } catch (e: any) {
      setError(e.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this plan? It must have no subscriptions.")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to delete plan");
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="font-semibold text-lg mb-3">Create Plan</h3>
        <form onSubmit={onCreate} className="grid md:grid-cols-5 gap-3">
          <input className="input" required placeholder="Name" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
          <input className="input md:col-span-2" required placeholder="Description" value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} />
          <input className="input" required placeholder="Price (ETH)" value={newPlan.priceEth} onChange={(e) => setNewPlan({ ...newPlan, priceEth: e.target.value })} />
          <input className="input" required type="number" min={1} placeholder="Duration days" value={newPlan.durationDays} onChange={(e) => setNewPlan({ ...newPlan, durationDays: Number(e.target.value) })} />
          <div className="md:col-span-5 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-white/80"><input type="checkbox" checked={newPlan.active} onChange={(e) => setNewPlan({ ...newPlan, active: e.target.checked })} /> Active</label>
            <button className="btn" disabled={loading}>Create</button>
            {error && <span className="text-red-400 text-sm">{error}</span>}
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-lg mb-3">Existing Plans</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/60">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Price (ETH)</th>
                <th className="py-2 pr-4">Days</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {plans.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-4"><input className="input" value={p.name} onChange={(e) => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x))} /></td>
                  <td className="py-2 pr-4"><input className="input w-full" value={p.description} onChange={(e) => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))} /></td>
                  <td className="py-2 pr-4"><input className="input w-28" value={p.priceEth} onChange={(e) => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, priceEth: e.target.value } : x))} /></td>
                  <td className="py-2 pr-4"><input className="input w-20" type="number" min={1} value={p.durationDays} onChange={(e) => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, durationDays: Number(e.target.value) } : x))} /></td>
                  <td className="py-2 pr-4">
                    <label className="inline-flex items-center gap-2 text-white/80">
                      <input type="checkbox" checked={p.active} onChange={(e) => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, active: e.target.checked } : x))} /> Active
                    </label>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button className="btn" onClick={() => onUpdate(p.id, { name: p.name, description: p.description, priceEth: p.priceEth, durationDays: p.durationDays, active: p.active })} disabled={loading}>Save</button>
                      <button className="btn-outline" onClick={() => onDelete(p.id)} disabled={loading}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function serializePlan(p: any): Plan {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    priceEth: typeof p.priceEth === "string" ? p.priceEth : String(p.priceEth),
    durationDays: p.durationDays,
    active: p.active,
    createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date(p.createdAt).toISOString(),
  };
}
