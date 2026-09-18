-- The weekly leaderboard, display names and reports (SPEC §26, §42, Phase 12).
--
-- This is the first feature that shows one learner something belonging to another, so the
-- tests that matter most are the ones about what must NOT be there: no guest, no hidden user,
-- no unnamed user, and above all no email address or auth identifier anywhere in the payload.
--
-- The other half is the per-day ranking cap. The rule it has to prove is subtle: the learner
-- always keeps every point they earned — the ledger and their level are untouched — and only
-- the figure the RANKING reads is clamped.

create extension if not exists pgtap with schema extensions;

begin;
select plan(58);

create or replace function pg_temp.act_as(p_uid uuid)
returns void language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub', p_uid, 'role', 'authenticated')::text);
end;
$$;

-- Moderation reads this queue in Supabase Studio; no client role can. A fixture has to be
-- able to check what was filed, so it reads it the way Studio does.
create or replace function pg_temp.queue(p_reported uuid)
returns table (reporter_id uuid, reason text, note text)
language sql security definer as $$
  select r.reporter_id, r.reason, r.note
  from public.reports r
  where r.reported_user_id = p_reported and r.status = 'open';
$$;

create or replace function pg_temp.act_as_owner()
returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';
end;
$$;

-- The seed fills the board with 60 fixture accounts so a developer has something to look at
-- on a device. Ranks have to be exact here, so this test starts from an empty board.
delete from public.leaderboard_weekly;

insert into auth.users (id, email) values
  ('aaaa1212-0000-0000-0000-0000000000a1', 'lb-ada@test.local'),
  ('aaaa1212-0000-0000-0000-0000000000a2', 'lb-grace@test.local'),
  ('aaaa1212-0000-0000-0000-0000000000a3', 'lb-alan@test.local'),
  ('aaaa1212-0000-0000-0000-0000000000a5', 'lb-hidden@test.local'),
  ('aaaa1212-0000-0000-0000-0000000000a6', 'lb-unnamed@test.local'),
  ('aaaa1212-0000-0000-0000-0000000000a7', 'lb-naming@test.local');

-- A guest: no email, and `is_anonymous` mirrored onto the profile by the auth trigger.
insert into auth.users (id, is_anonymous) values
  ('aaaa1212-0000-0000-0000-0000000000a4', true);

update public.profiles set display_name = 'Ada Lovelace' where id = 'aaaa1212-0000-0000-0000-0000000000a1';
update public.profiles set display_name = 'Grace Hopper' where id = 'aaaa1212-0000-0000-0000-0000000000a2';
update public.profiles set display_name = 'Alan Turing'  where id = 'aaaa1212-0000-0000-0000-0000000000a3';
update public.profiles set display_name = 'Ghost Learner', leaderboard_hidden = true
  where id = 'aaaa1212-0000-0000-0000-0000000000a5';

-- A guest WITH a name. In the product a guest never gets as far as choosing one, but proving
-- that `is_anonymous` alone is enough to exclude them is the point of the fixture.
update public.profiles set display_name = 'Passing Guest' where id = 'aaaa1212-0000-0000-0000-0000000000a4';

-- ...and a6 keeps display_name null on purpose: a learner with XP and no name.

insert into public.leaderboard_weekly (week_start, user_id, xp) values
  (public.iso_week_start(), 'aaaa1212-0000-0000-0000-0000000000a1', 300),
  (public.iso_week_start(), 'aaaa1212-0000-0000-0000-0000000000a2', 200),
  (public.iso_week_start(), 'aaaa1212-0000-0000-0000-0000000000a4', 900),
  (public.iso_week_start(), 'aaaa1212-0000-0000-0000-0000000000a5', 800),
  (public.iso_week_start(), 'aaaa1212-0000-0000-0000-0000000000a6', 700),
  -- Last week, for somebody who is otherwise perfectly eligible.
  (public.iso_week_start() - 7, 'aaaa1212-0000-0000-0000-0000000000a3', 5000);

-- ---------------------------------------------------------------------------------------
-- Display names (SPEC §26)
-- ---------------------------------------------------------------------------------------

select is(public.display_name_problem('Al'), 'too_short',
  'a two-character name is refused');

select is(public.display_name_problem('twentyonecharacters12'), 'too_long',
  'and so is a twenty-one character one');

select is(public.display_name_problem('Ana<b>'), 'invalid_characters',
  'markup cannot reach a screen that renders other people''s names');

select is(public.display_name_problem('Ada' || chr(8203) || 'X'), 'invalid_characters',
  'and neither can an invisible codepoint used to clone somebody else''s name');

select is(public.display_name_problem('M O D'), 'reserved',
  'a reserved word is still reserved when it is spaced out');

select is(public.display_name_problem('c.o.d.e.s.p.r.i.n.t'), 'reserved',
  'and when it is split with dots — folding happens before the comparison');

select is(public.display_name_problem('shitty name'), 'not_allowed',
  'profanity is refused as a substring');

select is(public.display_name_problem('Ana Mărioară'), null,
  'Romanian diacritics are a normal part of a name, not an invalid character');

select is(public.display_name_problem('Δημήτρης'), null,
  'so is a name in another alphabet entirely');

select is(public.display_name_problem('Ada_Lovelace-99'), null,
  'and separators are allowed between alphanumerics');

select pg_temp.act_as('aaaa1212-0000-0000-0000-0000000000a7');

select is(
  public.set_display_name('New Learner') ->> 'display_name',
  'New Learner',
  'a learner can name themselves'
);

select is(
  (select display_name from public.profiles where id = 'aaaa1212-0000-0000-0000-0000000000a7'),
  'New Learner',
  'and the name is what lands on the profile'
);

select throws_ok(
  $$select public.set_display_name('ad')$$,
  '22023',
  null,
  'an invalid name is refused by the RPC'
);

select throws_ok(
  $$select public.set_display_name('ada lovelace')$$,
  '23505',
  null,
  'and a name somebody else already holds is refused whatever its casing'
);

select lives_ok(
  $$select public.set_display_name('New Learner')$$,
  'setting your own name to the value it already has is not a collision with yourself'
);

-- The trigger, not the RPC. `update_profile` accepts a display name too, and moderation will
-- eventually write one directly — the rule has to hold on every path into the column.
select throws_ok(
  $$select public.update_profile('{"display_name": "codesprint"}'::jsonb)$$,
  '22023',
  null,
  'the profile patch cannot smuggle a reserved name past validation'
);

select pg_temp.act_as_owner();

select throws_ok(
  $$update public.profiles set display_name = 'Ana<b>'
    where id = 'aaaa1212-0000-0000-0000-0000000000a1'$$,
  '22023',
  null,
  'not even a direct write by the table owner can store an invalid name'
);

-- ---------------------------------------------------------------------------------------
-- The ranking (SPEC §26)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('aaaa1212-0000-0000-0000-0000000000a1');

select is(
  (public.get_leaderboard() ->> 'total_ranked')::integer,
  2,
  'only the named, registered, visible learners are ranked'
);

select is(
  public.get_leaderboard() -> 'top' -> 0 ->> 'display_name',
  'Ada Lovelace',
  'the highest weekly XP comes first'
);

select is(
  public.get_leaderboard() -> 'top' -> 1 ->> 'display_name',
  'Grace Hopper',
  'and the rest follow in descending order'
);

select is(
  (public.get_leaderboard() -> 'top' -> 1 ->> 'rank')::integer,
  2,
  'each row carries its rank, computed server-side'
);

select is(
  public.get_leaderboard() -> 'top' -> 0 ->> 'avatar_key',
  'default',
  'a row carries the avatar key the profile screen uses'
);

select ok(
  not (public.get_leaderboard() -> 'top')::text like '%Passing Guest%',
  'a guest is never ranked, even holding the highest score of the week (SPEC §26)'
);

select ok(
  not (public.get_leaderboard() -> 'top')::text like '%Ghost Learner%',
  'and neither is somebody who hid themselves from the leaderboard'
);

select ok(
  not (public.get_leaderboard() -> 'top')::text like '%0000000000a6%',
  'a learner with XP but no display name is absent rather than shown as an identifier'
);

select ok(
  not (public.get_leaderboard() -> 'top')::text like '%Alan Turing%',
  'last week''s score does not carry into this week''s board'
);

-- The single most important assertion in this file. Everything else is a product decision;
-- this one is a privacy promise (SPEC §26, §40).
select ok(
  public.get_leaderboard()::text not like '%@%',
  'no email address appears anywhere in the payload'
);

select ok(
  public.get_leaderboard()::text not like '%lb-ada%',
  'nor any fragment of one'
);

select is(
  (public.get_leaderboard() -> 'me' ->> 'rank')::integer,
  1,
  'the caller is told their own position'
);

select ok(
  (public.get_leaderboard() ->> 'eligible')::boolean,
  'and that they are eligible to be on the board at all'
);

-- ±5 neighbours only matter to somebody the top slice does not reach, so ask for a top of 1.
select pg_temp.act_as('aaaa1212-0000-0000-0000-0000000000a2');

select is(
  jsonb_array_length(public.get_leaderboard(1) -> 'top'),
  1,
  'the top slice honours the requested size'
);

select is(
  public.get_leaderboard(1) -> 'neighbours' -> 0 ->> 'display_name',
  'Grace Hopper',
  'somebody outside the slice still sees themselves among their neighbours'
);

select is(
  jsonb_array_length(public.get_leaderboard() -> 'neighbours'),
  0,
  'and nobody is listed twice once the slice already holds them'
);

-- Why somebody is absent is three different problems with three different fixes.
select pg_temp.act_as('aaaa1212-0000-0000-0000-0000000000a4');

select ok(
  (public.get_leaderboard() ->> 'is_guest')::boolean
    and not (public.get_leaderboard() ->> 'eligible')::boolean,
  'a guest is told they are a guest, not that they have no XP'
);

select pg_temp.act_as('aaaa1212-0000-0000-0000-0000000000a5');

select ok(
  (public.get_leaderboard() ->> 'hidden')::boolean
    and not (public.get_leaderboard() ->> 'eligible')::boolean,
  'and somebody hidden is told they are hidden, which they can undo in Settings'
);

select ok(
  jsonb_array_length(public.get_leaderboard() -> 'top') = 2,
  'a hidden learner can still see the board — hiding removes them from it, not it from them'
);

-- ---------------------------------------------------------------------------------------
-- The per-day ranking cap (SPEC §26, §42)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select is(
  public.award_xp('aaaa1212-0000-0000-0000-0000000000a2', 'manual', 'cap-a', 1900),
  1900,
  'a large award is written to the ledger in full'
);

select is(
  (select xp from public.leaderboard_weekly
   where user_id = 'aaaa1212-0000-0000-0000-0000000000a2'
     and week_start = public.iso_week_start()),
  2100,
  'and counts in full towards the ranking while the day is still under the cap'
);

select is(
  public.award_xp('aaaa1212-0000-0000-0000-0000000000a2', 'manual', 'cap-b', 300),
  300,
  'the award that crosses the cap is still paid in full to the learner'
);

select is(
  (select xp_total from public.user_stats where user_id = 'aaaa1212-0000-0000-0000-0000000000a2'),
  2200,
  'their XP total keeps every point — the cap never takes anything away (SPEC §19)'
);

select is(
  (select xp from public.leaderboard_weekly
   where user_id = 'aaaa1212-0000-0000-0000-0000000000a2'
     and week_start = public.iso_week_start()),
  2200,
  'but the ranking stops at the daily cap, counting only the part below the line'
);

select is(
  public.award_xp('aaaa1212-0000-0000-0000-0000000000a2', 'manual', 'cap-c', 500),
  500,
  'further XP that day is still earned'
);

select is(
  (select xp from public.leaderboard_weekly
   where user_id = 'aaaa1212-0000-0000-0000-0000000000a2'
     and week_start = public.iso_week_start()),
  2200,
  'and adds nothing at all to the ranking'
);

select is(
  public.award_xp('aaaa1212-0000-0000-0000-0000000000a1', 'manual', 'ad-bonus', 400, false),
  400,
  'a rewarded-ad bonus is real XP'
);

select is(
  (select xp from public.leaderboard_weekly
   where user_id = 'aaaa1212-0000-0000-0000-0000000000a1'
     and week_start = public.iso_week_start()),
  300,
  'that never touches the leaderboard, cap or no cap (SPEC §19, §30)'
);

-- ---------------------------------------------------------------------------------------
-- Reports (SPEC §26, §49)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('aaaa1212-0000-0000-0000-0000000000a1');

select lives_ok(
  $$select public.report_user('aaaa1212-0000-0000-0000-0000000000a2', 'offensive_name', 'Please look at this.')$$,
  'a learner can report a name they can see'
);

select is(
  (select count(*)::integer from pg_temp.queue('aaaa1212-0000-0000-0000-0000000000a2')),
  1,
  'which reaches the moderation queue'
);

select is(
  (select reporter_id from pg_temp.queue('aaaa1212-0000-0000-0000-0000000000a2')),
  'aaaa1212-0000-0000-0000-0000000000a1'::uuid,
  'attributed to the caller, who does not get to choose who they are'
);

select lives_ok(
  $$select public.report_user('aaaa1212-0000-0000-0000-0000000000a2', 'offensive_name')$$,
  'reporting the same person twice is accepted quietly'
);

select is(
  (select count(*)::integer from pg_temp.queue('aaaa1212-0000-0000-0000-0000000000a2')),
  1,
  'but files nothing new, so one person cannot flood the queue'
);

select throws_ok(
  $$select public.report_user('aaaa1212-0000-0000-0000-0000000000a1', 'offensive_name')$$,
  '22023',
  null,
  'nobody can report themselves'
);

select throws_ok(
  $$select public.report_user('aaaa1212-0000-0000-0000-0000000000a2', '  ')$$,
  '22023',
  null,
  'and a report without a reason is not a report'
);

-- Hidden and non-existent produce the SAME error, so this cannot be used to probe which
-- user ids exist.
select throws_ok(
  $$select public.report_user('aaaa1212-0000-0000-0000-0000000000a5', 'offensive_name')$$,
  'P0002',
  null,
  'somebody who is not on the board cannot be reported'
);

select throws_ok(
  $$select public.report_user('aaaa1212-0000-0000-0000-00000000dead', 'offensive_name')$$,
  'P0002',
  null,
  'and an id that belongs to nobody gives exactly the same answer'
);

select throws_ok(
  $$select count(*) from public.reports$$,
  '42501',
  null,
  'a client cannot read the moderation queue — not even their own reports (SPEC §40)'
);

-- ---------------------------------------------------------------------------------------
-- Grants (SPEC §40)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select ok(
  has_function_privilege('authenticated', 'public.get_leaderboard(integer)', 'execute')
    and has_function_privilege('authenticated', 'public.set_display_name(text)', 'execute')
    and has_function_privilege('authenticated', 'public.report_user(uuid, text, text)', 'execute'),
  'the three RPCs the app calls are executable by a signed-in user'
);

select ok(
  not has_function_privilege('anon', 'public.get_leaderboard(integer)', 'execute')
    and not has_function_privilege('anon', 'public.report_user(uuid, text, text)', 'execute'),
  'and by nobody who is not signed in'
);

select ok(
  not has_function_privilege('authenticated', 'public.leaderboard_eligible(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.leaderboard_xp_today(uuid)', 'execute'),
  'the internals stay internal: a client cannot ask about another user directly'
);

select * from finish();
rollback;
