"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import clsx from "clsx";
import { useAccount } from "wagmi";
import { LayoutDashboard, Users, Wallet as WalletIcon, Home } from "lucide-react";
import type { Route } from "next";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const { isConnected } = useAccount();

  const baseLinks: { href: Route; label: string; icon: JSX.Element }[] = [
    { href: "/", label: "Home", icon: <Home className="w-4 h-4" /> },
    { href: "/plans", label: "Plans", icon: <WalletIcon className="w-4 h-4" /> },
  ];
  const authedLinks: { href: Route; label: string; icon: JSX.Element }[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/affiliate", label: "Affiliate", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/5 border-b border-white/10">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-bold text-white/90 tracking-tight">
          <span className="bg-gradient-to-r from-brand to-white bg-clip-text text-transparent">Wallet Subscribe</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {[...baseLinks, ...(session ? (isConnected ? authedLinks : []) : [])].map((l) => (
            <Link key={l.href} href={l.href} className={clsx("text-white/70 hover:text-white inline-flex items-center gap-2", pathname === l.href && "text-white font-semibold")}>{l.icon}<span>{l.label}</span></Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ConnectButton chainStatus="icon" />
          {session ? (
            <>
              {!isConnected && (
                <span className="hidden sm:inline text-xs text-white/70">Connect wallet to access dashboard</span>
              )}
              <button className="btn" onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
            </>
          ) : sessionStatus === "loading" ? (
            <span className="text-white/60 text-sm">Loading…</span>
          ) : (
            <>
              {isConnected && (
                <span className="hidden sm:inline text-xs text-white/70">Wallet connected — please login</span>
              )}
              <Link className="btn" href="/login">Login</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
