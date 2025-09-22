export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UsersClient from "./users.client";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) redirect("/admin/login");
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") redirect("/admin/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      walletAddress: true,
      role: true,
      createdAt: true,
      subscriptions: { where: { active: true }, select: { id: true }, take: 1 },
    },
  });

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "",
    wallet: u.walletAddress ?? "",
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    subscribed: u.subscriptions.length > 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users & Emails</h1>
      <UsersClient initialRows={rows} />
    </div>
  );
}
