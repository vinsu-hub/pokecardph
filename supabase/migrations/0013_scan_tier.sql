-- ============================================================================
-- Phase 7-rev — Two-tier mandatory scanning
-- Source: pasted conversation resolving "make scanning mandatory" into two
-- honest tiers rather than one hard gate that would exclude desktop-only
-- vendors.
-- ============================================================================

-- Which pipeline a listing went through. Distinct from the `scan_status`
-- lifecycle (none/captured/processing/ready/failed) that PHASE7_SCAN_3D.md
-- specs for the real multi-angle capture — that column doesn't exist yet
-- because the async capture/processing pipeline it belongs to isn't built.
-- Tier 1 (flat) needs nothing more than this: it's synchronous, so a listing
-- goes straight from "no scan" to "flat, done" with no intermediate state to
-- track. Tier 2 (full) will add scan_status and the rest of the
-- scan_sessions machinery in its own migration when that pipeline lands.
alter table listings add column if not exists scan_tier text
  check (scan_tier in ('flat','full'));

comment on column listings.scan_tier is
  'flat: single image, no measured relief, warning badge shown. '
  'full: multi-angle photometric capture, verified badge, no warning. '
  'null: not yet scanned — status cannot become active without one.';
