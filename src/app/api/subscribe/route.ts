import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createPublicClient, http, getAddress } from "viem";
import { getAppConfig, toTokenUnits, addressTopic } from "@/lib/appConfig";

const bodySchema = z.object({
  planId: z.string(),
  txHash: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { planId, txHash } = parsed.data;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const cfg = await getAppConfig();
    const rpcUrl = cfg.rpcUrl;
    const platformAddress = cfg.treasuryAddress;
    const tokenAddress = cfg.tokenAddress;
    const tokenDecimals = cfg.tokenDecimals ?? 6;
    if (!rpcUrl || !platformAddress || !tokenAddress) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const publicClient = createPublicClient({ transport: http(rpcUrl) });

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null);
    if (!receipt || receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction not confirmed" }, { status: 400 });
    }

    // Verify ERC20 Transfer(tokenAddress, from=user.walletAddress, to=platformAddress, value=plan.priceEth with decimals)
    const token = getAddress(tokenAddress as `0x${string}`);
    const toTopic = addressTopic(getAddress(platformAddress as `0x${string}`));
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { walletAddress: true } });
    if (!me?.walletAddress) return NextResponse.json({ error: "User wallet not set" }, { status: 400 });
    const fromTopic = addressTopic(getAddress(me.walletAddress as `0x${string}`));
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;
    const expected = toTokenUnits(plan.priceEth.toString(), tokenDecimals);
    const match = receipt.logs.find((log) => {
      if (!log.address || log.address.toLowerCase() !== token.toLowerCase()) return false;
      if (!log.topics || log.topics.length < 3) return false;
      if ((log.topics[0] || '').toLowerCase() !== TRANSFER_TOPIC) return false;
      const t1 = (log.topics[1] || '').toLowerCase();
      const t2 = (log.topics[2] || '').toLowerCase();
      if (t1 !== fromTopic.toLowerCase()) return false;
      if (t2 !== toTopic.toLowerCase()) return false;
      try {
        const val = BigInt(log.data as `0x${string}`);
        return val === expected;
      } catch { return false; }
    });
    if (!match) {
      return NextResponse.json({ error: "No matching token transfer to treasury found" }, { status: 400 });
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        txHash,
        amountEth: plan.priceEth,
        startsAt: now,
        endsAt,
        active: true,
      },
    });

    // Two-level affiliate commissions (from AppConfig)
    const cfgBps = await getAppConfig();
    const LEVEL1_BPS = cfgBps.level1Bps; // 10% default
    const LEVEL2_BPS = cfgBps.level2Bps; // 5% default

    const buyer = await prisma.user.findUnique({ where: { id: userId } });
    if (buyer?.referrerId) {
      const level1 = await prisma.user.findUnique({ where: { id: buyer.referrerId } });
      if (level1) {
        await prisma.commission.create({
          data: {
            beneficiaryId: level1.id,
            fromUserId: buyer.id,
            level: 1,
            amountEth: plan.priceEth.mul(LEVEL1_BPS).div(10000),
            status: "PENDING",
          },
        });
        if (level1.referrerId) {
          const level2 = await prisma.user.findUnique({ where: { id: level1.referrerId } });
          if (level2) {
            await prisma.commission.create({
              data: {
                beneficiaryId: level2.id,
                fromUserId: buyer.id,
                level: 2,
                amountEth: plan.priceEth.mul(LEVEL2_BPS).div(10000),
                status: "PENDING",
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, subscription });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
