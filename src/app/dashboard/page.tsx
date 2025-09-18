import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WalletCard from "@/components/wallet-card";
import WithdrawForm from "@/components/withdraw-form";
import { redirect } from "next/navigation";
import ConnectionGuard from "@/components/connection-guard";
import CommissionChart from "@/components/commission-chart";
import { Coins, CreditCard, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return <div className="card p-6">You must be logged in.</div>;
  }
  const userId = (session.user as any).id as string;

  const since = new Date();
  since.setDate(since.getDate() - 6);

  const [user, subs, commissions, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { walletAddress: true } }),
    prisma.subscription.findMany({ where: { userId }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
    prisma.commission.groupBy({
      by: ["status"],
      _sum: { amountEth: true },
      where: { beneficiaryId: userId },
    }),
    prisma.commission.findMany({
      where: { beneficiaryId: userId, createdAt: { gte: since } },
      select: { createdAt: true, amountEth: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user?.walletAddress) {
    redirect("/connect");
  }

  const pendingDec = commissions.find((c) => c.status === "PENDING")?._sum.amountEth ?? null;
  const paidDec = commissions.find((c) => c.status === "PAID")?._sum.amountEth ?? null;
  const pending = pendingDec ? Number(pendingDec) : 0;
  const paid = paidDec ? Number(paidDec) : 0;

  const seriesDays: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const daySum = recent
      .filter((r) => r.createdAt.toISOString().slice(0, 10) === key)
      .reduce((acc, r) => acc + Number(r.amountEth), 0);
    seriesDays.push({ date: label, amount: daySum });
  }

  return (
    <div className="space-y-6">
      <ConnectionGuard />
      <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6 glow">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-lg">Commissions</h3>
          </div>
          <p className="text-white/70 mt-2">Pending: <span className="font-semibold">{pending.toFixed(4)}</span> ETH</p>
          <p className="text-white/70">Paid: <span className="font-semibold">{paid.toFixed(4)}</span> ETH</p>
          <div className="mt-4 text-white/60 text-sm inline-flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Last 7 days overview</div>
        </div>
        <WalletCard />
        <div className="card p-6 glow">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-lg">Withdraw</h3>
          </div>
          <div className="mt-4">
            <WithdrawForm />
          </div>
        </div>
      </div>

      <CommissionChart pending={pending} paid={paid} series={seriesDays} />

      <div className="card p-6">
        <h3 className="font-semibold text-lg mb-4">Your Subscriptions</h3>
        <div className="divide-y divide-white/10">
          {subs.length === 0 && <p className="text-white/70">No subscriptions yet.</p>}
          {subs.map((s) => (
            <div key={s.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.plan.name}</div>
                <div className="text-white/60 text-sm">{s.amountEth.toString()} ETH • Tx: {s.txHash.slice(0, 10)}...{s.txHash.slice(-6)}</div>
              </div>
              <div className="text-white/60 text-sm">Active until {new Date(s.endsAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
