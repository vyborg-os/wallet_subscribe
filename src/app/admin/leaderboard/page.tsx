export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserLeaderboard from "@/app/leaderboard/page";

export default async function AdminLeaderboardPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = !!(session?.user && (session.user as any).role === "ADMIN");
  if (!isAdmin) redirect("/admin/login");
  return <UserLeaderboard />;
}
