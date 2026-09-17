import { z } from 'zod';

import { localize } from '@/lib/content/localize';

import { getSupabaseClient } from '../supabase/client';
import type { ContentService, CourseOverview, ModuleSummary } from '../types';

/**
 * Course and module metadata (SPEC §40, access matrix).
 *
 * Only what the client is allowed to read directly: courses, modules and lesson counts.
 * `lesson_contents` and `questions` are RPC-only and arrive in Phase 7 — a direct select on
 * either is refused by the grant layer, which is exactly the intended behaviour.
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
const isLocked = (
  orderIndex: number,
  override: boolean | null,
  freeModuleCount: number,
): boolean => override ?? orderIndex > freeModuleCount;

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
};

/** Exported for unit tests — the lock rule is pure and worth pinning. */
export const moduleIsLocked = isLocked;
