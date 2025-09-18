"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { usePathname, useRouter } from "next/navigation";

export default function ConnectionGuard() {
  const { isConnected, status } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Wait for wagmi to finish reconnecting/connecting to avoid false redirects on refresh.
    if ((status === "connecting" || status === "reconnecting")) return;
    if (!isConnected && pathname !== "/connect") {
      timerRef.current = setTimeout(() => {
        router.replace("/connect");
      }, 1200);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isConnected, status, pathname, router]);

  return null;
}
