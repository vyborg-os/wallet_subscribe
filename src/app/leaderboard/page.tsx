export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Users, Clock } from "lucide-react";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function formatUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function shortAddr(a?: string | null) {
  if (!a) return "—";
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default async function LeaderboardPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const twoMonthsAgoStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));

  const USD_PER_ETH = Number(process.env.USD_PER_ETH || 3000);

  // Gather subscriptions for current month with sponsor (referrer)
  const subs = await prisma.subscription.findMany({
    where: { createdAt: { gte: monthStart, lte: monthEnd } },
    select: { amountEth: true, userId: true, user: { select: { referrerId: true } } },
  });

  type Agg = { volumeEth: number; userIds: Set<string> };
  const bySponsor = new Map<string, Agg>();
  for (const s of subs) {
    const sponsor = s.user.referrerId;
    if (!sponsor) continue;
    const slot = bySponsor.get(sponsor) || { volumeEth: 0, userIds: new Set<string>() };
    slot.volumeEth += Number(s.amountEth);
    slot.userIds.add(s.userId);
    bySponsor.set(sponsor, slot);
  }

  const sponsorIds = [...bySponsor.keys()];
  const sponsors = sponsorIds.length
    ? await prisma.user.findMany({ where: { id: { in: sponsorIds } }, select: { id: true, walletAddress: true } })
    : [];
  const sponsorMap = new Map(sponsors.map((u) => [u.id, u] as const));

  const rows = sponsorIds.map((id) => {
    const agg = bySponsor.get(id)!;
    const volumeUsd = agg.volumeEth * USD_PER_ETH;
    return {
      id,
      address: sponsorMap.get(id)?.walletAddress || id,
      refs: agg.userIds.size,
      volumeUsd,
    };
  });

  const totalVolumeUsd = rows.reduce((a, r) => a + r.volumeUsd, 0);
  const sorted = rows.sort((a, b) => b.volumeUsd - a.volumeUsd);
  const top20 = sorted.slice(0, 20);
  const top20Total = top20.reduce((a, r) => a + r.volumeUsd, 0) || 1;

  const poolAccruedNow = totalVolumeUsd * 0.15;

  // Last 3 months accruals (for history)
  const lastMonthSubs = await prisma.subscription.findMany({
    where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    select: { amountEth: true },
  });
  const lastMonthTotalUsd = lastMonthSubs.reduce((a, s) => a + Number(s.amountEth) * USD_PER_ETH, 0);
  const twoMonthsAgoSubs = await prisma.subscription.findMany({
    where: { createdAt: { gte: twoMonthsAgoStart, lte: startOfMonth(lastMonthStart) } },
    select: { amountEth: true },
  });
  const twoMonthsAgoTotalUsd = twoMonthsAgoSubs.reduce((a, s) => a + Number(s.amountEth) * USD_PER_ETH, 0);
  const avg3m = (totalVolumeUsd + lastMonthTotalUsd + twoMonthsAgoTotalUsd) / 3;

  const msLeft = monthEnd.getTime() - now.getTime();
  const days = Math.floor(msLeft / (24 * 3600 * 1000));
  const hours = Math.floor((msLeft % (24 * 3600 * 1000)) / (3600 * 1000));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-brand" />
        <h1 className="text-3xl font-bold">Monthly Leaderboard</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 glow lg:col-span-2">
          <h3 className="font-semibold text-lg">Leaders' 15% Reward Pool</h3>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60">Accrued (This Month)</div>
              <div className="text-xl font-semibold">{formatUsd(poolAccruedNow)}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60">Distribution In</div>
              <div className="text-xl font-semibold">{days}d {hours}h</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-white/60">Last Month Distributed</div>
              <div className="text-xl font-semibold">{formatUsd(lastMonthTotalUsd * 0.15)}</div>
            </div>
          </div>

          <p className="text-white/60 text-sm mt-3">Accrues 15% of all package activations. Distributes to Top-20 at month end by weighted share.</p>

          <div className="mt-4">
            <div className="text-xs text-white/60 mb-2">Split Bar</div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, (poolAccruedNow / (avg3m * 0.15 || 1)) * 60)}%` }} />
            </div>
            <div className="grid grid-cols-3 text-white/70 text-sm mt-3">
              <div className="text-center">
                <div className="font-semibold">Accrued</div>
                <div>{formatUsd(poolAccruedNow)}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">Last</div>
                <div>{formatUsd(lastMonthTotalUsd * 0.15)}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">Avg3m</div>
                <div>{formatUsd((avg3m || 0) * 0.15)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 glow">
          <h3 className="font-semibold text-lg">Distribution History</h3>
          <div className="mt-4 divide-y divide-white/10">
            {[0, 1, 2].map((i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              const total = i === 0 ? totalVolumeUsd : i === 1 ? lastMonthTotalUsd : twoMonthsAgoTotalUsd;
              const tx = `0xPOOLTX...${9 - i}`;
              return (
                <div key={i} className="py-3 flex items-center justify-between text-sm">
                  <div className="text-white/70 w-24">{m}</div>
                  <div className="flex-1 text-right font-medium">{formatUsd(total * 0.15)}</div>
                  <div className="w-40 text-right text-white/60">{tx}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-6 glow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Top-20 (Current Month)</h3>
          <div className="text-sm text-white/60 flex items-center gap-2"><Clock className="w-4 h-4" /> Updates live</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/60">
                <th className="py-2 pr-4">Rank</th>
                <th className="py-2 pr-4">Address</th>
                <th className="py-2 pr-4">Refs</th>
                <th className="py-2 pr-4">Volume (USD)</th>
                <th className="py-2 pr-4">Share %</th>
                <th className="py-2 pr-4">Est. Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {top20.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-white/60">No activity yet this month.</td>
                </tr>
              )}
              {top20.map((r, idx) => {
                const sharePct = totalVolumeUsd ? (r.volumeUsd / totalVolumeUsd) * 100 : 0;
                const estPayout = poolAccruedNow * (r.volumeUsd / top20Total);
                return (
                  <tr key={r.id}>
                    <td className="py-2 pr-4">{idx + 1}</td>
                    <td className="py-2 pr-4 font-mono">{shortAddr(r.address)}</td>
                    <td className="py-2 pr-4">{r.refs}</td>
                    <td className="py-2 pr-4">{formatUsd(r.volumeUsd)}</td>
                    <td className="py-2 pr-4">{sharePct.toFixed(2)}%</td>
                    <td className="py-2 pr-4">{formatUsd(estPayout)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
