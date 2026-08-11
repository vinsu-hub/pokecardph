-- ============================================================================
-- Phase 6 — "Who's That Pokémon?" weekly giveaway
-- Source: CONTEXT/POKECARD_PH_PHASE6_EVENTS.md
-- ============================================================================

create table if not exists pokemon_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  gift_listing_id uuid references listings(id),   -- null for a one-off item
  gift_name text not null,
  gift_description text,
  gift_image_url text,
  silhouette_image_url text,
  correct_answer text not null,                   -- normalised, e.g. 'pikachu'
  answer_aliases text[] default '{}',
  week_start date not null,
  window_start timestamptz not null,              -- earliest random go-live
  window_end timestamptz not null,                -- latest random go-live
  actual_start_time timestamptz,                  -- fixed once resolved
  guess_duration_minutes int default 60,
  ends_at timestamptz,
  status text default 'scheduled' check (
    status in ('scheduled','live','closed','winner_selected','fulfilled','cancelled')
  ),
  winner_id uuid references profiles(id),
  winning_guess_id uuid,
  created_at timestamptz default now(),
  check (window_end > window_start)
);

-- One event per shop per week — vendors can't spam the Events tab.
create unique index if not exists pokemon_events_shop_week_idx
  on pokemon_events(shop_id, week_start)
  where status <> 'cancelled';

create index if not exists pokemon_events_status_idx on pokemon_events(status, ends_at);

create table if not exists event_guesses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references pokemon_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  guess_text text not null,
  is_correct boolean not null default false,      -- computed server-side only
  created_at timestamptz default now(),
  unique (event_id, user_id)                      -- one guess, no retries
);

-- Reminder list for "Coming This Week".
create table if not exists event_reminders (
  event_id uuid not null references pokemon_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

-- ============================================================================
-- RLS — three rules ARE the game
-- ============================================================================

alter table pokemon_events  enable row level security;
alter table event_guesses   enable row level security;
alter table event_reminders enable row level security;

-- 1. `scheduled` rows are NOT publicly readable. If the exact go-live time
--    inside the window leaks, the surprise mechanic is defeated — that is the
--    entire reason go-live is randomised. Vendors still see their own.
drop policy if exists events_public_read on pokemon_events;
create policy events_public_read on pokemon_events
  for select using (
    status in ('live','closed','winner_selected','fulfilled')
    or shop_id in (select my_shop_ids())
  );

drop policy if exists events_vendor_write on pokemon_events;
create policy events_vendor_write on pokemon_events
  for all using (shop_id in (select my_shop_ids()))
  with check (shop_id in (select my_shop_ids()));

-- 2. A user reads ONLY their own guess. Reading everyone else's would let the
--    crowd copy the answer, which is the whole puzzle.
drop policy if exists guesses_own_read on event_guesses;
create policy guesses_own_read on event_guesses
  for select using (user_id = auth.uid());

-- Insert goes through the API route, but the policy still constrains it: your
-- own row, only while the event is live, and never with is_correct preset.
drop policy if exists guesses_own_insert on event_guesses;
create policy guesses_own_insert on event_guesses
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from pokemon_events e
      where e.id = event_guesses.event_id
        and e.status = 'live'
        and (e.ends_at is null or now() < e.ends_at)
    )
  );

drop policy if exists reminders_own on event_reminders;
create policy reminders_own on event_reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Aggregate counts come from a function, never raw row access.
create or replace function public.event_guess_count(p_event_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from event_guesses where event_id = p_event_id;
$$;

create or replace function public.event_correct_count(p_event_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  -- Only meaningful after close; before that it would leak how many people
  -- already have it right, which is a hint in itself.
  select case
    when (select status from pokemon_events where id = p_event_id)
         in ('closed','winner_selected','fulfilled')
    then (select count(*)::int from event_guesses where event_id = p_event_id and is_correct)
    else 0
  end;
$$;

grant execute on function public.event_guess_count(uuid) to anon, authenticated;
grant execute on function public.event_correct_count(uuid) to anon, authenticated;

-- ============================================================================
-- Guess submission — is_correct is computed here, never trusted from a client
-- ============================================================================

create or replace function public.submit_guess(p_event_id uuid, p_guess text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e pokemon_events%rowtype;
  v_norm text;
  v_correct boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in to guess');
  end if;

  select * into e from pokemon_events where id = p_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Event not found');
  end if;
  if e.status <> 'live' or (e.ends_at is not null and now() >= e.ends_at) then
    return jsonb_build_object('ok', false, 'error', 'This event is not open for guesses');
  end if;
  if exists (select 1 from event_guesses where event_id = p_event_id and user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'You have already guessed');
  end if;

  v_norm := lower(btrim(p_guess));
  v_correct := v_norm = lower(btrim(e.correct_answer))
               or v_norm = any (select lower(btrim(a)) from unnest(e.answer_aliases) a);

  insert into event_guesses (event_id, user_id, guess_text, is_correct)
  values (p_event_id, auth.uid(), p_guess, v_correct);

  -- Deliberately does NOT return whether the guess was right. Revealing it
  -- would let people re-guess through new accounts and let the crowd
  -- triangulate the answer from each other's reactions.
  return jsonb_build_object('ok', true, 'recorded', true);
end;
$$;

revoke all on function public.submit_guess(uuid, text) from public;
grant execute on function public.submit_guess(uuid, text) to authenticated;

-- ============================================================================
-- Resolver — go live, close, pick a winner
-- ============================================================================

create or replace function public.resolve_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e pokemon_events%rowtype;
  v_started int := 0;
  v_closed int := 0;
  v_decided int := 0;
  v_start timestamptz;
  v_winner uuid;
  v_guess uuid;
begin
  -- Go-live pass. The random point inside the window is resolved ONCE and
  -- stored. Re-rolling it every tick would mean the event never starts —
  -- each pass would push the start further away.
  for e in
    select * from pokemon_events
     where status = 'scheduled' and now() >= window_start
     for update skip locked
  loop
    if e.actual_start_time is null then
      v_start := e.window_start
        + (random() * (least(e.window_end, now()) - e.window_start));
      update pokemon_events set actual_start_time = v_start where id = e.id;
      e.actual_start_time := v_start;
    end if;

    if now() >= e.actual_start_time then
      update pokemon_events
         set status = 'live',
             ends_at = e.actual_start_time + (e.guess_duration_minutes || ' minutes')::interval
       where id = e.id;
      v_started := v_started + 1;
    end if;
  end loop;

  -- Close pass.
  update pokemon_events set status = 'closed'
   where status = 'live' and ends_at is not null and now() >= ends_at;
  get diagnostics v_closed = row_count;

  -- Winner pass — uniformly at random from correct guessers, NOT first to
  -- guess. Rewards knowing the answer rather than reflexes.
  for e in
    select * from pokemon_events
     where status = 'closed' and winner_id is null
     for update skip locked
  loop
    select user_id, id into v_winner, v_guess
      from event_guesses
     where event_id = e.id and is_correct
     order by random()
     limit 1;

    -- Zero correct guesses: no winner. The gift stays with the vendor, who may
    -- relist it — never automatic.
    update pokemon_events
       set status = 'winner_selected',
           winner_id = v_winner,
           winning_guess_id = v_guess
     where id = e.id;
    v_decided := v_decided + 1;
  end loop;

  return jsonb_build_object('started', v_started, 'closed', v_closed, 'decided', v_decided);
end;
$$;

revoke all on function public.resolve_events() from public;
