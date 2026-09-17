import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { services, type AppConfigValues } from '@/services';

/**
 * Remote config as server state (SPEC §0.1.3 — config belongs to TanStack Query, not Zustand).
 *
 * The service already falls back to bundled defaults on failure, so this query resolves even
 * offline and the UI never needs an error branch for "we have no flags".
 */
export const useAppConfig = () =>
  useQuery<AppConfigValues>({
    queryKey: queryKeys.config(),
    queryFn: () => services.config.refresh(),
    staleTime: 5 * 60_000,
    // Bundled defaults render instantly on first launch; the fetched values replace them.
    // Always present, never undefined: SPEC §50 requires the app to work on its own defaults
    // before any network call, so every caller can read `data` without a null branch.
    initialData: () =>
      ({
          ads_enabled: services.config.get('ads_enabled'),
          subscriptions_enabled: services.config.get('subscriptions_enabled'),
          paywall_enabled: services.config.get('paywall_enabled'),
          leaderboard_enabled: services.config.get('leaderboard_enabled'),
          exams_enabled: services.config.get('exams_enabled'),
          daily_challenge_enabled: services.config.get('daily_challenge_enabled'),
          guest_mode_enabled: services.config.get('guest_mode_enabled'),
          coding_challenges_enabled: services.config.get('coding_challenges_enabled'),
          offline_mode_enabled: services.config.get('offline_mode_enabled'),
          free_module_count: services.config.get('free_module_count'),
          lives_max: services.config.get('lives_max'),
          min_user_age: services.config.get('min_user_age'),
          minor_protection_age: services.config.get('minor_protection_age'),
          content_version: services.config.get('content_version'),
          min_supported_app_version: services.config.get('min_supported_app_version'),
      }) satisfies AppConfigValues,
  });
