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
