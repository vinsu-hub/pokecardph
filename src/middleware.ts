import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and guards the routes that
 * require one.
 *
 * Public by design — Home/Browse, Card Detail, Shop Storefront, Auctions
 * browse. A person can window-shop without an account and is only prompted at
 * the point of action (Buy Now, Place Bid, Propose Trade). That soft-gate is
 * the auth spec's central decision; these matchers are its enforcement half.
 */
const PROTECTED = ["/trade", "/vendor", "/orders", "/cart", "/checkout", "/messages", "/beta/signup"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must run — this is what refreshes an expiring session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where they were headed so they land there, not on a generic home.
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and images — the session still needs
    // refreshing on public pages, it just isn't required there.
    "/((?!_next/static|_next/image|favicon.ico|sfx/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|webm)$).*)",
  ],
};
