# PokeCard PH — Master Session Plan

The single document to execute from. Every phase in order, with the gate that must clear before
the next one starts. Each phase points at its source spec in `CONTEXT/` for full detail — this
file is the sequence and the rules, not a replacement for those documents.

**Vault mirror:** `D:\OBSIDIAN\Varix\PokeCard PH\` (8 notes, hub is `PokeCard PH - Overview`).

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

**10 unique screens, not 11.** `BUYER ACTIVE TRADES TAB.png` and `TRADE VIEW.png` are
byte-identical, so the Active Trades list has no reference.

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

**Status:** 📋 Specced only — zero code written.

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

- **Phase 4** — `/vendor/auctions/create` is a standalone form; fold it into the Add Listing wizard
  as its Sale Type branch. Deferred originally only because the wizard didn't exist yet when Auctions
  was built — the shape was always intended to converge.
- **Phase 6** — gift-claiming from a won event doesn't route anywhere. Spec says reuse the Phase 1
  order flow at ₱0; not yet wired.
- **Phase 7 → 7-rev** — the full rework: `scan_sessions` schema, real `getUserMedia` capture to
  Storage, `/api/scan/[sessionId]/process` running photometric stereo out of the request cycle, and
  the Three.js normal-mapped plane on Card Detail. Full detail in the Phase 7-rev section above and
  [[PokeCard PH - Scan and 3D]] — the capture wizard shell is largely correct and can be kept.
- **Phase 8** — build from scratch: ALTER `conversations`/`messages` (same trap Phase 3 hit with
  `trades`), a notifications table, Realtime wiring, and the four dead "Message X" buttons already
  sitting in the markup.
- **Phase 9** — build from scratch: header autocomplete (`/search` exists, the header bar doesn't),
  `/terms` `/privacy` `/vendor-agreement` (all currently 404), a 404 page, and `loading.tsx` on every
  route — none exist today, so every navigation flashes blank.
- **Seed** — consolidate the 7 fragmented per-phase seeds plus accumulated test-harness debris into
  one script; reconcile the cast (current seed: `buyer@pokecard.test` + 3 shops; plan: 2 named buyers
  + 2 named vendors with specific stats).
- **Unspecced mockup features** — `ITEM VIEW WITH 3D MODEL VIEW.png` shows AR View, a Market Price
  comparison widget, Pop. Higher, and Add to Watchlist. None exist in any spec or schema. Still
  undecided: spec each one or drop it from the reference image's authority. The Market Price widget
  matters most — it implies a price-history data source nobody has scoped.
- **Accessibility** — keyboard traversal and focus-trap on `SlideOver` have never been walked.
  `:focus-visible` styling is implemented globally; tab order isn't verified.

### Cross-cutting — not owned by any single phase

- **Deployment.** Every phase's stated gate is "deploys to the same Vercel project before the next
  phase begins." **None of the 8 built phases have ever been deployed** — everything runs on
  `localhost:3210`. This is the largest gap between the document's stated process and what actually
  happened. The Vercel CLI is authed (`vinsu-hub`, org `vince-tamis`); env vars need mirroring into
  the project when it's created.
- **Cron registration.** The auction closer, 3 billing crons, and event resolver all work correctly
  when called directly; none are registered anywhere, because there's no `vercel.json` yet — that
  file is created at first deploy, along with setting `CRON_SECRET`.
- **GitHub remote.** `git remote -v` returns nothing — no remote is configured at all, on top of
  `gh auth`'s keyring token being invalid (`gh auth login -h github.com` fixes the latter). 21+
  commits are local-only on `main`.
- **Google OAuth.** Deferred by explicit request. Needs the Google Cloud Console step (consent
  screen + redirect URIs registered separately for localhost, preview, and production — registering
  only production is the classic failure) before the already-built, already-disabled button can be
  turned on. No schema or policy change needed on this end; RLS already keys off `auth.uid()`
  regardless of how it's populated.
- **Xendit.** Not provisioned (`XENDIT_SECRET_KEY` empty). Checkout and billing both stop at
  `pending`/no payable link, and the UI says so rather than implying a working payment path.

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
`/api/webhooks/xendit` — checkout confirmation (Phase 1) and invoice payment (Phase 5).

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
