"use client";

import { useMemo, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function isInAppBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const hasEthereum = !!(window as any).ethereum;
  return hasEthereum || /metamask|metamaskmobile|trust|okx|imtoken|bitkeep|rabby|coinbasewallet|rainbow|zerion|argent/.test(ua);
}

export default function SmartConnectButton() {
  const { isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const [busy, setBusy] = useState(false);

  const isInApp = useMemo(() => isInAppBrowser(), []);

  async function connectInApp() {
    if (isConnected || isPending || busy) return;
    setBusy(true);
    try {
      // Choose the best connector for the in-app context
      const order = ["metaMask", "coinbaseWallet", "injected"];
      const ready = (c: any) => c?.ready !== false;
      const list = [...connectors].filter(ready);
      // If UA mentions MetaMask explicitly, prefer its connector
      const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
      let target = list.find((c) => c.id === (ua.includes("metamask") ? "metaMask" : ""));
      if (!target) {
        // Generic priority order
        target = order.map((id) => list.find((c) => c.id === id)).find(Boolean) as any;
      }
      if (!target && list.length) target = list[0];
      if (target) {
        await connectAsync({ connector: target });
      }
    } catch {
      // ignore — user can retry or use default modal
    } finally {
      setBusy(false);
    }
  }

  // If already connected, keep the RainbowKit button (shows chain/account nicely)
  if (isConnected) {
    return <ConnectButton chainStatus="icon" />;
  }

  // In in-app wallets, show a direct connect button that calls the injected provider
  if (isInApp) {
    return (
      <button className="btn" onClick={connectInApp} disabled={busy || isPending}>
        {busy || isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  // Otherwise, use RainbowKit modal
  return <ConnectButton chainStatus="icon" />;
}
