import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  treasuryAddress: z.string().nullable().optional(),
  leaderboardAddress: z.string().nullable().optional(),
  tokenAddress: z.string().nullable().optional(),
  tokenDecimals: z.number().int().min(0).max(36).nullable().optional(),
  currencySymbol: z.string().min(1).max(10).nullable().optional(),
  chainId: z.number().int().nullable().optional(),
  rpcUrl: z.string().url().nullable().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return { status: 401 as const };
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") return { status: 403 as const };
  return { status: 200 as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  let cfg = await prisma.appConfig.findFirst();
  if (!cfg) {
    cfg = await prisma.appConfig.create({ data: {} });
  }
  return NextResponse.json({ config: cfg });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const json = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.appConfig.findFirst();
  const raw = parsed.data;
  // Build Prisma-safe data: allow nulls for nullable columns, but omit nulls on non-nullable ones
  const data: any = {
    // Nullable columns — allow null to clear
    treasuryAddress: raw.treasuryAddress ?? undefined,
    leaderboardAddress: raw.leaderboardAddress ?? undefined,
    tokenAddress: raw.tokenAddress ?? undefined,
    chainId: raw.chainId ?? undefined,
    rpcUrl: raw.rpcUrl ?? undefined,
  };
  if (raw.tokenDecimals !== null && raw.tokenDecimals !== undefined) data.tokenDecimals = raw.tokenDecimals;
  if (raw.currencySymbol !== null && raw.currencySymbol !== undefined) data.currencySymbol = raw.currencySymbol.toUpperCase();

  const cfg = existing
    ? await prisma.appConfig.update({ where: { id: existing.id }, data })
    : await prisma.appConfig.create({ data });
  return NextResponse.json({ config: cfg });
}
