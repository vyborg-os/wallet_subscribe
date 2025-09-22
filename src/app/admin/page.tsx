export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) redirect("/admin/login");
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") redirect("/admin/login");

  const [totalUsers, totalSubscribed, totalActiveSubs] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { subscriptions: { some: { active: true } } } }),
    prisma.subscription.count({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="text-xs text-white/60">Total Users</div>
          <div className="text-3xl font-semibold mt-1">{totalUsers}</div>
        </div>
        <div className="card p-6">
          <div className="text-xs text-white/60">Users with Active Subscription</div>
          <div className="text-3xl font-semibold mt-1">{totalSubscribed}</div>
        </div>
        <div className="card p-6">
          <div className="text-xs text-white/60">Active Subscriptions</div>
          <div className="text-3xl font-semibold mt-1">{totalActiveSubs}</div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-lg mb-3">Management</h3>
        <div className="flex flex-wrap gap-3">
          <Link className="btn" href="/admin/users">Users & Emails</Link>
          <Link className="btn-outline" href="/admin/leaderboard">Leaderboard</Link>
        </div>
      </div>
    </div>
  );
}
