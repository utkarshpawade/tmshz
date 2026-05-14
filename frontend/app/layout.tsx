import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { TrafficBot } from "@/components/TrafficBot";
import { ToastHost } from "@/components/Toast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VeloCT — AI-powered Traffic Congestion Predictor",
  description:
    "VeloCT — AI-powered Delhi NCR Traffic Congestion Predictor. Live command center with route comparison, alert feed, emergency routing, ML analytics, and a Groq-powered chatbot.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppShell>{children}</AppShell>
        <TrafficBot />
        <ToastHost />
      </body>
    </html>
  );
}
