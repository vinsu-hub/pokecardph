import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/**
 * The Pokémon TCG's own display typeface — supplied as two files in
 * `fonts/pokemon/`. These are Nintendo/Game Freak's actual branding font,
 * the same trademark-exposure category already flagged for the two
 * Pokémon-derived SFX assets in the audio system — see the licensing note in
 * POKECARD_PH_DESIGN_SYSTEM.md. Wired here as available tokens, applied only
 * to the Events hub's "Who's That Pokémon?" heading — one contained,
 * thematically-justified use, not sprinkled wherever a headline needs
 * personality.
 */
const pokemonSolid = localFont({
  src: "../../fonts/pokemon/Pokemon Solid.ttf",
  variable: "--font-pokemon-solid",
  display: "swap",
});
const pokemonHollow = localFont({
  src: "../../fonts/pokemon/Pokemon Hollow.ttf",
  variable: "--font-pokemon-hollow",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3210"),
  title: "PokeCard PH — Buy, Sell & Trade Pokémon Cards",
  description:
    "The Philippine marketplace for Pokémon cards. Buy from verified vendors, trade with collectors, and inspect card condition before you commit.",
};

// Explicit rather than relying on the framework default. `maximumScale` and
// `userScalable` are deliberately left alone — never disable zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e4002b",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${pokemonSolid.variable} ${pokemonHollow.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
