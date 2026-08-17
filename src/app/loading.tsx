import { LoadingIndicator } from "@/components/shared/LoadingIndicator";

/**
 * Root-level loading UI — Next.js wraps every route below this in a Suspense
 * boundary, so this one file covers navigation/tab-switch loading site-wide
 * (every page here is `force-dynamic` with a real Supabase fetch, so this is
 * a real wait, not a cosmetic flash). Mounted/unmounted automatically by
 * Next.js while the target route is loading — no state to manage here,
 * unlike the Server Action call sites (checkout, trade) that read
 * `useFormStatus()` themselves.
 */
export default function Loading() {
  return <LoadingIndicator state="pending" pendingLabel="Loading…" anchored />;
}
