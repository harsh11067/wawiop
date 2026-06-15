import type { Metadata } from "next";
import { Instrument_Serif, Sora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Display serif — used for headlines and the "wallet voice"
const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Body sans
const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Monospace — labels, addresses, telemetry
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vectis — Wallet with Opinions",
  description:
    "An autonomous onchain agent with rules, memory, and budget. ERC-7710 redelegation chains with Venice AI reasoning and 1Shot gasless execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${sora.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
