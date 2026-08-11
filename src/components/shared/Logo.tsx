import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The PokeCard PH lockup, rendered from the supplied brand artwork in
 * `public/brand/`: `logo-lockup-light.png` (black "POKE" + red "CARD", for
 * light backgrounds) and `logo-lockup-dark.png` (white "POKE", for
 * --color-ink backgrounds). `compact` renders the mark alone.
 */
export function Logo({
  reversed = false,
  href = "/",
  compact = false,
}: {
  /** Use the dark-mode lockup for --color-ink backgrounds. */
  reversed?: boolean;
  href?: string | null;
  /** Mark only, for tight spaces. */
  compact?: boolean;
}) {
  const inner = compact ? (
    <Image
      src="/brand/mark-transparent.png"
      alt="PokeCard PH"
      width={1080}
      height={1080}
      className="size-8 shrink-0"
      priority
    />
  ) : (
    <Image
      src={reversed ? "/brand/logo-lockup-dark.png" : "/brand/logo-lockup-light.png"}
      alt="PokeCard PH"
      width={1080}
      height={335}
      className="h-9 w-auto shrink-0"
      priority
    />
  );

  const cls = cn("flex min-h-11 shrink-0 items-center gap-2");
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}
