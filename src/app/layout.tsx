import type { Metadata } from "next";
import "@/app/globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Wallet Subscribe",
  description: "Advanced subscriptions with two-level affiliate and wallet connect",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="container py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
