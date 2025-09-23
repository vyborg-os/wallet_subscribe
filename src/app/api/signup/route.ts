import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  ref: z.string().min(1, "Referral link required"),
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
    let refCode = crypto.randomBytes(6).toString("hex");

    // Require a valid referral code
    const referrer = await prisma.user.findUnique({ where: { refCode: ref } });
    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral link" }, { status: 400 });
    }
    const referrerId: string | undefined = referrer.id;

    // Create user; in the rare case refCode collides, retry once with a new code
    let user;
    try {
      user = await prisma.user.create({
        data: { name, email, passwordHash, refCode, referrerId },
        select: { id: true, email: true, name: true, refCode: true },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Unique constraint failed (likely refCode). Retry once.
        refCode = crypto.randomBytes(6).toString("hex");
        user = await prisma.user.create({
          data: { name, email, passwordHash, refCode, referrerId },
          select: { id: true, email: true, name: true, refCode: true },
        });
      } else {
        throw e;
      }
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) {
    console.error("/api/signup error:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Database error", code: e.code }, { status: 500 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
