export const dynamic = "force-dynamic";

import { Shield, Wallet, Link as LinkIcon, Users } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const ctaHref = session ? "/dashboard" : "/signup";
  const ctaLabel = session ? "Go to Dashboard" : "Get Started";
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight gradient-text">Wallet‑native subscriptions that grow with you</h1>
        <p className="mt-4 text-white/80">Connect Trust Wallet, subscribe on-chain, and earn with a two-level affiliate program. Built with modern security and great UX.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={ctaHref} className="btn">{ctaLabel}</Link>
          <Link href="/plans" className="btn bg-white/10 hover:bg-white/20">View Plans</Link>
        </div>
      </div>
      <div className="card p-8 glow">
        <h3 className="text-xl font-semibold mb-3">Why this platform?</h3>
        <ul className="space-y-3 text-white/80">
          <li className="flex items-start gap-3"><Shield className="w-5 h-5 text-brand mt-0.5" /> <span>Advanced auth with referral tracking</span></li>
          <li className="flex items-start gap-3"><Wallet className="w-5 h-5 text-brand mt-0.5" /> <span>Trust Wallet connect via RainbowKit & wagmi</span></li>
          <li className="flex items-start gap-3"><LinkIcon className="w-5 h-5 text-brand mt-0.5" /> <span>On-chain payment verification</span></li>
          <li className="flex items-start gap-3"><Users className="w-5 h-5 text-brand mt-0.5" /> <span>Two-level affiliate commissions</span></li>
        </ul>
      </div>
    </div>
  );
}
