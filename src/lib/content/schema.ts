import { z } from 'zod';

/**
 * The authoring format (SPEC §35).
 *
 * These schemas are the contract between the YAML files and the database. They live under
 * `src/lib` rather than in `scripts/` because the app renders the same block and payload
 * shapes from Phase 7 onwards — two copies would drift, and the one that drifted would be
 * the one nobody was testing.
 *
 * Everything is `.strict()`. A typo in a key is the single most likely authoring mistake, and
 * silently ignoring `explaination:` would ship a question with no explanation.
 */

/** Stable UUIDs, written by hand into the files and never regenerated (SPEC §17). */
const uuid = z.string().uuid('must be a stable UUID — generate once and never change it');

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case: lowercase words joined by hyphens');

/**
 * Localised text (SPEC §38). English is required; other locales are optional and fall back.
 * Authoring in one language still produces the right JSONB shape, so adding Romanian later
 * is a content change rather than a migration.
 */
export const localizedText = z
  .object({ en: z.string().min(1, 'English text is required') })
  .catchall(z.string());

export type LocalizedText = z.infer<typeof localizedText>;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const MATCH_MODES = [
  'exact',
  'trimmed',
  'whitespace_insensitive',
  'case_insensitive',
] as const;
export const REVIEW_STATUSES = ['draft', 'reviewed'] as const;

/* ------------------------------------------------------------------ Lesson blocks (§15) */

const textBlock = z
  .object({
    type: z.literal('text'),
    body: localizedText,
  })
  .strict();

const codeBlock = z
  .object({
    type: z.literal('code'),
    code: z.string().min(1),
    /** Expected stdout. Required when `runnable`, because that is what gets verified. */
    output: z.string().optional(),
    /**
     * Marks the snippet for execution by `verify_python.py` on every supported interpreter.
     * A snippet that cannot run standalone (a fragment, or one that needs input) sets false.
     */
    runnable: z.boolean().default(false),
    caption: localizedText.optional(),
  })
  .strict()
  .refine((block) => !block.runnable || block.output !== undefined, {
    message: 'a runnable code block must declare its expected output',
    path: ['output'],
  });

const calloutBlock = z
  .object({
    type: z.literal('callout'),
    variant: z.enum(['note', 'tip', 'mistake']),
    body: localizedText,
  })
  .strict();

/* ------------------------------------------------------------------ Questions (§16, §17) */

/**
 * Every question type is a payload (what the client may see) plus an answer (what it may
 * never see). The split is enforced here and again by a CHECK constraint on `questions`.
 */

const baseQuestion = {
  id: uuid,
  difficulty: z.enum(DIFFICULTIES),
  prompt: localizedText,
  code_snippet: z.string().optional(),
  explanation: localizedText,
  hint: localizedText.optional(),
  skill_tags: z.array(slug).min(1, 'at least one skill tag — the progress screen groups by them'),
  xp_reward: z.number().int().positive().optional(),
  is_premium: z.boolean().default(false),
  is_challenge_eligible: z.boolean().default(true),
  is_exam_eligible: z.boolean().default(true),
  review_status: z.enum(REVIEW_STATUSES).default('draft'),
};

const option = z.object({ id: slug, text: localizedText }).strict();

const multipleChoice = z
  .object({
    ...baseQuestion,
    type: z.literal('multiple_choice'),
    payload: z.object({ options: z.array(option).min(2).max(6) }).strict(),
    answer: z.object({ option_id: slug }).strict(),
  })
  .strict();

const multipleSelect = z
  .object({
    ...baseQuestion,
    type: z.literal('multiple_select'),
    payload: z.object({ options: z.array(option).min(3).max(8) }).strict(),
    // All-or-nothing grading (SPEC §16), so two correct options is the useful minimum.
    answer: z.object({ option_ids: z.array(slug).min(2) }).strict(),
  })
  .strict();

const trueFalse = z
  .object({
    ...baseQuestion,
    type: z.literal('true_false'),
    payload: z.object({}).strict().default({}),
    answer: z.object({ value: z.boolean() }).strict(),
  })
  .strict();

const predictOutput = z
  .object({
    ...baseQuestion,
    type: z.literal('predict_output'),
    code_snippet: z.string().min(1, 'predict_output needs the code the learner reads'),
    payload: z
      .object({
        /**
         * SPEC §16: multi-line output is ALWAYS multiple choice. Free text is only tolerable
         * for a short single line, where typing it is quick and normalisation is reliable.
         */
        input: z.enum(['text', 'choice']),
        options: z.array(option).min(2).max(6).optional(),
      })
      .strict(),
    answer: z
      .object({
        value: z.string(),
        match_mode: z.enum(MATCH_MODES).default('trimmed'),
        accepted_answers: z.array(z.string()).default([]),
      })
      .strict(),
    /** Verified against a real interpreter unless the snippet cannot run standalone. */
    runnable: z.boolean().default(true),
  })
  .strict()
  .refine((q) => q.payload.input !== 'choice' || (q.payload.options?.length ?? 0) >= 2, {
    message: 'a choice-style predict_output needs its options',
    path: ['payload', 'options'],
  })
  .refine((q) => q.payload.input !== 'text' || !q.answer.value.includes('\n'), {
    message: 'multi-line output must use input: choice (SPEC §16)',
    path: ['answer', 'value'],
  });

const fillBlank = z
  .object({
    ...baseQuestion,
    type: z.literal('fill_blank'),
    code_snippet: z
      .string()
      .min(1)
      .refine((code) => code.includes('___'), {
        message: 'mark the blank with ___ so the renderer knows where it goes',
      }),
    payload: z
      .object({
        /** Default is a tap-to-place token bank (SPEC §16), not a keyboard. */
        input: z.enum(['tokens', 'text']).default('tokens'),
        tokens: z.array(z.string()).min(2).optional(),
      })
      .strict(),
    answer: z
      .object({
        value: z.string().min(1),
        match_mode: z.enum(MATCH_MODES).default('trimmed'),
        accepted_answers: z.array(z.string()).default([]),
      })
      .strict(),
  })
  .strict()
  .refine((q) => q.payload.input !== 'tokens' || (q.payload.tokens?.length ?? 0) >= 2, {
    message: 'a token-bank blank needs tokens to choose from',
    path: ['payload', 'tokens'],
  })
  .refine(
    (q) => q.payload.input !== 'tokens' || (q.payload.tokens ?? []).includes(q.answer.value),
    {
      message: 'the correct token must be present in the token bank',
      path: ['payload', 'tokens'],
    },
  );

const codeOrdering = z
  .object({
    ...baseQuestion,
    type: z.literal('code_ordering'),
    payload: z
      .object({
        /** Presented shuffled by the client; this is the authoring order, not the answer. */
        lines: z
          .array(z.object({ id: slug, text: z.string() }).strict())
          .min(3)
          .max(8),
      })
      .strict(),
    answer: z.object({ order: z.array(slug).min(3) }).strict(),
    /** When true, the correctly ordered program is executed and compared (SPEC §35.2). */
    runnable: z.boolean().default(false),
    expected_output: z.string().optional(),
  })
  .strict()
  .refine((q) => q.answer.order.length === q.payload.lines.length, {
    message: 'the answer must order every line exactly once',
    path: ['answer', 'order'],
  })
  .refine((q) => new Set(q.answer.order).size === q.answer.order.length, {
    message: 'the answer order repeats a line id',
    path: ['answer', 'order'],
  })
  .refine((q) => q.answer.order.every((id) => q.payload.lines.some((line) => line.id === id)), {
    message: 'the answer order names a line that does not exist',
    path: ['answer', 'order'],
  })
  .refine((q) => !q.runnable || q.expected_output !== undefined, {
    message: 'a runnable ordering question must declare the output of the correct order',
    path: ['expected_output'],
  });

const debugging = z
  .object({
    ...baseQuestion,
    type: z.literal('debugging'),
    code_snippet: z.string().min(1),
    payload: z
      .object({
        /** Select the faulty line, choose the fix, or both (SPEC §16). */
        mode: z.enum(['select_line', 'choose_fix', 'both']),
        lines: z
          .array(z.object({ id: slug, text: z.string() }).strict())
          .min(2)
          .optional(),
        options: z.array(option).min(2).max(5).optional(),
      })
      .strict(),
    answer: z
      .object({
        line_id: slug.optional(),
        option_id: slug.optional(),
      })
      .strict(),
    /**
     * When runnable, the pipeline proves the premise: the broken version must actually fail
     * or print the wrong thing, and the fixed version must produce `fixed_output`. A
     * "debugging" question whose broken code works is the worst kind of wrong.
     */
    runnable: z.boolean().default(false),
    fixed_code: z.string().optional(),
    fixed_output: z.string().optional(),
  })
  .strict()
  .refine((q) => q.payload.mode === 'choose_fix' || q.answer.line_id !== undefined, {
    message: 'selecting a line requires answer.line_id',
    path: ['answer', 'line_id'],
  })
  .refine((q) => q.payload.mode === 'select_line' || q.answer.option_id !== undefined, {
    message: 'choosing a fix requires answer.option_id',
    path: ['answer', 'option_id'],
  })
  .refine((q) => q.payload.mode === 'choose_fix' || (q.payload.lines?.length ?? 0) >= 2, {
    message: 'selecting a line requires the lines to select from',
    path: ['payload', 'lines'],
  })
  .refine((q) => q.payload.mode === 'select_line' || (q.payload.options?.length ?? 0) >= 2, {
    message: 'choosing a fix requires the options to choose from',
    path: ['payload', 'options'],
  })
  .refine((q) => !q.runnable || (q.fixed_code !== undefined && q.fixed_output !== undefined), {
    message: 'a runnable debugging question must declare fixed_code and fixed_output',
    path: ['fixed_code'],
  });

const conceptMatching = z
  .object({
    ...baseQuestion,
    type: z.literal('concept_matching'),
    payload: z
      .object({
        concepts: z
          .array(z.object({ id: slug, text: localizedText }).strict())
          .min(3)
          .max(6),
        definitions: z
          .array(z.object({ id: slug, text: localizedText }).strict())
          .min(3)
          .max(6),
      })
      .strict(),
    answer: z.object({ pairs: z.record(slug, slug) }).strict(),
  })
  .strict()
  .refine((q) => Object.keys(q.answer.pairs).length === q.payload.concepts.length, {
    message: 'every concept needs exactly one definition',
    path: ['answer', 'pairs'],
  })
  .refine(
    (q) =>
      Object.entries(q.answer.pairs).every(
        ([conceptId, definitionId]) =>
          q.payload.concepts.some((c) => c.id === conceptId) &&
          q.payload.definitions.some((d) => d.id === definitionId),
      ),
    {
      message: 'a pair names a concept or definition that does not exist',
      path: ['answer', 'pairs'],
    },
  )
  .refine(
    (q) => new Set(Object.values(q.answer.pairs)).size === Object.values(q.answer.pairs).length,
    { message: 'two concepts map to the same definition', path: ['answer', 'pairs'] },
  );

export const questionSchema = z.discriminatedUnion('type', [
  multipleChoice,
  multipleSelect,
  trueFalse,
  predictOutput,
  fillBlank,
  codeOrdering,
  debugging,
  conceptMatching,
]);

export type ContentQuestion = z.infer<typeof questionSchema>;
export type QuestionType = ContentQuestion['type'];

/** Every type the authoring format supports; `validate.ts` checks the seed covers them all. */
export const QUESTION_TYPES = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'predict_output',
  'fill_blank',
  'code_ordering',
  'debugging',
  'concept_matching',
] as const satisfies readonly QuestionType[];

/* ------------------------------------------------------------------ Files */

const questionBlock = z.object({ type: z.literal('question'), question: questionSchema }).strict();

/**
 * A plain union rather than a discriminated one: `code` carries a cross-field refinement
 * (runnable implies output), which Zod cannot express inside `discriminatedUnion`.
 */
export const anyBlock = z.union([textBlock, codeBlock, calloutBlock, questionBlock]);

export type LessonBlock = z.infer<typeof anyBlock>;

export const lessonFile = z
  .object({
    id: uuid,
    slug,
    title: localizedText,
    summary: localizedText.optional(),
    estimated_minutes: z.number().int().min(1).max(30),
    review_status: z.enum(REVIEW_STATUSES).default('draft'),
    blocks: z.array(anyBlock).min(1),
  })
  .strict();

export type LessonFile = z.infer<typeof lessonFile>;

export const moduleFile = z
  .object({
    id: uuid,
    slug,
    title: localizedText,
    description: localizedText.optional(),
    order_index: z.number().int().positive(),
    /** Omit to derive premium status from `app_config.free_module_count` (SPEC D5). */
    is_premium_override: z.boolean().optional(),
    estimated_minutes: z.number().int().nonnegative().default(0),
    lessons: z.array(slug).min(1, 'list the lesson files in the order they should be taken'),
  })
  .strict();

export type ModuleFile = z.infer<typeof moduleFile>;

export const examFile = z
  .object({
    id: uuid,
    slug,
    title: localizedText,
    description: localizedText.optional(),
    question_count: z.number().int().positive(),
    time_limit_minutes: z.number().int().positive().optional(),
    pass_threshold_pct: z.number().int().min(1).max(100).default(70),
    /** Omit for the free sample; 'premium' for the full exam (SPEC §27). */
    requires_entitlement: z.enum(['no_ads', 'premium']).optional(),
  })
  .strict();

export const courseFile = z
  .object({
    id: uuid,
    slug,
    title: localizedText,
    description: localizedText.optional(),
    language: z.string().default('python'),
    icon_key: z.string().optional(),
    order_index: z.number().int().nonnegative().default(0),
    // Modules are discovered by scanning `modules/*/module.yaml` and ordered by their own
    // `order_index`. Listing them here too would be a second place to forget to update.
    exams: z.array(examFile).default([]),
  })
  .strict();

export type CourseFile = z.infer<typeof courseFile>;
