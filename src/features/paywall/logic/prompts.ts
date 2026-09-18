/**
 * When the app may suggest upgrading (SPEC §34).
 *
 * The rules exist to stop this product nagging. Every one of them is a restriction, and the
 * defaults are deliberately quiet: once a day, never during a lesson, and never before the
 * learner has finished one — somebody who has not yet seen what the app does cannot judge
 * whether the paid version is worth it (SPEC §33).
 *
 * Pure, so "would this nag?" is a unit test rather than a day of tapping.
 */

export const PAYWALL_TRIGGERS = [
  /** They hit the free module boundary (SPEC §34). */
  'module_locked',
  /** They ran out of lives. */
  'out_of_lives',
  /** They opened a hard practice set or the full exam. */
  'premium_feature',
  /** An interstitial ad just finished (Phase 15). */
  'after_ad',
  /** They opened it themselves, from Profile or a card. */
  'manual',
] as const;

export type PaywallTrigger = (typeof PAYWALL_TRIGGERS)[number];

export interface PromptContext {
  /** Prompts already shown on the learner's current local day. */
  shownToday: number;
  maxPerDay: number;
  /** True while a lesson, practice set, challenge or exam is in progress. */
  inSession: boolean;
  /** Lessons finished ever. */
  lessonsCompleted: number;
  /** Already paying for something — there is nothing to sell. */
  isAdFree: boolean;
  isPremium: boolean;
  paywallEnabled: boolean;
}

export type PromptDecision =
  | { show: true }
  | {
      show: false;
      reason: 'disabled' | 'entitled' | 'in-session' | 'no-lesson-yet' | 'daily-cap';
    };

/**
 * Whether an automatic upgrade prompt may appear.
 *
 * `manual` bypasses everything except "you already own it": when somebody taps "See Premium"
 * they have asked, and refusing to show it because of a frequency cap would be absurd.
 */
export const shouldPrompt = (trigger: PaywallTrigger, context: PromptContext): PromptDecision => {
  if (!context.paywallEnabled) return { show: false, reason: 'disabled' };

  // Nothing left to sell. `premium_feature` still shows for a No Ads subscriber, because
  // Premium is genuinely a different thing (SPEC §5) — but never to a Premium one.
  if (context.isPremium) return { show: false, reason: 'entitled' };
  if (context.isAdFree && trigger !== 'premium_feature' && trigger !== 'manual') {
    return { show: false, reason: 'entitled' };
  }

  if (trigger === 'manual') return { show: true };

  // Never mid-lesson (SPEC §34). Interrupting somebody who is answering a question to ask for
  // money is the single most resented thing an app like this can do.
  if (context.inSession) return { show: false, reason: 'in-session' };

  // Not before they have seen what the product does (SPEC §33).
  if (context.lessonsCompleted < 1) return { show: false, reason: 'no-lesson-yet' };

  if (context.shownToday >= context.maxPerDay) return { show: false, reason: 'daily-cap' };

  return { show: true };
};

/** The i18n key for the sentence explaining why this prompt appeared. */
export const promptReasonKey = (trigger: PaywallTrigger): string => `trigger.${trigger}`;
