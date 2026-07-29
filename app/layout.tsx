import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import TourProvider from "@/components/Tour/TourProvider";
import { ToastProvider } from "@/components/Toast";

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
        {/*
          TourProvider lives here, above every page, so:
            1. Its state (which step is active) survives client-side route
               changes as the tour walks the user across Dashboard → Log →
               History → Settings.
            2. useTour() is available from any page or component in the
               app, e.g. the "Take Tour Again" button in Settings.
        */}
        <ToastProvider>
          <TourProvider>{children}</TourProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
