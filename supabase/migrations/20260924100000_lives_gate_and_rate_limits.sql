-- Out of lives means out of answers; per-user rate limits (SPEC §22, §40, §42).
--
-- Two decisions taken after Phase 21's E2E run (2026-09-24):
--
--   1. At 0 lives a learner cannot answer in lesson, practice or challenge context. Until now
--      the out-of-lives card appeared but the next question could be answered as normal, which
--      left Premium's "unlimited lives" with nothing to offer.
--   2. Answers and rewards are rate-limited per user, as SPEC §40 and §42 ask.
--
-- Both are enforced where the row is WRITTEN — a BEFORE INSERT trigger on the attempts and on
-- the rewarded grants — rather than in each RPC. Every path that records an answer is then
-- covered, including ones added later, and no RPC had to be copied into this migration to
-- gain one line. A refusal raises inside the RPC's transaction, so nothing of that call is
-- recorded: no attempt, no XP, no life taken.
--
-- Exam answers are left alone: exams have their own limits (attempts per week, a timer) and
-- pay nothing per answer.

-- ---------------------------------------------------------------------------------------
-- 1. Configuration
-- ---------------------------------------------------------------------------------------

insert into public.app_config (key, value, is_public, description) values
  ('rate_limit_answers_per_minute', '60'::jsonb, false,
   'Answers one learner may submit per minute (SPEC §42). One a second is beyond any honest pace. 0 disables.'),
  ('rate_limit_rewards_per_minute', '10'::jsonb, false,
   'Rewarded-ad grants one learner may receive per minute, on top of the daily cap (SPEC §42). 0 disables.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------
-- 2. Rate limits
-- ---------------------------------------------------------------------------------------

-- One row per learner and bucket: a fixed window and the hits inside it. Small on purpose —
-- this is abuse resistance, not metering.
create table public.rate_limit_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (user_id, bucket)
);

-- RLS on, and no policies at all: only security-definer functions touch it (SPEC §40).
alter table public.rate_limit_counters enable row level security;
revoke all on public.rate_limit_counters from anon, authenticated;

comment on table public.rate_limit_counters is
  'Per-user request counters for rate limits (SPEC §42). Server-only; no client policies.';

/**
 * Counts one hit in `p_bucket` for `p_user_id`, and refuses once the window's allowance is
 * spent.
 *
 * `clock_timestamp()`, not `now()`: `now()` is fixed for the whole transaction, and the
 * window has to move with real time. A refused call raises, which rolls its own increment
 * back — so a learner hammering the limit does not push the window further away.
 */
create or replace function public.enforce_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_max integer,
  p_window interval default interval '1 minute'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_hits integer;
begin
  if p_max is null or p_max <= 0 then
    return;
  end if;

  insert into public.rate_limit_counters as c (user_id, bucket, window_start, hits)
  values (p_user_id, p_bucket, v_now, 1)
  on conflict (user_id, bucket) do update
    set hits = case when c.window_start <= v_now - p_window then 1 else c.hits + 1 end,
        window_start = case when c.window_start <= v_now - p_window then v_now else c.window_start end
  returning hits into v_hits;

  if v_hits > p_max then
    raise exception 'rate limited: %', p_bucket
      using errcode = 'RL000', hint = 'Too many requests in a short time. Try again shortly.';
  end if;
end;
$$;

comment on function public.enforce_rate_limit(uuid, text, integer, interval) is
  'Counts a hit and raises RL000 once the per-window allowance is spent (SPEC §42).';

-- ---------------------------------------------------------------------------------------
-- 3. Out of lives, out of answers
-- ---------------------------------------------------------------------------------------

/**
 * Whether this learner may answer in this context right now (SPEC §22).
 *
 * Yes for Premium (unlimited lives), yes in a context that does not use lives (exams, by
 * default), and otherwise yes while at least one life is left — after regeneration, so a life
 * that has come back since the last answer counts.
 */
create or replace function public.may_answer(p_user_id uuid, p_context public.answer_context)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contexts jsonb;
begin
  if public.has_entitlement(p_user_id, 'premium') then
    return true;
  end if;

  select value into v_contexts from public.app_config where key = 'lives_consume_in';
  if not coalesce(v_contexts, '["lesson","practice","challenge"]'::jsonb) ? p_context::text then
    return true;
  end if;

  return public.regenerate_lives(p_user_id) > 0;
end;
$$;

comment on function public.may_answer(uuid, public.answer_context) is
  'False at 0 lives in a context that uses them, unless Premium (SPEC §22).';

-- ---------------------------------------------------------------------------------------
-- 4. The guards
-- ---------------------------------------------------------------------------------------

create or replace function public.guard_answer_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.context = 'exam' then
    return new;
  end if;

  perform public.enforce_rate_limit(
    new.user_id, 'answer', public.config_int('rate_limit_answers_per_minute', 60)
  );

  -- Checked BEFORE this answer's own life is taken (submit_answer consumes after recording),
  -- so the answer that spends the last life is allowed and the one after it is not.
  if not public.may_answer(new.user_id, new.context) then
    raise exception 'out of lives'
      using errcode = 'LV000', hint = 'Wait for a life, watch an ad for one, or go Premium.';
  end if;

  return new;
end;
$$;

create trigger user_question_attempts_guard
  before insert on public.user_question_attempts
  for each row execute function public.guard_answer_attempt();

create or replace function public.guard_reward_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enforce_rate_limit(
    new.user_id, 'reward', public.config_int('rate_limit_rewards_per_minute', 10)
  );
  return new;
end;
$$;

create trigger rewarded_ad_grants_guard
  before insert on public.rewarded_ad_grants
  for each row execute function public.guard_reward_grant();

-- ---------------------------------------------------------------------------------------
-- 5. Nothing here is callable from outside
-- ---------------------------------------------------------------------------------------

revoke execute on function public.enforce_rate_limit(uuid, text, integer, interval)
  from public, anon, authenticated;
revoke execute on function public.may_answer(uuid, public.answer_context)
  from public, anon, authenticated;
revoke execute on function public.guard_answer_attempt() from public, anon, authenticated;
revoke execute on function public.guard_reward_grant() from public, anon, authenticated;
