-- CodeSprint — the question engine's server side (SPEC §16, §18, §19, §42, Phase 8).
--
-- Every answer in the product is graded here. The client sends what the learner chose and
-- gets back a verdict, the explanation and the XP it earned — never the key it was compared
-- against, except as part of the "here is the correct answer" the spec asks for AFTER an
-- attempt. Grading on the server is the whole anti-cheat position (SPEC §42): a rooted phone
-- can lie about what it displayed, but not about what this function decided.

-- ---------------------------------------------------------------------------------------
-- Config helper for non-integer values
-- ---------------------------------------------------------------------------------------

create or replace function public.config_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_config where key = p_key),
                  p_default);
$$;

comment on function public.config_numeric(text, numeric) is
  'Internal: reads a decimal config value, falling back to the supplied default.';

-- ---------------------------------------------------------------------------------------
-- Free-text normalisation (SPEC §16)
-- ---------------------------------------------------------------------------------------
--
-- Mobile keyboards silently substitute curly quotes and typographic dashes for the straight
-- characters Python actually uses. A learner who typed the right answer must not be told
-- they are wrong because iOS "improved" their apostrophe. Typographic normalisation is
-- therefore unconditional; the match mode decides how forgiving the rest is.

create or replace function public.normalize_answer_text(p_text text, p_mode public.answer_match_mode)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := coalesce(p_text, '');
begin
  -- Curly single and double quotes, and the three common typographic dashes.
  v := translate(v, '‘’‚‛“”„‟–—―', '''''''''""""---');
  v := replace(v, E'\r\n', E'\n');

  case p_mode
    when 'exact' then
      return v;
    when 'trimmed' then
      return btrim(v, E' \t\n\r');
    when 'whitespace_insensitive' then
      return btrim(regexp_replace(v, '\s+', ' ', 'g'), E' \t\n\r');
    when 'case_insensitive' then
      return lower(btrim(v, E' \t\n\r'));
  end case;
end;
$$;

comment on function public.normalize_answer_text(text, public.answer_match_mode) is
  'Straightens typographic quotes and dashes, then applies the match mode (SPEC §16).';

-- ---------------------------------------------------------------------------------------
-- The grader
-- ---------------------------------------------------------------------------------------
--
-- One function per product rather than one per type, so the dispatch is visible in one place
-- and a new type cannot be graded as "always wrong" by omission without it being obvious.
--
-- Every branch is written so that a MISSING or malformed field grades as incorrect rather
-- than raising: a null on one side of `=` yields null, and coalesce(..., false) settles it.

create or replace function public.grade_answer(p_question_id uuid, p_submitted jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_type public.question_type;
  v_payload jsonb;
  v_key public.question_answer_keys;
  v_mode text;
  v_expected text;
  v_given text;
  v_accepted text;
begin
  select q.type, q.payload into v_type, v_payload
  from public.questions q
  where q.id = p_question_id;

  select k.* into v_key
  from public.question_answer_keys k
  where k.question_id = p_question_id;

  if v_type is null or v_key.question_id is null then
    return false;
  end if;

  case v_type

    when 'multiple_choice' then
      return coalesce(p_submitted ->> 'option_id' = v_key.answer ->> 'option_id', false);

    when 'true_false' then
      return coalesce(
        jsonb_typeof(p_submitted -> 'value') = 'boolean'
          and (p_submitted -> 'value') = (v_key.answer -> 'value'),
        false
      );

    when 'multiple_select' then
      -- All-or-nothing (SPEC §16): the chosen SET must equal the correct set. Sorting both
      -- sides makes the comparison independent of the order the learner tapped in.
      if jsonb_typeof(p_submitted -> 'option_ids') <> 'array' then
        return false;
      end if;
      return coalesce(
        (select array_agg(x order by x) from jsonb_array_elements_text(p_submitted -> 'option_ids') x)
        = (select array_agg(x order by x) from jsonb_array_elements_text(v_key.answer -> 'option_ids') x),
        false
      );

    when 'predict_output', 'fill_blank' then
      v_mode := v_key.match_mode::text;

      -- A choice-style predict_output submits the option it picked, not the text on it. The
      -- text is resolved here from the authored (English) payload, so a translated option
      -- label can never be compared against an untranslated program output.
      if p_submitted ? 'option_id' and (p_submitted ->> 'value') is null then
        select o -> 'text' ->> 'en' into v_given
        from jsonb_array_elements(coalesce(v_payload -> 'options', '[]'::jsonb)) o
        where o ->> 'id' = p_submitted ->> 'option_id';
        if v_given is null then
          return false;
        end if;
        v_given := public.normalize_answer_text(v_given, v_key.match_mode);
      else
        if p_submitted ->> 'value' is null then
          return false;
        end if;
        v_given := public.normalize_answer_text(p_submitted ->> 'value', v_key.match_mode);
      end if;

      v_expected := public.normalize_answer_text(v_key.answer ->> 'value', v_key.match_mode);
      if v_given = v_expected then
        return true;
      end if;

      -- Alternative phrasings the author allowed (e.g. "34" and '"34"' for a string).
      for v_accepted in
        select jsonb_array_elements_text(coalesce(v_key.accepted_answers, '[]'::jsonb))
      loop
        if v_given = public.normalize_answer_text(v_accepted, v_key.match_mode) then
          return true;
        end if;
      end loop;
      return false;

    when 'code_ordering' then
      -- jsonb array equality is positional, which is exactly what an ordering needs.
      return coalesce(
        jsonb_typeof(p_submitted -> 'order') = 'array'
          and (p_submitted -> 'order') = (v_key.answer -> 'order'),
        false
      );

    when 'debugging' then
      case v_payload ->> 'mode'
        when 'select_line' then
          return coalesce(p_submitted ->> 'line_id' = v_key.answer ->> 'line_id', false);
        when 'choose_fix' then
          return coalesce(p_submitted ->> 'option_id' = v_key.answer ->> 'option_id', false);
        else
          return coalesce(
            p_submitted ->> 'line_id' = v_key.answer ->> 'line_id'
              and p_submitted ->> 'option_id' = v_key.answer ->> 'option_id',
            false
          );
      end case;

    when 'concept_matching' then
      -- jsonb OBJECT equality ignores key order, so {a:x,b:y} matches {b:y,a:x}.
      return coalesce(
        jsonb_typeof(p_submitted -> 'pairs') = 'object'
          and (p_submitted -> 'pairs') = (v_key.answer -> 'pairs'),
        false
      );

    else
      -- coding_challenge is schema-only in V1 (SPEC §16). Nothing can be graded.
      return false;
  end case;
end;
$$;

comment on function public.grade_answer(uuid, jsonb) is
  'Internal: compares a submitted answer with its key. Malformed input grades as incorrect.';

-- ---------------------------------------------------------------------------------------
-- XP for a question (SPEC §19)
-- ---------------------------------------------------------------------------------------

create or replace function public.question_xp(p_question_id uuid, p_attempt_no integer)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_difficulty public.difficulty_level;
  v_override integer;
  v_base integer;
begin
  select q.difficulty, q.xp_reward into v_difficulty, v_override
  from public.questions q
  where q.id = p_question_id;

  v_base := coalesce(
    v_override,
    case v_difficulty
      when 'easy' then public.config_int('xp_easy', 5)
      when 'medium' then public.config_int('xp_medium', 10)
      when 'hard' then public.config_int('xp_hard', 15)
    end,
    0
  );

  -- "Correct on a retry: 50% of the above (rounded down)."
  if p_attempt_no > 1 then
    v_base := floor(v_base * public.config_numeric('xp_retry_multiplier', 0.5));
  end if;

  return greatest(v_base, 0);
end;
$$;

comment on function public.question_xp(uuid, integer) is
  'Internal: XP for a correct answer, halved and floored on a retry (SPEC §19).';

-- ---------------------------------------------------------------------------------------
-- submit_answer — the client-callable entry point
-- ---------------------------------------------------------------------------------------

create or replace function public.submit_answer(
  p_question_id uuid,
  p_answer jsonb,
  p_context public.answer_context default 'lesson',
  p_locale text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_question public.questions;
  v_module_id uuid;
  v_attempt_no integer;
  v_correct boolean;
  v_xp integer := 0;
  v_key public.question_answer_keys;
begin
  if p_answer is null or jsonb_typeof(p_answer) <> 'object' then
    raise exception 'answer must be a JSON object' using errcode = '22023';
  end if;

  select q.* into v_question
  from public.questions q
  where q.id = p_question_id and q.is_active;

  if v_question.id is null then
    raise exception 'question not found' using errcode = 'P0002';
  end if;

  select l.module_id into v_module_id
  from public.lessons l
  where l.id = v_question.lesson_id and l.is_active;

  if v_module_id is null then
    raise exception 'question not found' using errcode = 'P0002';
  end if;

  -- The same gate as get_lesson, plus the per-question premium flag (advanced sets, SPEC §5).
  if not public.can_access_module(v_uid, v_module_id)
     or (v_question.is_premium and not public.has_entitlement(v_uid, 'premium')) then
    raise exception 'this question requires premium' using errcode = '42501';
  end if;

  -- Attempts are counted across every context: a question failed in a lesson and answered in
  -- practice later is a retry, which is exactly what the 50% rule describes (SPEC §19, §23).
  select count(*) + 1 into v_attempt_no
  from public.user_question_attempts a
  where a.user_id = v_uid and a.question_id = p_question_id;

  v_correct := public.grade_answer(p_question_id, p_answer);

  insert into public.user_question_attempts
    (user_id, question_id, context, is_correct, attempt_no, submitted_answer)
  values
    (v_uid, p_question_id, p_context, v_correct, v_attempt_no, p_answer);

  -- Question XP belongs to the lesson context (SPEC §19). Practice, challenge and exam XP
  -- follow their own rules in their own phases. award_xp's unique reward key means a question
  -- can never pay twice, whatever the attempt count says.
  if v_correct and p_context = 'lesson' then
    v_xp := public.award_xp(
      v_uid, 'question', p_question_id::text, public.question_xp(p_question_id, v_attempt_no)
    );
  end if;

  select k.* into v_key
  from public.question_answer_keys k
  where k.question_id = p_question_id;

  return jsonb_build_object(
    'correct', v_correct,
    'attempt_no', v_attempt_no,
    'xp_awarded', v_xp,
    -- The explanation is returned after ANY answer (SPEC §17: "returned only after
    -- answering"; §18: shown on correct and on incorrect).
    'explanation', public.localized_text(v_question.explanation, p_locale),
    'hint', case
      when v_question.hint is null then null
      else public.localized_text(v_question.hint, p_locale)
    end,
    -- "Explanation of the correct answer" (SPEC §18) needs the answer: the renderer marks the
    -- right option, line or pair. Released only here, after an attempt has been recorded.
    'solution', v_key.answer
  );
end;
$$;

comment on function public.submit_answer(uuid, jsonb, public.answer_context, text) is
  'Grades one answer server-side, records the attempt, awards question XP in lesson context, '
  'and returns the verdict with the explanation (SPEC §16, §18, §19).';

-- ---------------------------------------------------------------------------------------
-- Grants (SPEC §40, default-deny)
-- ---------------------------------------------------------------------------------------

revoke all on function public.config_numeric(text, numeric) from public, anon, authenticated;
revoke all on function public.normalize_answer_text(text, public.answer_match_mode)
  from public, anon, authenticated;
revoke all on function public.grade_answer(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.question_xp(uuid, integer) from public, anon, authenticated;
revoke all on function public.submit_answer(uuid, jsonb, public.answer_context, text)
  from public, anon, authenticated;

grant execute on function public.submit_answer(uuid, jsonb, public.answer_context, text)
  to authenticated;
