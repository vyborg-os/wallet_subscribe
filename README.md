# Wallet Subscribe

Advanced, responsive Next.js app for wallet-native subscriptions with two-level affiliate commissions and Trust Wallet connect via RainbowKit/wagmi.

## Features

- Advanced signup/login (Credentials via NextAuth) with referral support
- Plans page with on-chain subscription (ETH on Sepolia by default)
- Two-level affiliate program with commission tracking
- Connect Trust Wallet (and others) via RainbowKit/wagmi
- User dashboard: commissions summary, save payout wallet, request withdrawals
- Prisma + SQLite (dev) with seed data
- Tailwind CSS modern UI

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- NextAuth (Credentials)
- Prisma ORM
- RainbowKit + wagmi + viem
- Tailwind CSS

## Setup

1. Copy environment variables

   ```bash
   cp .env.example .env.local
   ```

   Fill the following:

   - `NEXTAUTH_SECRET`: strong random string
   - `NEXTAUTH_URL`: `http://localhost:3000`
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: create one at walletconnect.com
   - `NEXT_PUBLIC_RPC_URL` and `RPC_URL`: Sepolia RPC (Infura/Alchemy/etc.)
   - `NEXT_PUBLIC_TREASURY_ADDRESS` and `TREASURY_ADDRESS`: your receiving address
   - Optional: `LEVEL1_BPS` and `LEVEL2_BPS` (defaults 10% and 5%)

2. Install dependencies

   ```bash
   npm install
   ```

3. Setup database and seed

   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

4. Run the app

   ```bash
   npm run dev
   ```

## How it works

- Users sign up at `/signup`. If their link contains `?ref=CODE`, they are linked to a referrer.
- Plans are listed at `/plans`. Subscribing sends a wallet transaction to `TREASURY_ADDRESS` and the server verifies it on-chain before recording a `Subscription` and creating level 1/2 `Commission` entries.
- The affiliate dashboard `/affiliate` shows your referral link and earnings.
- The user dashboard `/dashboard` shows commissions, allows saving a payout wallet, and requesting withdrawals.

## Notes

- Default chain is `sepolia` and ETH payments are verified with `viem`.
- Trust Wallet is supported through WalletConnect (RainbowKit). Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set.
- In production, switch Prisma datasource to Postgres and configure your RPC with higher reliability.
