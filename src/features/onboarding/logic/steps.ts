import type { OnboardingAnswers } from '@/services';

/**
 * The onboarding sequence (SPEC §11: at most six screens, skippable where possible).
 *
 * The order is not arbitrary. The age gate is first because its outcome can end the flow
 * entirely — asking someone their motivation and then telling them they cannot have an
 * account would be both rude and a waste of their time. Consent is last because the reminder
 * screen is what makes notification permission meaningful.
 */
export const ONBOARDING_STEPS = [
  'age',
  'experience',
  'motivation',
  'goal',
  'reminder',
  'consent',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_COUNT = ONBOARDING_STEPS.length;

export const stepNumber = (step: OnboardingStep): number => ONBOARDING_STEPS.indexOf(step) + 1;

/** 0 to 1, for the progress bar at the top of every step. */
export const stepProgress = (step: OnboardingStep): number => stepNumber(step) / STEP_COUNT;

export const nextStep = (step: OnboardingStep): OnboardingStep | null =>
  ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null;

/** Partial answers, accumulated across steps before a single submit at the end. */
export type DraftAnswers = Partial<OnboardingAnswers>;

/**
 * Whether the draft is ready to submit.
 *
 * `reminderTime` is intentionally absent: null is a real answer there — "no reminder" —
 * so requiring it would force a choice the spec says is skippable.
 */
export const isComplete = (draft: DraftAnswers): draft is OnboardingAnswers =>
  typeof draft.birthYear === 'number' &&
  draft.experienceLevel !== undefined &&
  draft.motivation !== undefined &&
  draft.dailyGoalMinutes !== undefined &&
  draft.analyticsConsent !== undefined;
