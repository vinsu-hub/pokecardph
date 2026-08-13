import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Raw TTF bytes for Satori (`next/og`'s renderer) — it needs actual font
 * data, not a CSS `font-family`, unlike the `next/font/google` Inter used
 * for on-site CSS in `layout.tsx`. Read once per warm serverless instance
 * (module-scope memoized), not per request — the files never change.
 */
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]> | null = null;

export function getOgFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(join(process.cwd(), "assets/fonts/Inter-Regular.ttf")),
      readFile(join(process.cwd(), "assets/fonts/Inter-Bold.ttf")),
    ]).then(([regular, bold]) => [
      { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
    ]);
  }
  return fontsPromise;
}
