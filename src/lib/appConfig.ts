import { prisma } from "./prisma";

export type AppConfigShape = {
  treasuryAddress: string | null;
  leaderboardAddress: string | null;
  tokenAddress: string | null;
  tokenDecimals: number;
  currencySymbol: string;
  level1Bps: number;
  level2Bps: number;
  paymentNetwork: "EVM" | "TRON";
  chainId: number | null;
  rpcUrl: string | null;
  tronApiKey: string | null;
};

export async function getAppConfig(): Promise<AppConfigShape> {
  const cfg = await prisma.appConfig.findFirst().catch(() => null);
  return {
    treasuryAddress: cfg?.treasuryAddress ?? process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? process.env.TREASURY_ADDRESS ?? null,
    leaderboardAddress: cfg?.leaderboardAddress ?? null,
    tokenAddress: cfg?.tokenAddress ?? null,
    tokenDecimals: cfg?.tokenDecimals ?? 6,
    currencySymbol: cfg?.currencySymbol ?? "USDT",
    level1Bps: (cfg as any)?.level1Bps ?? Number(process.env.LEVEL1_BPS ?? 1000),
    level2Bps: (cfg as any)?.level2Bps ?? Number(process.env.LEVEL2_BPS ?? 500),
    paymentNetwork: ((cfg as any)?.paymentNetwork as "EVM" | "TRON") ?? "EVM",
    chainId: cfg?.chainId ?? null,
    rpcUrl: cfg?.rpcUrl ?? process.env.NEXT_PUBLIC_RPC_URL ?? process.env.RPC_URL ?? null,
    tronApiKey: (cfg as any)?.tronApiKey ?? process.env.TRON_API_KEY ?? null,
  };
}

export function tokenUsdRate(cfg: Pick<AppConfigShape, "currencySymbol">) {
  // If USDT, 1 token = 1 USD; otherwise use fallback env (ETH for example)
  if ((cfg.currencySymbol || "").toUpperCase() === "USDT") return 1;
  return Number(process.env.USD_PER_ETH || 3000);
}

export function toTokenUnits(amountStr: string | number, decimals: number): bigint {
  // Convert a decimal string/number to token smallest unit BigInt without floating point errors
  const s = typeof amountStr === "number" ? amountStr.toString() : amountStr;
  const [intPart, fracPartRaw = ""] = s.split(".");
  const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
  const whole = BigInt(intPart || "0") * BigInt(10) ** BigInt(decimals);
  const frac = BigInt(fracPart || "0");
  return whole + frac;
}

export function addressTopic(addr: string): `0x${string}` {
  const a = addr.toLowerCase().replace(/^0x/, "");
  return ("0x" + "0".repeat(24) + a) as `0x${string}`;
}
