import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const display = Rubik({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Rubik({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = Rubik({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PayLedger",
  description: "GCash & Maya cash in / cash out ledger",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0E1620",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} font-body bg-ink text-text-hi min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
