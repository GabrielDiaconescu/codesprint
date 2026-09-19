/**
 * When an interstitial may interrupt (SPEC §30, §34).
 *
 * Every rule here is a restriction, and the defaults are deliberately timid. An interstitial
 * is the most intrusive thing this product does to a learner who has not paid, and the
 * difference between "acceptable" and "uninstalled" is entirely a question of when it appears.
 *
 * Pure, so each restriction is a unit test rather than an afternoon of tapping through
 * lessons with a stopwatch.
 */

export interface InterstitialRules {
  /** `interstitial_min_minutes_between`, default 5. */
  minMinutesBetween: number;
  /** `interstitial_max_per_day`, default 4. */
  maxPerDay: number;
  /** `interstitial_grace_lessons`, default 3. */
  graceLessons: number;
}

export interface InterstitialContext {
  /** Epoch millis of the last interstitial, or null if none this install. */
  lastShownAt: number | null;
  shownToday: number;
  /** Lessons the learner has ever completed — the grace period is about being new. */
  lessonsCompleted: number;
  /** Epoch millis when the app became interactive this session. */
  sessionStartedAt: number;
  now: number;
  adsAllowed: boolean;
}

export type InterstitialDecision =
  | { show: true }
  | {
      show: false;
      reason: 'not-allowed' | 'grace' | 'daily-cap' | 'too-soon' | 'just-launched';
    };

/**
 * How long after launch an interstitial is never shown.
 *
 * SPEC §30 says "never right after launch" without a number. Thirty seconds is the
 * interpretation: long enough that the ad is attached to something the learner did rather
 * than to opening the app, short enough that it does not become a fourth de-facto cap.
 */
export const LAUNCH_QUIET_MS = 30_000;

export const shouldShowInterstitial = (
  context: InterstitialContext,
  rules: InterstitialRules,
): InterstitialDecision => {
  // Entitlement, the kill switch and consent are all folded into this one flag by the
  // caller — and it is checked first, because everything below is about pacing an ad that
  // this learner may not be shown at all.
  if (!context.adsAllowed) return { show: false, reason: 'not-allowed' };

  // Somebody still learning what the app is gets no interstitials at all (SPEC §30).
  if (context.lessonsCompleted < rules.graceLessons) return { show: false, reason: 'grace' };

  if (context.shownToday >= rules.maxPerDay) return { show: false, reason: 'daily-cap' };

  if (context.now - context.sessionStartedAt < LAUNCH_QUIET_MS) {
    return { show: false, reason: 'just-launched' };
  }

  if (
    context.lastShownAt !== null &&
    context.now - context.lastShownAt < rules.minMinutesBetween * 60_000
  ) {
    return { show: false, reason: 'too-soon' };
  }

  return { show: true };
};

/**
 * Whether ads may be requested at all for this learner.
 *
 * SPEC §30 is specific that the entitlement is checked **before loading**, not before
 * showing: an ad fetched for a paying subscriber has already cost them bandwidth and told an
 * ad network they exist, even if it is never rendered.
 */
export interface AdEligibility {
  isAdFree: boolean;
  adsEnabledRemotely: boolean;
  /** UMP resolved one way or the other. 'required' means the form has not been answered. */
  consentResolved: boolean;
}

export const canRequestAds = (eligibility: AdEligibility): boolean =>
  !eligibility.isAdFree && eligibility.adsEnabledRemotely && eligibility.consentResolved;
