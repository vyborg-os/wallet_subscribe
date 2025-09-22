import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hash } from "bcryptjs";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  walletAddress: z.string().min(1).optional(), // allow empty string to clear via custom logic
  password: z.string().min(6).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return { status: 401 as const };
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!me || me.role !== "ADMIN") return { status: 403 as const };
  return { status: 200 as const };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const id = params.id;
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data: any = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.walletAddress !== undefined) data.walletAddress = parsed.data.walletAddress.trim() === "" ? null : parsed.data.walletAddress;
  if (parsed.data.password !== undefined) data.passwordHash = await hash(parsed.data.password, 10);

  try {
    const user = await prisma.user.update({ where: { id }, data, select: { id: true, email: true, name: true, walletAddress: true, role: true } });
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.status !== 200) return NextResponse.json({ error: auth.status === 401 ? "Unauthorized" : "Forbidden" }, { status: auth.status });

  const id = params.id;
  const [subs, wds, com1, com2] = await Promise.all([
    prisma.subscription.count({ where: { userId: id } }),
    prisma.withdrawal.count({ where: { userId: id } }),
    prisma.commission.count({ where: { beneficiaryId: id } }),
    prisma.commission.count({ where: { fromUserId: id } }),
  ]);
  if (subs > 0 || wds > 0 || com1 > 0 || com2 > 0) {
    return NextResponse.json({ error: "Cannot delete a user with financial history" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 400 });
  }
}
