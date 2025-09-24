"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

function isInAppBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const hasEthereum = !!(window as any).ethereum;
  // Common in-app wallet indicators or injected provider
  return hasEthereum || /metamask|metamaskmobile|trust|okx|imtoken|bitkeep|rabby|coinbasewallet|rainbow|zerion|argent/.test(ua);
}

export default function InAppAutoConnect() {
  const { isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();

  useEffect(() => {
    if (isConnected) return;
    if (!isInAppBrowser()) return;
    if (isPending) return;
    // Prefer any injected-type connector
    const injected = connectors.find((c: any) => c.type === "injected");
    if (!injected) return;
    // Some connectors expose `.ready` to indicate injected provider availability
    if ((injected as any).ready === false) return;
    (async () => {
      try {
        await connectAsync({ connector: injected });
      } catch {
        // ignore; user can still use the Connect button
      }
    })();
  }, [isConnected, connectors, connectAsync, isPending]);

  return null;
}
