export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./settings.client";
import { redirect } from "next/navigation";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) redirect("/admin/login");
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") redirect("/admin/login");

  let cfg = await prisma.appConfig.findFirst();
  if (!cfg) {
    cfg = await prisma.appConfig.create({ data: {} });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <SettingsClient initial={cfg} />
    </div>
  );
}
