import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { services, type OnboardingAnswers, type UserProfile } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

import { refuseUnderageAccount } from '../logic/refuseUnderage';
import { useOnboardingStore } from '../store';

/**
 * Submits the whole flow in one call and seeds the cache with the row that comes back
 * (SPEC §11).
 *
 * Writing the returned profile straight into the cache matters here: the router decides
 * between onboarding and the app from `onboardingCompleted`, so waiting for a refetch would
 * leave the user on the last onboarding screen after they had finished it.
 */
export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);
  const resetDraft = useOnboardingStore((state) => state.reset);

  return useMutation<UserProfile, Error, OnboardingAnswers>({
    mutationFn: (answers) => services.profile.completeOnboarding(answers),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.user.profile(userId ?? 'none'), profile);
      resetDraft();

      // The onboarding-completion KPI (SPEC §43). Enums only: the daily goal in minutes and
      // the experience level, never the birth year.
      services.analytics.capture('onboarding_completed', {
        daily_goal_minutes: profile.dailyGoalMinutes,
        experience_level: profile.experienceLevel,
      });
    },
  });
};

/**
 * Refuses an account to someone below the minimum age (SPEC §11, §41).
 *
 * The account is deleted, not merely signed out: for a registered user, signing out would
 * leave a child's email address stored indefinitely.
 *
 * The sign-out afterwards is local cleanup. It is deliberately not conditional on the delete
 * succeeding — if the server call fails, the user must still not end up inside the app.
 *
 * `showRefusal` navigates to the refusal screen, and runs BEFORE the sign-out; the order and
 * the reason for it are in `logic/refuseUnderage.ts`.
 */
export const useRejectUnderageAccount = ({ showRefusal }: { showRefusal: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () =>
      refuseUnderageAccount({
        deleteAccount: () => services.profile.rejectUnderageAccount(),
        showRefusal,
        signOut: async () => {
          await services.auth.signOut();
          queryClient.clear();
        },
      }),
  });
};
