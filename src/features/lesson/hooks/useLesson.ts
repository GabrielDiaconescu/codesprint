import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { queryKeys } from '@/lib/queryClient';
import { services, type LessonResponse, type LessonSummary } from '@/services';

/**
 * A lesson's blocks (SPEC §15, §35).
 *
 * Keyed by `content_version`, so republishing a lesson invalidates it everywhere, and by
 * locale. `retry: false` is deliberate: the two interesting failures — needing Premium and a
 * withdrawn lesson — will never succeed on a retry, and retrying them three times just makes
 * the paywall take two seconds to appear.
 */
export const useLesson = (lessonId: string | undefined) => {
  const { i18n } = useTranslation();
  const { data: config } = useAppConfig();

  return useQuery<LessonResponse>({
    queryKey: queryKeys.content.lesson(config.content_version, `${lessonId}:${i18n.language}`),
    queryFn: () => services.content.getLesson(lessonId!, i18n.language),
    enabled: typeof lessonId === 'string' && lessonId.length > 0,
    staleTime: 30 * 60_000,
    retry: false,
  });
};

/** The lessons of one module, for the module screen. */
export const useModuleLessons = (moduleId: string | undefined) => {
  const { i18n } = useTranslation();
  const { data: config } = useAppConfig();

  return useQuery<LessonSummary[]>({
    queryKey: queryKeys.content.moduleLessons(
      config.content_version,
      `${moduleId}:${i18n.language}`,
    ),
    queryFn: () => services.content.getModuleLessons(moduleId!, i18n.language),
    enabled: typeof moduleId === 'string' && moduleId.length > 0,
    staleTime: 30 * 60_000,
  });
};
