import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  ref: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { name, email, password, ref } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);
    const refCode = crypto.randomBytes(6).toString("hex");

    let referrerId: string | undefined;
    if (ref) {
      const referrer = await prisma.user.findUnique({ where: { refCode: ref } });
      if (referrer) referrerId = referrer.id;
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash, refCode, referrerId },
      select: { id: true, email: true, name: true, refCode: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
