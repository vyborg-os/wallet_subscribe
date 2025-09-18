import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  amountEth: z.string(), // decimal string
  toAddress: z.string().min(4),
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

    const { amountEth, toAddress } = parsed.data;

    const withdrawal = await prisma.withdrawal.create({
      data: { userId, toAddress, amountEth, status: "REQUESTED" },
    });

    return NextResponse.json({ ok: true, withdrawal });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
