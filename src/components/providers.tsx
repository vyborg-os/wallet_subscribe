"use client";

import { ReactNode, useMemo } from "react";
import { WagmiProvider, createConfig } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { SessionProvider } from "next-auth/react";
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors";
import InAppAutoConnect from "./inapp-auto-connect";

const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string | undefined;
const projectId = rawProjectId && rawProjectId !== "your-wc-project-id" ? rawProjectId : undefined;
const envRpc = process.env.NEXT_PUBLIC_RPC_URL as string | undefined;
const rpcUrl = envRpc && !envRpc.includes("YOUR_KEY") ? envRpc : "https://rpc.sepolia.org";

const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: process.env.NEXT_PUBLIC_APP_NAME || "Wallet Subscribe",
      projectId,
      chains: [sepolia, mainnet],
      transports: {
        [sepolia.id]: http(rpcUrl),
        [mainnet.id]: http("https://cloudflare-eth.com"),
      },
      ssr: true,
    })
  : createConfig({
      chains: [sepolia, mainnet],
      transports: {
        [sepolia.id]: http(rpcUrl),
        [mainnet.id]: http("https://cloudflare-eth.com"),
      },
      connectors: [
        // Explicitly include MetaMask and Coinbase connectors in addition to generic injected.
        metaMask({ shimDisconnect: true }),
        coinbaseWallet({ appName: process.env.NEXT_PUBLIC_APP_NAME || "Wallet Subscribe" }),
        injected({ shimDisconnect: true }),
      ],
      ssr: true,
    });

export default function Providers({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <SessionProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={darkTheme({ accentColor: "#6C5CE7" })} initialChain={sepolia}>
            <InAppAutoConnect />
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}
