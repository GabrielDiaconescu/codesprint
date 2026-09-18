import { createClient } from '@supabase/supabase-js';

import { buildRows, type ContentRows } from './build';
import { loadContent } from './load';
import { runValidation } from './validate';

/**
 * Publishes content to a Supabase project (SPEC §35.4).
 *
 * Three rules shape everything here:
 *
 *   1. **Upsert by stable id.** Ids come from the content files and never change, so a
 *      learner's attempt from six months ago still points at the right question.
 *   2. **Never delete.** Removing a question would orphan every attempt and exam record that
 *      references it. Withdrawn content is deactivated instead.
 *   3. **Only reviewed content reaches production.** `review_status: draft` is publishable to
 *      staging, where it can be read in a real app, but never to production.
 *
 * Requires the SECRET key, which exists only in local shells and CI secrets — never in the
 * app, never in an EXPO_PUBLIC_ variable (SPEC §59.27).
 *
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run content:publish -- --production
 */

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const isProduction = process.argv.includes('--production');
const dryRun = process.argv.includes('--dry-run');

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

/** Upserts in batches so one oversized request cannot fail an otherwise fine publish. */
const CHUNK = 100;

const chunked = <T>(items: T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
};

const main = async () => {
  if (!url || !secretKey) {
    fail(
      'SUPABASE_URL and SUPABASE_SECRET_KEY must be set.\n' +
        'The secret key belongs in your shell or in CI secrets — never in .env or the app.',
    );
    return;
  }

  // Publishing invalid content is worse than not publishing: the app would serve it.
  const problems = runValidation();
  if (problems.length > 0) {
    fail(
      `Refusing to publish: content has ${problems.length} problem(s). Run npm run content:validate.`,
    );
    return;
  }

  const { courses } = loadContent();
  let rows: ContentRows = buildRows(courses);

  if (isProduction) {
    // SPEC §35.3: drafts may exist on staging, where they can be read in a real app, but
    // production only ever serves content a human has reviewed.
    const reviewedLessons = new Set(
      rows.lessons.filter((l) => l.review_status === 'reviewed').map((l) => l.id),
    );
    const droppedLessons = rows.lessons.length - reviewedLessons.size;

    rows = {
      ...rows,
      lessons: rows.lessons.filter((l) => reviewedLessons.has(l.id)),
      lessonContents: rows.lessonContents.filter((c) => reviewedLessons.has(c.lesson_id)),
      questions: rows.questions.filter(
        (q) => q.review_status === 'reviewed' && reviewedLessons.has(q.lesson_id),
      ),
      answerKeys: rows.answerKeys,
    };

    const publishedQuestionIds = new Set(rows.questions.map((q) => q.id));
    rows.answerKeys = rows.answerKeys.filter((k) => publishedQuestionIds.has(k.question_id));

    if (droppedLessons > 0) {
      console.log(`Skipping ${droppedLessons} unreviewed lesson(s) — production is reviewed only.`);
    }
  }

  const target = isProduction ? 'PRODUCTION' : 'staging/local';
  console.log(`Publishing to ${target}: ${url}`);
  console.log(
    `  ${rows.courses.length} course, ${rows.modules.length} modules, ` +
      `${rows.lessons.length} lessons, ${rows.questions.length} questions`,
  );

  if (dryRun) {
    console.log('\n--dry-run: nothing was written.');
    return;
  }

  const client = createClient(url, secretKey, { auth: { persistSession: false } });

  const push = async (table: string, data: unknown[], onConflict: string) => {
    for (const batch of chunked(data)) {
      const { error } = await client.from(table).upsert(batch, { onConflict });
      if (error) fail(`\n${table}: ${error.message}`);
    }
    console.log(`  ${table.padEnd(26)} ${data.length}`);
  };

  console.log('\nUpserting:');
  // Order matters: every table below references the one above it.
  await push('courses', rows.courses, 'id');
  await push('modules', rows.modules, 'id');
  await push('lessons', rows.lessons, 'id');
  await push('lesson_contents', rows.lessonContents, 'lesson_id');
  await push('questions', rows.questions, 'id');
  await push('question_answer_keys', rows.answerKeys, 'question_id');
  await push('exams', rows.exams, 'id');

  /* -------------------------------------------------- withdraw, never delete */

  const deactivate = async (table: string, keepIds: string[], idColumn = 'id') => {
    const { data, error } = await client.from(table).select(idColumn).eq('is_active', true);
    if (error) fail(`\n${table}: ${error.message}`);

    const keep = new Set(keepIds);
    const stale = (data ?? [])
      .map((row) => (row as unknown as Record<string, string>)[idColumn]!)
      .filter((id) => !keep.has(id));

    if (stale.length === 0) return;

    const { error: updateError } = await client
      .from(table)
      .update({ is_active: false })
      .in(idColumn, stale);
    if (updateError) fail(`\n${table}: ${updateError.message}`);

    console.log(`  deactivated ${stale.length} withdrawn row(s) in ${table}`);
  };

  console.log('\nWithdrawing content no longer in the files:');
  await deactivate(
    'modules',
    rows.modules.map((r) => r.id),
  );
  await deactivate(
    'lessons',
    rows.lessons.map((r) => r.id),
  );
  await deactivate(
    'questions',
    rows.questions.map((r) => r.id),
  );
  await deactivate(
    'exams',
    rows.exams.map((r) => r.id),
  );

  /* -------------------------------------------------- invalidate client caches */

  // Content queries are keyed by content_version (SPEC §35), so bumping it is what makes
  // every installed app notice the change without any push mechanism.
  const { data: current, error: readError } = await client
    .from('app_config')
    .select('value')
    .eq('key', 'content_version')
    .single();
  if (readError) fail(`\napp_config: ${readError.message}`);

  const nextVersion = Number(current?.value ?? 0) + 1;
  const { error: bumpError } = await client
    .from('app_config')
    .update({ value: nextVersion })
    .eq('key', 'content_version');
  if (bumpError) fail(`\napp_config: ${bumpError.message}`);

  console.log(`\ncontent_version -> ${nextVersion}. Published.`);
};

void main();
