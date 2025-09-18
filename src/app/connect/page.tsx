import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WalletCard from "@/components/wallet-card";
import Link from "next/link";
import { Wallet, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ConnectPage() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    redirect("/login");
  }
  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletAddress: true } });

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="card p-8">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-bold">Connect your wallet</h1>
        </div>
        <p className="text-white/70 mt-2">Connect and save your wallet address to access your dashboard and affiliate tools.</p>
        <div className="mt-6">
          <WalletCard />
        </div>
        {user?.walletAddress ? (
          <div className="mt-6 flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>Wallet saved: {user.walletAddress}</span>
          </div>
        ) : null}
        <div className="mt-8">
          <Link href="/dashboard" className="btn disabled:opacity-60" aria-disabled={!user?.walletAddress}>
            Continue to Dashboard
          </Link>
        </div>
      </div>

      <div className="card p-8">
        <h3 className="text-xl font-semibold">Why connect?</h3>
        <ul className="mt-4 space-y-2 text-white/80 list-disc pl-5">
          <li>Securely receive your commissions and withdrawals</li>
          <li>Enable one-click on-chain subscriptions</li>
          <li>Access affiliate dashboard and analytics</li>
        </ul>
      </div>
    </div>
  );
}
