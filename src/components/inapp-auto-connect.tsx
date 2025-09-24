"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

function isInAppBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const hasEthereum = !!(window as any).ethereum;
  return hasEthereum || /metamask|metamaskmobile|trust|okx|imtoken|bitkeep|rabby|coinbasewallet|rainbow|zerion|argent/.test(ua);
}

export default function InAppAutoConnect() {
  const { isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();

  useEffect(() => {
    if (isConnected) return;
    if (!isInAppBrowser()) return;
    if (isPending) return;

    // Choose the best available connector (EIP-6963 first), then fallback to injected
    const byPriority = (a: any, b: any) => {
      const order = [
        // common EIP-6963 ids
        "io.metamask",
        "com.trustwallet.app",
        "com.okex.wallet",
        "app.coinbase.wallet",
        "me.rainbow",
        "io.zerion.wallet",
        "im.token",
        "injected",
      ];
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    };

    const ready = (c: any) => c?.ready !== false;
    const sorted = [...connectors].sort(byPriority).filter(ready);
    const target = sorted[0];
    if (!target) return;

    (async () => {
      try {
        await connectAsync({ connector: target });
      } catch {
        // ignore; user can still use the Connect button
      }
    })();
  }, [isConnected, connectors, connectAsync, isPending]);

  return null;
}
