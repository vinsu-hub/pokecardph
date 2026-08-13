import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/**
 * Image resolution for the OG routes. Everything funnels through a base64
 * data URI so every route's JSX has one predictable shape and Satori never
 * has to do its own network fetching. Failures are swallowed (return null)
 * rather than thrown — a flaky image host must never break the whole
 * opengraph-image route; the caller renders its own fallback instead.
 */

let markPromise: Promise<string> | null = null;

export function loadMarkDataUri() {
  if (!markPromise) {
    markPromise = readFile(join(process.cwd(), "public/brand/mark-transparent.png")).then(
      (buf) => `data:image/png;base64,${buf.toString("base64")}`,
    );
  }
  return markPromise;
}

export async function loadRemoteOrLocalImage(url: string | null): Promise<string | null> {
  if (!url) return null;

  try {
    let buf: Buffer;
    if (url.startsWith("/")) {
      buf = await readFile(join(process.cwd(), "public", url));
    } else if (url.startsWith("https://")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }

    // Satori/resvg (next/og's renderer) can't decode WebP — most of this
    // catalog's photos are .webp, so every image is normalized to PNG here
    // rather than trusting the source format.
    const png = await sharp(buf).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) => Math.round(255 * f(n)).toString(16).padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

/** Same per-card hue hash as `CardArt.tsx`, output as hex instead of an
 *  `hsl(...)` string — Satori's CSS-color parsing is a subset and hex
 *  sidesteps any doubt about `hsl()` function support. */
export function hashGradientHex(seed: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return {
    from: hslToHex(h, 70, 88),
    to: hslToHex((h + 40) % 360, 65, 78),
  };
}
