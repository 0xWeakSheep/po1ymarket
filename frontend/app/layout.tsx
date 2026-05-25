import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark h-full scroll-smooth antialiased">
      <body className="min-h-full flex flex-col">
        <div className="scanlines" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <div className="mechanical-frame" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
