import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query owns SERVER state only (SPEC §0.1.3): content, progress, leaderboard, config.
 * Client state (active lesson session, UI, settings) lives in Zustand.
 *
 * Content queries are keyed by `content_version` (SPEC §35), so publishing content invalidates
 * every client's cache without any push mechanism.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // V1 is online-only (SPEC §36); retry briefly, then surface an error state with Retry.
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Gameplay mutations are server-authoritative and idempotent via the XP ledger
        // (SPEC §19), but a blind retry could still double-submit a UI action. Retry is
        // opted into per mutation instead.
        retry: 0,
      },
    },
  });

/** Query key factory — one place, so cache invalidation is mechanical (see PLAN.md §5.1). */
export const queryKeys = {
  config: () => ['config'] as const,
  content: {
    course: (contentVersion: number, courseId: string) =>
      ['content', contentVersion, 'course', courseId] as const,
    lesson: (contentVersion: number, lessonId: string) =>
      ['content', contentVersion, 'lesson', lessonId] as const,
  },
  user: {
    profile: (userId: string) => ['user', userId, 'profile'] as const,
    home: (userId: string) => ['user', userId, 'home'] as const,
    progress: (userId: string) => ['user', userId, 'progress'] as const,
    stats: (userId: string) => ['user', userId, 'stats'] as const,
    achievements: (userId: string) => ['user', userId, 'achievements'] as const,
  },
  leaderboard: (weekStart: string) => ['leaderboard', weekStart] as const,
  entitlements: (userId: string) => ['entitlements', userId] as const,
} as const;
