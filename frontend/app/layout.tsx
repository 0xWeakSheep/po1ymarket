import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "po1market",
  description: "Mock-first frontend for Polymarket source recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="scanlines" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <div className="mechanical-frame" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
