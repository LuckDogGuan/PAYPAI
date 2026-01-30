import type { Metadata } from "next";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "@/components/providers/WagmiProvider";

export const metadata: Metadata = {
  title: "PayPai - AI-Powered Smart Wallet",
  description: "Execute blockchain transactions with natural language on Kite AI Chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
