import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createPublicClient, http, getAddress } from "viem";
import { getAppConfig, addressTopic, toTokenUnits } from "@/lib/appConfig";

const bodySchema = z.object({
  label: z.string().min(2),
  amountUsd: z.number().positive(),
  amountEth: z.string().min(1),
  txHash: z.string().min(3),
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
    const { label, amountUsd, amountEth, txHash } = parsed.data;

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

    // Verify ERC20 Transfer from user to treasury
    const token = getAddress(tokenAddress as `0x${string}`);
    const toTopic = addressTopic(getAddress(platformAddress as `0x${string}`));
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { walletAddress: true } });
    if (!me?.walletAddress) return NextResponse.json({ error: "User wallet not set" }, { status: 400 });
    const fromTopic = addressTopic(getAddress(me.walletAddress as `0x${string}`));
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;
    const expected = toTokenUnits(amountEth, tokenDecimals);
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

    // Ensure a Plan exists for this independent package label (so dashboard lists it)
    const plan = await prisma.plan.upsert({
      where: { name: label },
      update: { priceEth: amountEth },
      create: {
        name: label,
        description: "Independent package",
        priceEth: amountEth,
        durationDays: 30,
      },
    });

    const now = new Date();
    const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        txHash,
        amountEth: amountEth,
        startsAt: now,
        endsAt,
        active: true,
      },
    });

    // Two-level affiliate commissions (in token units)
    const LEVEL1_BPS = Number(process.env.LEVEL1_BPS ?? 1000);
    const LEVEL2_BPS = Number(process.env.LEVEL2_BPS ?? 500);
    const amt = Number(amountEth);
    const l1Amt = (amt * LEVEL1_BPS) / 10000;
    const l2Amt = (amt * LEVEL2_BPS) / 10000;

    const buyer = await prisma.user.findUnique({ where: { id: userId } });
    if (buyer?.referrerId) {
      const level1 = await prisma.user.findUnique({ where: { id: buyer.referrerId } });
      if (level1) {
        await prisma.commission.create({
          data: {
            beneficiaryId: level1.id,
            fromUserId: buyer.id,
            level: 1,
            amountEth: l1Amt.toFixed(18),
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
                amountEth: l2Amt.toFixed(18),
                status: "PENDING",
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, subscription, amountUsd });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
