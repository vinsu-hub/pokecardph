-- ============================================================================
-- Action Events — event-flavored bidding
-- Reference: REFERENCE IMAGES/ACTION OR BIDDING LAYOUT.png,
--            REFERENCE IMAGES/WHO'S THAT POKEMON.png (the Events hub listing them)
--
-- Additive columns on the existing `auctions` table, all nullable, so
-- ordinary auctions are entirely unaffected. Only 'bidding_war' is a real,
-- buildable category — the mockup also shows Tournament and League event
-- cards, but neither has any mechanic specified anywhere (no bracket system,
-- no PvP engine), so those stay UI-only teasers, never written here.
--
-- Bidder identity stays masked via the existing public_bid_history view,
-- unchanged by this migration — the mockup shows real usernames in its live
-- bidding feed, but that would be a second, weaker fairness posture for what
-- is mechanically the same bid table as regular Auctions. One rule, not two.
-- ============================================================================

alter table auctions add column if not exists is_action_event boolean not null default false;
alter table auctions add column if not exists event_category text;
alter table auctions add column if not exists max_participants int;
alter table auctions add column if not exists event_title text;
alter table auctions add column if not exists event_subtitle text;
alter table auctions add column if not exists prize_description text;

do $$ begin
  alter table auctions add constraint auctions_event_category_check
    check (event_category is null or event_category in ('bidding_war'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table auctions add constraint auctions_event_category_requires_flag
    check (event_category is null or is_action_event);
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Participants reuse auction_watchers rather than a new table. "Joining" an
-- event and "watching" a regular auction are the same underlying fact — a
-- user has a standing interest in this auction — so a second table would
-- just be tracking the identical thing under a different name.
-- ============================================================================

create or replace function public.join_action_event(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a auctions%rowtype;
  v_count int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in to join');
  end if;

  select * into a from auctions where id = p_auction_id for update;
  if not found or not a.is_action_event then
    return jsonb_build_object('ok', false, 'error', 'Not an action event');
  end if;

  if exists (
    select 1 from auction_watchers
    where auction_id = p_auction_id and user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', true, 'already_joined', true);
  end if;

  if a.max_participants is not null then
    select count(*) into v_count from auction_watchers where auction_id = p_auction_id;
    if v_count >= a.max_participants then
      return jsonb_build_object('ok', false, 'error', 'This event is full');
    end if;
  end if;

  insert into auction_watchers (auction_id, user_id) values (p_auction_id, auth.uid());
  return jsonb_build_object('ok', true, 'already_joined', false);
end;
$$;

revoke all on function public.join_action_event(uuid) from public;
grant execute on function public.join_action_event(uuid) to authenticated;
