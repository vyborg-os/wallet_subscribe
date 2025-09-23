import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ConnectionGuard from "@/components/connection-guard";
import { getAppConfig } from "@/lib/appConfig";

function absoluteUrl(path: string) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}${path}`;
}

export default async function AffiliatePage() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return <div className="card p-6">You must be logged in.</div>;
  }
  const userId = (session.user as any).id as string;
  const cfg = await getAppConfig();
  const sym = cfg.currencySymbol || "USDT";

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { refCode: true, walletAddress: true } });
  if (!user?.walletAddress) {
    redirect("/connect");
  }
  const refLink = absoluteUrl(`/signup?ref=${user?.refCode}`);

  // Level 1 referrals
  const level1 = await prisma.user.findMany({ where: { referrerId: userId }, select: { id: true } });
  const level1Ids = level1.map((u: { id: string }) => u.id);
  // Level 2 referrals (referrals of your referrals)
  const level2Count = level1Ids.length > 0 ? await prisma.user.count({ where: { referrerId: { in: level1Ids } } }) : 0;

  const commissions = await prisma.commission.groupBy({
    by: ["level"],
    _sum: { amountEth: true },
    where: { beneficiaryId: userId },
  });

  const level1Sum = commissions.find((c: { level: number; _sum: { amountEth: any | null } }) => c.level === 1)?._sum.amountEth?.toString() || "0";
  const level2Sum = commissions.find((c: { level: number; _sum: { amountEth: any | null } }) => c.level === 2)?._sum.amountEth?.toString() || "0";

  return (
    <div className="space-y-6">
      <ConnectionGuard />
      <h1 className="text-3xl font-bold">Affiliate</h1>
      <div className="card p-6">
        <h3 className="font-semibold text-lg">Your referral link</h3>
        <div className="mt-3 flex gap-2 items-center">
          <input className="input flex-1" readOnly value={refLink} />
          {/* Use a client-side copy button by fallback using input select */}
        </div>
        <p className="text-white/70 text-sm mt-2">Share this link. You earn on two levels when someone subscribes.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-lg">Level 1 referrals</h3>
          <p className="text-3xl font-extrabold mt-2">{level1Ids.length}</p>
          <p className="text-white/70">Earnings: {level1Sum} {sym}</p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-lg">Level 2 referrals</h3>
          <p className="text-3xl font-extrabold mt-2">{level2Count}</p>
          <p className="text-white/70">Earnings: {level2Sum} {sym}</p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-lg">How it works</h3>
          <ul className="list-disc pl-5 text-white/80 mt-2 space-y-1">
            <li>Share your unique signup link.</li>
            <li>You earn Level 1 commission from direct referrals.</li>
            <li>You earn Level 2 commission from their referrals.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
