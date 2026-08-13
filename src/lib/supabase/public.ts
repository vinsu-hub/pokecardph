import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client, for the `opengraph-image.tsx` routes only.
 * The regular `createClient()` in `server.ts` calls `cookies()`, which forces
 * Next to treat the route as fully dynamic (no caching at all). Safe here
 * because every table these routes read (`listings`, `cards`, `shops`,
 * `auctions`) is already gated by public RLS policies — no session is needed
 * for a public share-preview image.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
