import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "buyer" | "vendor";
  /** The signed-in user's shop, if they've completed vendor onboarding. */
  shopId: string | null;
  shopName: string | null;
};

/**
 * The current user plus the shop they own, in one round trip.
 *
 * Nearly every page in Phases 3 and 4 needs both — a trade page has to know
 * whether you're the proposer or the vendor, and an auction has to know
 * whether you're bidding on your own listing. Resolving it once here keeps
 * that check identical everywhere instead of re-derived per route.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("vendor_id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? null,
    role: (profile?.role as "buyer" | "vendor") ?? "buyer",
    shopId: shop?.id ?? null,
    shopName: shop?.name ?? null,
  };
}

/** Shape AppShell expects. */
export function shellUser(u: SessionUser | null) {
  return u ? { email: u.email, displayName: u.displayName } : null;
}
