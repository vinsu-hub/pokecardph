-- Scheduling for the two sub-daily jobs.
--
-- Vercel's Hobby tier allows daily cron granularity only — a deploy carrying
-- `"schedule": "* * * * *"` is rejected outright. The auction closer needs to
-- run every minute (anti-snipe extends an auction by 2 minutes, so a coarser
-- tick would let ended auctions sit unsettled) and the event resolver every 5.
--
-- Both API routes are thin wrappers: /api/auctions/close calls
-- close_due_auctions() and /api/events/resolve calls resolve_events(), each
-- already SECURITY DEFINER. So pg_cron calls the functions directly. That is
-- better than an HTTP cron would have been even on a paid plan — no cold
-- start, no shared secret in flight, no dependency on the web tier being up
-- for auctions to settle. The routes stay for manual invocation and tests.

create extension if not exists pg_cron;

-- pg_cron installs into its own schema; the postgres role needs usage on it.
grant usage on schema cron to postgres;

-- Idempotent: unschedule before scheduling, so re-running this migration
-- doesn't accumulate duplicate jobs firing the same function.
do $$
begin
  perform cron.unschedule('close-due-auctions');
exception when others then
  null; -- not scheduled yet
end $$;

do $$
begin
  perform cron.unschedule('resolve-events');
exception when others then
  null;
end $$;

-- Every minute. close_due_auctions() moves scheduled -> live, settles expired
-- auctions into ended_sold/ended_unsold, and writes a pending order plus a 48h
-- confirm deadline for each winner.
select cron.schedule(
  'close-due-auctions',
  '* * * * *',
  $$select public.close_due_auctions()$$
);

-- Every 5 minutes. resolve_events() fixes actual_start_time once (re-rolling
-- it each tick would push the start further away every pass and the event
-- would never begin), closes due events, and draws a winner uniformly from
-- correct guessers.
select cron.schedule(
  'resolve-events',
  '*/5 * * * *',
  $$select public.resolve_events()$$
);
