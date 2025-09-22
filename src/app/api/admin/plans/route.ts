import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  priceEth: z.string().regex(/^\d+(\.\d+)?$/),
  durationDays: z.number().int().positive(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = planSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, description, priceEth, durationDays, active } = parsed.data;

  const plan = await prisma.plan.create({
    data: {
      name,
      description,
      priceEth: new Prisma.Decimal(priceEth),
      durationDays,
      active: active ?? true,
    },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
