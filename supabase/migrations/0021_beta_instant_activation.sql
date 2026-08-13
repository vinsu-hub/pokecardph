-- ============================================================================
-- Beta Vendor Program — instant activation
-- Source: POKECARD_PH_BETA_REGISTRATION_INSTANT.md, revised against
-- REFERENCE IMAGES/VENDOR REGISTRATION BETA.png + VENDOR ADD NEW LISTING
-- VIEW.png — the reference shows a 4-step wizard (Your Information / Shop
-- Details / Review & Submit / Start Listing) where step 4 is a redirect into
-- the already-built Add Listing wizard, not a bulk starter-photo uploader
-- that auto-converts into draft listings. An earlier revision of this
-- migration built that bulk-upload mechanism (beta_starter_items,
-- beta-starter-photos bucket, a starter-items param on the RPC below) — none
-- of it was ever applied to the database, so it's removed here rather than
-- reverted with a follow-up migration.
-- ============================================================================

-- ---- shops: richer signup fields -------------------------------------------
alter table shops add column if not exists vendor_type text
  check (vendor_type in ('hobbyist','casual_reseller','established_shop'));
alter table shops add column if not exists social_handle text;
alter table shops add column if not exists how_heard text;
-- Shop-signup-time contact data, same scope as location/social_handle/
-- how_heard — not a general profile field, so it lives here rather than on
-- `profiles`.
alter table shops add column if not exists phone text;

-- ---- register_beta_vendor_instant() ----------------------------------------
-- Creates the shop and flips profiles.role in one transaction, matching the
-- codebase's established pattern for multi-step vendor-state changes that
-- must commit together (place_bid, join_action_event, submit_guess). The
-- vendor's first real listing is created afterward through the standard Add
-- Listing wizard (src/app/vendor/listings/add) — this RPC's job ends at
-- "shop exists, role is vendor."
--
-- The beta-window check stays in TypeScript, ahead of this call (existing
-- beta_program_config read/compare logic in the Server Action) — small enough
-- that duplicating it in plpgsql isn't worth a second place to keep in sync.
create or replace function public.register_beta_vendor_instant(
  p_name text,
  p_location text,
  p_vendor_type text,
  p_social_handle text,
  p_how_heard text,
  p_phone text,
  p_trial_days int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in required');
  end if;
  if exists (select 1 from shops where vendor_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'You already have a shop');
  end if;

  insert into shops (
    vendor_id, name, location, tier, trial_ends_at, onboarded_at,
    is_beta_vendor, beta_registered_at, vendor_type, social_handle, how_heard, phone
  ) values (
    auth.uid(), p_name, p_location, 'free',
    now() + (p_trial_days || ' days')::interval, now(),
    true, now(), p_vendor_type, p_social_handle, p_how_heard, p_phone
  )
  returning id into v_shop_id;

  -- profiles.role becomes 'vendor' only here or in createShopForVendor() —
  -- never at signup. Two writers of this flip now exist (TS for standard
  -- onboarding, this RPC for beta); keep both in sync if the trigger point
  -- ever changes.
  update profiles set role = 'vendor' where id = auth.uid();

  return jsonb_build_object('ok', true, 'shop_id', v_shop_id);
end;
$$;

revoke all on function public.register_beta_vendor_instant(text,text,text,text,text,text,int) from public;
grant execute on function public.register_beta_vendor_instant(text,text,text,text,text,text,int) to authenticated;
