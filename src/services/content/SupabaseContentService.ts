import { z } from 'zod';

import { localize } from '@/lib/content/localize';

import { getSupabaseClient } from '../supabase/client';
import {
  LessonUnavailableError,
  type ContentService,
  type CourseOverview,
  type LessonErrorReason,
  type LessonSummary,
  type ModuleSummary,
} from '../types';

import { answerResult, lessonResponse } from './lessonSchema';

/**
 * Content reads (SPEC §40, access matrix).
 *
 * Courses, modules and lesson metadata are selected directly — the client is allowed to read
 * them. `lesson_contents` and `questions` are not: they have no grants and no policies, so a
 * direct select is refused by the grant layer. They come through `get_lesson`, which checks
 * the entitlement first and never returns explanations or answers.
 */

const SELECT =
  'id, slug, title, description, order_index, ' +
  'modules(id, slug, title, description, order_index, estimated_minutes, is_premium_override, ' +
  'is_active, lessons(count))';

const countSchema = z.array(z.object({ count: z.number() })).default([]);

const moduleRow = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.unknown(),
  description: z.unknown(),
  order_index: z.number(),
  estimated_minutes: z.number(),
  is_premium_override: z.boolean().nullable(),
  is_active: z.boolean(),
  lessons: countSchema,
});

const courseRow = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.unknown(),
  description: z.unknown(),
  order_index: z.number(),
  modules: z.array(moduleRow).default([]),
});

/**
 * Whether a module sits beyond the free boundary (SPEC D5).
 *
 * This is for DISPLAY only — showing a padlock. Access is decided by `can_access_module()` on
 * the server, so a client that lies to itself here gains nothing but a misleading icon.
 */
const isLocked = (orderIndex: number, override: boolean | null, freeModuleCount: number): boolean =>
  override ?? orderIndex > freeModuleCount;

export const SupabaseContentService: ContentService = {
  serviceName: 'SupabaseContentService',
  isNoop: false,

  async getCourseOverview(courseSlug, locale, freeModuleCount): Promise<CourseOverview | null> {
    const { data, error } = await getSupabaseClient()
      .from('courses')
      .select(SELECT)
      .eq('slug', courseSlug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (data === null) return null;

    const parsed = courseRow.parse(data);

    const modules: ModuleSummary[] = parsed.modules
      .filter((module) => module.is_active)
      .sort((a, b) => a.order_index - b.order_index)
      .map((module) => ({
        id: module.id,
        slug: module.slug,
        title: localize(module.title, locale),
        description: localize(module.description, locale),
        orderIndex: module.order_index,
        estimatedMinutes: module.estimated_minutes,
        lessonCount: module.lessons[0]?.count ?? 0,
        isLocked: isLocked(module.order_index, module.is_premium_override, freeModuleCount),
      }));

    return {
      id: parsed.id,
      slug: parsed.slug,
      title: localize(parsed.title, locale),
      description: localize(parsed.description, locale),
      modules,
    };
  },

  async getModuleLessons(moduleId, locale): Promise<LessonSummary[]> {
    // `lessons` holds metadata only and is readable directly (SPEC §40 access matrix); the
    // body lives in `lesson_contents`, which is not.
    const { data, error } = await getSupabaseClient()
      .from('lessons')
      .select('id, slug, title, summary, order_index, estimated_minutes')
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .order('order_index');

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localize(row.title, locale),
      summary: localize(row.summary, locale),
      orderIndex: row.order_index,
      estimatedMinutes: row.estimated_minutes,
    }));
  },

  async getLesson(lessonId, locale) {
    const { data, error } = await getSupabaseClient().rpc('get_lesson', {
      p_lesson_id: lessonId,
      p_locale: locale,
    });

    if (error) throw new LessonUnavailableError(toLessonReason(error));

    // Parsed, not trusted: the payload is assembled by hand in SQL, so a shape mistake should
    // surface here rather than inside a renderer three components deeper.
    return lessonResponse.parse(data);
  },

  async submitAnswer(questionId, answer, context, locale) {
    const { data, error } = await getSupabaseClient().rpc('submit_answer', {
      p_question_id: questionId,
      p_answer: answer as never,
      p_context: context,
      p_locale: locale,
    });

    if (error) throw new LessonUnavailableError(toLessonReason(error));
    return answerResult.parse(data);
  },
};

/**
 * Maps the RPC's error to something the UI can act on.
 *
 * `42501` is the paywall and `P0002` is a missing lesson — very different screens. Anything
 * else is genuinely unexpected and gets the generic retry.
 */
const toLessonReason = (error: { code?: string | null } | null): LessonErrorReason => {
  if (error?.code === '42501') return 'requires-premium';
  if (error?.code === 'P0002') return 'not-found';
  return 'unknown';
};

/** Exported for unit tests — the lock rule is pure and worth pinning. */
export const moduleIsLocked = isLocked;

export const lessonErrorReason = toLessonReason;
