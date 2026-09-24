-- Answers stay fast however long a learner has been learning (SPEC §45; found in Phase 23).
--
-- The daily caps read the learner's whole XP history and date every row in their timezone.
-- When that dating read the timezone database from disk, the seventy-first answer took
-- sixteen seconds. These tests give a learner a long history and put a ceiling on the time —
-- generous enough never to flake, far below what the slow version took.

create extension if not exists pgtap with schema extensions;

begin;
select plan(6);

-- Same dates as before the change.
select is(
  public.local_date_for('Europe/Bucharest', timestamptz '2026-03-28 22:30:00+00'),
  date '2026-03-29',
  'a known zone gives its local date'
);

select is(
  public.local_date_for('Not/AZone', timestamptz '2026-03-28 22:30:00+00'),
  date '2026-03-28',
  'an unknown zone still falls back to UTC'
);

select is(
  public.local_date_for(null, timestamptz '2026-03-28 22:30:00+00'),
  date '2026-03-28',
  'no zone at all is UTC'
);

-- Two thousand calls, the way a long history reaches them. The slow version took about a
-- minute for this; the ceiling is two seconds.
create temporary table timing (started timestamptz, finished timestamptz);
insert into timing (started) values (clock_timestamp());
select count(public.local_date_for('Europe/Bucharest', now() - n * interval '1 hour'))
from generate_series(1, 2000) as n;
update timing set finished = clock_timestamp();

select ok(
  (select finished - started from timing) < interval '2 seconds',
  'dating 2000 rows takes well under two seconds'
);

-- A learner with a year of XP: the leaderboard cap reads all of it on every answer.
insert into auth.users (id, email) values
  ('eeee1717-0000-0000-0000-00000000000a', 'long-history@test.local');

update public.profiles set timezone = 'Europe/Bucharest'
where id = 'eeee1717-0000-0000-0000-00000000000a';

insert into public.xp_events (user_id, source_type, source_id, amount, counts_for_leaderboard, created_at)
select 'eeee1717-0000-0000-0000-00000000000a', 'question', 'history-' || n, 10, true,
       now() - n * interval '8 hours'
from generate_series(1, 1500) as n;

insert into public.xp_events (user_id, source_type, source_id, amount, counts_for_leaderboard)
values ('eeee1717-0000-0000-0000-00000000000a', 'question', 'today', 15, true);

truncate timing;
insert into timing (started) values (clock_timestamp());
select is(
  public.leaderboard_xp_today('eeee1717-0000-0000-0000-00000000000a') >= 15,
  true,
  'today''s leaderboard XP is counted from a long history'
);
update timing set finished = clock_timestamp();

select ok(
  (select finished - started from timing) < interval '1 second',
  'counting today''s XP across 1500 events takes under a second'
);

select * from finish();
rollback;
