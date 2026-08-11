import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client. Mirrors src/lib/supabase/server.ts. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
