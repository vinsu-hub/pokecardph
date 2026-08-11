"use client";

import { useEffect } from "react";
import { play } from "@/lib/audio";

/**
 * Fires --sfx-order-complete once, on arrival from checkout.
 *
 * Silent unless the visitor has opted into SFX, and suppressed under
 * prefers-reduced-motion — both handled inside lib/audio. The success banner
 * beside it carries the same information visually, so a muted session loses
 * nothing.
 */
export function OrderCompleteCue() {
  useEffect(() => {
    play("order-complete");
  }, []);
  return null;
}
