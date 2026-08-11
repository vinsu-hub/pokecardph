import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokeCard PH — Buy, Sell & Trade Pokémon Cards",
  description:
    "The Philippine marketplace for Pokémon cards. Buy from verified vendors, trade with collectors, and inspect card condition before you commit.",
};

// Explicit rather than relying on the framework default. `maximumScale` and
// `userScalable` are deliberately left alone — never disable zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
