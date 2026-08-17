import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ViewTransition } from "react";
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
  openGraph: {
    siteName: "PokeCard PH",
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
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
        {/* Enables the browser's View Transitions API for route navigations
            (Next.js 16 + React 19, zero extra config) so that Suspense
            reveals — i.e. `loading.tsx` — get a real screenshot of the
            outgoing page as `::view-transition-old(root)` instead of
            nothing. `globals.css` blurs that snapshot so the Pikachu loading
            overlay sits over an actual blurred previous page rather than
            blank space.

            This wrapper itself never unmounts across navigations — only its
            `children` (the routed page) do — so from this ViewTransition's
            own perspective a route change is an "update", not an
            enter/exit. `default="none"` alone sets every transition type
            (enter/exit/share/update) to "none", which turns out to make
            React skip calling `document.startViewTransition()` entirely —
            confirmed empirically (patched `document.startViewTransition` in
            a real browser and saw zero calls). `update="auto"` restores
            just the one type this case actually needs, leaving
            enter/exit/share suppressed so unrelated `startTransition` calls
            elsewhere in the app (filters, tabs, etc.) don't trigger a
            surprise full-page crossfade. */}
        <ViewTransition default="none" update="auto">{children}</ViewTransition>
      </body>
    </html>
  );
}
