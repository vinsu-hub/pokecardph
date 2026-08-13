# PokeCard PH — Master Session Plan

The single document to execute from. Every phase in order, with the gate that must clear before
the next one starts. Each phase points at its source spec in `CONTEXT/` for full detail — this
file is the sequence and the rules, not a replacement for those documents.

**Vault mirror:** `D:\OBSIDIAN\Varix\PokeCard PH\` (8 notes, hub is `PokeCard PH - Overview`).

**Session status (2026-08-13):** Phase 12a is now fully closed — migration `0019` applied,
`price_history`/condition grades seeded, deployed and re-verified on
`https://pokecard-ph.vercel.app` itself (Card Condition and Market Price confirmed rendering with
real data). Phase 13 (Beta Vendor Program) is also built, committed, pushed, and deployed — see
below — with one migration (`0020`) still to be run by hand in Supabase Studio. A GitHub remote is
now configured: `https://github.com/vinsu-hub/pokecardph.git`, `master` pushed and tracking.
**Still queued, deferred from the original Phase 12 plan**: full-site audit + checklist, the
vendor storefront's 1:1 rebuild against `VENDOR STORE VIEW.png`, a 3D shelf "picking" card
interaction, and a landing-carousel hardening pass — full detail in the Outstanding Work Register
below and in `phase 12.md` (project root).

**Same day, 2026-08-13, second pass:** Phase 13's beta signup was superseded by an instant-
activation flow (a real 3-step wizard, then an instant redirect into the Add Listing wizard on
submit — see the Phase 13 register entry below for the full redesign history). Google OAuth was
code-enabled, then fully finished (Google Cloud Console + Supabase provider live) and confirmed
working end-to-end on production. The Storefront vs. `VENDOR STORE VIEW.png` gap was re-confirmed
against a real screenshot, not just code. Also logged (documentation only, not yet built): the
updated business model's no-held-funds payment architecture, a net-new News Feed tab, and Full
Condition Scan monetization — see the Outstanding Work Register's cross-cutting section. Migrations
`0020`/`0021` applied to production the same day; beta registration opened live.

**Same day, 2026-08-13, third pass:** a Remotion-based Pikachu pixel-art loading animation was
built (`D:\CODING\remotion`, two rendered clips in `public/loading/`) and wired into beta signup via
a new `LoadingIndicator` component. Two real Card Detail bugs fixed: the 2D hero image was
collapsing to near-zero width (`w-fit` with no in-flow children — see `CardImageGallery.tsx`), which
also surfaced a separate pre-existing mobile horizontal-overflow bug on the same page (the 2-column
grid had no explicit `grid-cols-1` below `lg:`, so a horizontally-scrolling child could push the
whole mobile layout wide — fixed in `card/[id]/page.tsx`); and the 3D Inspection view was missing
the full shop info card the 2D view has, fixed by extracting a shared `ShopInfoCard` component. The
Storefront shelf got a genuine isometric CSS 3D treatment (not just the subtle ledge effect —
`rotateY` added alongside the existing `rotateX`, tuned in-browser, confirmed clean in Chromium,
Firefox, and WebKit) plus chevron paging, search, sort, grid/list toggle, true multi-select facets,
and an icon stat header — closing out the Storefront rebuild item queued below.

---

## Scope — read this first

**Build target: a responsive website, deployed and working end-to-end.** Not a native app.

- **In scope:** the web app at all breakpoints, including how it behaves when opened on a phone
  browser — standard responsive web behaviour, per the *Responsive & mobile web* section of
  `CONTEXT/POKECARD_PH_DESIGN_SYSTEM.md`.
- **Out of scope, deferred to a separate future project:** a native mobile app (React Native).
  Do not scaffold it, do not design for it, do not add app-shaped patterns to the web build.
- **Definition of done for this effort:** a full working demo deployed to Vercel against a live
  Supabase project, usable on desktop and phone browsers.

Mobile has almost no reference imagery (see the gap register below). **Mobile is built from the
documented responsive rules, not from comps.** That is a deliberate decision, not an oversight.

## How to use this

Work one phase at a time. Do not start a phase until the previous phase's **Gate** is verified —
not "looks done", verified by the listed checks. Each phase ends deployed to the same Vercel
project before the next begins.

At the start of every phase, re-read `CONTEXT/POKECARD_PH_DESIGN_SYSTEM.md`. It is short and it is
the thing that keeps seven phases built at different times from looking like seven products.

## Reference imagery — what you actually have

Full audit: `D:\OBSIDIAN\Varix\PokeCard PH\PokeCard PH - Reference Gaps.md`.

**11 unique screens, not 10 — corrected 2026-08-12.** `BUYER ACTIVE TRADES TAB.png` and
`TRADE VIEW.png` are byte-identical, so the Active Trades list has no reference — but
`ITEM VIEW WITH 2D IMAGE ONLY.png` (18 files in the folder total) is Card Detail (2D)'s real
reference, confirmed during the Phase 12a verification pass and previously missing from this count
entirely. Card Detail was rebuilt to it in Phase 12a.

**Three filenames lie about their contents** — build from the screen, not the name:

| File | What it actually is |
|---|---|
| `SHOP PAGE.png` | **Home/Browse**, signed-out |
| `VENDOR STORE VIEW.png` | **Shop Storefront**, buyer-facing |
| `ITEM VIEW WITH 3D MODEL VIEW.png` | **3D Inspection page** (Phase 7) — *not* Card Detail |

**One image is a trap.** `VENDOR ADD LISTING.png` is the single-page 5-section variant the spec
says to ignore. The canonical wizard is `VENDOR ADD NEW LISTING VIEW.png`.

### Reference status per phase

| Phase | Have | Must derive from spec + design system |
|---|---|---|
| **1** | Home/Browse, Search results (+ the only mobile comp), Shop Storefront | **Card Detail (2D)**, Cart, Checkout, Order Tracking, Messages, signed-in Home |
| **1b** | — | Login page, soft-gate modal, avatar dropdown |
| **2** | Dashboard, Add Listing **step 1 only** | Wizard steps 2–4, All Listings, Vendor Orders + slide-over, Analytics, Shop Settings, onboarding |
| **3** | Trade Hub, Trade detail | Active Trades list, Vendor Trade Requests |
| **4** | *nothing* | All 4 screens |
| **5** | *nothing* | Billing page |
| **6** | *nothing* | All 5 screens |
| **7** | Scan & Grade, 3D Inspection | Card Detail's 2D↔3D handoff state |
| **Mobile** | 1 screen | **Everything else — from the responsive rules** |

**Card Detail (2D) is the single most important gap.** It is the page where money changes hands
and there is no picture of it. Build it from `MASTER_PROMPT.md` §4 (1.2), using the Shop Storefront
and Search Results images for card/badge/typography treatment.

### Unspecced features in the mockups — decide before Phase 1

`ITEM VIEW WITH 3D MODEL VIEW.png` shows four things that exist in no spec and no schema:
**AR View**, a **Market Price** comparison widget (Ungraded / PSA 9 / PSA 10, "updated 5 mins
ago"), a **Pop. Higher** field, and **Add to Watchlist**.

Each is either a feature to spec or a mockup flourish to drop. The Market Price widget especially —
it implies a price-history data source nobody has scoped. **Do not silently build them, and do not
silently ignore them.** Raise them.

### Known image-vs-image conflicts

- **Wizard is 5 steps with scanning on** (`VENDOR SCAN OR UPLOAD ITEM.png` inserts Scan & Grade as
  step 3). "Canonical 4-step" means 4 without scan, 5 with.
- **The two trade images disagree.** `TRADE HOME PANEL.png` uses tabs; `TRADE VIEW.png` uses a left
  sidebar. Pick one and apply it to both.
- **Vendor sidebar differs between images** — "Discounts" appears in one, not the other. Neither
  shows Auctions, Events, or Billing.
- **Nav bar differs between images.** Decide the final nav inventory **once**, accounting for
  Auctions (Phase 4) and Events (Phase 6), rather than per screen.

---

## Ground rules — apply to every phase

1. **The design system outranks everything.** Where a reference image implies a color, spacing, or
   animation choice that conflicts with a token in `POKECARD_PH_DESIGN_SYSTEM.md`, follow the token
   and **say so in your response**. Never silently pick one.
2. **Reference images are layout intent only.** They live flat in `REFERENCE IMAGES/` — *not* in
   `/design-reference/buyer|vendor|shared` as `MASTER_PROMPT.md` claims. That path is wrong;
   ignore it.
3. **Never build ahead.** If a screenshot's sidebar shows a later phase's feature, stub the nav
   link and move on. Every phase spec opens with a "What NOT to touch" section — honour it.
4. **Additive schema only.** Later phases add tables and columns. They never modify or drop what an
   earlier phase created.
5. **No new motion vocabulary.** Every animation reuses the `--ease-*` and `--duration-*` tokens.
   The complete list of sanctioned >400ms exceptions is in the design system; anything else above
   400ms is a bug.
6. **Server-side validation is not optional** for bids, guesses, billing, and auth. Never trust a
   client-computed correctness or validity flag.
7. **`prefers-reduced-motion` gates both motion and audio.** Every animated moment needs a
   reduced-motion fallback.
8. **Verify before claiming done.** Run the check, read the output, then say it works.

### Canonical flows

Where reference images disagree, these win:
- **Add Listing** = the 4-step wizard (Card Information → Condition & Price → Photos & Description
  → Preview) with the live preview panel pinned right
- **Vendor Dashboard** = the version with Quick Actions grid, Recent Orders table, Sales Overview
  with 7D/30D/3M/1Y toggle, Recent Trade Requests, Top Selling Listings, Shop Health score

---

## Phase 0 — Pre-flight

**Status:** ✅ Built & verified (Gate 0 closed).

Nothing here is app code. All of it blocks Phase 1.

### 0.1 Project setup
- Next.js 14+ App Router + TypeScript, Tailwind, shadcn/ui
- Fresh Supabase project — Postgres, Auth, Storage, Realtime
- Vercel project connected to the repo, auto-deploy on `main`, previews per branch
- Migrations tracked in `/supabase/migrations`, applied with `supabase db push`

### 0.2 Environment variables (six)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
XENDIT_SECRET_KEY
XENDIT_WEBHOOK_TOKEN
NEXT_PUBLIC_SITE_URL          # added by Phase 1b — OAuth redirect target
```

### 0.3 Design tokens
Encode the full token set from `POKECARD_PH_DESIGN_SYSTEM.md` as CSS custom properties and Tailwind
theme extensions **before writing a single component**: colors, status pairs, type scale, the
4/8/12/16/24/32/48 spacing scale, radii, the two shadows, and the `--ease-*` / `--duration-*`
motion tokens.

### 0.3b Responsive shell — build it once, here
Because mobile has no comps, the responsive primitives must exist as **shared components** before
any page uses them, or every page will invent its own. Build:

- **App shell** — desktop top nav ⇄ mobile bottom tab bar (max 5) + hamburger overflow, switching
  at the 1024px line
- **Filter sheet** — the mobile counterpart to every left filter sidebar
- **Slide-over** — the mobile counterpart to every right rail, and the desktop order-detail panel
- **Responsive table** — renders as a table at `≥1024px`, as stacked cards below. Never a
  horizontally-scrolling table.
- **Sticky action bar** — pins the primary button above the tab bar on Card Detail, Cart, Checkout

Breakpoints, transforms, and the non-negotiables (44×44 targets, no horizontal scroll, no disabled
zoom, safe-area insets) are in the design system's *Responsive & mobile web* section.

### 0.4 Audio asset prep — do all eight at once
Assets are in `audio files/`. They are **not** ready to ship as-is.

| File | Now | Trim to | Role token |
|---|---|---|---|
| `item select.mp3` | 2.06s | **~120ms** | `--sfx-select` |
| `item add to cart.mp3` | 1.72s | **~400ms** | `--sfx-cart-add` |
| `pokemon-evolve.mp3` | 4.23s | ~1.2s | `--sfx-listing-live` |
| `item deliverd.mp3` | 4.08s | ~1.5s | `--sfx-order-complete` |
| `whos-that-pokemon.mp3` | 4.65s | **~800ms** | `--sfx-reveal` |
| `won the auction.mp3` | 5.04s | ~2s | `--sfx-auction-won` |
| `level up sound effect.mp3` | 4.17s | ~2s | `--sfx-tier-up` |
| `shop vendor open.mp3` | 29.26s | loop, uncut | `--ambient-storefront` |

Also: **re-encode everything to 128kbps mono** (`level up` is currently 1702kbps / 888KB,
`item deliverd` is 666kbps), **normalise all assets to the same LUFS**, and export `.mp3` +
`.webm`/Opus. Target under 150KB for the whole SFX set. The ambient bed loads separately and only
when its toggle is on.

Reference sounds by **role token, never filename** — the files are placeholders and the indirection
makes replacing them a one-line change.

> **Licensing, decide before public launch:** `pokemon-evolve.mp3` and `whos-that-pokemon.mp3` are
> recognisably first-party Pokémon audio. On a platform charging vendors ₱275–17,500/month that is
> real trademark exposure. Treat them as scratch assets for feel-testing and commission
> sound-alikes before launch. Not a technical blocker — the role-token layer absorbs either answer.

### Gate
Tokens resolve in a test component. **The five responsive shell components exist and switch
correctly at 640/1024px.** All eight audio assets trimmed, normalised, and under budget. Supabase
project reachable. A trivial page deploys to a Vercel preview URL.

---

## Phase 1 — Buyer core loop

**Spec:** `MASTER_PROMPT.md` §3–4 · **Vault:** `PokeCard PH - Build Phases`

**Status:** ✅ Built — Home/Browse, Card Detail, Cart, Checkout, Order Tracking all live against real
Supabase data. Card Detail (2D) has no reference image; derived from `MASTER_PROMPT.md` §4 (1.2).

### Schema — the full base migration
13 tables, **RLS enabled on every one**: `profiles`, `shops`, `cards`, `listings`, `orders`,
`order_items`, `trades`, `trade_items`, `conversations`, `messages`, `billing_tiers`,
`vendor_gmv_history`, `vendor_monthly_billing`.

The load-bearing modelling choice: **`cards` is shared catalog reference data, not per-listing.**
One Charizard row, many shops' `listings` pointing at it. That is what makes cross-vendor search,
price history, and trade matching by `card_id` overlap possible at all. Get this right here.

RLS intent: own-row only on `profiles`; public read on `shops`; public read on `listings` where
`status = 'active'`; buyers read own orders, vendors read only `order_items` matching their
`shop_id` and may update status but **not** buyer or total.

### Build
Home/Browse (filter bar, card grid, pagination) → Card Detail (2D only, 3D toggle present but
disabled) → Cart → Checkout (4-step stepper, Xendit session on the payment step) → Order
Confirmation & Tracking.

### Audio — the foundation lands here
`--sfx-select`, `--sfx-cart-add`, `--sfx-order-complete`, `--ambient-storefront`, **plus the mute
toggles and `localStorage` preference**. Every later cue depends on this scaffolding, so it cannot
be deferred.

Rules: muted by default, opt-in per session. Two independent switches (SFX / ambient). Audio never
carries information alone — every cue has a visual counterpart. Never more than one cue per event.

### Seed
20 cards across 3 shops.

### Gate
Browse → cart → checkout → order tracking works end-to-end on a preview URL against real Supabase
data. RLS verified by attempting cross-user reads and confirming they fail. **The same journey
completes on a phone-width viewport** — no horizontal scroll, touch targets ≥44px, sticky primary
action reachable, filters open as a sheet.

---

## Phase 1b — Auth & Google Sign-In

**Spec:** `AUTH_GOOGLE_SIGNIN.md` · **Vault:** `PokeCard PH - Auth`

**Status:** ✅ Built — email magic-link is the real, working path. Google OAuth deferred by explicit
request; the button is rendered disabled with a "coming soon" note, not omitted, so turning it on
later needs only the Google Cloud Console step + a provider toggle. No schema or policy change.

Not a numbered phase — a **gate before Phase 2**, because every later phase assumes an
authenticated user. It can land after Phase 1 without a rewrite: RLS already keys off `auth.uid()`,
so only the mechanism populating it changes.

### Configure
Google provider in Supabase Auth. Google Cloud Console consent screen ("PokeCard PH", logo,
redirect URI `https://<project>.supabase.co/auth/v1/callback`). **Register localhost, preview, and
production redirect URIs separately** — registering only production is the classic failure here.

### Schema
One function + trigger: `handle_new_user()` on `auth.users`, auto-inserting the `profiles` row with
`role = 'buyer'`, Google's name/avatar, or `'Collector'` as fallback. No manual insert after signup,
ever.

### Build
One combined login/signup page — Google is primary, email is a **magic link, not a password**.
`/auth/callback` route. `middleware.ts` for session refresh and route guarding.

### The soft-gate pattern — the decision that matters most
- **Public:** Home/Browse, Card Detail, Shop Storefront, Auctions Browse. Window-shopping needs no
  account.
- **Gated at point of intent:** Buy Now, Add to Cart, Place Bid, Propose Trade, Message Vendor →
  opens a **modal**, not a redirect.
- **On success the original action completes automatically.** Signing in to add to cart actually
  adds it. Intent survives the auth interruption.
- **Middleware-protected:** `/cart`, `/checkout`, `/orders/*`, `/trade/*`, `/vendor/*`, `/messages`.
- Returning users land back where they were headed, never a generic dashboard.

Everyone starts a **buyer**. Vendor is only ever reached through Phase 2 onboarding.

### Audio
None. Sign-in is a gate, not a delight moment — and autoplay policy blocks any cue before the first
gesture regardless.

### Gate
A signed-out visitor browses freely, is prompted only at point of action, and their action
completes after sign-in. `profiles` row exists automatically. `/vendor/*` redirects a shop-less
buyer to onboarding rather than erroring. **If Phase 1 used mock auth, all references are now
real `supabase.auth.getUser()` calls — and no RLS policy was edited.**

---

## Phase 2 — Vendor core loop

**Spec:** `PHASE2_VENDOR.md`

**Status:** ✅ Built — onboarding, dashboard, the 4-step Add Listing wizard, All Listings, Vendor
Orders with the slide-over.

### Schema
No new tables. Columns only: `shops.banner_url`, `description`, `positive_feedback_pct`,
`avg_response_time`; `listings.compare_price`, `population`.

### Build
Vendor onboarding (1-page form off the "Sell" nav) → Dashboard → **Add Listing 4-step wizard** →
All Listings → Vendor Orders with the row-click slide-over.

Dashboard's Sales Overview may use mock data this phase. Trade Requests and Scan Card tiles are
**stubbed and disabled** with phase tooltips.

Layout shell: fixed left sidebar + main + right rail, where the rail becomes a **slide-over under
1024px**, never squeezed inline.

### Audio
`--sfx-listing-live` on publish from the wizard.

### Gate
A vendor onboards, publishes a listing through all four wizard steps, and sees it live on the buyer
side. Vendor sees only their own shop's orders.

---

## Phase 3 — Trade engine

**Spec:** `PHASE3_TRADE_ENGINE.md` · **Vault:** `PokeCard PH - Trade Engine`

**Status:** ✅ Built (Gate 3 closed).

### Schema
`trade_cards` (buyer's personal inventory — **distinct from shop listings**), `trade_activity`,
`meetup_locations`; `trades` and `trade_items` expand. `trade_items` carries a check constraint
enforcing that `offered` references a `trade_card_id` and `requested` references a `listing_id`,
never both.

### Build
Buyer Trade Hub (My Trade Cards + Build Your Trade two-column builder) → Propose Trade → the
**shared** `/trade/[tradeId]` detail page, rendered conditionally for buyer or vendor → vendor
Trade Requests.

Nine-state ladder: `proposed → accepted → plan_created → meetup_scheduled → cards_verified →
value_confirmed → completed` (+ `cancelled`, `declined`). **Status advances via Server Actions only,
and every transition writes a `trade_activity` row automatically** — that is what keeps the
activity log honest.

**Matching is deliberately dumb this phase** — a SQL query on `card_id` overlap. No recommendation
algorithm. Do not over-build it.

No money moves through the platform for a pure trade.

### Audio
None. A trade completes at an in-person meetup; there is no screen moment worth scoring.

### Gate
Full cycle: buyer builds an offer → vendor accepts → both confirm meetup → progresses to completed
→ both inventories update. Seed ~10 `trade_cards` and 2–3 `meetup_locations`.

---

## Phase 4 — Auctions & bidding

**Spec:** `PHASE4_AUCTIONS.md` · **Vault:** `PokeCard PH - Auctions`

**Status:** ✅ Built (Gate 4 closed, 18/18 attack-shaped RLS assertions). **Outstanding:**
`/vendor/auctions/create` is still a standalone form rather than the Add Listing wizard's Sale Type
branch — deferred originally only because the wizard didn't exist yet when this phase was built.

First hard **Supabase Realtime** dependency. No reference images exist — build to the established
visual language.

### Schema
`auctions`, `bids`, `auction_watchers`. `listings` gains `sale_type` and `item_category`, and
**`listings.card_id` must become nullable** — sealed product and merch have no catalog card.

**Critical RLS:** a bidder's `max_proxy_amount` is readable **only by that bidder**. Exposing proxy
maximums breaks the entire mechanic. Enforce via a view or column-level policy.

### Server-side only
Bid placement: **lock the auction row**, validate status and increment, reject the vendor bidding on
their own shop, resolve proxy bids, then **anti-snipe — extend `end_time` by 2 minutes if inside the
final 2 minutes.** Realtime propagates the row update; no separate broadcast.

Closer cron (every minute): scheduled → live; expired with no bids or reserve unmet →
`ended_unsold`; expired with bids and reserve met → `ended_sold` + 48h `win_confirm_deadline` +
a pending `orders` row for the winner. A second pass cancels unpaid winners and surfaces relist —
**never auto-relists**.

### Build
Auctions Browse (current bid, not starting bid) → Auction Detail with the bidding panel → vendor
Create Auction (extends the Phase 2 wizard, does not fork it) → vendor Auctions panel.

**Masked bidder identities** in bid history. **Never reveal the reserve amount.** Cancel Auction
enabled **only while `bid_count = 0`** — a fairness rule, not a technical one.

Winning-bid checkout **reuses the Phase 1 flow**. No separate payment path.

### Audio
`--sfx-auction-won` only. **No cue on live bid updates** — those are Realtime-driven and the user
didn't trigger them; sound there would violate the no-focus-stealing rule in the most irritating way
available. The visual flash is the whole feedback mechanism.

### Gate
Anti-snipe extension and reserve logic both verified under test. Seed 3 auctions — one no-reserve
card, one sealed box with reserve + Buy It Now, and **one signed item ending within the hour**
specifically to exercise anti-snipe.

---

## Phase 5 — Monetization

**Spec:** `PHASE5_MONETIZATION.md` · **Vault:** `PokeCard PH - Monetization`

**Status:** ✅ Built — Xendit not provisioned, invoicing stops at `pending`/no payable link and the UI
says so. All three crons work when called directly; none are registered (no `vercel.json` yet).

### Schema
`billing_config`, `vendor_payouts`; `shops` gains `trial_ends_at`, `trial_gmv_cap`,
`trial_gmv_used`, `onboarded_at`, `billing_status`.

**The tier ladder lives in `billing_tiers` rows, not in code** — retune pricing by editing the
table, no redeploy. Nine tiers from ₱275 (0–5k GMV) to ₱17,500 + 3% overage (500k+). Growth
surcharge is config-driven: 2% of the increase when month-over-month growth exceeds 25%.

**No client-side INSERT or UPDATE on any billing table.** Written exclusively by scheduled functions.

### Functions & crons
`resolve_billing(gmv)` and `resolve_monthly_bill(shop_id, period)` in Postgres. Three Edge
Functions: `gmv-aggregator` (nightly, upserts so the figure is accurate intra-month, and ends the
trial early on GMV cap breach), `monthly-invoicer` (1st of month, writes `waived_trial` rows for
trial shops and skips invoicing), `trial-reminder` (daily, at 7 and 1 days out with a projected
bill). Plus the Xendit `invoice-webhook`.

### Build
`/vendor/billing` — trial status card, current tier card, the full read-only tier ladder with the
current row highlighted, invoice history, payout settings. Dashboard trial banner. The Payouts
sidebar item, stubbed since Phase 2, goes live.

**Restricted state:** blocks Add Listing and Create Auction, but **existing live listings and
auctions stay visible to buyers.** Don't punish buyers for a vendor's unpaid invoice.

### Audio
`--sfx-tier-up`. Be deliberate: a tier increase means the vendor's bill went **up**. The cue only
works if the surrounding framing is honestly about growth. If the page can't make that read cleanly,
drop the cue rather than sounding tone-deaf about a price rise.

### Gate
Backdate the test vendor's `onboarded_at` to 65 days ago and seed 2 months of `vendor_gmv_history`,
so the Billing page shows real tier and invoice data without waiting a cycle. All three crons
registered, Xendit webhook configured.

---

## Phase 6 — "Who's That Pokémon?" events

**Spec:** `PHASE6_EVENTS.md` · **Vault:** `PokeCard PH - Events`

**Status:** ✅ Built (16/16 `verify-events.mjs`). **Outstanding:** gift-claiming from a won event
doesn't route anywhere yet — spec says reuse the Phase 1 order flow at ₱0.

### Schema
`pokemon_events`, `event_guesses` (with `unique (event_id, user_id)` — one guess, no retries).

**Three RLS rules are the entire game:**
1. `status = 'scheduled'` rows are **not publicly readable** — leaking the go-live time defeats the
   surprise mechanic
2. A user SELECTs **only their own guess row** — otherwise the crowd copies the answer
3. Aggregate counts come from a **function**, never raw row access

### Two layers of randomness, both intentional
1. **When** an event goes live, randomised inside the vendor's chosen window
2. **Who wins**, drawn uniformly from correct guessers — **not first-to-guess**, so it rewards
   knowing the answer rather than typing speed

### The subtle bug to avoid
The resolver must fix `actual_start_time` **the first time** it encounters an event whose window has
opened, and store it. Re-rolling the random point on every cron tick means the event effectively
never starts.

### The no-early-reveal rule
Correctness is never returned to the client on submit — only "guess recorded". Revealing immediately
would let people re-guess via new accounts and let the crowd triangulate from others' reactions.
`is_correct` is computed server-side.

### Build
Events tab (Live Now / Coming This Week / Past Winners) — **discoverable nowhere else**, not in
Home/Browse, search, or storefronts. Event detail with silhouette + single guess. Winner
announcement with three distinct viewer states. Vendor create (with silhouette preview so they can
confirm it's actually hard) and manage. One event per shop per week.

Fulfillment **reuses Phase 1 orders at ₱0 and the Phase 2 Vendor Orders panel.** No parallel system.

### Motion & audio — the signature moment
Silhouette cross-dissolves to the full image over **~800ms** (a sanctioned exception), answer text
fades and scales 0.95 → 1 timed to land *as* the image completes. Confetti on a win — small, once,
skipped entirely under reduced motion.

`--sfx-reveal` scores this, trimmed so the jingle resolves exactly as the image lands. The one
asset whose original purpose matches its use precisely — and therefore the product's most visible
IP surface. See the licensing note in Phase 0.

### Gate
Seed one `scheduled` event with a window starting minutes out, and run the full go-live → guess →
close → winner cycle without waiting a week. Cron registered at every 5 minutes.

---

## Phase 7 — Scan & 3D

**Status:** ✅ Built, ⚠️ **diverges from its own spec** — built as a rotating CSS card with fixed
lighting presets because no spec existed yet; `PHASE7_SCAN_3D.md` arrived afterward and describes
photometric stereo instead. See **Phase 7-rev** below.

**No standalone spec** — the only phase that never had one. Detail lives in `MASTER_PROMPT.md` §2.4
and §7.

Scan & Grade capture wizard (the UI shell was referenced from Phase 2 onward), photometric
normal-map generation into `listings.normal_map_url`, and the Three.js / `@react-three/fiber` viewer
wired into Card Detail's 3D toggle — disabled since Phase 1, live here.

**The scan supports the vendor's stated grade; it never overrides it.** No auto-grading model. That
is a product decision and the core of the trust proposition — do not quietly turn it into a scoring
feature.

### Audio
None.

---

---

## Phase 7-rev — Scan & 3D rework

**Spec:** `CONTEXT/POKECARD_PH_PHASE7_SCAN_3D.md` (arrived 2026-08-11, after Phase 7 was built)
**Vault:** `PokeCard PH - Scan and 3D`

**Status:** 🟡 Partially built 2026-08-12, ahead of schedule — the buyer-facing viewer exists and is
live in production, using test images the user supplied (`pokemoncards/`, gitignored). Still missing:
real `getUserMedia` capture, `scan_sessions` schema, and out-of-request photometric processing — see
below for exactly what landed and what didn't.

> ⚠️ **Phase 7 as built does not match its spec.** It was built from the two reference images alone
> because no spec existed — it was the only phase that never had one. The spec describes
> **photometric stereo**: six captures under different light angles produce a normal map, and the
> buyer's viewer is a **flat plane with a moving virtual light** — like tilting a real card under a
> lamp. What exists is a **rotating card** with fixed lighting presets. Competent object viewer;
> not the feature.

Rework: `scan_sessions` + four `listings` columns · real `getUserMedia` capture to Storage ·
`/api/scan/[sessionId]/process` running least-squares photometric stereo **out of the request
cycle** (light directions are known constants, fixed by the capture order) · Three.js normal-mapped
plane with a spring-damped cursor light, lazy-loaded and gated on `scan_status = 'ready'` · moved
onto Card Detail behind the existing 2D/3D toggle · scan-ready badges and trust messaging.

**Failure must never block publishing** — `scan_status = 'failed'` and the listing still ships on
its flat photos. And still no auto-grading model: the vendor's stated grade stays authoritative.

The capture wizard shell is largely correct and can be kept; it needs a camera behind it and a
processor after it.

### What actually landed 2026-08-12
The buyer-facing half only, pulled forward from user-supplied test images rather than a real
capture, and deployed. **`CardSurface.tsx`** (Three.js / `@react-three/fiber`) replaced the CSS-3D
internals of `Inspector3D.tsx` with the spec's real mechanic — a flat plane, a spring-damped virtual
light following the cursor, not a rotating object. Confirmed lazy-loaded (864KB of JS present only on
`/card/[id]/3d`, absent from `/card/[id]`) and light-tracking confirmed by byte-diffing screenshots
at different cursor positions, since a static frame can't prove motion by itself.

**The honest limit:** a normal map needs one face under several *known* light angles; the supplied
assets are 4 flat images, so `.dev/prep-cards.mjs` derives relief from artwork luminance (Sobel
gradients) instead of measuring it. That's real light-play, sourced from the art, not a physical
scan — the viewer says so inline and this never touches `scan_status`. Real capture replaces the
lookup in `lib/photos.ts`, not the viewer itself.

**Also landed in the same pass, because it was nearly free once `cards.image_url` was wired:** real
card art across the whole app. `image_url` existed in schema and types since Phase 1 but was never
selected or rendered — every tile used a generated gradient. `CardArt.tsx` now renders it with the
gradient as an explicit fallback (most of the catalog still has none). Tiles moved from
`aspect-[3/4]` to `aspect-[5/7]`, the real card ratio. One graded listing now carries a real PSA slab
photo (split from the supplied composite scan) instead of a placeholder.

**Still not built:** `scan_sessions` schema, real `getUserMedia` capture, and
`/api/scan/[sessionId]/process` running actual photometric stereo out of the request cycle. Those
remain exactly as specced above.

### The mandatory two-tier model — 2026-08-12
A pasted conversation asked for scanning to become a real requirement to publish, resolved into two
tiers rather than one hard gate (which would have made the still-unbuilt capture wizard a
prerequisite for desktop-only vendors): **Flat Scan** — a listing's Front photo *is* its flat scan,
satisfied automatically, no separate upload — and **Full Condition Scan** — the capture pipeline
above, unchanged in scope, now framed as the earned upgrade.

`0013_scan_tier.sql` adds `listings.scan_tier` (`'flat'|'full'|null`) — deliberately not
`scan_status`, since that column belongs to Full tier's still-unbuilt async lifecycle and shouldn't
be half-modeled. Publishing is gated server-side on a Front photo existing (never trusted
client-only); `CardSurface.tsx` gained a thin backing box so a Flat Scan reads as an object, not a
photo pasted onto nothing; `Inspector3D` shows a Flat Scan warning or Platform Verified badge from
the real `scan_tier` column, kept independent of the unrelated test-artwork-derived normal-map
disclaimer above. `ScanStudio`'s "Skip Scan & Continue" is retired — nothing is skippable now, since
Flat Scan is already satisfied by the time a vendor reaches that page.

Caught mid-build: publishing a listing with a real vendor-uploaded photo crashed Card Detail —
`next.config.ts` never allowlisted the Supabase Storage hostname for `next/image`, since every image
so far had been same-origin. Fixed by deriving `remotePatterns` from `NEXT_PUBLIC_SUPABASE_URL`.

Verified end-to-end with real wait conditions, not fixed timeouts: warning/disabled-button before a
photo, both clear after, `scan_tier` recorded correctly, badge matches. 21/21 journey, 19/19
controls, 0 console errors. Deployed and confirmed in production.

---

## Phase 8 — Messaging & Notifications

**Spec:** `CONTEXT/POKECARD_PH_PHASE8_MESSAGING_NOTIFICATIONS.md` · **Vault:** `PokeCard PH - Messaging and Notifications`

**Status:** 📋 Specced only — zero code written. Messaging is the last fully-unbuilt surface; four
"Message X" buttons across the app are already wired up in markup and go nowhere.

The last unbuilt surface. Every phase has shipped a Message button with nothing behind it and said
"notify the user" without a notifications table.

**`conversations` and `messages` already exist** as Phase 1 shells — this ALTERs them, adding
`context_type`/`context_id`, unread counters and `last_message_at`. Same trap Phase 3 hit with
`trades`. The `unique (buyer, shop, context_type, context_id)` constraint is load-bearing: messaging
the same shop about the same order twice must land in one thread.

Realtime is **not optional**. Notifications INSERT is **server-side only**. Triggers fire from
inside existing Server Actions and crons, not a new poller.

Motion reuses existing recipes — bid-history row entrance for new messages, cart-badge pop for the
bell, avatar-dropdown mechanic for the panel. The spec says explicitly: do not create a third
variant of "dropdown opens".

---

## Phase 9 — Search, Legal, Empty & Loading States

**Spec:** `CONTEXT/POKECARD_PH_PHASE9_SEARCH_LEGAL_EMPTY_STATES.md` · **Vault:** `PokeCard PH - Search and Polish`

**Status:** 📋 Specced only — zero code written.

Header **autocomplete** (`pg_trgm`, 250ms debounce, Cards/Shops grouped) — `/search` exists but the
header bar has none. Vendor-side search is a *different* search over their own orders and listings.

`/terms`, `/privacy`, `/vendor-agreement` — all currently 404 from the login footer and the new
global footer. Plus a 404 page.

Empty states: most already exist; the job is unifying them onto one pattern. **Loading states are
the real work** — the build has `force-dynamic` throughout and **no `loading.tsx` anywhere**, so
every route flashes blank on navigation.

---

## Seed — one coherent dataset

**Spec:** `CONTEXT/POKECARD_PH_SEED_DATA_PLAN.md` · **Vault:** `PokeCard PH - Seed Data Plan`

**Status:** 📋 Specced only — the live database is still the 7 fragmented per-phase seeds plus
accumulated test-harness debris (journey-run orders, suite-closed auctions, `VERIFY GIFT` events).

Seven per-phase seeds have produced disconnected fragments, now compounded by test-harness debris
(journey-run orders, suite-closed auctions, `VERIFY GIFT` events). Replace with one script against
a fresh database: 4 named people, ~25 cards, ~15 listings, orders across every status, trades,
auctions, an event, conversations, and two months of GMV.

Reconcile the cast: the current seed has `buyer@pokecard.test` and three shops; the plan names two
buyers and two vendors.

---

## Brand — red/black/white retrofit

**Spec:** `CONTEXT/POKECARD_PH_BRAND_ALIGNMENT.md` · **Vault:** `PokeCard PH - Design System`

**Status:** ✅ Applied — indigo → red `#E4002B`/ink/white palette across Phases 0–5, grade badges
moved to neutral fill, global footer, real logo artwork (see below). `POKECARD_PH_DESIGN_SYSTEM.md`
§2 updated in place per the brand doc's own closing instruction, rather than superseded by a second
document.

**Real logo assets landed 2026-08-11**, after the initial retrofit shipped with a hand-built SVG
reconstruction (the brand doc referenced image assets that hadn't been supplied yet). Six files —
two wordmark lockups (light/dark-mode) and four mark-only variants — are now in `public/brand/` and
`Logo.tsx` renders them directly. The reconstruction's geometry was already close; this is exactness,
not a correction. Also fixed in the same pass: `viewport.themeColor` in `layout.tsx` was still the
old `#4f46e5` indigo — a browser-chrome surface the original CSS-token sweep didn't reach because
it isn't a CSS custom property.

---

## Phase 10 — Landing page, sign-up restyle, Action Events

**Spec:** five new `REFERENCE IMAGES/` files (`MAIN LANDING PAGE.png`, `LANDING PAGE IMAGE
BACKGROUND.png`, `SIGN UP PAGE.png`, `ACTION OR BIDDING LAYOUT.png`, `WHO'S THAT POKEMON.png`) plus
`fonts/pokemon/`. **Status:** ✅ Built and deployed 2026-08-12.

Three of the five mockups directly conflicted with decisions already built, tested, and deployed —
resolved by asking rather than silently following the newest picture, all three resolved toward the
existing behavior: **Home/Browse moved to `/browse`**, with the marketing landing page taking `/`
for signed-out visitors only (a signed-in session redirects, query string preserved) — the "no
browse wall" property from `AUTH_GOOGLE_SIGNIN.md` survives, just one click further in.
**Sign-up stays magic-link only** — the mockup's password fields were never built; only the
split-panel layout and copy were adopted. **Bidder identity stays masked** in the new event-bidding
type, matching existing Auctions, not the mockup's real usernames.

**Action Events** reuse the Phase 4 auction engine entirely — `0014_action_events.sql` adds nullable
event-framing columns to `auctions` (`is_action_event`, `event_title`/`subtitle`, `max_participants`,
`prize_description`) and `join_action_event()`, following the same locked-row SECURITY DEFINER
pattern as `place_bid`. Participants reuse `auction_watchers` rather than a new table. `/auctions/[id]`
gains a conditional hero-banner branch around the existing `BiddingPanel`, not a forked page. New
`/events/action` mirrors Auctions Browse filtered to the flag. `/events` restructures with All
Events/My Entries tabs and an Action Events row, including inert Tournament/League teasers — no
mechanic is specified for either anywhere, so they're stubbed with a reason, same treatment as AR
View and the Market Price widget, never built as real features.

The Pokémon TCG display font (`Pokemon Solid.ttf`/`Pokemon Hollow.ttf` — real trademark exposure,
same category as the two Pokémon-derived SFX assets) is wired via `next/font/local` and applied to
exactly one place: the Events hub's "Who's That Pokémon?" heading.

One real bug caught by the existing suites, not assumed working: the signed-in redirect from `/` to
`/browse` was dropping query strings entirely — `controls.mjs`'s filter assertions caught it
immediately, since every filtered total came back identical to the unfiltered one.

Full regression: 21/21 journey, 19/19 controls, 16/16 events, 25/25 RLS/mechanics, 14/14 contrast
pairs checked, 0 sub-44px targets across every new route (two real ones found and fixed — a
grid/flexbox intrinsic-width leak and undersized breadcrumb links), 0 console errors. Deployed and
re-verified against production, not just localhost.

---

## Phase 11 — Post-deploy polish: 3D fix, admin access, real seed content

**Spec:** an 11-item post-deploy feedback pass on the live site, covering one genuine regression, two
"looks broken but is actually just empty" reports, and eight content/access gaps. **Status:** ✅ Built
and deployed 2026-08-12.

**3D viewer flicker (real bug, not perception):** `CardSurface.tsx`'s backing box, added in Phase
7-rev for the Flat Scan "reads as an object" requirement, had its front face landing at exactly the
same `z` as the card plane — z-fighting, invisible in any static screenshot and only visible while the
viewing angle changes, matching the report exactly. Fixed with a small position epsilon; a permanent
regression script (`.dev/verify-3d-flicker.mjs`) drags through a full rotation sweep and byte-diffs
per-frame luminance rather than eyeballing single frames, since the bug is inherently invisible to a
static check.

**Admin access:** new unlinked `/admin-login` — real `supabase.auth.signInWithPassword`, not a
hardcoded check. Reuses the existing seeded `foilandflame@pokecard.test` vendor account (given a real
password via the Admin API) rather than creating a second `admin@` profile, which would have needed
its own shop under the `shops.vendor_id` 1:1 constraint and either orphaned the existing test account
or shipped an empty, unpopulated dashboard. Not referenced from `/login`, the landing page, or any
nav — confirmed absent from both `a11y.mjs`'s 104-link dead-link crawl and a dedicated
`verify-admin-login.mjs` link-reachability check.

**Events tab was empty, not broken:** both `pokemon_events` rows were `winner_selected` verification
debris (`VERIFY GIFT`/`VERIFY EMPTY`) and the only `is_action_event` auction was an `ended_unsold`
test row (`Test Pack Battle`) backed by a listing with no `card_id`. Migrations `0017`–`0018` delete
the debris and seed one real live Who's That Pokémon event and one real live Action Event ("Moonbreon
Bidding War," repurposing the test auction's own listing/auction rows rather than creating new ones,
avoiding the `auctions.listing_id` unique constraint). The real event was deliberately placed on
PokeVault PH — the one shop `verify-events.mjs`'s own fixture never touches — after the first attempt
collided with that script's `(shop_id, week_start)` uniqueness constraint on its first two
alphabetical shops.

**Card metadata + description template:** `0015_card_metadata.sql` adds `cards.generation` and
`cards.pull_rate`, backfilled from the user-supplied 20-card reference table (Generation / Set /
Rarity Tier / Pull Rate), matched by name against the existing catalog — 20 of 21 cards matched; the
Rayquaza EX PSA slab, not in the table, stays null and Card Detail's existing
`.filter(([, v]) => v)` on the spec list already omits it cleanly. These two fields are now also the
template for what a seller's own listing description should cover going forward.

**Price rebalancing + shop content:** `0016_price_rebalance_and_shops.sql` adjusts four existing
listing prices (no listings added or removed) so all four `/browse` price bands return results —
previously only 1 of 28 active listings fell under ₱1,000 and only 1 over ₱5,000. Also seeds the
`shops.description` column (populated by Phase 2, never written to) with one real About blurb per
shop, surfaced in a new "About [Shop Name]" block on Card Detail, alongside promoting the existing
"View Shop" link into a "Visit Store" CTA.

**Select cue:** `ListingCardTile.tsx` now calls `play("select")` on tap — the asset was processed and
role-mapped in `lib/audio.ts` since Phase 0 but never wired to an actual event. Required converting
the tile to a client component (`"use client"`); its only other imports (`next/image` via `CardArt`,
`@/lib/utils`) already work inside a client boundary.

Full regression: 21/21 journey (0 sub-44px targets), 19/19 controls, 16/16 events (including a
same-session fixture collision found and fixed via `0018`), all four price bands populated, 17/17
contrast pairs, 0 dead links across 104 crawled hrefs, `tsc --noEmit` and `eslint` both clean, 0
console errors. Deployed and re-verified against production — admin login, price bands, 3D flicker,
Events tab content, and Card Detail spec/store rendering all re-checked on
`https://pokecard-ph.vercel.app` itself, not assumed from localhost.

---

## Phase 12a — Verification pass + Card Detail rebuild

**Spec:** a "Phase 12a: Verification Pass" (produced `CONTEXT/VERIFIED_GAP_REPORT.md`, superseding
this document's Outstanding Work Register wherever they conflict) followed by execution of that
report's recommended order, plus a follow-up independent audit that caught and fixed one real bug
(nullable `card`/`shop` unguarded on `/card/[id]`, confirmed as a live crash before the fix).
**Status:** ✅ Built, migrated, seeded, deployed, and re-verified on production — **fully closed
2026-08-13.** `0019_card_detail_condition_and_price_history.sql` applied via Supabase Studio,
`.dev/seed-price-history.mjs` (216 rows across 21 cards) and `.dev/seed-condition-grades.mjs` (5
listings graded) both run, `vercel deploy --prod --yes --scope vince-tamis` shipped, and Card
Condition/Market Price confirmed rendering real data by fetching `/card/[id]` directly off
`https://pokecard-ph.vercel.app` and grepping the response for both section headings. Full detail
in `phase 12.md` (project root); this is the condensed version for the phase ladder.

**Verification pass first, corrections found:** re-ran both previously-failed Explore audits
(dead-link/disabled-button inventory; nav/flow map), confirmed or corrected every Outstanding Work
Register item against live evidence rather than prior wording. Notable corrections: local commit
count is 43 (not "21+"); only 2 distinct dead "Message X" controls exist (not 4), both properly
disabled; Xendit's gap is stronger than stated (no code anywhere even checks the env var, and
`/api/webhooks/xendit` doesn't exist); Phase 8's `conversations`/`messages` tables and RLS already
exist correctly (only UI/Realtime is greenfield); `REFERENCE IMAGES/` has 18 files/11 unique screens
(not 10) once `ITEM VIEW WITH 2D IMAGE ONLY.png` — Card Detail's real reference — is counted. Two
previously-unknown genuinely-dead controls found and fixed (ScanStudio's "Preview" button,
Footer's newsletter form). Decided the four unspecced mockup features: dropped AR View and Pop.
Higher (no data source, no scope), specced Watchlist minimally as a future fast-follow, and treated
Market Price as resolved by this same pass's Card Detail rebuild.

**Shipped:** `SlideOver.tsx` gained a real focus trap (confirmed absent by code read, not just
unverified). Leafeon VSTAR and Gengar VMAX got real photography wired in, joining Mew ex and
Umbreon VMAX (which turned out to already be live — the prior "shows placeholders" claim was only
true for half the set). Card Detail (`/card/[id]`) was rebuilt 1:1 to
`ITEM VIEW WITH 2D IMAGE ONLY.png`: image gallery with thumbnail strip, Card Condition subgrades,
a 3-column Card Details grid, Market Price with a price-history chart, Trade This Card, and a new
You Might Also Like row (a new generic `HorizontalScroller` component, not a reuse of the
storefront's shelf — that turned out to have no chevron paging at all, correcting the original
spec's assumption that it did). Two additive schema pieces:
`listings.condition_centering/corners/edges/surface` and a new `price_history` table.

**Verified:** `pnpm lint`/`tsc --noEmit`/`next build` all clean; `/card/[id]` spot-checked locally
for both a listing with real photos and one without, both rendering correctly with graceful
degradation on the still-unmigrated schema. **Not verified this pass:** any Playwright-driven
check — this session's environment can't launch Chromium (missing system libraries, no
non-interactive `sudo`) — so `journey.mjs`/`controls.mjs`/the new `.dev/verify-carousel-motion.mjs`
did not run. Flagged here rather than silently assumed green.

---

## Phase 13 — Beta Vendor Program

**Spec:** a pasted "Beta Vendor Program — Landing Page & Onboarding" prompt, planned and built in
one session via `/plan`. **Status:** ✅ Built, committed (`5ebe47e`), pushed to
`github.com/vinsu-hub/pokecardph`, and deployed to `https://pokecard-ph.vercel.app`.
⚠️ **Migration `0020_beta_vendor_program.sql` is still unapplied** — needs Supabase Studio's SQL
editor, same situation Phase 12a was in last session. Confirmed safe either order: `/beta`
degrades to its closed-registration fallback (verified live in production) rather than erroring
when the table doesn't exist yet.

A shareable `/beta` signup path, separate from the standard "Sell" nav-link onboarding, offering a
time-boxed launch cohort ("Founding Vendors") 3 months free with **no GMV cap** — meant to be
posted externally rather than discovered inside the app. Two real deviations from the pasted
spec, both forced by the codebase rather than assumed: no soft-gate sign-in modal exists anywhere
(despite the Auth phase's spec describing one), so "Apply as a Founding Vendor" links straight to
the now-`middleware.ts`-protected `/beta/signup` and rides the existing `/login?next=` redirect
flow instead; and the registration mutation is a Server Action co-located in the page, matching
`vendor/onboarding/page.tsx`'s existing convention, not a standalone `/api/beta/register` route.

**Schema:** `shops.is_beta_vendor`/`beta_registered_at`, a new singleton `beta_program_config`
table (`id boolean primary key default true` + `check (id)` — a second row is physically
impossible), and a `shops.vendor_id` unique constraint (one-vendor-one-shop was previously
app-code-only). Confirmed against production data first: 4 shops, zero duplicate `vendor_id`s, so
the constraint applies cleanly. Window seeded 2026-08-15 → 2026-11-15 (3 months), amber `attention`
`StatusPill` tone reused for the badge (user's call, over a Plan subagent's independent objection
that the same tone also means "trial ending / needs attention" elsewhere on the same sidebar —
flagged, not overridden), global Footer included on `/beta` (diverges from the sibling `/` landing
page, which omits one — also the user's explicit call).

**A real, adjacent bug fixed as a drive-by:** standard vendor onboarding never set `trial_ends_at`
on insert — no column default exists for it, so every vendor who onboarded since Phase 5 shipped
has had `trial_ends_at = NULL`, silently skipped by `runTrialReminder()`'s own null filter and
mis-evaluated by `runInvoice()`'s trial check. Fixed once, in a new shared
`createShopForVendor()` helper (`src/lib/shop-signup.ts`) both the standard and beta signup paths
now call, so the two row shapes can't drift apart.

**Also shipped:** a Founding Vendor badge that stacks with Premium Shop everywhere shop badges
render (storefront, card detail, every vendor dashboard page) — the 3 previously hand-rolled
Premium Shop badges were migrated onto `StatusPill` in the same pass rather than adding a 4th
hand-rolled variant; `getSessionUser()` extended to select `tier`/`is_beta_vendor` in its existing
one-round-trip shop query so the badge is now consistent across all 11 `VendorShell` pages, not
just the 2 that happened to fetch a shop row before; an explicit `is_beta_vendor` exemption in the
nightly GMV aggregator (not an implicit "cap = 0" sentinel); and the Vendor Dashboard's "Trial ends
in N days" banner — specced back in Phase 5, never actually built until now, built generically for
every trial vendor with one copy branch for beta framing.

**Verified:** `pnpm lint`/`tsc --noEmit`/`next build` all clean (after fixing one purity-rule
violation — `Date.now()` inside a Server Component body, resolved the same way
`vendor/billing/page.tsx`'s existing `trialState()` helper already does, by moving the date math
outside the component). Local dev-server smoke test: `/beta` 200 (shown correctly in its
closed-registration fallback pre-migration), `/beta/signup` and `/vendor/onboarding` both 307 to
login when signed out, `/shops/[shopId]` and `/card/[id]` both 200 with no runtime errors despite
`is_beta_vendor` not existing in the live schema yet. Re-confirmed the same on production after
deploy. **Not yet exercised end-to-end** (full beta signup → dashboard → badge → billing walk) —
blocked on the pending migration; do this once `0020` is applied.

---

## Phase 14 — Rich Link Preview (Open Graph images)

**Spec:** a pasted "Rich Link Preview (Open Graph Image) Implementation Prompt," planned via
`/plan` and built in one session. **Status:** ✅ Built, verified locally and on production, deployed
to `https://pokecard-ph.vercel.app`. **Not yet committed to git** — see the note at the top of this
document's changelog area; this sits alongside the rest of this session's uncommitted work.

Replaced the broken static `src/app/opengraph-image.png` (a 1080×335 copy of the logo lockup — wrong
aspect ratio, no page anywhere had `generateMetadata`/`openGraph`/`twitter` fields) with a real
1200×630 default image, plus three dynamic per-page images generated at request time from live data.

**Static default:** `REFERENCE IMAGES/IMAGEPREVIEW.png` cropped to 1200×630 via `sharp` (top
1536×806 region resized down — the user's confirmed call to drop the bottom feature-bar/URL-pill
section, keeping logo/tagline/headline/subhead/CTA/cards).

**Dynamic images** (`next/og`'s `ImageResponse`, one per route):
`src/app/card/[id]/opengraph-image.tsx`, `src/app/shops/[shopId]/opengraph-image.tsx`,
`src/app/auctions/[id]/opengraph-image.tsx` — each `export const revalidate = 3600`, no explicit
`runtime` (Node.js is the v16 default and `fs.readFile` needs it). Shared `src/lib/og/` module:
`OgFrame.tsx` (the one shared layout piece — brand background + corner mark/wordmark), `fonts.ts`
(module-scope memoized read of two bundled TTFs at `assets/fonts/` — Satori needs raw font bytes,
not the `next/font/google` Inter already used for on-site CSS), `assets.ts` (image resolution +
`hashGradientHex`, a hex-output port of `CardArt.tsx`'s hue hash), `countdown.ts`
(`timeRemainingLabel`, a one-shot port of `Countdown.tsx`'s format minus live-tick machinery),
`constants.ts`. New `src/lib/supabase/public.ts` — a cookie-free client for these three routes only,
since the regular `createClient()` calls `cookies()` and would force full per-request dynamic
rendering; safe because every table read here (`listings`/`cards`/`shops`/`auctions`) is already
public via RLS.

**Two real bugs found and fixed during local verification, not assumed away:**
- Satori (the `next/og`/`ImageResponse` renderer) **cannot decode WebP** — this catalog's card
  photos are `.webp`, and embedding one as a data URI crashed the route (`TypeError: u2 is not
  iterable`, a minified resvg-wasm failure) for any listing/auction with a real local photo. Fixed
  by piping every loaded image through `sharp` to normalize to PNG before embedding, in
  `loadRemoteOrLocalImage()` — not just skipped or silently left broken.
- A React Fragment (`<>...</>`) inside the Auction template's conditional block is also not
  Satori-safe; replaced with a plain `<div>` even though the crash's actual cause turned out to be
  the WebP issue above, since Satori's own docs warn Fragments aren't reliably supported.

**Metadata wiring:** root layout's existing `metadata` export extended (not replaced) with
`openGraph: { siteName, locale: "en_PH", type: "website" }` and `twitter: { card:
"summary_large_image" }`; `generateMetadata` added to all three dynamic-image pages (none existed
before) for `title`/`description`. No `twitter-image.tsx` — X/Twitter falls back to `og:image` once
`twitter:card` is set. No manual `openGraph.images` anywhere — the file-convention auto-injects
`og:image:*` tags, and setting them again would duplicate.

**Verified:** lint/`tsc --noEmit`/`next build` clean before and after the WebP fix. Local dev-server
fetch of all four image routes with real DB rows (including the no-logo shop-initials fallback path
and both a live and an ended auction), each opened and visually confirmed. Actual `<meta>` tags
checked via curl on `/`, a card, a shop, and an auction — correct absolute URLs, titles, alt text,
`twitter:card`. Re-confirmed identically on production after deploy (`vercel env pull` reported
`NEXT_PUBLIC_SITE_URL=""` for every var including the known-real Supabase anon key — a CLI
redaction artifact, not real state; verified the actual value via the live site's own rendered
`og:image` URL instead, which was already correctly absolute). **Not yet run through Facebook's
Sharing Debugger or Twitter's Card Validator** — those require pasting the production URL into each
tool's own scrape-again flow, left for the user to trigger since it's an external, cache-sensitive
step outside this session's tools.

---

## Phase 15 — Manual card entry (Add Listing)

**Status:** ✅ Built, verified end-to-end against the dev DB, migration applied. **Not yet deployed
to production** and, like the rest of this session's work, not yet committed.

The Add Listing wizard's "Card Information" step (shared identically by standard vendors and Beta
Vendor instant-activation, both landing on `/vendor/listings/add`) previously limited a vendor to a
plain unfiltered `<select>` of the ~20 rows in the `cards` catalog, itself seeded once by a
developer-only script (`.dev/seed.mjs`) — there was no in-product way to add a card, so a vendor
whose card wasn't one of those ~20 couldn't list it. Replaced with typed fields grounded in
real-world Pokémon TCG categorization (researched and sourced — set symbol, `NNN/MMM` collector
number, the modern rarity ladder through Illustration/Special Illustration/Hyper Rare, illustrator
credit, and the edition/finish/language variants that price the same card+number differently):
Card name, Set, Card number, Rarity, Illustrator, Finish, Edition, Language.

**Data model, confirmed with the user over the lighter alternative:** typed cards still resolve into
the shared `cards` catalog via a new `find_or_create_card()` SECURITY DEFINER RPC (migration
`0022_manual_card_entry.sql`, matching `register_beta_vendor_instant()`'s established pattern) —
case-insensitive/trimmed match on name+set+number+finish+edition+language reuses an existing row, or
creates one. `cards` gains three new nullable columns (`illustrator`, `finish`, `edition`); RLS is
unchanged (public read, no direct insert policy — the RPC is the only write path). This keeps
price-history charts, Card Detail, and cross-vendor "same card" matching working identically for
vendor-typed cards as for catalog ones, since every 'card'-category listing still gets a real
`card_id` — no new `card_id`-null listings are introduced, so the pre-existing non-null `ListingCard`
type assumption in checkout/cart stays exactly as safe (or unsafe) as it already was.

`AddListingWizard.tsx` no longer takes a `cards` prop — the wizard's full-catalog fetch in
`add/page.tsx` is gone entirely. The catalog-shortcut/autocomplete alternative was explicitly
declined in favor of pure typing, per the user's choice.

**Verified** via a new `.dev/verify-manual-card-entry.mjs` (following `journey.mjs`'s established
real-magic-link sign-in pattern, run against a real seeded vendor): a brand-new card creates exactly
one `cards` row with all typed fields correct; resubmitting the same details (different casing/
whitespace) dedupes onto the same row; a different finish correctly creates a second, distinct row;
Card Detail renders correctly for a vendor-typed card. All cleanup is automatic (deletes its own
test rows every run). One real bug caught and fixed during this verification pass — not in the
app, in the test script itself: `waitForURL(/\/vendor\/listings/)`'s regex matched the *starting*
URL `/vendor/listings/add` too, so it resolved before the actual submit/redirect ever happened,
producing a flaky false read of the DB mid-flight. Fixed by matching on exact pathname.

---

## Deferred — not part of this effort

**Native mobile app (React Native).** A separate future project with its own session. The website's
responsive behaviour is *not* a substitute for it and is not a prototype of it — do not let app
patterns leak into the web build, and do not build web abstractions "so the app can reuse them".
Ship the website first.

Everything above targets one deliverable: **a full working demo of the website, deployed, usable on
desktop and phone browsers.**

---

## Outstanding work register

Consolidated 2026-08-11 from the session handoff's "Still open" list, the Fidelity Review's "Not
run" note, and this document's own Open decisions footer — those sources had drifted apart, and two
items on the handoff's list were already stale (see "Removed as stale" below). This is now the one
place to check what's left; the per-phase Status lines above point back here rather than repeating
it.

### By phase

- **Phase 12a — fully closed 2026-08-13** (migrated, seeded, deployed, re-verified on production),
  see phase section above and `phase 12.md`. **Still queued, deferred from the original Phase 12
  plan**: full-site audit + checklist, a new 3D shelf "picking" card interaction (hover tilt/glow/
  price-callout) applied to both storefront shelves and Browse/Search grids, and a landing-carousel
  reduced-motion hardening pass (code-reviewed, found no bug, but never browser-verified — see
  Accessibility/Playwright note below).
  ~~Vendor storefront rebuilt 1:1 against `VENDOR STORE VIEW.png`~~ — **done 2026-08-13.** Search,
  sort, grid/list toggle (reusing `/search`'s `ListingResults`/`ViewToggle`), true multi-select
  facets (checkbox membership toggling, not single-value replacement), icon stat cards
  (`lucide-react`, matching `CardDetailsGrid`'s pattern), and chevron paging on `Shelf` (a new
  shared `useEdgeScroll` hook + `ShelfScroller`, extracted from `HorizontalScroller` so the two
  can't drift) are all built and confirmed live. Went further than the reference image itself asks
  for, per explicit request: the shelf is now a genuine isometric CSS 3D treatment (`rotateY` added
  alongside the pre-existing `rotateX` ledge tilt in `globals.css`, tuned in-browser), not just the
  subtle ledge effect — confirmed rendering correctly with zero layout overflow in Chromium,
  Firefox, and WebKit. One real bug caught and fixed along the way: the isometric row's 3D bounding
  box bled a few pixels past its container into page-level horizontal scroll — contained via
  `overflow-x: clip` on `.shelf` (with `overflow-y: visible` kept explicit so the hover-lift effect
  wasn't collateral damage), which in turn required insetting the chevron buttons within the shelf's
  edge instead of straddling it as `HorizontalScroller`'s does.
  ~~Card Detail 2D hero image too small~~ — **done 2026-08-13, real bug found, not a false report.**
  `CardImageGallery.tsx`'s hero box was `w-fit` with zero in-flow children (every child was
  `position: absolute`), so `fit-content` had nothing to measure and collapsed toward zero width —
  fixed with a real `w-full max-w-[400px]`. Fixing it surfaced a second, previously-invisible bug on
  the same page: `card/[id]/page.tsx`'s 2-column grid had no explicit `grid-cols-1` below `lg:`,
  so a horizontally-scrolling child (the "You Might Also Like" shelf) could push the entire mobile
  layout wide — 505px of real horizontal page overflow, invisible before only because the collapsed
  hero never revealed the oversized parent. Both fixed and verified with `document.documentElement.
  scrollWidth` checks, not just eyeballing a screenshot.
  ~~Card Detail 3D View missing the shop info card~~ — **done 2026-08-13.** Extracted a shared
  `ShopInfoCard` component from the 2D page's inline block, rendered identically in both
  `card/[id]/page.tsx` and `card/[id]/3d/page.tsx` — no more data-thin "Sold by {name}" text line.
  Still open: `CardImageGallery`/`CardCondition` correctly render nothing for listings that still
  lack real photography (most of the catalog), which reads as a bare page rather than an obviously-
  empty state — worth a placeholder treatment in a future pass.
- **Phase 13 (Beta Vendor Program) — built, committed, pushed, and deployed 2026-08-13**, see phase
  section above. **⚠️ Reminder for next session:** migration `0020_beta_vendor_program.sql` is
  still unapplied — run it in Supabase Studio's SQL editor (full SQL in the Phase 13 section
  above), then walk the full beta signup flow end-to-end on production (`/beta` → sign in →
  `/beta/signup` → shop created with `is_beta_vendor = true` → Founding Vendor badge visible → no
  GMV-cap bar on the Billing page), since that path hasn't been exercised against real data yet —
  only smoke-tested pre-migration.
  **Superseded the same day by instant activation, then redesigned again against real reference
  imagery** (`REFERENCE IMAGES/VENDOR REGISTRATION BETA.png` +
  `VENDOR ADD NEW LISTING VIEW.png`, found after the first instant-activation pass): `/beta/signup`
  is now a **3-step wizard** (Your Information → Shop Details → Review & Submit, plus a 4th
  "Start Listing" stepper node that represents the handoff rather than a form screen) collecting a
  richer field set (full name, phone, vendor type as three icon cards, social handle, how-heard).
  Submitting creates the shop and flips `profiles.role` via a `register_beta_vendor_instant()`
  SECURITY DEFINER RPC (`0021_beta_instant_activation.sql` — **still unapplied, same as `0020`, run
  both in order**), then redirects straight into the real Add Listing wizard
  (`/vendor/listings/add?beta=welcome`) to create their first listing — no dashboard stop, no
  bulk-photo-upload step. An earlier same-day pass had built a "3–10 starter photos auto-convert to
  draft listings" mechanism (`beta_starter_items` table, a `beta-starter-photos` bucket, wizard
  pre-fill support) before the reference images were checked against it; since neither migration had
  been applied yet, that mechanism was removed outright rather than patched — `git checkout --` on
  the untouched files it had modified, the RPC simplified back to create-shop-and-flip-role only.
  Google Sign-In was enabled for real as part of this work (see the Google OAuth line below) —
  `/beta/signup` accepts either Google or magic-link, matching the app's one-shared-auth-flow
  convention, so step 1 has no inline Google button unlike the reference image. **Not yet verified
  end-to-end** — blocked on both migrations landing; do the full walk (register through all 3 steps
  → land on `/vendor/listings/add?beta=welcome` → complete and publish a real listing) once applied.
- **Phase 4** — `/vendor/auctions/create` is a standalone form; fold it into the Add Listing wizard
  as its Sale Type branch. Deferred originally only because the wizard didn't exist yet when Auctions
  was built — the shape was always intended to converge.
- **Phase 6** — gift-claiming from a won event doesn't route anywhere. Spec says reuse the Phase 1
  order flow at ₱0; not yet wired.
- **Phase 7 → 7-rev** — the full rework: `scan_sessions` schema, real `getUserMedia` capture to
  Storage, `/api/scan/[sessionId]/process` running photometric stereo out of the request cycle, and
  the Three.js normal-mapped plane on Card Detail. Full detail in the Phase 7-rev section above and
  [[PokeCard PH - Scan and 3D]] — the capture wizard shell is largely correct and can be kept.
- **Phase 8** — `conversations`/`messages` tables and their RLS already exist correctly (confirmed
  live 2026-08-12 — Phase 1 shells, same trap Phase 3 hit with `trades`: don't mistake "needs ALTER"
  for "needs CREATE"). Still fully unbuilt: the `context_type`/`context_id`/unread-counter ALTER, a
  notifications table, Realtime wiring, and the UI behind the two (not four — recounted 2026-08-12)
  dead "Message X" controls already sitting in the markup, both correctly disabled with a tooltip.
- **Phase 9** — build from scratch: header autocomplete (`/search` exists, the header bar doesn't),
  `/terms` `/privacy` `/vendor-agreement` (all currently 404), a 404 page, and `loading.tsx` on every
  route — none exist today, so every navigation flashes blank.
- **Seed** — consolidate the 7 fragmented per-phase seeds plus accumulated test-harness debris into
  one script; reconcile the cast (current seed: `buyer@pokecard.test` + 3 shops; plan: 2 named buyers
  + 2 named vendors with specific stats).
- ~~**Unspecced mockup features**~~ — **decided 2026-08-12.** `ITEM VIEW WITH 3D MODEL VIEW.png`
  shows AR View, a Market Price comparison widget, Pop. Higher, and Add to Watchlist; none existed
  in any spec or schema. **AR View and Pop. Higher: dropped** — no data source or framework in
  scope for either, and fabricating a "Pop. Higher" number would be a real credibility risk on a
  grading-trust marketplace. **Market Price: resolved**, not dropped — built in Phase 12a as
  `MarketPrice`/`PriceHistoryChart` with a real (if synthetic-seeded) `price_history` table.
  **Add to Watchlist: specced minimally**, not yet built — one join table (`user_id`, `listing_id`),
  a toggle button, a list view; low risk, queued as a future fast-follow.
- ~~**Accessibility — `SlideOver` focus-trap**~~ — **done 2026-08-12.** Confirmed absent by direct
  code read (not just "never walked"), then built: focus moves into the panel on open, cycles
  Tab/Shift+Tab within it, returns to the trigger on close. `:focus-visible` styling remains global;
  full keyboard tab-order across every route still isn't exhaustively walked.

### Cross-cutting — not owned by any single phase

- **Pikachu loading animation** — new, 2026-08-13. A pixel-art sprite-sheet loading indicator
  (`REFERENCE IMAGES/pikachuanimation.png`, 4×3 grid of 12 documentation-style frames) meant to
  replace generic spinners across async actions site-wide. Built via the separate Remotion project
  at `D:\CODING\remotion` (`src/pikachu/`): a "pending" loop (frames 1-10, ~7.5fps stepped) and a
  one-shot "complete" clip (frames 11-12, held on 12), rendered to WebM and copied into
  `public/loading/`. The source sheet has documentation chrome baked in (numbered badges, captions,
  a flattened card background) — cropped out per-frame rather than attempting true alpha
  transparency, which a flattened source would need real per-frame background removal for; the web
  loading modal's background matches the sheet's own sampled page color (`#F8FAFC`) instead so the
  card frame reads as intentional. Wired into one flow only, per explicit scope decision: beta
  signup, via a new `src/components/shared/LoadingIndicator.tsx` (progress bar is real data when the
  caller has it, an indeterminate CSS sweep otherwise — most Server Action submits, including this
  one, only expose a pending boolean, not a percentage). **Not yet wired anywhere else** — Add
  Listing, Trade, and checkout (once Xendit exists) are explicit future integration points, not done
  here.
- ~~**Deployment**~~ — **done 2026-08-11.** Live at **https://pokecard-ph.vercel.app** (Vercel
  project `vince-tamis/pokecard-ph`), serving real Supabase data from serverless with middleware and
  auth redirects working. Operational detail now lives in
  `CONTEXT/POKECARD_PH_DEPLOYMENT_RUNBOOK.md` — a document `SEED_DATA_PLAN.md` §4 referenced but that
  had never existed.
  ~~Still open: the deployed origin must be added to Supabase's redirect allowlist~~ — **done
  2026-08-12.** Verified past "no error thrown": confirmed GoTrue's `generate_link` response actually
  embedded the production redirect rather than silently falling back to Site URL, then re-ran the
  full buyer + vendor journey suite against `https://pokecard-ph.vercel.app` itself — 21/21, 0
  console errors, real order created and tracked, vendor saw it and opened the slide-over. **Stage 1
  is now fully closed**, all four gate criteria proved on the deployed URL, not assumed from
  localhost.
- ~~**Cron registration**~~ — **done 2026-08-12.** Vercel Hobby allows daily granularity only, so the
  five jobs split: the three billing jobs collapse into one daily `/api/cron/daily`, while the
  auction closer and event resolver run on **pg_cron inside Postgres**, calling
  `close_due_auctions()` and `resolve_events()` directly since both are already SECURITY DEFINER
  functions. **Proved running, not just scheduled** — `cron.job_run_details` showed real executions
  within 90 seconds of the migration landing.
- ~~**Storage**~~ — **done 2026-08-12.** `0011_storage.sql` applied: five buckets with
  path-convention ownership policies. **Proved end-to-end as a real signed-in vendor**: upload to
  own shop's folder succeeds, upload to another shop's folder is rejected, the result is publicly
  readable. `ImageUpload.tsx` is wired into the Add Listing wizard.
- ~~**GitHub remote.**~~ — **done 2026-08-13.** `origin` now points at
  `https://github.com/vinsu-hub/pokecardph.git`; `master` pushed and tracking, 45 commits landed.
  Deploys still go via `vercel deploy` directly, not git — pushing to GitHub doesn't itself trigger
  a deploy on this project.
- **Google OAuth.** Code-enabled 2026-08-13 — `src/app/(auth)/login/page.tsx`'s button now calls
  `signInWithOAuth({provider:"google"})` instead of rendering disabled, driven by the beta
  instant-activation spec leading with "Sign in with Google." A second, separate disabled Google
  button was found and fixed the same day on the marketing landing page (`src/app/page.tsx`,
  missed in the first pass) — now `src/components/shared/LandingGoogleButton.tsx`, same
  `signInWithOAuth` call, defaulting `next=/browse`. **⚠️ Still needs the operator-side
  steps before it actually works**: the Google Cloud Console consent screen + OAuth client, and the
  Supabase Auth provider toggle + redirect URLs registered separately for localhost, preview, and
  production (registering only production is the classic failure). No schema or policy change
  needed on this end; RLS already keys off `auth.uid()` regardless of how it's populated. Until the
  Console/Supabase steps are done, both buttons will error on click rather than sit safely disabled —
  worth doing before this ships to production.
- **Landing page featured cards + demo-data consolidation.** Done 2026-08-13. The marketing landing
  page's "For Sale"/"For Trade" strip (`src/app/page.tsx`, `FEATURED_COUNT = 5`) now sorts real
  photography ahead of sales/newest ranking, landing-page-only — `/browse` and `/search` are
  untouched. Confirmed exactly 5 cards currently have real photography (Mew ex, Umbreon VMAX,
  Leafeon VSTAR, Gengar VMAX, Rayquaza EX), previously split across Card Haven PH and Foil & Flame
  Cards; their listings were reassigned via direct `shop_id` PATCH (service-role REST, no DB
  password needed) so all 5 now live under one shop — **Foil & Flame Cards**, chosen because it's
  already tied to the site's admin/test login (`foilandflame@pokecard.test`). Deliberately
  untouched: Card Haven PH's and PokeVault PH's other listings/vendor accounts, and — found during
  this session's inventory — **a real shop (SandX) and 6 real personal-email buyer accounts that
  signed up on the live site 2026-08-12/13**, genuine people rather than test fixtures. The
  accumulated `.dev/journey.mjs` test-run order debris (47 orders, mostly `pending`) flagged in the
  Seed register item below is still outstanding — this pass didn't touch it, staying scoped to
  cards/shops only as asked.
- **Xendit.** Not provisioned (`XENDIT_SECRET_KEY` empty) — and, confirmed 2026-08-12, no code
  anywhere reads that variable at runtime, so this isn't "ready code waiting on a credential," it's
  no integration code at all yet. `/api/webhooks/xendit`, listed in this document's own cross-phase
  reference table below, doesn't exist. Checkout and billing both stop at `pending`/no payable link,
  and the UI says so rather than implying a working payment path.
  **Design constraint, confirmed 2026-08-13** against the updated business model
  (`buisness context\PokeCard_PH_Business_Model_Updated.docx` §4, "Payment Architecture —
  Subscription-Only, No Held Funds"): the platform must never collect or hold buyer payments.
  Buyer→Vendor checkout has to pay the **vendor's own** Xendit-linked account directly; Vendor→
  Platform is a fully separate monthly subscription invoice (which is already how Phase 5's
  `vendor_monthly_billing`/Xendit-invoice design works — only the buyer-facing checkout side needs
  this constraint applied when it's finally built). Apply this before writing any Phase 1 checkout
  code — there's no existing implementation to unwind yet, so this is a clean starting constraint,
  not a rework.
- **News Feed tab.** Net-new scope, confirmed 2026-08-13 against the updated business model §8 — a
  buyer-facing tab, separate from the Events (Who's That Pokémon) tab, surfacing admin-curated posts
  plus organizer-submitted convention/meetup listings under a moderation workflow, with a
  "sponsored placement" revenue line in the same doc's §5. Absent from every existing phase spec,
  the phase ladder above, and the codebase (`grep`-confirmed zero hits). Needs a real spec doc
  before it can be scheduled as a phase.
- **Full Condition Scan monetization.** The two-tier scan model (Flat required / Full optional) is
  fully built (Phase 7-rev's `scan_tier` work) and matches the updated business model's description
  exactly — but that doc frames choosing the Full upgrade as a **paid** action ("verified/full
  condition scan fee... per listing, opt-in," §5). No payment gate exists on that choice today;
  flagging so it isn't lost once Xendit checkout exists to build it against.
- **Stale business-model doc pointer.** `AGENTS.md` and this document both cite
  `CONTEXT/POKECARD_PH_BUSINESS_MODEL.md` as the canonical business model spec. As of 2026-08-13 the
  real current version is `buisness context\PokeCard_PH_Business_Model_Updated.docx` (subscription-
  only payment architecture, News Feed tab, two-track vendor trials, weekly event cadence — none of
  which are in the `CONTEXT/` copy). Update the source-of-truth reference, or copy the updated
  document into `CONTEXT/`, so a future session doesn't work from the outdated one.

### Open product decisions

Carried from this document's original footer — genuinely still open, not resolved by this pass:
**Buyer Pro subscription** timing (Phase 5 explicitly excludes it, launch timing undecided);
**minimum shop rating threshold** and its consequence (warning / suspension / reduced visibility);
**DTI/SEC registration** — required at onboarding, or only past a GMV threshold; **audio licensing**
for `pokemon-evolve.mp3` and `whos-that-pokemon.mp3`, both recognisably first-party Pokémon audio and
a real trademark question on a platform charging vendors ₱275–17,500/month.

### Removed as stale

Two items on the handoff note's "Still open" list no longer apply and are dropped here rather than
carried forward again: `NEXT_PUBLIC_SITE_URL` was flagged as still pointing at port 3000 — it's
already `http://localhost:3210` in `.env.local`, fixed back in the Phase 1b gate. `src/app/page.tsx`
was flagged as the throwaway Phase 0 gate page — it was replaced by the real Home/Browse in Phase 1
and has been for several gates.

---

## Cross-phase reference

### Cron jobs by phase
| Phase | Job | Frequency |
|---|---|---|
| 4 | `/api/auctions/close` | every minute |
| 5 | `gmv-aggregator` | nightly |
| 5 | `monthly-invoicer` | 1st of month |
| 5 | `trial-reminder` | daily |
| 6 | `/api/events/resolve` | every 5 minutes |

### Webhooks
`/api/webhooks/xendit` — checkout confirmation (Phase 1) and invoice payment (Phase 5). **Planned,
not built** — confirmed absent 2026-08-12, see the Xendit line in the Outstanding work register.

### Known documentation conflicts, already resolved
- **Phase numbering.** `MASTER_PROMPT.md` §7 lists Phase 4 as Messaging and omits Auctions
  entirely. **Superseded** — the standalone phase docs are canonical. Messaging is specced into
  Phase 1's shared systems; each phase defines its own notification triggers.
- **Reference image path.** `MASTER_PROMPT.md` says `/design-reference/*`. Wrong — use
  `REFERENCE IMAGES/`.
- **Scan & 3D was Phase 6.** `PHASE6_EVENTS.md` claimed the number; scan moved to 7.
- **Business model duplication.** `POKECARD_PH_BUSINESS_MODEL.md` is canonical;
  `PokeCard_PH_Business_Model.docx` is the exported artifact.

### Decided
- ~~Flat 60-day trial vs. GMV-cap hybrid~~ — **resolved by implementation.** Phase 5 ships both
  (`trial_ends_at` *and* `trial_gmv_cap` with early termination), so the hybrid is the de-facto
  answer unless deliberately overridden.

Still-open product decisions moved to **Outstanding work register** above, so they live in one place
rather than two.
