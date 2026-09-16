import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chrome Market Analyser | Connect Logistics",
  description: "Verified chrome ore market intelligence, logistics spreads and scenario forecasts.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
