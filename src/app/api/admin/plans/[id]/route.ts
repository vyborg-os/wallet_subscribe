import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  priceEth: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  durationDays: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return { status: 401 as const };
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") return { status: 403 as const };
  return { status: 200 as const };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const id = params.id;
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data: any = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.priceEth !== undefined) data.priceEth = new Prisma.Decimal(parsed.data.priceEth);
  if (parsed.data.durationDays !== undefined) data.durationDays = parsed.data.durationDays;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  try {
    const plan = await prisma.plan.update({ where: { id }, data });
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update plan" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const id = params.id;
  const subCount = await prisma.subscription.count({ where: { planId: id } });
  if (subCount > 0) {
    return NextResponse.json({ error: "Cannot delete a plan with subscriptions" }, { status: 400 });
  }
  try {
    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 400 });
  }
}
