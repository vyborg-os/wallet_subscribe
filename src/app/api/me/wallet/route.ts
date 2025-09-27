import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAddress } from "viem";
import { z } from "zod";
import { getAppConfig } from "@/lib/appConfig";

const schema = z.object({ address: z.string() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const cfg = await getAppConfig();
  const { address } = parsed.data;

  try {
    let validAddress: string;
    
    if (cfg.paymentNetwork === "TRON") {
      // Basic Tron address validation (starts with T, 34 chars)
      if (!address.startsWith("T") || address.length !== 34) {
        throw new Error("Invalid Tron address format");
      }
      validAddress = address;
    } else {
      // EVM address validation and checksum
      validAddress = getAddress(address as `0x${string}`);
    }

    const user = await prisma.user.update({ 
      where: { id: userId }, 
      data: { walletAddress: validAddress }, 
      select: { id: true, walletAddress: true } 
    });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
}
