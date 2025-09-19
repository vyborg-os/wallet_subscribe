import type { Metadata } from "next";
import "@/app/globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import Breadcrumbs from "@/components/breadcrumbs";

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
          <Breadcrumbs />
          <main className="container py-6 min-w-0">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
