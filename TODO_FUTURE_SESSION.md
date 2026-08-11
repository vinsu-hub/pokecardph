# TODO — Next Session (Phase 12)

Carried over from a planning session on 2026-08-12. Not started — this is the plan to pick up next
time, written before compacting/ending this session. Read this file first in a fresh conversation;
it stands alongside `SESSION_PLAN.md` (the project's main runbook) rather than replacing it — once
Phase 12 below is actually built, fold a summary into `SESSION_PLAN.md` per Part 7 and this file can
be deleted.

## Context

Everything from the prior 11-item pass (Phase 11, already deployed) is live. This request is a step
up in scope: a full professional-construct audit (missing parts, dead/faulty buttons, flow validation
with a checklist), a site-wide animation/responsiveness pass, and two items called out as critical:

1. **The vendor storefront is not 1:1 with `VENDOR STORE VIEW.png`.** Confirmed by direct comparison
   — the reference has an in-shop search bar, a sort dropdown, a grid/list toggle, checkbox-style
   multi-select facets, icon-labeled stat cards, chevron row-paging controls, and — the biggest gap —
   one "active" featured card per shelf row that lifts, tilts in 3D toward the viewer, glows, and
   shows a floating price callout. The current build (`src/app/shops/[shopId]/page.tsx`) has the
   shelf *structure* (`.shelf`/`.shelf-plane` in `globals.css`) but only a flat `translateZ` hover
   lift — none of the rest exists.
2. **The landing carousel "is just a 3x3 grid."** Reproduced cleanly in an automated browser:
   `LandingPreview.tsx` renders the real animated marquee when `prefers-reduced-motion: no-preference`,
   and a static wrapped 5-card row (which reads as a 3-then-2 grid) when `reduce` is set — confirmed
   identically on localhost and production. Asked the user to check their OS setting; their answer
   ("it was off, now I had it on, it works now") does not cleanly confirm the direction, so this is
   **not fully closed** — Part 1 below both hardens the fallback so it never looks broken *and*
   re-verifies the hydration timing to rule out a first-paint bug, rather than declaring it solved on
   an ambiguous report.

The user also pasted a full build spec for a "3D Shelf-Style Card Listing with Picking Interaction"
component — perspective-tilt-on-hover, glow ring, price callout, idle ambient showcase, touch
fallback. This is exactly the missing piece from gap #1 above, confirmed to apply to **both** the
storefront shelves and the Browse/Search card grid (per the user's explicit answer).

**Research note:** two Explore-agent audits (dead-link/disabled-button inventory; nav/flow map) were
launched mid-session and both failed on an API session-limit error, not a real failure — re-running
them is Part 2's first step. The manual investigation already done this session (reference-image diff,
carousel repro, direct file reads of the storefront page, AppShell nav, middleware, and
`SESSION_PLAN.md`'s existing Outstanding Work Register — which already documents Phase 8 Messaging as
entirely unbuilt, `/terms`/`/privacy`/`/vendor-agreement` as 404s, and no `loading.tsx` anywhere) is a
solid foundation for everything below.

---

## Part 1 — Landing carousel: harden the fallback, rule out a hydration bug

- Reproduce with a **hard reload** (not a mid-session OS toggle) under both `reduced-motion: reduce`
  and `no-preference`, using Playwright's `reducedMotion` context option, to check whether
  `usePrefersReducedMotion()` (`src/lib/use-is-client.ts`) ever gets stuck on its SSR snapshot
  (`() => false`) past hydration in a real browser — the `useSyncExternalStore` pattern is correct in
  principle, but the user's ambiguous "toggling fixed it" report is consistent with a stale value that
  only a genuine `change` event resolves.
- Regardless of root cause: redesign the `reduce`-motion fallback in `LandingPreview.tsx` so it never
  reads as broken — a deliberately styled static "Featured Cards" grid (reusing Part 4's new card
  treatment minus the animated tilt), not a bare wrapped flex row.
- New permanent regression script, `.dev/verify-carousel-motion.mjs`: asserts the animated marquee
  under `no-preference` and a properly laid-out static grid under `reduce`, on both localhost and
  production, from a cold page load each time.

## Part 2 — Full site audit → a checklist deliverable

- Re-run the two failed Explore-agent audits (disabled buttons/dead links/stub inventory; nav/flow
  map from AppShell through every route) once agent capacity is available.
- Cross-reference against `SESSION_PLAN.md`'s existing Outstanding Work Register rather than
  rediscovering it from scratch — it already correctly lists Phase 8 Messaging as unbuilt, legal pages
  as 404s, and the total absence of `loading.tsx`/`error.tsx`/`not-found.tsx`.
- Deliverable: a new **`CONTEXT/SITE_AUDIT_CHECKLIST.md`** — one row per route: renders clean,
  every button works-or-is-a-labeled-stub, every link resolves, ≥44px touch targets, ≥4.5:1 contrast,
  no horizontal overflow at 375px. This is the "professional construct" validation artifact, and gets
  re-run before every future deploy (not a one-off document).
- Any genuinely broken (not just unbuilt-and-labeled) button or link found gets fixed directly as part
  of this pass.

## Part 3 — Vendor Storefront: rebuild to match `VENDOR STORE VIEW.png` 1:1

Itemized gaps in `src/app/shops/[shopId]/page.tsx` vs. the reference, confirmed by direct comparison:

- **Missing:** in-shop search input, "Sort by" dropdown, grid/list view toggle.
- **Facets are wrong shape:** reference shows checkbox multi-select for Set and Rarity with a
  "Show more" expander; current `FacetList` is single-select via plain links. Rebuild as real
  multi-select (checkboxes → repeated query params, e.g. `?set=A&set=B`).
- **Stat cards:** reference pairs each of Sales/Feedback/Response/Rating with a small icon; current
  renders bare numbers.
- **Shelf row paging:** reference has left/right chevron controls per row; current relies on bare
  native horizontal scroll only.
- **Message Shop / Follow:** both hard-disabled today. Follow is low-risk to make real (`follower_count`
  already exists on `Shop`) — flagged in the audit checklist as a candidate, not silently enabled here
  to avoid scope creep into a feature with no spec; Message Shop stays a labeled stub (genuinely blocked
  on unbuilt Phase 8).
- This is also where Part 4's new card component gets wired in, replacing the current flat
  `.shelf-item` hover lift.

## Part 4 — Build the 3D Shelf "Picking" Interaction (from the pasted spec)

New shared component, built to the pasted brief:

- **`ShelfRow`** — perspective container (`perspective: 1400px`, `transform-style: preserve-3d`),
  extending (not replacing) the existing `.shelf`/`.shelf-plane` ledge CSS in `globals.css`.
- **`TiltCard`** — wraps `ListingCardTile`'s existing content (no duplication); owns hover/active
  transform state via a `requestAnimationFrame`-throttled `onMouseMove` mapping cursor position to
  `rotateX`/`rotateY` through a CSS custom property, plus lift + scale + z-index + glow ring + deepened
  shadow + a price callout pill that only animates in on active state. Idle ambient auto-feature (timer-
  driven, same visual treatment) for touch devices and static rows.
- **Gates:** `prefers-reduced-motion` disables tilt/idle entirely, falling back to opacity/scale only
  — the same non-negotiable rule Part 1 enforces, not a new exception to it.
  `@media (hover: hover) and (pointer: fine)` gates the cursor-tracked tilt specifically; touch gets
  tap-to-select with lift/glow only, per the brief.
- **Design-token alignment:** glow ring and callout use `--color-primary`/`--color-primary-subtle`
  (not the mock's raw purple), radii/shadows from existing `--radius-lg`/`--shadow-elevated` tokens.
  Documented as a new sanctioned continuous-motion exception in `globals.css`'s existing comment block,
  alongside `CardSurface` and the marquee.
- **Applied to:**
  - Storefront shelf rows (Part 3) — full treatment including the ledge.
  - Browse/Search `ListingCardTile` grids (`src/app/browse/page.tsx`, `src/app/search/page.tsx`) —
    `TiltCard`'s hover/tap tilt+glow+callout without the shelf ledge (no shelf metaphor on a flat
    grid); idle ambient auto-cycling is **off** here (dozens of tiles auto-animating would be
    distracting) — hover/tap-only on these two routes.

## Part 5 — Responsive + animation smoothness pass

- Sweep for any transition timing not using `--ease-*`/`--duration-*` tokens; replace with tokens.
- Confirm every animated property across the new components is `transform`/`opacity`/`box-shadow`
  only — no layout-thrashing properties — by construction in `TiltCard`.
- Re-check 375/390/768/1024/1440 breakpoints for: storefront shelves (chevrons + ledge at narrow
  widths), new grid tilt cards (touch fallback), landing carousel.

## Part 6 — Verification

- `CONTEXT/SITE_AUDIT_CHECKLIST.md` fully green.
- `.dev/verify-carousel-motion.mjs` passes cold-load under both motion settings, local + production.
- New `.dev/verify-shelf-tilt.mjs`: hover triggers tilt/glow/callout, only one active card per row,
  touch viewport gets tap-only with no rotation, `prefers-reduced-motion` disables tilt entirely.
- Full existing regression: `journey.mjs`, `controls.mjs`, `verify-events.mjs`, `a11y.mjs` — all
  green, 0 console errors — then deploy and re-verify every item against production.

## Part 7 — Compact + handoff

- Append a "Phase 12" section to `SESSION_PLAN.md` (matching the Phase 10/11 pattern) and refresh its
  Outstanding Work Register (Follow-button candidate, anything Part 2 found and didn't fix inline).
  `SESSION_PLAN.md` is this project's single consolidated handoff doc per `AGENTS.md` — no separate
  `HANDOFF.md` exists — so this **is** the session hand-off the user asked for.
- Once folded into `SESSION_PLAN.md`, delete this file — it's a carry-over stub, not a permanent doc.

---

## Out of scope

Real Messaging (Phase 8) stays unbuilt — Message Shop remains a labeled stub. Follow enablement is
flagged as a candidate in the audit, not silently shipped. Xendit, Google OAuth, and the native app
(never in scope per `AGENTS.md`) are untouched.

---

## Session-end state (for the next conversation to resume from)

- Last deploy: commit `9cdb734` (docs: record Phase 11), preceded by `fbd0d1f` (Phase 11 feature
  work) — both live on `https://pokecard-ph.vercel.app`. Nothing in this Phase 12 plan has been
  built yet; no code changes were made this session beyond Phase 11.
- Dev server on port 3210 was running locally during investigation; may need restarting
  (`npx next dev -p 3210`) next session.
- API/session usage limit was hit mid-investigation this session (reset ~6:10am Asia/Manila) — if
  Explore-agent calls fail again early next session, retry rather than assume they're broken.
