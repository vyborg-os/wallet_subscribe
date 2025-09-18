import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Simple connectivity check
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("/api/health DB error:", e);
    return NextResponse.json({ ok: false, error: "DB connection failed" }, { status: 500 });
  }
}
