-- ============================================================================
-- Manual card entry — vendors type card details directly instead of picking
-- from a pre-seeded catalog dropdown. `cards` stays the shared, deduplicated
-- catalog (see the "do not denormalise" comment in 0001_base.sql) —
-- find_or_create_card() is the only write path into it from vendor-facing
-- code, matching the SECURITY DEFINER pattern already used by
-- register_beta_vendor_instant() (0021). RLS on `cards` is unchanged: public
-- read, no direct insert policy for authenticated/anon.
-- ============================================================================

alter table cards add column if not exists illustrator text;
alter table cards add column if not exists finish text;
alter table cards add column if not exists edition text;

-- Case-insensitive/trimmed match on name+set+number+finish+edition+language —
-- a different edition/finish/language is a genuinely different printing
-- (different price history), so it legitimately creates a new row rather
-- than being deduped onto an existing one.
create or replace function public.find_or_create_card(
  p_name text, p_set_name text, p_card_number text, p_rarity text,
  p_illustrator text, p_finish text, p_edition text, p_language text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_number text := nullif(trim(p_card_number), '');
  v_rarity text := nullif(trim(p_rarity), '');
  v_illustrator text := nullif(trim(p_illustrator), '');
  v_finish text := nullif(trim(p_finish), '');
  v_edition text := coalesce(nullif(trim(p_edition), ''), 'Unlimited');
  v_language text := coalesce(nullif(trim(p_language), ''), 'English');
begin
  select id into v_id from cards
  where lower(name) = lower(trim(p_name))
    and lower(set_name) = lower(trim(p_set_name))
    and coalesce(lower(card_number), '') = coalesce(lower(v_number), '')
    and coalesce(lower(finish), '') = coalesce(lower(v_finish), '')
    and lower(coalesce(edition, 'Unlimited')) = lower(v_edition)
    and lower(coalesce(language, 'English')) = lower(v_language)
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into cards (name, set_name, card_number, rarity, illustrator, finish, edition, language)
  values (trim(p_name), trim(p_set_name), v_number, v_rarity, v_illustrator, v_finish, v_edition, v_language)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.find_or_create_card(text,text,text,text,text,text,text,text) from public;
grant execute on function public.find_or_create_card(text,text,text,text,text,text,text,text) to authenticated;
