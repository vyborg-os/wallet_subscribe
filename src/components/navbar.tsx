"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import clsx from "clsx";
import { useAccount } from "wagmi";
import { LayoutDashboard, Users, Wallet as WalletIcon, Home, Menu, X } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const { isConnected } = useAccount();

  const baseLinks = [
    { href: "/", label: "Home", icon: <Home className="w-4 h-4" /> },
    { href: "/plans", label: "Plans", icon: <WalletIcon className="w-4 h-4" /> },
    { href: "/leaderboard", label: "Leaderboard", icon: <Users className="w-4 h-4" /> },
    { href: "/leaderboard/rankings", label: "Ranks", icon: <Users className="w-4 h-4" /> },
  ] satisfies { href: Route; label: string; icon: JSX.Element }[];
  const authedLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/affiliate", label: "Affiliate", icon: <Users className="w-4 h-4" /> },
  ] satisfies { href: Route; label: string; icon: JSX.Element }[];

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/5 border-b border-white/10">
      <div className="container flex h-16 items-center justify-between min-w-0">
        <Link href="/" className="font-bold text-white/90 tracking-tight">
          <span className="bg-gradient-to-r from-brand to-white bg-clip-text text-transparent">Wallet Subscribe</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {baseLinks.map((l) => (
            <Link key={l.href} href={l.href as Route} className={clsx("text-white/70 hover:text-white inline-flex items-center gap-2", pathname === l.href && "text-white font-semibold")}> 
              {l.icon}
              <span>{l.label}</span>
            </Link>
          ))}
          {session && isConnected && authedLinks.map((l) => (
            <Link key={l.href} href={l.href as Route} className={clsx("text-white/70 hover:text-white inline-flex items-center gap-2", pathname === l.href && "text-white font-semibold")}> 
              {l.icon}
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <ConnectButton chainStatus="icon" />
          {session ? (
            <>
              {!isConnected && (
                <span className="hidden sm:inline text-xs text-white/70">Connect wallet to access dashboard</span>
              )}
              <button className="btn hidden sm:inline-flex" onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
            </>
          ) : sessionStatus === "loading" ? (
            <span className="text-white/60 text-sm">Loading…</span>
          ) : (
            <>
              {isConnected && (
                <span className="hidden sm:inline text-xs text-white/70">Wallet connected — please login</span>
              )}
              <Link className="btn hidden sm:inline-flex" href="/login">Login</Link>
            </>
          )}
          {/* Mobile hamburger */}
          <button aria-label="Open menu" className="md:hidden inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 p-2 ml-1" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#0f1221]/95 backdrop-blur">
          <div className="container py-4 space-y-2">
            {[...baseLinks, ...(session && isConnected ? authedLinks : [])].map((l) => (
              <Link key={l.href} href={l.href as Route} onClick={() => setOpen(false)} className={clsx("block px-2 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5", pathname === l.href && "text-white font-semibold bg-white/10")}>
                <span className="inline-flex items-center gap-2">{l.icon}<span>{l.label}</span></span>
              </Link>
            ))}
            <div className="pt-2 flex gap-2">
              {session ? (
                <button className="btn w-full" onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
              ) : (
                <Link className="btn w-full" href="/login" onClick={() => setOpen(false)}>Login</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
