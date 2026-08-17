# About PokeCard PH

A reference document describing what this project *is*, end to end: infrastructure, site structure,
layout system, database, user roles, and the flows that connect them. Written as a snapshot of the
shipped state — for what's planned next or resolved-but-unbuilt scope, `SESSION_PLAN.md` is the
authoritative, continuously-updated runbook; this file explains the shape of what already exists.

## 1. What it is

PokeCard PH is a two-sided web marketplace for Pokémon cards and collectibles, built for the
Philippine market. It connects **vendors** (shops, resellers, individual collectors selling at
volume) with **buyers**, through three transaction modes:

- **Fixed-price sales** — Buy Now listings, graded or non-graded.
- **Trades** — card-for-card exchanges with in-app meetup coordination.
- **Auctions** — bidding events for rare cards, sealed product, and signed/merch items, including a
  weekly "Who's That Pokémon?" vendor-hosted giveaway format (Action Events).

The trust mechanism at the center of the product is **vendor-declared condition**, backed by a
two-tier scan every card listing must include: a required **Flat Scan** (a single photo/scan wrapped
onto a simple 3D card mesh) and an optional **Full Condition Scan** (guided multi-angle capture,
earning a Verified Condition badge — the scan mechanism is built, the payment gate for it is not).

Brand identity: red/black/white, built around a Poké Ball mark, three values — Trust, Trade,
Passion. Design tokens live in `src/app/globals.css`, sourced from
`CONTEXT/POKECARD_PH_DESIGN_SYSTEM.md`.

## 2. Infrastructure & stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens in `globals.css`) + shadcn/ui patterns |
| Backend/DB | Supabase (Postgres, Auth, Storage, RLS, SECURITY DEFINER RPCs, pg_cron) |
| Auth | Google OAuth (primary) + email magic link (fallback), via Supabase Auth |
| Payments | Xendit — **not yet provisioned**. Billing math is real; no invoice is payable yet. |
| Hosting | Vercel (`https://pokecard-ph.vercel.app`) |
| Image generation | `next/og` (`ImageResponse`) for dynamic social-share previews |
| 3D | `@react-three/fiber` + `three` (Card Detail 3D inspection, condition scan viewer) |
| Package manager | pnpm |

**Repo root docs**: `SESSION_PLAN.md` (the execution runbook — read this first for current state),
`AGENTS.md` (project instructions for AI-assisted work), `CONTEXT/` (design system, master prompt,
business model, per-phase specs), `REFERENCE IMAGES/` (mockups), `buisness context/` (the source
business-model docx).

**Environment/config surface**: `.env.local` for local dev (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`,
`XENDIT_SECRET_KEY` — currently empty), mirrored in Vercel's project environment variables for
production. One Supabase project serves both local dev and production — there is no separate
staging database.

## 3. User roles & the buyer/vendor split

Everyone starts as a **buyer**. There is no separate signup form for buyers vs. vendors — signing in
(Google or magic link) creates a `profiles` row with `role = 'buyer'` by default. A user becomes a
**vendor** the moment their `shops` row is created (`profiles.role` flips to `'vendor'` at that exact
point, never earlier) — via one of two paths:

- **Standard onboarding** (`/vendor/onboarding`) — any signed-in buyer, any time. 60-day free trial,
  GMV-capped, silently tracked for accurate first-invoice tiering.
- **Beta Vendor instant activation** (`/beta` → `/beta/signup`) — a separate, externally-shared
  signup path active only during an announced beta window. 3-month trial, **no GMV cap**, awards a
  permanent "Founding Vendor" badge that survives trial expiry. Both paths converge on the same
  standard tiered billing afterward, and both redirect into the same `/vendor/listings/add` wizard to
  create the vendor's first real listing.

**A vendor is not a different account type — it's a buyer who also owns a shop.** `getSessionUser()`
(`src/lib/auth.ts`) resolves both the profile and any owned `shops` row in one round trip, so any
page can check `user.role`, `user.shopId`, `user.shopTier`, `user.billingStatus`, and
`user.isBetaVendor` together. A vendor can freely move between the buyer-facing site and their vendor
dashboard (a "← Back to buyer view" link sits at the bottom of the vendor sidebar; a "Sell" link in
the buyer account menu goes the other way) — there's no separate login, no separate session.

**Route protection** (`src/middleware.ts`): most of the site is intentionally public — Home/Browse,
Card Detail, Shop Storefront, and Auction browsing all work signed-out, so window-shopping never
requires an account. Only action-taking routes are gated: `/trade`, `/vendor`, `/orders`, `/cart`,
`/checkout`, `/messages`, `/beta/signup`. Hitting one signed-out redirects to `/login?next=<path>`,
preserving the destination. This "soft-gate" pattern — browse freely, log in only at the point of
action — is a deliberate, central decision, not an oversight.

## 4. Layout system: two shells, one design language

**`AppShell`** (`src/components/shared/AppShell.tsx`) — the buyer-facing shell. Desktop
(≥1024px): top nav with logo, search, nav links, cart, account menu. Mobile (<1024px): compact top
bar + full-width search row + a 5-item bottom tab bar (Home, Search, Trade, Events, Orders) —
capped at 5 by a hard UX rule; anything beyond (Auctions, Messages) lives in an overflow menu.
Disabled/not-yet-built items render greyed out with a tooltip, never a dead link or a 404.

**`VendorShell`** (`src/components/vendor/VendorShell.tsx`) — the vendor-facing shell. Fixed left
sidebar (shop identity block with Premium/Founding Vendor badges, nav list, "back to buyer view"
link) + main content area. Below 1024px the sidebar collapses to a horizontal scrolling strip rather
than a hamburger, so switching between e.g. Orders and Trade Requests on a phone is one tap, not two.
Nav: Dashboard, Listings (All/Add New/Drafts), Orders, Trade Requests, Auctions, Events, Billing,
Shop Settings.

Both shells share the same underlying design tokens (`globals.css`) and component rules
(`CONTEXT/POKECARD_PH_DESIGN_SYSTEM.md`) — colors, type scale, spacing, motion timing, badge
(`StatusPill`) conventions — so the two halves of the product read as one brand, not two apps bolted
together. Native `<select>`/`<input>` elements styled consistently (`h-11 rounded-md border
border-border`) are used throughout rather than a component-library dropdown; there is no dedicated
search/autocomplete/combobox component anywhere in the codebase, by design (every "picker" in the
app is either a native `<select>` or a typed field).

**Brand colors** (from `globals.css`): primary `#e4002b` (red), ink `#0b0f1a` (near-black navy), plus
a neutral grade/rarity-badge palette (`#eef2f6`/`#334155`) kept deliberately separate from action-red
so a PSA 10 badge never visually competes with a Buy Now button.

## 5. Site map

### Public / buyer-facing

| Route | Purpose |
|---|---|
| `/` | Landing page (signed-out only — a signed-in visitor is redirected straight to `/browse`) |
| `/browse` | Home/browse grid — the real marketplace entry point once signed in |
| `/search` | Search with facets (set, rarity, category, sort, grid/list view) |
| `/card/[id]` | Card Detail (2D) — gallery, condition, price, similar listings, shop info |
| `/card/[id]/3d` | Card Detail 3D inspection (interactive scan viewer) |
| `/shops/[shopId]` | Vendor storefront — isometric shelf browsing, tabs, facets |
| `/auctions`, `/auctions/[id]` | Auction browse + detail, live bidding |
| `/events`, `/events/[id]`, `/events/action` | "Who's That Pokémon?" giveaway events + Action Events |
| `/trade`, `/trade/[tradeId]` | Buyer trade proposals and trade detail |
| `/cart`, `/checkout` | Cart and 4-step checkout |
| `/orders`, `/orders/[id]` | Buyer order history and detail |
| `/beta`, `/beta/signup` | Beta Vendor Program landing + instant-activation signup |
| `/(auth)/login` | Combined login/signup (Google + magic link) |

### Vendor-facing (all under `VendorShell`, all require a shop)

| Route | Purpose |
|---|---|
| `/vendor/dashboard` | Vendor home — sales overview, shop health |
| `/vendor/listings`, `/vendor/listings/add`, `/vendor/listings/[id]/scan` | Listings management, the 4-step Add Listing wizard, condition scan studio |
| `/vendor/orders` | Order fulfillment |
| `/vendor/trade-requests` | Incoming trade proposals |
| `/vendor/auctions`, `/vendor/auctions/create` | Auction hosting |
| `/vendor/events`, `/vendor/events/create` | Giveaway event hosting |
| `/vendor/billing` | Trial/tier status, tier ladder, invoices, payouts |
| `/vendor/settings` | Shop identity editing (name/location/description/logo/banner), Premium feature showcase, sign out |
| `/vendor/onboarding` | Standard vendor signup |

### Auth & system

| Route | Purpose |
|---|---|
| `/auth/callback` | OAuth/magic-link callback, session exchange |
| `/auth/signout` | POST-only sign-out |
| `/admin-login` | Unlinked admin entry point (not crawlable, not in any nav) |
| `/api/auctions/[id]/bid`, `/api/auctions/[id]/join`, `/api/auctions/close` | Auction bidding/lifecycle |
| `/api/events/resolve` | Giveaway resolution |
| `/api/billing/aggregate-gmv`, `/api/billing/invoice`, `/api/billing/trial-reminder`, `/api/cron/daily` | Billing crons (work when called directly; not yet registered in `vercel.json`) |
| `/opengraph-image.png`, `/card/[id]/opengraph-image`, `/shops/[shopId]/opengraph-image`, `/auctions/[id]/opengraph-image` | Static + dynamic social-share preview images |

## 6. Database schema (Supabase Postgres, RLS on every table)

Grouped by domain — every table lives across `supabase/migrations/*.sql`, applied in order via
`.dev/migrate.mjs` (a custom `_migrations`-tracked runner, not the Supabase CLI).

**Identity & shop**
- `profiles` — one row per authenticated user, `role` (`buyer`/`vendor`), display name.
- `shops` — one row per vendor. Identity (`name`, `location`, `description`, `logo_url`,
  `banner_url`), reputation (`rating`, `review_count`, `follower_count`,
  `positive_feedback_pct`, `avg_response_time`), billing (`tier`, `trial_ends_at`,
  `trial_gmv_cap/used`, `billing_status`, `onboarded_at`), beta program
  (`is_beta_vendor`, `beta_registered_at`), and beta-signup extras (`vendor_type`, `social_handle`,
  `how_heard`, `phone`). RLS: public read, vendor-self write only (`vendor_id = auth.uid()`).

**Catalog & listings**
- `cards` — the **shared, deduplicated catalog** (explicitly documented as "one Charizard row, many
  shops' listings pointing at it — do not denormalise"). `name`, `set_name`, `card_number`, `rarity`,
  `language`, `image_url`, `generation`, `pull_rate`, plus `illustrator`/`finish`/`edition` (added for
  manual card entry). Public read only — the sole write path is `find_or_create_card()`, a SECURITY
  DEFINER RPC vendors call when typing in a card that isn't already cataloged.
- `listings` — one row per vendor's sellable item. `card_id` (nullable since sealed/merch/signed
  items have no catalog card), `listing_type` (graded/non-graded), `sale_type` (fixed/auction),
  `item_category`, grading fields, `price`/`compare_price`/`quantity`, `photos` (jsonb),
  `scan_tier` (flat/full/null), per-axis condition scores, `status` (draft/active/sold/removed).
- `price_history` — keyed by `(card_id, grade)`, not listing — a catalog+grade property powering the
  Market Price chart on Card Detail.

**Orders & trades**
- `orders`, `order_items` — buyer purchases, platform fee captured at order time.
- `trades`, `trade_items`, `trade_cards`, `trade_activity`, `meetup_locations` — card-for-card
  proposals with an in-app meetup flow; `trade_items` enforces exactly one of `trade_card_id`/
  `listing_id` per side via a check constraint.

**Auctions**
- `auctions`, `bids`, `auction_watchers` — proxy/max bidding, anti-snipe, Action Event participation.

**Messaging**
- `conversations`, `messages` — in-app buyer↔vendor messaging (schema exists; UI is a Phase 8 item,
  see §8).

**Monetization / billing**
- `billing_tiers`, `billing_config`, `vendor_gmv_history`, `vendor_monthly_billing`,
  `vendor_payouts` — the real, built GMV-tiered subscription system. `resolve_billing()` /
  `resolve_monthly_bill()` SQL functions compute tier + growth surcharge from actual GMV.

**Events**
- `pokemon_events`, `event_guesses`, `event_reminders` — the weekly giveaway mechanic.

**Beta program**
- `beta_program_config` — a singleton config row (`id boolean primary key default true`) holding the
  beta window dates.

**Storage buckets** (`supabase/migrations/0011_storage.sql`): `listing-photos` (public, 10MB),
`shop-assets` (public, 5MB — logos/banners), `scan-raw` (private, 15MB — raw condition-scan capture),
`scan-maps` (public, 10MB — processed normal maps for the 3D viewer), `message-attachments`
(private, 10MB). Every upload goes **directly from the browser** as the signed-in user via
`src/components/shared/ImageUpload.tsx`; storage RLS policies are the actual security boundary, not
server-side trust.

## 7. Core flows

**Vendor side**: Sign up via Google → onboarding (standard or beta) → free trial begins → Add
Listing (Card Information → Condition & Price → Photos & Description → Preview, 4-step wizard,
shared identically by standard and beta vendors) → required Flat Scan → Publish → receive
order/bid/trade request → fulfill (ship or meetup) → order completes → GMV logged → monthly billing
applies once trial ends.

**Buyer side**: Browse/search (no account needed) → view listing (condition scan always visible) →
Buy Now / Place Bid / Propose Trade → sign-in prompt if not authenticated → checkout (fixed-price) or
win auction or agree trade → payment goes **directly buyer → vendor** via Xendit (once provisioned)
or is settled in person for meetup trades → track order → receive → confirm & review.

**Payment architecture** (deliberate, documented in the business model): the platform never holds or
splits buyer funds. Two fully separate money flows — buyer→vendor (direct, per-transaction) and
vendor→platform (monthly subscription invoice) — keeps PokeCard PH in a simple
merchant-of-record-for-its-own-fees category rather than a funds-holding intermediary, avoiding
BSP money-service-business oversight. This is *why* the business model is subscription-tiered
rather than a per-transaction take-rate.

## 8. Feature inventory (what's actually built vs. not)

Built and shipped, in rough chronological order (full detail per phase in `SESSION_PLAN.md`): buyer
core browse/search/cart/checkout loop; Google + magic-link auth; vendor core (onboarding, listings,
storefront); trade engine; auctions with proxy bidding and anti-snipe; vendor GMV-tiered billing
(math real, Xendit payment not connected); "Who's That Pokémon?" events plus Action Events; two-tier
condition scanning (Flat required, Full optional) with a 3D viewer; landing page + Beta Vendor
Program instant-activation; rich social-share previews (dynamic OG images per card/shop/auction);
manual card entry (vendors type card details instead of picking from a seeded-only catalog,
resolving into the shared catalog via `find_or_create_card()`); vendor Shop Settings (edit shop
identity, sign out, a Premium-features showcase).

**Explicitly not built, called out rather than silently assumed**:
- **Xendit payment processing** — no code anywhere reads the credential at runtime; billing math is
  real, nothing is actually payable yet.
- **Messaging UI** — the `conversations`/`messages` schema exists; no page/component consumes it.
- **News Feed** — a buyer-facing tab for conventions/community events described in the business
  model doc. Zero implementation anywhere (no table, no route, no component) — needs its own spec
  before it can be scheduled.
- **Five of six "Premium" revenue streams** from the business model doc — featured/boosted
  listings, auction listing fees, protected-trade fees, News Feed sponsorship, and sponsored search
  placement have no functional code anywhere (no schema, no ranking logic, no fee collection). They
  exist today only as a "Coming Soon" informational showcase on `/vendor/settings`. The sixth,
  Verified Condition Scan, has its underlying mechanism built (`scan_tier`) but no payment gate.
- **`shops.tier` (free/premium) is currently decorative only** — it renders a badge in four places
  and gates nothing functionally (no search ranking, no feature access change).
- **Cron jobs are unregistered** — the billing crons work when invoked directly but aren't wired into
  `vercel.json`, so they don't run on a schedule yet.
- **AR View, Market Price comparison widget variants, "Pop. Higher," Add to Watchlist** — appear in
  early mockups but in no spec and no schema; deliberately not built.

## 9. Where to go for more detail

- **`SESSION_PLAN.md`** — the living execution runbook, phase-by-phase, with exact file paths, what
  shipped, what's deferred, and open product decisions. The single most up-to-date source.
- **`CONTEXT/POKECARD_PH_DESIGN_SYSTEM.md`** — color/type/spacing/component/motion tokens, locked.
- **`CONTEXT/POKECARD_PH_MASTER_PROMPT.md`** — original scope/stack/schema brief (phase ordering
  superseded by `SESSION_PLAN.md`).
- **`buisness context/PokeCard_PH_Business_Model_Updated.docx`** — revenue model, onboarding
  requirements, payment architecture rationale, open business decisions.
- **`CONTEXT/PHASE*_*.md`** — per-phase specs (vendor core, trade engine, auctions, monetization,
  events, storefront animation, Google sign-in).
