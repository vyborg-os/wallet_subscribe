import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createPublicClient, http, parseEther, getAddress, isAddressEqual } from "viem";
import { sepolia } from "wagmi/chains";

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

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? process.env.RPC_URL;
    const platformAddress = process.env.TREASURY_ADDRESS;
    if (!rpcUrl || !platformAddress) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null);
    if (!receipt || receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction not confirmed" }, { status: 400 });
    }

    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });

    const toOk = tx.to ? isAddressEqual(getAddress(tx.to), getAddress(platformAddress as `0x${string}`)) : false;
    const valueOk = tx.value === parseEther(plan.priceEth.toString());

    if (!toOk || !valueOk) {
      return NextResponse.json({ error: "Invalid transaction details" }, { status: 400 });
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

    // Two-level affiliate commissions
    const LEVEL1_BPS = Number(process.env.LEVEL1_BPS ?? 1000); // 10%
    const LEVEL2_BPS = Number(process.env.LEVEL2_BPS ?? 500); // 5%

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
