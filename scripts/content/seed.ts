import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildFromDisk, type ContentRows } from './build';

/**
 * Generates `supabase/seed.sql` from the real content files (SPEC §52).
 *
 * The seed is produced, never written by hand: "no Lorem ipsum, no 'Question 1', no disguised
 * test data". Everything a developer sees locally is the same content a learner would see,
 * which is the only way local testing tells you anything true.
 *
 * `supabase db reset` applies this automatically after the migrations.
 */

const OUTPUT = join(process.cwd(), 'supabase', 'seed.sql');

/* ------------------------------------------------------------------ SQL literals */

/**
 * Escapes by doubling quotes rather than dollar-quoting.
 *
 * Dollar-quoting reads better but needs a delimiter that cannot appear in the value, and
 * lesson content is arbitrary prose and code. Doubling is unconditionally safe.
 */
const text = (value: string | null): string =>
  value === null ? 'null' : `'${value.replace(/'/g, "''")}'`;

const json = (value: unknown): string =>
  value === null || value === undefined ? 'null' : `${text(JSON.stringify(value))}::jsonb`;

const bool = (value: boolean | null): string => (value === null ? 'null' : String(value));
const num = (value: number | null): string => (value === null ? 'null' : String(value));

const textArray = (values: string[]): string =>
  values.length === 0 ? "'{}'::text[]" : `array[${values.map((v) => text(v)).join(', ')}]::text[]`;

/** `insert ... on conflict do update` so re-running the seed is idempotent. */
const upsert = (
  table: string,
  columns: string[],
  rows: string[][],
  conflictTarget: string,
): string => {
  if (rows.length === 0) return `-- no rows for ${table}\n`;

  const updates = columns
    .filter((c) => !conflictTarget.includes(c))
    .map((c) => `  ${c} = excluded.${c}`)
    .join(',\n');

  return [
    `insert into ${table} (${columns.join(', ')}) values`,
    rows.map((row) => `  (${row.join(', ')})`).join(',\n'),
    `on conflict (${conflictTarget}) do update set`,
    updates,
    ';\n',
  ].join('\n');
};

/* ------------------------------------------------------------------ content */

const contentSql = (rows: ContentRows): string => {
  const parts: string[] = [];

  parts.push(
    upsert(
      'public.courses',
      ['id', 'slug', 'title', 'description', 'language', 'icon_key', 'order_index'],
      rows.courses.map((r) => [
        text(r.id),
        text(r.slug),
        json(r.title),
        json(r.description),
        text(r.language),
        text(r.icon_key),
        num(r.order_index),
      ]),
      'id',
    ),
  );

  parts.push(
    upsert(
      'public.modules',
      [
        'id',
        'course_id',
        'slug',
        'title',
        'description',
        'order_index',
        'is_premium_override',
        'estimated_minutes',
      ],
      rows.modules.map((r) => [
        text(r.id),
        text(r.course_id),
        text(r.slug),
        json(r.title),
        json(r.description),
        num(r.order_index),
        bool(r.is_premium_override),
        num(r.estimated_minutes),
      ]),
      'id',
    ),
  );

  parts.push(
    upsert(
      'public.lessons',
      [
        'id',
        'module_id',
        'slug',
        'title',
        'summary',
        'order_index',
        'estimated_minutes',
        'review_status',
        'content_hash',
      ],
      rows.lessons.map((r) => [
        text(r.id),
        text(r.module_id),
        text(r.slug),
        json(r.title),
        json(r.summary),
        num(r.order_index),
        num(r.estimated_minutes),
        `'${r.review_status}'::public.review_status`,
        text(r.content_hash),
      ]),
      'id',
    ),
  );

  parts.push(
    upsert(
      'public.lesson_contents',
      ['lesson_id', 'blocks', 'content_hash'],
      rows.lessonContents.map((r) => [text(r.lesson_id), json(r.blocks), text(r.content_hash)]),
      'lesson_id',
    ),
  );

  parts.push(
    upsert(
      'public.questions',
      [
        'id',
        'lesson_id',
        'type',
        'difficulty',
        'prompt',
        'code_snippet',
        'payload',
        'explanation',
        'hint',
        'xp_reward',
        'is_premium',
        'is_challenge_eligible',
        'is_exam_eligible',
        'skill_tags',
        'order_index',
        'review_status',
        'content_hash',
      ],
      rows.questions.map((r) => [
        text(r.id),
        text(r.lesson_id),
        `'${r.type}'::public.question_type`,
        `'${r.difficulty}'::public.difficulty_level`,
        json(r.prompt),
        text(r.code_snippet),
        json(r.payload),
        json(r.explanation),
        json(r.hint),
        num(r.xp_reward),
        bool(r.is_premium),
        bool(r.is_challenge_eligible),
        bool(r.is_exam_eligible),
        textArray(r.skill_tags),
        num(r.order_index),
        `'${r.review_status}'::public.review_status`,
        text(r.content_hash),
      ]),
      'id',
    ),
  );

  parts.push(
    upsert(
      'public.question_answer_keys',
      ['question_id', 'answer', 'match_mode', 'accepted_answers'],
      rows.answerKeys.map((r) => [
        text(r.question_id),
        json(r.answer),
        `'${r.match_mode}'::public.answer_match_mode`,
        json(r.accepted_answers),
      ]),
      'question_id',
    ),
  );

  parts.push(
    upsert(
      'public.exams',
      [
        'id',
        'course_id',
        'slug',
        'title',
        'description',
        'question_count',
        'time_limit_minutes',
        'pass_threshold_pct',
        'requires_entitlement',
      ],
      rows.exams.map((r) => [
        text(r.id),
        text(r.course_id),
        text(r.slug),
        json(r.title),
        json(r.description),
        num(r.question_count),
        num(r.time_limit_minutes),
        num(r.pass_threshold_pct),
        r.requires_entitlement === null
          ? 'null'
          : `'${r.requires_entitlement}'::public.entitlement_id`,
      ]),
      'id',
    ),
  );

  return parts.join('\n');
};

/* ------------------------------------------------------------------ dev users */

/**
 * Test accounts for local development (SPEC §52).
 *
 * These MUST NEVER exist in production — the entitlement rows would hand out Premium for
 * free. `seed.sql` is only ever applied by `supabase db reset` against a local database;
 * `publish.ts` writes content and nothing else.
 */
interface DevUser {
  id: string;
  email: string;
  /** Needed to appear on the leaderboard at all (SPEC §26). */
  displayName: string;
  /** Adults. An unknown birth year is treated as a minor, and minors are hidden (SPEC §41). */
  birthYear: number;
  label: string;
  entitlements: ('no_ads' | 'premium')[];
}

const DEV_PASSWORD = 'sprint2026';

const DEV_USERS: DevUser[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'free@codesprint.test',
    birthYear: 1996,
    displayName: 'Free Tester',
    label: 'Free tier: ads, lives, modules up to the free boundary',
    entitlements: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'noads@codesprint.test',
    birthYear: 1992,
    displayName: 'No Ads Tester',
    label: 'No Ads: same content as free, without advertising',
    entitlements: ['no_ads'],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'premium@codesprint.test',
    birthYear: 1988,
    displayName: 'Premium Tester',
    label: 'Premium: every module, unlimited lives, full exam',
    entitlements: ['no_ads', 'premium'],
  },
];

const devUsersSql = (): string => {
  const lines: string[] = [];

  lines.push(`-- Test accounts. Password for all of them: ${DEV_PASSWORD}`);
  for (const user of DEV_USERS) {
    lines.push(`--   ${user.email.padEnd(26)} ${user.label}`);
  }
  lines.push('');

  for (const user of DEV_USERS) {
    lines.push(`-- ${user.email}`);
    // The empty-string token columns are not decoration. GoTrue scans them into Go strings
    // rather than pointers, so leaving them NULL makes every sign-in fail with an opaque
    // "Database error querying schema" 500 — with rows that look perfectly correct in Studio.
    lines.push(`insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  ${text(user.id)},
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  ${text(user.email)},
  extensions.crypt(${text(DEV_PASSWORD)}, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;`);

    // Without an identity row GoTrue does not consider the email a usable sign-in method,
    // and the account exists but cannot log in.
    lines.push(`insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  extensions.gen_random_uuid(),
  ${text(user.id)},
  ${text(user.id)},
  'email',
  ${text(JSON.stringify({ sub: user.id, email: user.email, email_verified: true }))}::jsonb,
  now(), now(), now()
) on conflict (provider, provider_id) do nothing;`);

    // `handle_new_user` has already created the profile; this names it. Going through the
    // table rather than `set_display_name` is deliberate — the seed runs as the database
    // owner, with no `auth.uid()` to be the caller. The validation trigger still applies.
    lines.push(`update public.profiles
set display_name = ${text(user.displayName)},
    birth_year = ${user.birthYear}
where id = ${text(user.id)};`);

    for (const entitlement of user.entitlements) {
      // `store` is tagged so a fixture is obvious in Studio and impossible to mistake for a
      // real purchase (SPEC §31: these must never exist in production).
      lines.push(`insert into public.user_entitlements (user_id, entitlement, is_active, store)
values (${text(user.id)}, '${entitlement}'::public.entitlement_id, true, 'dev-seed')
on conflict (user_id, entitlement) do update set is_active = true, store = 'dev-seed';`);
    }

    lines.push('');
  }

  return lines.join('\n');
};

/* ------------------------------------------------------------------ leaderboard */

/** How many fixture accounts populate the weekly ranking. */
const RIVAL_COUNT = 60;

/**
 * A populated weekly leaderboard for local development (SPEC §26, §52).
 *
 * The device check for this phase is "weekly ranking with test users", and a ranking with one
 * row proves nothing: the top-50 slice, the caller's own position and the ±5 neighbours only
 * behave differently once there are more competitors than the slice holds. Sixty of them puts
 * a freshly seeded developer account below the cut, where the neighbour path is what renders.
 *
 * These accounts have no `auth.identities` row, so they cannot sign in. They are rows that
 * exist to be ranked, and nothing else.
 *
 * The XP is written straight into `leaderboard_weekly` rather than through the ledger. That
 * is the one place this seed departs from real gameplay, and it is the honest trade: 60 users
 * x 20 ledger rows to reproduce a number the ranking reads directly would slow every reset
 * down for no extra truth. Their `user_stats` stay at zero, which is correct — they have not
 * answered anything.
 *
 * `iso_week_start()` is evaluated at reset time, so the fixtures always land in the current
 * week. A database left unreset across a Monday shows an empty board until the next reset.
 */
const leaderboardSql = (): string =>
  `-- ${RIVAL_COUNT} ranked fixture accounts. They cannot sign in (no identity row).
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  ('00000000-0000-4000-8000-0000000100' || to_char(n, 'FM00'))::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rival' || to_char(n, 'FM00') || '@codesprint.test',
  extensions.crypt(${text(DEV_PASSWORD)}, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(),
  '', '', '', '', '', '', '', ''
from generate_series(1, ${RIVAL_COUNT}) as n
on conflict (id) do nothing;

update public.profiles p
set display_name = 'Sprinter ' || to_char(n.n, 'FM00'),
    avatar_key = 'avatar-' || to_char(1 + (n.n % 8), 'FM0')
from generate_series(1, ${RIVAL_COUNT}) as n(n)
where p.id = ('00000000-0000-4000-8000-0000000100' || to_char(n.n, 'FM00'))::uuid;

-- A descending spread, so ranks 1..${RIVAL_COUNT} are distinct and a developer who has just
-- finished a lesson or two lands near the bottom.
insert into public.leaderboard_weekly (week_start, user_id, xp)
select
  public.iso_week_start(),
  ('00000000-0000-4000-8000-0000000100' || to_char(n, 'FM00'))::uuid,
  1520 - 24 * n
from generate_series(1, ${RIVAL_COUNT}) as n
on conflict (week_start, user_id) do update set xp = excluded.xp;
`;

/* ------------------------------------------------------------------ main */

const main = () => {
  const rows = buildFromDisk();

  const header = `-- GENERATED FILE — DO NOT EDIT.
--
-- Produced by \`npm run content:seed\` from the YAML in content/ (SPEC §52).
-- Edit the content files and regenerate; changes made here are lost on the next run.
--
-- Applied automatically by \`supabase db reset\` against the LOCAL database only.
-- It contains developer test accounts with entitlement fixtures, which must never
-- reach production (SPEC §31).

begin;

`;

  const body = [
    '-- ============================================================ content',
    '',
    contentSql(rows),
    '-- ============================================================ development accounts',
    '',
    devUsersSql(),
    '-- ============================================================ leaderboard fixtures',
    '',
    leaderboardSql(),
    'commit;',
    '',
  ].join('\n');

  writeFileSync(OUTPUT, header + body, 'utf8');

  console.log(`Wrote supabase/seed.sql`);
  console.log(
    `  ${rows.courses.length} course, ${rows.modules.length} modules, ` +
      `${rows.lessons.length} lessons, ${rows.questions.length} questions, ` +
      `${rows.answerKeys.length} answer keys, ${rows.exams.length} exams`,
  );
  console.log(`  ${DEV_USERS.length} test accounts (password: ${DEV_PASSWORD})`);
  console.log(`  ${RIVAL_COUNT} leaderboard fixture accounts`);
};

if (process.argv[1]?.includes('seed')) main();
