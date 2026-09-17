import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { queryKeys } from '@/lib/queryClient';
import { services, type CourseOverview } from '@/services';

/** The launch course (SPEC §14). Later courses arrive through `available_course_ids`. */
export const DEFAULT_COURSE_SLUG = 'python-fundamentals';

/**
 * Course and module metadata for the Learn screen.
 *
 * Keyed by `content_version` (SPEC §35), so publishing new content invalidates every client's
 * cache without any push mechanism — and by locale, so switching language cannot show the
 * previous one's titles.
 *
 * `staleTime` is long on purpose: content changes when it is published, not while someone is
 * reading it, and the version key already handles the change.
 */
export const useCourseOverview = (courseSlug: string = DEFAULT_COURSE_SLUG) => {
  const { i18n } = useTranslation();
  const { data: config } = useAppConfig();

  const contentVersion = config.content_version;
  const freeModuleCount = config.free_module_count;
  const locale = i18n.language;

  return useQuery<CourseOverview | null>({
    queryKey: queryKeys.content.overview(contentVersion, courseSlug, locale),
    queryFn: () => services.content.getCourseOverview(courseSlug, locale, freeModuleCount),
    staleTime: 30 * 60_000,
  });
};
