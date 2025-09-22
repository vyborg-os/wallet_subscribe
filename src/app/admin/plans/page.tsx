export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PlansClient from "./plans.client";

export default async function AdminPlansPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) redirect("/admin/login");
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") redirect("/admin/login");

  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      priceEth: true,
      durationDays: true,
      active: true,
      createdAt: true,
    },
  });

  const initialPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceEth: p.priceEth.toString(),
    durationDays: p.durationDays,
    active: p.active,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Plans</h1>
      <PlansClient initialPlans={initialPlans} />
    </div>
  );
}
