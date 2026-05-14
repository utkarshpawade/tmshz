import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { TopBar } from "@/components/TopBar";
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
  title: "Smart Traffic — AI Congestion Predictor",
  description:
    "AI-powered Delhi NCR traffic congestion predictor. Live command center with route comparison, alert feed, emergency routing, ML analytics, and a Groq-powered chatbot.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="shell">
          <TopBar />
          <main className="screen">{children}</main>
        </div>
        <TrafficBot />
        <ToastHost />
      </body>
    </html>
  );
}
