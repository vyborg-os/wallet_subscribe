import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, refCode: true, walletAddress: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [level1, level1Ids, commissions] = await Promise.all([
    prisma.user.count({ where: { referrerId: userId } }),
    prisma.user.findMany({ where: { referrerId: userId }, select: { id: true } }).then((arr) => arr.map((u) => u.id)),
    prisma.commission.groupBy({ by: ["status", "level"], _sum: { amountEth: true }, where: { beneficiaryId: userId } }),
  ]);

  const level2 = level1Ids.length > 0 ? await prisma.user.count({ where: { referrerId: { in: level1Ids } } }) : 0;

  return NextResponse.json({
    user,
    stats: {
      level1,
      level2,
      commissions,
    },
  });
}
