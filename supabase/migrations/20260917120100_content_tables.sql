-- CodeSprint — educational content tables (SPEC §17, §35, §39).
--
-- Content is authored as YAML in the repo and published here by scripts/content/publish.ts.
-- IDs are STABLE UUIDs defined in the content files and are never regenerated, so user
-- attempts keep pointing at the right question across republishes.
--
-- Rows are never deleted: publishing sets is_active = false instead, so historical attempts
-- and exam records keep their foreign keys (SPEC §35).

-- ---------------------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------------------

create table public.courses (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  -- Localized JSONB throughout, so Romanian can be added without a migration (SPEC §38).
  title jsonb not null,
  description jsonb not null default '{}'::jsonb,
  language text not null default 'python',
  icon_key text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_active_order_idx on public.courses (is_active, order_index);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------------------------

create table public.modules (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title jsonb not null,
  description jsonb not null default '{}'::jsonb,
  order_index integer not null,
  -- NULL means "derive from app_config.free_module_count" (SPEC D5). Storing the premium
  -- flag per module would duplicate that config and make moving the free boundary a
  -- data migration instead of a config change.
  is_premium_override boolean,
  estimated_minutes integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (course_id, order_index) deferrable initially deferred
);

create index modules_course_order_idx on public.modules (course_id, order_index);

create trigger modules_set_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- lessons + lesson_contents
-- ---------------------------------------------------------------------------------------

create table public.lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  slug text not null,
  title jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  order_index integer not null,
  estimated_minutes integer not null default 5,
  review_status public.review_status not null default 'draft',
  content_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug)
);

create index lessons_module_order_idx on public.lessons (module_id, order_index);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- Blocks live in their own table so listing lessons (metadata only) never drags the full
-- body over the wire — SPEC §45 caps a lesson payload at 50 KB.
create table public.lesson_contents (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  blocks jsonb not null default '[]'::jsonb,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lesson_contents_set_updated_at
  before update on public.lesson_contents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------------------

create table public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type public.question_type not null,
  difficulty public.difficulty_level not null,
  prompt jsonb not null,
  code_snippet text,
  -- Type-specific rendering data: options, tokens, lines, pairs.
  -- It MUST NOT contain the answer — the answer lives in question_answer_keys (SPEC §17).
  payload jsonb not null default '{}'::jsonb,
  explanation jsonb not null,
  hint jsonb,
  -- NULL means "derive from difficulty via app_config" (SPEC §19).
  xp_reward integer,
  is_premium boolean not null default false,
  is_active boolean not null default true,
  is_challenge_eligible boolean not null default true,
  is_exam_eligible boolean not null default true,
  skill_tags text[] not null default '{}',
  order_index integer not null default 0,
  review_status public.review_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index questions_lesson_order_idx on public.questions (lesson_id, order_index);
create index questions_challenge_pool_idx on public.questions (is_challenge_eligible)
  where is_active and is_challenge_eligible;
create index questions_exam_pool_idx on public.questions (is_exam_eligible)
  where is_active and is_exam_eligible;
create index questions_skill_tags_idx on public.questions using gin (skill_tags);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- A defence in depth against an authoring mistake leaking an answer through the payload,
-- which the client IS allowed to read. Cheap to check, catastrophic to miss.
alter table public.questions
  add constraint questions_payload_has_no_answer
  check (
    not (
      payload ? 'answer'
      or payload ? 'correct'
      or payload ? 'correct_answer'
      or payload ? 'correctIndex'
      or payload ? 'is_correct'
      or payload ? 'solution'
    )
  );

-- ---------------------------------------------------------------------------------------
-- question_answer_keys — the most security-sensitive table in the project
-- ---------------------------------------------------------------------------------------
--
-- SPEC §17/§40: RLS enabled with NO client policies at all. It is readable only from inside
-- SECURITY DEFINER functions. Never add a policy here, and never join it into an RPC
-- response — grading returns a verdict, never the key (SPEC §59.29).

create table public.question_answer_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  answer jsonb not null,
  match_mode public.answer_match_mode not null default 'exact',
  accepted_answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger question_answer_keys_set_updated_at
  before update on public.question_answer_keys
  for each row execute function public.set_updated_at();

comment on table public.question_answer_keys is
  'Answer keys. RLS enabled with zero policies: readable only inside SECURITY DEFINER '
  'functions. Never expose through an RPC response.';

-- ---------------------------------------------------------------------------------------
-- exams
-- ---------------------------------------------------------------------------------------
--
-- The free sample exam and the full premium exam are two ROWS, not a code branch
-- (SPEC §27), so changing either is configuration rather than a release.

create table public.exams (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null unique,
  title jsonb not null,
  description jsonb not null default '{}'::jsonb,
  question_count integer not null,
  time_limit_minutes integer,
  pass_threshold_pct integer not null default 70,
  -- NULL = open to everyone; 'premium' = the full exam.
  requires_entitlement public.entitlement_id,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_question_count_positive check (question_count > 0),
  constraint exams_pass_threshold_valid check (pass_threshold_pct between 1 and 100)
);

create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();
