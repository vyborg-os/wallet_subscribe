import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WalletCard from "@/components/wallet-card";
import WithdrawForm from "@/components/withdraw-form";
import { redirect } from "next/navigation";
import ConnectionGuard from "@/components/connection-guard";
import CommissionChart from "@/components/commission-chart";
import QuickActions from "@/components/quick-actions";
import WalletStatus from "@/components/wallet-status";
import { Coins, CreditCard, TrendingUp, Wallet as WalletIcon, Users, BarChart3 } from "lucide-react";
import { getAppConfig } from "@/lib/appConfig";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return <div className="card p-6">You must be logged in.</div>;
  }
  const userId = (session.user as any).id as string;

  const since = new Date();
  since.setDate(since.getDate() - 6);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [user, subs, commissions, recent, commissionsByLevel, level1Refs, platformMonthSubs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { walletAddress: true, refCode: true } }),
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
    prisma.commission.groupBy({
      by: ["level"],
      _sum: { amountEth: true },
      where: { beneficiaryId: userId },
    }),
    prisma.user.count({ where: { referrerId: userId } }),
    prisma.subscription.findMany({ where: { createdAt: { gte: monthStart, lte: monthEnd } }, select: { amountEth: true } }),
  ]);

  const cfg = await getAppConfig();
  const sym = cfg.currencySymbol || "USDT";

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

  // Overview computations
  const l1Sum = Number((commissionsByLevel.find((c) => c.level === 1)?._sum.amountEth) ?? 0);
  const l2Sum = Number((commissionsByLevel.find((c) => c.level === 2)?._sum.amountEth) ?? 0);
  const poolAccrued = platformMonthSubs.reduce((a, s) => a + Number(s.amountEth), 0) * 0.15;

  // Rank snapshot (current month direct volume by sponsor)
  const monthSubs = await prisma.subscription.findMany({
    where: { createdAt: { gte: monthStart, lte: monthEnd } },
    select: { amountEth: true, user: { select: { referrerId: true } } },
  });
  const bySponsor = new Map<string, number>();
  for (const s of monthSubs) {
    const sponsor = s.user.referrerId;
    if (!sponsor) continue;
    bySponsor.set(sponsor, (bySponsor.get(sponsor) ?? 0) + Number(s.amountEth));
  }
  const myVol = bySponsor.get(userId) ?? 0;
  const sortedSponsors = [...bySponsor.values()].sort((a, b) => b - a);
  const myRank = myVol > 0 ? sortedSponsors.findIndex((v) => v === myVol) + 1 : undefined;
  const USD_PER_ETH = Number(process.env.USD_PER_ETH || 3000);
  const myVolUsd = myVol * USD_PER_ETH;

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
          <p className="text-white/70 mt-2">Pending: <span className="font-semibold">{pending.toFixed(4)}</span> {sym}</p>
          <p className="text-white/70">Paid: <span className="font-semibold">{paid.toFixed(4)}</span> {sym}</p>
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

      {/* Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <div className="text-xs text-white/60">L1 Earnings (50%)</div>
          <div className="text-2xl font-semibold mt-1">{l1Sum.toFixed(4)} {sym}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <div className="text-xs text-white/60">L2 Earnings (20%)</div>
          <div className="text-2xl font-semibold mt-1">{l2Sum.toFixed(4)} {sym}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <div className="text-xs text-white/60">Pool Accrued (15%)</div>
          <div className="text-2xl font-semibold mt-1">{poolAccrued.toFixed(4)} {sym}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <div className="text-xs text-white/60">Referrals</div>
          <div className="text-2xl font-semibold mt-1">{level1Refs}</div>
        </div>
      </div>

      <CommissionChart pending={pending} paid={paid} series={seriesDays} />

      <div className="grid md:grid-cols-3 gap-6">
        <QuickActions />
        {/* Wallet Status */}
        <div className="card p-6">
          <div className="flex items-center gap-2"><WalletIcon className="w-5 h-5 text-brand" /><h3 className="font-semibold text-lg">Wallet Status</h3></div>
          <WalletStatus />
        </div>
        <div className="card p-6 md:col-span-2">
          <h3 className="font-semibold text-lg mb-4">Your Subscriptions</h3>
          <div className="divide-y divide-white/10">
            {subs.length === 0 && <p className="text-white/70">No subscriptions yet.</p>}
            {subs.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.plan.name}</div>
                  <div className="text-white/60 text-sm">{s.amountEth.toString()} {sym} • Tx: {s.txHash.slice(0, 10)}...{s.txHash.slice(-6)}</div>
                </div>
                <div className="text-white/60 text-sm">Active until {new Date(s.endsAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Receipts and Rank Snapshot */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6 md:col-span-2">
          <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-brand" /><h3 className="font-semibold text-lg">Recent Receipts</h3></div>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-white/60">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4">50% L1</th>
                  <th className="py-2 pr-4">20% L2</th>
                  <th className="py-2 pr-4">15% Pool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(await prisma.commission.findMany({ where: { beneficiaryId: userId }, orderBy: { createdAt: "desc" }, take: 10 })).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-4">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">L{c.level}</td>
                    <td className="py-2 pr-4">{c.level === 1 ? `${Number(c.amountEth).toFixed(6)} ${sym}` : "-"}</td>
                    <td className="py-2 pr-4">{c.level === 2 ? `${Number(c.amountEth).toFixed(6)} ${sym}` : "-"}</td>
                    <td className="py-2 pr-4">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-white/60 text-sm">Your Rank Snapshot</div>
          <div className="text-3xl font-semibold mt-2">{typeof myRank === "number" ? `#${myRank}` : "—"}</div>
          <div className="mt-2 text-white/70">Volume: <span className="font-semibold">${myVolUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div className="mt-1 text-white/70">Refs: <span className="font-semibold">{level1Refs}</span></div>
          <div className="mt-1 text-emerald-400 text-sm">Trend ▲</div>
        </div>
      </div>
    </div>
  );
}
