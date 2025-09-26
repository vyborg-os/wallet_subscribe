import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await prisma.appConfig.findFirst();
    const fallbackTreasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS || null;
    const fallbackRpc = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || null;
    const fallbackL1 = Number(process.env.LEVEL1_BPS ?? 1000);
    const fallbackL2 = Number(process.env.LEVEL2_BPS ?? 500);
    return NextResponse.json({
      config: {
        treasuryAddress: cfg?.treasuryAddress ?? fallbackTreasury,
        leaderboardAddress: cfg?.leaderboardAddress ?? null,
        tokenAddress: cfg?.tokenAddress ?? null,
        tokenDecimals: cfg?.tokenDecimals ?? 6,
        currencySymbol: cfg?.currencySymbol ?? "USDT",
        level1Bps: (cfg as any)?.level1Bps ?? fallbackL1,
        level2Bps: (cfg as any)?.level2Bps ?? fallbackL2,
        chainId: cfg?.chainId ?? null,
        rpcUrl: cfg?.rpcUrl ?? fallbackRpc,
      },
    });
  } catch (e) {
    console.error("/api/config error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
