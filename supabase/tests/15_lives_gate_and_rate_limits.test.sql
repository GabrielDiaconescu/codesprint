-- Out of lives means out of answers; per-user rate limits (SPEC §22, §40, §42).
--
-- Both rules sit in BEFORE INSERT triggers, so they are tested through the functions that
-- write the rows — submit_answer and the rewarded grants — and, where it matters, by writing
-- the row directly as the owner, which a trigger does not care about.

create extension if not exists pgtap with schema extensions;

begin;
select plan(20);

create or replace function pg_temp.act_as(p_uid uuid)
returns void language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub', p_uid, 'role', 'authenticated')::text);
end;
$$;

create or replace function pg_temp.act_as_owner()
returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';
end;
$$;

-- A true/false question from a free module, and its right and wrong answers. Chosen from the
-- catalogue rather than hardcoded, so content edits do not break this file.
create or replace function pg_temp.tf_question(p_nth integer default 1)
returns uuid language sql security definer as $$
  select q.id
  from public.questions q
  join public.lessons l on l.id = q.lesson_id
  join public.modules m on m.id = l.module_id
  where q.type = 'true_false' and q.is_active and not q.is_premium and m.order_index = 1
  order by l.order_index, q.order_index
  offset p_nth - 1 limit 1;
$$;

create or replace function pg_temp.right_answer(p_question uuid)
returns jsonb language sql security definer as $$
  select k.answer from public.question_answer_keys k where k.question_id = p_question;
$$;

create or replace function pg_temp.wrong_answer(p_question uuid)
returns jsonb language sql security definer as $$
  select jsonb_build_object('value', not (k.answer ->> 'value')::boolean)
  from public.question_answer_keys k where k.question_id = p_question;
$$;

create or replace function pg_temp.attempts(p_uid uuid)
returns bigint language sql security definer as $$
  select count(*) from public.user_question_attempts a where a.user_id = p_uid;
$$;

-- F = free, past the grace period · P = premium · R = rate limits · G = rewarded grants
insert into auth.users (id, email) values
  ('eeee1616-0000-0000-0000-00000000000f', 'gate-free@test.local'),
  ('eeee1616-0000-0000-0000-00000000000e', 'gate-premium@test.local'),
  ('eeee1616-0000-0000-0000-00000000000d', 'gate-rate@test.local'),
  ('eeee1616-0000-0000-0000-00000000000c', 'gate-grants@test.local');

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('eeee1616-0000-0000-0000-00000000000e', 'premium', true);

-- Past the three-lesson grace, one life left.
update public.user_stats set lessons_completed = 5, lives = 1, lives_updated_at = now()
where user_id = 'eeee1616-0000-0000-0000-00000000000f';

-- ---------------------------------------------------------------------------------------
-- Out of lives, out of answers (SPEC §22)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000f');

select lives_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(1), pg_temp.wrong_answer(pg_temp.tf_question(1))),
  'the answer that spends the last life is still taken'
);

-- lives_state is server-side only; read it as the owner.
select pg_temp.act_as_owner();
select is(
  (public.lives_state('eeee1616-0000-0000-0000-00000000000f') ->> 'lives')::integer,
  0,
  'and leaves no lives'
);
select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000f');

select throws_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(2), pg_temp.right_answer(pg_temp.tf_question(2))),
  'LV000',
  'out of lives',
  'the next one is refused in a lesson — right answers too'
);

select is(
  pg_temp.attempts('eeee1616-0000-0000-0000-00000000000f'),
  1::bigint,
  'and the refused answer left nothing behind'
);

select throws_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'practice')$$,
         pg_temp.tf_question(2), pg_temp.right_answer(pg_temp.tf_question(2))),
  'LV000',
  'out of lives',
  'in practice'
);

select throws_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'challenge')$$,
         pg_temp.tf_question(2), pg_temp.right_answer(pg_temp.tf_question(2))),
  'LV000',
  'out of lives',
  'and in the daily challenge'
);

-- Exams use attempt limits, not lives (SPEC §22, §27).
select pg_temp.act_as_owner();
select lives_ok(
  format($$insert into public.user_question_attempts (user_id, question_id, context, is_correct)
           values ('eeee1616-0000-0000-0000-00000000000f', %L, 'exam', true)$$,
         pg_temp.tf_question(2)),
  'an exam answer is not gated by lives'
);

-- A life comes back after the regeneration interval (default 240 minutes).
update public.user_stats set lives_updated_at = now() - interval '5 hours'
where user_id = 'eeee1616-0000-0000-0000-00000000000f';

select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000f');
select lives_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(2), pg_temp.right_answer(pg_temp.tf_question(2))),
  'a regenerated life opens answering again'
);

-- Premium has unlimited lives, whatever the stored count says.
select pg_temp.act_as_owner();
update public.user_stats set lessons_completed = 5, lives = 0, lives_updated_at = now()
where user_id = 'eeee1616-0000-0000-0000-00000000000e';

select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000e');
select lives_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(1), pg_temp.wrong_answer(pg_temp.tf_question(1))),
  'Premium is never refused for lives'
);

-- ---------------------------------------------------------------------------------------
-- Rate limits (SPEC §42)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();
update public.app_config set value = '3'::jsonb where key = 'rate_limit_answers_per_minute';

select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000d');
select lives_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson'),
                  public.submit_answer(%L, %L::jsonb, 'lesson'),
                  public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(1), pg_temp.right_answer(pg_temp.tf_question(1)),
         pg_temp.tf_question(2), pg_temp.right_answer(pg_temp.tf_question(2)),
         pg_temp.tf_question(3), pg_temp.right_answer(pg_temp.tf_question(3))),
  'answers up to the limit are taken'
);

select throws_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(1), pg_temp.right_answer(pg_temp.tf_question(1))),
  'RL000',
  'rate limited: answer',
  'the one past it is refused'
);

select is(
  pg_temp.attempts('eeee1616-0000-0000-0000-00000000000d'),
  3::bigint,
  'and was not recorded'
);

-- The window has passed.
select pg_temp.act_as_owner();
update public.rate_limit_counters set window_start = now() - interval '2 minutes'
where user_id = 'eeee1616-0000-0000-0000-00000000000d' and bucket = 'answer';

select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000d');
select lives_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(1), pg_temp.right_answer(pg_temp.tf_question(1))),
  'a new window starts a new allowance'
);

-- 0 switches the limit off.
select pg_temp.act_as_owner();
update public.app_config set value = '0'::jsonb where key = 'rate_limit_answers_per_minute';

select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000d');
select lives_ok(
  format($$select public.submit_answer(%L, %L::jsonb, 'lesson'),
                  public.submit_answer(%L, %L::jsonb, 'lesson'),
                  public.submit_answer(%L, %L::jsonb, 'lesson'),
                  public.submit_answer(%L, %L::jsonb, 'lesson')$$,
         pg_temp.tf_question(1), pg_temp.right_answer(pg_temp.tf_question(1)),
         pg_temp.tf_question(2), pg_temp.right_answer(pg_temp.tf_question(2)),
         pg_temp.tf_question(3), pg_temp.right_answer(pg_temp.tf_question(3)),
         pg_temp.tf_question(1), pg_temp.right_answer(pg_temp.tf_question(1))),
  'a limit of 0 is no limit'
);

-- Rewarded grants have a per-minute limit on top of the daily cap.
select pg_temp.act_as_owner();
update public.app_config set value = '60'::jsonb where key = 'rate_limit_answers_per_minute';
update public.app_config set value = '1'::jsonb where key = 'rate_limit_rewards_per_minute';

select lives_ok(
  $$insert into public.rewarded_ad_grants (user_id, reward_type, local_date)
    values ('eeee1616-0000-0000-0000-00000000000c', 'life', current_date)$$,
  'a grant inside the reward allowance is written'
);

select throws_ok(
  $$insert into public.rewarded_ad_grants (user_id, reward_type, local_date)
    values ('eeee1616-0000-0000-0000-00000000000c', 'life', current_date)$$,
  'RL000',
  'rate limited: reward',
  'one past it is refused, whichever path writes it'
);

update public.app_config set value = '10'::jsonb where key = 'rate_limit_rewards_per_minute';

-- ---------------------------------------------------------------------------------------
-- None of it is reachable from a client (SPEC §40)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('eeee1616-0000-0000-0000-00000000000f');

select throws_ok(
  $$select count(*) from public.rate_limit_counters$$,
  '42501',
  null,
  'a client cannot read the counters'
);

select throws_ok(
  $$delete from public.rate_limit_counters$$,
  '42501',
  null,
  'or reset them'
);

select throws_ok(
  $$select public.enforce_rate_limit('eeee1616-0000-0000-0000-00000000000f', 'answer', 1000)$$,
  '42501',
  null,
  'or call the limiter'
);

select throws_ok(
  $$select public.may_answer('eeee1616-0000-0000-0000-00000000000f', 'lesson')$$,
  '42501',
  null,
  'or ask the lives gate directly'
);

select * from finish();
rollback;
