<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PokeCard PH — Project Instructions

A two-sided Pokémon card marketplace for the Philippines. Next.js 16 App Router + TypeScript +
Tailwind v4 + shadcn/ui, Supabase backend, Xendit payments, Vercel deploy.

## Start here

**`SESSION_PLAN.md`** (project root) is the execution runbook — every phase in order, with the gate
that must clear before the next starts. Work from it. It sequences the specs rather than replacing
them.

## Scope

Build target is a **responsive website**, deployed and working end-to-end on desktop and phone
browsers. A **native app is deferred to a separate project** — don't scaffold it, don't design for
it, don't add app patterns to the web build.

"Mobile is out of scope" in `MASTER_PROMPT.md` means *no native app*. Responsive mobile web is in
scope and is likely the primary surface for this market.

**Only one reference image has a mobile view.** Mobile is built from the *Responsive & mobile web*
rules in the design system, not from comps. The five responsive shell components in
`SESSION_PLAN.md` §0.3b exist for this — use them, don't reinvent per page.

## Source of truth

These win over any skill, any default, and any reference image:

1. `SESSION_PLAN.md` — the ordered runbook, ground rules, and resolved conflicts.
2. `CONTEXT/POKECARD_PH_DESIGN_SYSTEM.md` — **locks color, type, spacing, components, motion.**
   Where a reference image and this file conflict, this file wins. Re-read it at the start of
   every phase.
3. `CONTEXT/POKECARD_PH_MASTER_PROMPT.md` — scope, stack, repo structure, base schema.
   **Two things in it are stale:** its §7 phase ordering is superseded, and its
   `/design-reference/*` image path is wrong.
4. `CONTEXT/POKECARD_PH_BUSINESS_MODEL.md` and the phase docs — `AUTH_GOOGLE_SIGNIN`,
   `PHASE2_VENDOR`, `PHASE3_TRADE_ENGINE`, `PHASE4_AUCTIONS`, `PHASE5_MONETIZATION`,
   `PHASE6_EVENTS`, `SHOP_STOREFRONT_ANIMATION`.
5. `REFERENCE IMAGES/` — layout intent only. View the relevant screens before building them.
   The images live **flat in this folder**, not in `/design-reference/buyer|vendor|shared`.
   **10 unique screens, not 11** (two files are identical), and **three filenames don't match their
   contents** — `SHOP PAGE` is Home/Browse, `VENDOR STORE VIEW` is the Shop Storefront, and
   `ITEM VIEW WITH 3D MODEL VIEW` is a Phase 7 3D page, *not* Card Detail. `VENDOR ADD LISTING` is
   the non-canonical variant; use `VENDOR ADD NEW LISTING VIEW`. Full audit in `SESSION_PLAN.md`.
6. `audio files/` — 8 cues mapped to role tokens in `SESSION_PLAN.md` §0.4. Processed output lives
   in `public/sfx/`; reference them by role token via `src/lib/audio.ts`, never by filename.

## Phase ladder

1 Buyer core → **1b Auth** → 2 Vendor core → 3 Trades → 4 Auctions → 5 Monetization →
6 Events → 7 Scan & 3D.

Do not build outside the current phase, even when a screenshot's nav hints at later features.
Stub the link, leave the page unbuilt, move on.

## Do not build these

Four features appear in the mockups but in **no spec and no schema**: **AR View**, the **Market
Price** comparison widget (Ungraded/PSA 9/PSA 10), **Pop. Higher**, and **Add to Watchlist**.
Don't silently build them and don't silently drop them — raise them.

## Skill stack

Skills are installed globally at `C:\Users\vinsu\.claude\skills\` and invoked with the Skill tool.

### Design & UI

The design system is already locked. **Do not run `ui-ux-pro-max --design-system`** — it would
generate a competing token set. Use it in query mode instead, for decisions the design system
does not already answer (interaction patterns, animation timing, chart selection, a11y checks):

```bash
python "C:/Users/vinsu/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain ux
python "C:/Users/vinsu/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --stack nextjs
```

Its priority 1–2 rules are hard requirements here — 4.5:1 contrast, 44×44px touch targets,
visible focus rings (use `--color-primary` #4F46E5), full keyboard navigation.

Supporting skills, all subordinate to `CONTEXT/POKECARD_PH_DESIGN_SYSTEM.md`:

- `ui-styling` — shadcn/ui + Tailwind implementation. Map every class back to a design-system token.
- `design-system` — only for extending tokens the design system leaves undefined. Never redefine
  an existing one.
- `taste-skill` / `taste-redesign` — anti-slop pre-flight before a surface ships. Run its audit,
  but reject any suggestion that changes locked brand colors or type.
- `animate` — the motion **implementation** skill (ships `RECIPES.md`). This is the one that builds
  the staggered storefront entrance in `SHOP_STOREFRONT_ANIMATION.md`. Its recipes must be mapped
  onto the design system's own `--ease-*` / `--duration-*` tokens, not its defaults.
- `emil-design-eng`, `apple-design`, `react-view-transitions` — motion craft and polish.
  `review-animations` / `improve-animations` audit what's built; `animate` builds it.
- `prototype` — for surfaces with no reference image (auctions, billing). Throwaway only; the real
  build still goes through the design system.
- `ask-sonner` — Sonner toast API, for order/bid/trade status feedback.
- `dataviz` — the Sales Overview chart and vendor analytics. Use the status colors already defined.
- `brand`, `banner-design`, `slides` — marketing and deck assets only, not product UI.

### Ideation

`adhd` for open-ended calls — trade-engine mechanics, auction rules, naming, API surface.
Skip it for syntax, lookups, and bugs with a known root cause.

### Engineering discipline

- `codebase-research` + `pattern-matching` before adding to an existing area.
- `specification-first` / `task-planning` before any multi-file feature or phase.
- `nextjs-developer`, `react-expert`, `typescript-pro`, `postgres-pro`, `api-designer` per surface.
- `security-protocol` / `secure-code-guardian` for Supabase RLS, auth, Xendit webhooks, and
  anything touching money or user-uploaded card photos.
- `fault-diagnosis` for bugs — root cause before fix.
- `completion-gate` + `quality-gate` before calling a phase done. Evidence precedes claims.

## Known gaps

`design` and `banner-design` reference three skills that are not installed — `ai-artist`,
`ai-multimodal`, `chrome-devtools`. Their AI image-generation and screenshot paths will fail;
the reference material and design intelligence work without them.
