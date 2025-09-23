/* eslint-disable */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseEther(str) {
  const [int, fracRaw = ''] = String(str).split('.');
  const frac = (fracRaw + '000000000000000000').slice(0, 18);
  const clean = (int.replace(/^0+/, '') || '0') + frac;
  // Return decimal string like 0.02 stored as Decimal, so we keep original str
  return String(str);
}

async function main() {
  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for getting started',
      priceEth: '0.01',
      durationDays: 30,
    },
    {
      name: 'Pro',
      description: 'For growing users with more needs',
      priceEth: '0.05',
      durationDays: 90,
    },
    {
      name: 'Elite',
      description: 'Top tier access and perks',
      priceEth: '0.1',
      durationDays: 365,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  console.log('Seeded plans');

  // Seed AppConfig (only if none exists)
  const existingCfg = await prisma.appConfig.findFirst();
  if (!existingCfg) {
    const treasury = process.env.TREASURY_ADDRESS || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || null;
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
    const tokenAddress = process.env.TOKEN_ADDRESS || process.env.NEXT_PUBLIC_TOKEN_ADDRESS || null;
    const tokenDecimals = process.env.TOKEN_DECIMALS ? Number(process.env.TOKEN_DECIMALS) : 6;
    const currencySymbol = process.env.CURRENCY_SYMBOL || 'USDT';
    const chainId = process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null;

    await prisma.appConfig.create({
      data: {
        treasuryAddress: treasury,
        leaderboardAddress: null,
        tokenAddress: tokenAddress,
        tokenDecimals,
        currencySymbol,
        chainId,
        rpcUrl,
      },
    });
    console.log('Seeded AppConfig');
  } else {
    console.log('AppConfig already present — skipping');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
