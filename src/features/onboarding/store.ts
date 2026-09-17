import { create } from 'zustand';

import type { DailyGoalMinutes, ExperienceLevel, Motivation } from '@/services';

import type { DraftAnswers } from './logic/steps';

/**
 * Onboarding answers while the user is still answering (SPEC §0.1.3: transient client state
 * belongs to Zustand, not to TanStack Query).
 *
 * Nothing is written to the server until the last step. Saving each answer as it is given
 * would leave a half-filled profile behind for everyone who abandons the flow, and would cost
 * six round trips instead of one.
 *
 * The exception is the age gate, which acts immediately: a user below the minimum age has
 * their account deleted there and then, because SPEC §41 says the account must not exist.
 */
interface OnboardingState {
  draft: DraftAnswers;
  setBirthYear: (birthYear: number) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;
  setMotivation: (motivation: Motivation) => void;
  setDailyGoal: (minutes: DailyGoalMinutes) => void;
  setReminderTime: (time: string | null) => void;
  setAnalyticsConsent: (granted: boolean) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  draft: {},
  setBirthYear: (birthYear) => set((s) => ({ draft: { ...s.draft, birthYear } })),
  setExperienceLevel: (experienceLevel) => set((s) => ({ draft: { ...s.draft, experienceLevel } })),
  setMotivation: (motivation) => set((s) => ({ draft: { ...s.draft, motivation } })),
  setDailyGoal: (dailyGoalMinutes) => set((s) => ({ draft: { ...s.draft, dailyGoalMinutes } })),
  setReminderTime: (reminderTime) => set((s) => ({ draft: { ...s.draft, reminderTime } })),
  setAnalyticsConsent: (analyticsConsent) => set((s) => ({ draft: { ...s.draft, analyticsConsent } })),
  reset: () => set({ draft: {} }),
}));
