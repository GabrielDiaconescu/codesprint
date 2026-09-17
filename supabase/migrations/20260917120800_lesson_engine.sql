-- CodeSprint — the lesson engine (SPEC §14, §15, §40, Phase 7).
--
-- `lesson_contents` and `questions` have no grants and no policies at all. This is the only
-- way either reaches a client, and it checks two things first: that the user may open the
-- module, and that the lesson is active.
--
-- What it deliberately does NOT return is as important as what it does. Explanations and
-- hints are the reward for answering (SPEC §17, §18); shipping them with the lesson would let
-- anyone read the answer reasoning before attempting anything. Answer keys never appear here
-- under any circumstance.

-- ---------------------------------------------------------------------------------------
-- Localisation helpers (SPEC §38)
-- ---------------------------------------------------------------------------------------

create or replace function public.localized_text(p_value jsonb, p_locale text default 'en')
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(p_value ->> p_locale, ''),
    nullif(p_value ->> 'en', ''),
    ''
  );
$$;

comment on function public.localized_text(jsonb, text) is
  'Reads a localized JSONB field with an English fallback (SPEC §38).';

/**
 * Replaces every localized object in a structure with the string for one locale.
 *
 * Applied to whole blocks and payloads rather than field by field, so option text, concept
 * labels and captions all localise by the same rule and a new field cannot be forgotten.
 *
 * The rule: an object carrying an `en` string IS localized text. That holds throughout the
 * authoring schemas, where `{ "en": ... }` never means anything else.
 *
 * Localising on the server rather than shipping every locale keeps the lesson payload inside
 * the 50 KB cap (SPEC §45) once a second language exists.
 */
create or replace function public.localize_deep(p_value jsonb, p_locale text default 'en')
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_result jsonb;
  v_key text;
begin
  if p_value is null then
    return null;
  end if;

  if jsonb_typeof(p_value) = 'object' then
    if p_value ? 'en' and jsonb_typeof(p_value -> 'en') = 'string' then
      return to_jsonb(public.localized_text(p_value, p_locale));
    end if;

    v_result := '{}'::jsonb;
    for v_key in select jsonb_object_keys(p_value) loop
      v_result := v_result || jsonb_build_object(
        v_key, public.localize_deep(p_value -> v_key, p_locale)
      );
    end loop;
    return v_result;
  end if;

  if jsonb_typeof(p_value) = 'array' then
    return coalesce(
      (
        select jsonb_agg(public.localize_deep(element, p_locale) order by ordinality)
        from jsonb_array_elements(p_value) with ordinality as t(element, ordinality)
      ),
      '[]'::jsonb
    );
  end if;

  return p_value;
end;
$$;

comment on function public.localize_deep(jsonb, text) is
  'Recursively collapses localized objects to one locale (SPEC §38, §45).';

-- ---------------------------------------------------------------------------------------
-- get_lesson
-- ---------------------------------------------------------------------------------------

create or replace function public.get_lesson(p_lesson_id uuid, p_locale text default 'en')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_lesson public.lessons;
  v_module public.modules;
  v_blocks jsonb;
  v_rendered jsonb;
begin
  select l.* into v_lesson
  from public.lessons l
  where l.id = p_lesson_id and l.is_active;

  if v_lesson.id is null then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  select m.* into v_module
  from public.modules m
  where m.id = v_lesson.module_id and m.is_active;

  if v_module.id is null then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  -- The paywall boundary, enforced where it cannot be bypassed. The client draws a padlock
  -- from config for display; this is what actually decides (SPEC §40).
  if not public.can_access_module(v_uid, v_module.id) then
    raise exception 'this module requires premium' using errcode = '42501';
  end if;

  select c.blocks into v_blocks
  from public.lesson_contents c
  where c.lesson_id = p_lesson_id;

  if v_blocks is null then
    v_blocks := '[]'::jsonb;
  end if;

  -- Question blocks reference questions by id; this is where they are resolved into exactly
  -- the fields a renderer needs. `explanation` and `hint` are not among them.
  select coalesce(jsonb_agg(rendered order by ordinality), '[]'::jsonb)
  into v_rendered
  from (
    select
      ordinality,
      case
        when block ->> 'type' = 'question' then (
          select jsonb_build_object(
            'type', 'question',
            'question', jsonb_build_object(
              'id', q.id,
              'type', q.type,
              'difficulty', q.difficulty,
              'prompt', public.localized_text(q.prompt, p_locale),
              'code_snippet', q.code_snippet,
              'payload', public.localize_deep(q.payload, p_locale),
              -- Whether a hint EXISTS, never the hint itself: the client needs to decide
              -- whether to offer the button, and asking for it is a Phase 8 request.
              'has_hint', (q.hint is not null),
              'skill_tags', to_jsonb(q.skill_tags)
            )
          )
          from public.questions q
          where q.id = (block ->> 'question_id')::uuid and q.is_active
        )
        else public.localize_deep(block, p_locale)
      end as rendered
    from jsonb_array_elements(v_blocks) with ordinality as t(block, ordinality)
  ) resolved
  -- A question deactivated after publication leaves a null here; drop it rather than
  -- rendering a hole in the lesson.
  where rendered is not null;

  return jsonb_build_object(
    'id', v_lesson.id,
    'slug', v_lesson.slug,
    'title', public.localized_text(v_lesson.title, p_locale),
    'summary', public.localized_text(v_lesson.summary, p_locale),
    'estimated_minutes', v_lesson.estimated_minutes,
    'order_index', v_lesson.order_index,
    'module', jsonb_build_object(
      'id', v_module.id,
      'slug', v_module.slug,
      'title', public.localized_text(v_module.title, p_locale),
      'order_index', v_module.order_index
    ),
    'blocks', v_rendered
  );
end;
$$;

comment on function public.get_lesson(uuid, text) is
  'The only client path to lesson bodies and questions. Entitlement-checked; never returns '
  'explanations, hints or answer keys (SPEC §17, §40).';

-- ---------------------------------------------------------------------------------------
-- Grants (SPEC §40, default-deny)
-- ---------------------------------------------------------------------------------------

revoke all on function public.localized_text(jsonb, text) from public, anon, authenticated;
revoke all on function public.localize_deep(jsonb, text) from public, anon, authenticated;
revoke all on function public.get_lesson(uuid, text) from public, anon, authenticated;

-- Guests included: SPEC §12 D1 says a new user starts the first lesson immediately.
grant execute on function public.get_lesson(uuid, text) to authenticated;
