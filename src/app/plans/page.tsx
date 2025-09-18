import { prisma } from "@/lib/prisma";
import SubscribeButton from "@/components/subscribe-button";
import { Crown, Clock, Wallet } from "lucide-react";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { priceEth: "asc" } });
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Crown className="w-6 h-6 text-brand" />
        <h1 className="text-3xl font-bold">Choose your plan</h1>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className="card p-6 flex flex-col glow">
            <h3 className="text-xl font-semibold">{p.name}</h3>
            <p className="text-white/70 mt-1 flex-1">{p.description}</p>
            <div className="mt-4 space-y-1">
              <div className="text-2xl font-bold inline-flex items-center gap-2"><Wallet className="w-5 h-5 text-brand" /> {p.priceEth.toString()} ETH</div>
              <div className="text-white/60 text-sm inline-flex items-center gap-2"><Clock className="w-4 h-4" /> {p.durationDays} days</div>
            </div>
            <div className="mt-6">
              <SubscribeButton planId={p.id} priceEth={p.priceEth.toString()} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
