# Phase 12 — Verification Pass + Card Detail Rebuild

Concluded 2026-08-12. Executed the recommended order from `CONTEXT/VERIFIED_GAP_REPORT.md`
(Phase 12a's verification pass — read that file first for what was found and corrected in the
Outstanding Work Register). This document is the "what actually shipped" summary; it does not
re-paste the plan.

## Shipped

**Two genuinely-dead buttons, fixed:**
- `src/components/vendor/ScanStudio.tsx` — "◎ Preview" now opens a real overlay showing thumbnails
  of the captures taken so far (was previously a button with no `onClick` at all).
- `src/components/shared/Footer.tsx` — the newsletter "Subscribe" form is now a proper disabled
  stub (input + button both `disabled`, no backend exists to wire it into) instead of silently
  reloading the page on submit.

**SlideOver focus trap, built:** `src/components/shared/SlideOver.tsx` previously only handled
Escape-to-close and body-scroll-lock. Now traps focus while open (moves focus in on open, cycles
Tab/Shift+Tab between the first and last focusable descendants, returns focus to the trigger on
close) — a real accessibility gap the Verified Gap Report confirmed by direct code read, not just
flagged as "never verified."

**Two remaining card images wired in:** Leafeon VSTAR and Gengar VMAX now have real photography
processed (`.dev/prep-cards.mjs`) and `cards.image_url` set (`.dev/wire-card-art.mjs`), matching
Mew ex and Umbreon VMAX (which, per the Verified Gap Report, were already live — the "shows
placeholders" claim in the prior TODO was only true for half the set). All four cards now have
front/back webp art and a normal map for the Phase 7-rev 3D viewer (`src/lib/photos.ts`'s
`TEST_NORMAL_MAPS`).

**Card Detail (2D) rebuilt to `REFERENCE IMAGES/ITEM VIEW WITH 2D IMAGE ONLY.png`:**
`src/app/card/[id]/page.tsx` gained 9 new components under `src/components/buyer/`:
`CardImageGallery` (hero + zoom/arrow nav + 4-thumb strip), `CardCondition` (grade badge + 4
animated subgrade bars + Seller Notes), `CardDetailsGrid` (3-column icon/label/value grid,
replacing the old flat spec `<dl>`), `MarketPrice` + `PriceHistoryChart` (4 stat blocks + a
recharts line chart), `TradeThisCard` (reuses the existing `/trade?want=&shop=` pre-fill link),
`HorizontalScroller` + `SimilarListingsShelf` ("You Might Also Like", built as a new generic
chevron-paging component rather than reusing the storefront's shelf — that one turned out to have
no chevrons at all, correcting the original spec's assumption). The right column gained a PSA
Certified chip, a 3-icon trust row, the shop's logo, and a new "Need Help" card.

Two additive schema pieces: `listings.condition_centering/corners/edges/surface` (nullable
smallint 0-10) and a new `price_history` table (`card_id`, `grade`, `price`, `recorded_at`,
public-read RLS). Every new component degrades gracefully (hides its section) when this data is
null/absent — verified directly, not assumed, since the migration was still pending at time of
writing (see Outstanding below).

## Verified, honestly

- `pnpm lint` — clean, zero output.
- `npx tsc --noEmit` — clean, zero errors.
- `npx next build` (production build) — compiled successfully, all 45 routes built including
  `/card/[id]` as a dynamic route, zero type errors.
- Local dev server: `/card/[id]` for a listing **without** real photos (Charizard ex) renders 200
  with all unconditional new sections present (Card Details, Trade This Card, You Might Also Like,
  Need Help, trust row) and the data-dependent ones (Card Condition, Market Price) correctly
  hidden given no seed data yet. A listing **with** real photos (Mew ex) renders its gallery
  correctly — Front/Back thumbnails present, Detail/Certification correctly absent (no upload for
  those slots).
- `/` and `/browse` — spot-checked 200 after the change, no regression.
- **Not run this session**: Playwright-based regression (`journey.mjs`, `controls.mjs`, the new
  `.dev/verify-carousel-motion.mjs`). This WSL environment can't launch Chromium — missing
  `libnspr4`/`libnss3`, and there's no non-interactive `sudo` to install them. Flagged here rather
  than silently skipped; re-run these before the next production deploy once on an environment
  where the browser can launch (or once someone runs `sudo npx playwright install-deps chromium`
  here and reports back).

## Post-build validation pass (independent audit, same session)

Requested after the fidelity audit above: verify connectivity, and independently audit the 9
files touched by the Card Detail rebuild for button function, layout/responsive soundness, and
design-token discipline. Run by a fresh Explore agent (no memory of writing the code), findings
cross-checked before accepting.

- **Connection — healthy.** Service-role query to Supabase: ~1s round trip. Production responds
  200 in ~1.3s.
- **Button function — clean.** Every clickable control in the 9 files has a real handler; zero
  dead controls.
- **One real bug found and fixed**: `src/app/card/[id]/page.tsx` destructured `card`/`shop` from
  the listing join and used `card.name` in the breadcrumb with no null check, even though
  `card_id` is nullable for sealed product/merch/signed items (`src/lib/supabase/types.ts:46`).
  **Confirmed as a live, reproducible crash** — an active `sealed_box` listing exists in the seed
  data; hitting its `/card/[id]` page 500'd with `TypeError: Cannot read properties of null
  (reading 'name')` before the fix, confirmed 404 (correctly) after it. Pre-existing gap (already
  flagged in `CONTEXT/VERIFIED_GAP_REPORT.md`'s Part 1), but this session's rebuild propagated the
  same unguarded assumption into 3 new components, so fixed now rather than left to widen further.
  Fix: `if (!card || !shop) notFound();` right after the destructure, matching the guard pattern
  `ListingCardTile.tsx` already uses. `pnpm lint`/`tsc --noEmit` clean after.
- **Two pre-existing sub-44px touch targets, not introduced this session, not fixed**: the
  breadcrumb `Home`/shop-name links and the "3D View" toggle (`page.tsx:70,72,84-89`) — inherited
  unchanged from the pre-rebuild page.
- **One pre-existing cosmetic bug, not fixed**: `page.tsx:167` — `Shop.location` nullable, the
  `·` separator always renders even when location is null, leaving a dangling `"★ 4.5 (12) · "`.
- **One layout construct flagged for a manual visual check once a browser is available**:
  `CardImageGallery.tsx`'s hero frame combines `aspect-[5/7]` + `w-fit` + `max-h-[560px]` — a
  width-derived-from-height sizing direction that's new to this codebase (every other usage is
  width-driven). Reasoned through as sound, but worth an actual look at 375/768/1024px once
  Playwright works here.
- **`prefers-reduced-motion` on `CardCondition`'s bars** — audit flagged the fill transition isn't
  conditionally stripped under reduced motion; confirmed this is a non-issue, not fixed —
  `globals.css`'s global `transition-duration: 0.01ms !important` rule under
  `prefers-reduced-motion: reduce` already neutralizes it for every element, the same safety net
  every other animation in the codebase relies on.
- **Design tokens — clean**, no bypassed tokens; `PriceHistoryChart.tsx`'s few raw numbers in
  recharts' inline SVG props match the existing accepted pattern in `SalesChart.tsx`.

## Outstanding — carried forward, not lost

**⚠️ REMINDER FOR NEXT SESSION (you said you'd do this when you get home):**

1. **Migration `supabase/migrations/0019_card_detail_condition_and_price_history.sql` is written
   but not yet applied.** This WSL session has no working path to the direct Postgres host at all
   (`db.<ref>.supabase.co` has no IPv4 address, and this environment has no IPv6 route — confirmed
   via DNS, independent of any password). **Needs to be run in Supabase Studio's SQL editor** (or
   from a machine with a working route to the DB host, via `.dev/migrate.mjs`). **Deployed to
   production without this** — deliberately, confirmed safe: every new Card Detail component checks
   for the new columns/table and hides its section gracefully when they're absent, so production is
   live today with Card Condition and Market Price simply not showing yet, not broken. Once applied,
   run:
   - `node .dev/seed-price-history.mjs` — seeds `price_history` for every card with an active
     fixed-price listing (Ungraded bucket always, plus the listing's own grade if graded).
   - `node .dev/seed-condition-grades.mjs` — hand-sets `condition_*` on the four cards with real
     photos (Mew ex, Umbreon VMAX, Leafeon VSTAR, Gengar VMAX) so `CardCondition` has real data to
     show immediately rather than every listing rendering the hidden/null state.
   - Then re-verify `MarketPrice` and `CardCondition` actually render their data (not just that
     they degrade gracefully without it, which is already confirmed).
2. **Playwright can't run in this WSL session** (see above) — the full regression suite and the
   new carousel-motion script are still unverified by an actual browser this pass, same gap the
   Verified Gap Report already carried forward from Part 1.
3. **Not deployed.** Corrected — an earlier note in this doc said "deployed 2026-08-12," but that
   was premature: the user was given the deploy commands but never ran them (away from their PC
   for the rest of the session). `pokecard-ph.vercel.app` still serves the pre-Phase-12 build.
   Deploying without the migration is still confirmed safe, whenever it happens (see item 1's
   graceful-degradation note) — run `vercel deploy --prod --yes --scope vince-tamis`
   (`CONTEXT/POKECARD_PH_DEPLOYMENT_RUNBOOK.md`) yourself when ready. **After both this and items
   1–2 land, re-verify Card Condition and Market Price actually render on
   `https://pokecard-ph.vercel.app` itself**, not just localhost.
4. **Everything from the Verified Gap Report's own recommended order that wasn't in this pass's
   scope** — the site audit checklist, the Vendor Storefront 1:1 rebuild, the 3D shelf tilt
   interaction, and the responsive/animation smoothness pass all remain queued in
   `SESSION_PLAN.md`'s Outstanding Work Register, resequenced per that report's findings.

## Corrections folded in from the Verified Gap Report

Already applied to `SESSION_PLAN.md`'s Outstanding Work Register and `AGENTS.md`'s reference-image
count as part of this hand-off — see those files directly rather than duplicating the corrections
list here.
