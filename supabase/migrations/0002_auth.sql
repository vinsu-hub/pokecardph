-- ============================================================================
-- Phase 1b — Auth
-- Source: CONTEXT/POKECARD_PH_AUTH_GOOGLE_SIGNIN.md §3
--
-- No RLS policy changes anywhere. Policies already key off auth.uid(); only
-- the mechanism populating it changes, from nothing to a real session. That is
-- exactly why auth can land after the schema without a rewrite.
-- ============================================================================

-- Auto-create the profiles row the moment an auth.users row appears. Covers
-- magic-link today and Google later with identical behaviour, so `profiles`
-- never needs a manual insert after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name, avatar_url)
  values (
    new.id,
    'buyer',                       -- everyone starts a buyer; vendor is an
                                   -- upgrade through onboarding, never a
                                   -- choice made at signup
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Collector'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;     -- seeded accounts already have profiles
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
