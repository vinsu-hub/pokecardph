-- Storage foundation.
--
-- Nothing in Phases 0-7 ever touched Supabase Storage: every image in the app
-- is a generated gradient placeholder, and the Add Listing wizard's photo step
-- says so in the UI. Three remaining phases need real files (listing photos,
-- scan captures and normal maps, message attachments), so the buckets and
-- their policies are created once here rather than per-phase.
--
-- Ownership is enforced by path convention. The first folder segment of an
-- object name identifies the owner, and policies check it against the
-- SECURITY DEFINER helpers — the same shape as the table policies in 0001.

-- ---- Buckets --------------------------------------------------------------
-- `public` controls anonymous READ only. Writes are governed by the policies
-- below in every case, public or not.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Buyer-visible listing photography.
  ('listing-photos', 'listing-photos', true, 10485760,
   array['image/jpeg','image/png','image/webp']),
  -- Shop logos and banners.
  ('shop-assets', 'shop-assets', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/svg+xml']),
  -- Raw photometric captures. PRIVATE — these are working files, never served
  -- to buyers; only the processed maps below are public.
  ('scan-raw', 'scan-raw', false, 15728640,
   array['image/jpeg','image/png']),
  -- Processed normal/albedo maps the 3D viewer fetches. Public read: they are
  -- textures for a public listing page.
  ('scan-maps', 'scan-maps', true, 10485760,
   array['image/png','image/webp']),
  -- PRIVATE — a photo attached to a message is between two people.
  ('message-attachments', 'message-attachments', false, 10485760,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---- Helper: listings owned by the current user ---------------------------
-- The scan buckets key their paths by listing_id (per the Phase 7 spec's
-- `scan-raw/{listing_id}/{step}.jpg` convention), so ownership has to resolve
-- listing -> shop -> vendor. SECURITY DEFINER for the same reason
-- my_shop_ids() is: storage policies have no select rights on `listings`.
create or replace function public.my_listing_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.id from listings l where l.shop_id in (select my_shop_ids());
$$;

-- ---- listing-photos: {shop_id}/{listing_id}/{file} ------------------------
drop policy if exists listing_photos_read on storage.objects;
create policy listing_photos_read on storage.objects
  for select using (bucket_id = 'listing-photos');

drop policy if exists listing_photos_write on storage.objects;
create policy listing_photos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and ((storage.foldername(name))[1])::uuid in (select my_shop_ids())
  );

drop policy if exists listing_photos_modify on storage.objects;
create policy listing_photos_modify on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-photos'
    and ((storage.foldername(name))[1])::uuid in (select my_shop_ids())
  );

drop policy if exists listing_photos_delete on storage.objects;
create policy listing_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and ((storage.foldername(name))[1])::uuid in (select my_shop_ids())
  );

-- ---- shop-assets: {shop_id}/{file} ---------------------------------------
drop policy if exists shop_assets_read on storage.objects;
create policy shop_assets_read on storage.objects
  for select using (bucket_id = 'shop-assets');

drop policy if exists shop_assets_write on storage.objects;
create policy shop_assets_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-assets'
    and ((storage.foldername(name))[1])::uuid in (select my_shop_ids())
  );

drop policy if exists shop_assets_modify on storage.objects;
create policy shop_assets_modify on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shop-assets'
    and ((storage.foldername(name))[1])::uuid in (select my_shop_ids())
  );

drop policy if exists shop_assets_delete on storage.objects;
create policy shop_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-assets'
    and ((storage.foldername(name))[1])::uuid in (select my_shop_ids())
  );

-- ---- scan-raw: {listing_id}/{step}.jpg -----------------------------------
-- No public read policy at all. The owning vendor can read their own captures
-- back (to review a step); nobody else can, including other vendors. The
-- processing job uses the service role, which bypasses RLS.
drop policy if exists scan_raw_owner_read on storage.objects;
create policy scan_raw_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scan-raw'
    and ((storage.foldername(name))[1])::uuid in (select my_listing_ids())
  );

drop policy if exists scan_raw_write on storage.objects;
create policy scan_raw_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'scan-raw'
    and ((storage.foldername(name))[1])::uuid in (select my_listing_ids())
  );

drop policy if exists scan_raw_modify on storage.objects;
create policy scan_raw_modify on storage.objects
  for update to authenticated
  using (
    bucket_id = 'scan-raw'
    and ((storage.foldername(name))[1])::uuid in (select my_listing_ids())
  );

drop policy if exists scan_raw_delete on storage.objects;
create policy scan_raw_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'scan-raw'
    and ((storage.foldername(name))[1])::uuid in (select my_listing_ids())
  );

-- ---- scan-maps: {listing_id}/{normal|albedo}.png -------------------------
-- Public read (the viewer fetches these on a public listing page). Written
-- ONLY by the processing job via the service role — no client-side insert
-- policy exists, deliberately: a vendor uploading a hand-authored "normal map"
-- would be fabricating condition evidence.
drop policy if exists scan_maps_read on storage.objects;
create policy scan_maps_read on storage.objects
  for select using (bucket_id = 'scan-maps');

-- ---- message-attachments: {conversation_id}/{file} -----------------------
-- Participant-only, both directions. The conversations table gains its Phase 8
-- shape in 0012; this policy is written against the columns that already exist
-- in the Phase 1 shell (buyer_id, shop_id), so it holds either way.
drop policy if exists message_attachments_read on storage.objects;
create policy message_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from conversations c
      where c.id = ((storage.foldername(name))[1])::uuid
        and (c.buyer_id = auth.uid() or c.shop_id in (select my_shop_ids()))
    )
  );

drop policy if exists message_attachments_write on storage.objects;
create policy message_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from conversations c
      where c.id = ((storage.foldername(name))[1])::uuid
        and (c.buyer_id = auth.uid() or c.shop_id in (select my_shop_ids()))
    )
  );
