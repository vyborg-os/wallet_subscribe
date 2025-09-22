import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { compare } from "bcryptjs";
import { sendOtpEmail } from "@/lib/mailer";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  purpose: z.enum(["login", "signup"]),
});

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const { email, password, purpose } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (purpose === "login") {
      if (!password || !user.passwordHash) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
      const ok = await compare(password, user.passwordHash);
      if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    } else if (purpose === "signup") {
      // For signup, validate password too (the one just set during signup)
      if (!password || !user.passwordHash) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
      const ok = await compare(password, user.passwordHash);
      if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.create({ data: { userId: user.id, code, purpose, expiresAt } });
    await sendOtpEmail({ to: user.email, code, purpose });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("/api/auth/request-otp error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
