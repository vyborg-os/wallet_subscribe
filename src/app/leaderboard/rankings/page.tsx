export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import LeaderboardClient from "./LeaderboardClient";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function shortAddr(a?: string | null) {
  if (!a) return "—";
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export type LeaderRow = {
  id: string;
  address: string;
  refs: number;
  volumeDirectUsd: number;
  volumeTwoLevelUsd: number; // direct + credited as L2
};

export default async function RankingsPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const USD_PER_ETH = Number(process.env.USD_PER_ETH || 3000);

  // Current month subscriptions and their sponsors (referrerId)
  const subs = await prisma.subscription.findMany({
    where: { createdAt: { gte: monthStart, lte: monthEnd } },
    select: { amountEth: true, userId: true, user: { select: { referrerId: true } } },
  });

  type Agg = { volumeEth: number; userIds: Set<string> };
  const bySponsor = new Map<string, Agg>(); // L1 volume credited to sponsor
  for (const s of subs) {
    const sponsor = s.user.referrerId;
    if (!sponsor) continue;
    const slot = bySponsor.get(sponsor) || { volumeEth: 0, userIds: new Set<string>() };
    slot.volumeEth += Number(s.amountEth);
    slot.userIds.add(s.userId);
    bySponsor.set(sponsor, slot);
  }

  // Build L2 mapping: sponsor -> their referrer (uplines)
  const sponsorIds = [...bySponsor.keys()];
  const sponsors = sponsorIds.length
    ? await prisma.user.findMany({ where: { id: { in: sponsorIds } }, select: { id: true, walletAddress: true, referrerId: true } })
    : [];
  const sponsorMap = new Map(sponsors.map((u) => [u.id, u] as const));
  const l2Map = new Map<string, string | null>(sponsors.map((u) => [u.id, u.referrerId ?? null] as const));

  // Credit L2 volume to upline of each sponsor
  const byL2: Map<string, number> = new Map();
  for (const [sponsorId, agg] of bySponsor) {
    const l2 = l2Map.get(sponsorId);
    if (!l2) continue;
    const prev = byL2.get(l2) ?? 0;
    byL2.set(l2, prev + agg.volumeEth);
  }

  const rows: LeaderRow[] = sponsorIds.map((id) => {
    const agg = bySponsor.get(id)!;
    const directUsd = agg.volumeEth * USD_PER_ETH;
    const l2Usd = (byL2.get(id) ?? 0) * USD_PER_ETH;
    const address = sponsorMap.get(id)?.walletAddress || id;
    return { id, address, refs: agg.userIds.size, volumeDirectUsd: directUsd, volumeTwoLevelUsd: directUsd + l2Usd };
  });

  const totalDirectUsd = rows.reduce((a, r) => a + r.volumeDirectUsd, 0) || 1;
  const totalTwoLevelUsd = rows.reduce((a, r) => a + r.volumeTwoLevelUsd, 0) || 1;
  const sorted = rows.sort((a, b) => b.volumeDirectUsd - a.volumeDirectUsd);

  // Provide initial page size 10; client can change to 25/50
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-brand" />
        <h1 className="text-3xl font-bold">Monthly Leaderboard</h1>
      </div>

      <LeaderboardClient initialRows={sorted} totalDirectUsd={totalDirectUsd} totalTwoLevelUsd={totalTwoLevelUsd} />
    </div>
  );
}
