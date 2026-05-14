import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { MapLayer } from "@/components/MapLayer";
import { TopBar } from "@/components/TopBar";
import { TrafficBot } from "@/components/TrafficBot";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Traffic Management — AI Congestion Predictor",
  description:
    "AI-powered Delhi NCR traffic congestion predictor. Live command center with route comparison, alert feed, emergency routing, and an AI chatbot.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <MapLayer />
        <div className="shell">
          <TopBar />
          {children}
          <TrafficBot />
        </div>
      </body>
    </html>
  );
}
