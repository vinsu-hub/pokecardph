"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True once hydrated, false during SSR.
 *
 * Portals can't render on the server, so components using createPortal must
 * wait. The older `useState(false)` + `useEffect(() => setMounted(true))`
 * pattern does the same job but React 19's compiler lints it as a cascading
 * render — `useSyncExternalStore` expresses "server and client disagree about
 * this value" directly, which is exactly the situation.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // client
    () => false, // server
  );
}

/**
 * Live `prefers-reduced-motion`, reactive to the setting changing mid-session.
 *
 * `lib/audio.ts` reads the same media query but only ever needs a one-shot
 * value at the moment a cue fires. Anything that has to react continuously —
 * this drives a `useFrame` loop — needs the subscription form. Same reasoning
 * as `useIsClient`: a `useState` + `useEffect(() => setX(...))` pair is a
 * cascading render the moment the effect body calls `setState` synchronously;
 * `useSyncExternalStore` expresses "read this external value, and rerender
 * when it changes" as one primitive instead of two.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const q = window.matchMedia("(prefers-reduced-motion: reduce)");
      q.addEventListener("change", onChange);
      return () => q.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false, // server: assume motion allowed, corrected on hydration
  );
}
