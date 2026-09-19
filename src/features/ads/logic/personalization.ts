/**
 * Personalized or not (SPEC §30, §41, D11).
 *
 * Three independent reasons to serve a non-personalized ad, and any one of them is enough:
 *
 *   1. the learner is under `minor_protection_age` (D11 — 16 by default);
 *   2. UMP says consent was not obtained;
 *   3. on iOS, App Tracking Transparency was not granted.
 *
 * Pure, and the failure mode is chosen deliberately: **anything unknown counts as "no"**. A
 * non-personalized ad earns less; a personalized ad served without a basis is a regulatory
 * problem and a store-policy problem. The asymmetry is not close.
 */

export type AttStatus = 'granted' | 'denied' | 'restricted' | 'not-determined' | 'unavailable';

export interface PersonalizationInputs {
  /** From `profiles.birth_year`, classified against `minor_protection_age`. */
  isProtectedMinor: boolean;
  /** UMP consent state for ad personalisation. */
  adsConsentObtained: boolean;
  /**
   * iOS only. `'unavailable'` on Android and on iOS versions without ATT, where the prompt
   * does not exist and personalisation does not depend on it.
   */
  att: AttStatus;
  platform: 'ios' | 'android';
}

export type PersonalizationDecision = {
  personalized: boolean;
  /** Why not, for the dev panel and for monitoring. Null when personalized. */
  blockedBy: 'minor' | 'no-consent' | 'att-denied' | null;
};

export const decidePersonalization = (inputs: PersonalizationInputs): PersonalizationDecision => {
  // Checked first because it is the one that cannot be consented away: a 14-year-old tapping
  // "accept" does not make personalised advertising to them lawful (SPEC §41).
  if (inputs.isProtectedMinor) return { personalized: false, blockedBy: 'minor' };

  if (!inputs.adsConsentObtained) return { personalized: false, blockedBy: 'no-consent' };

  // ATT only exists on iOS. Anything other than an explicit grant means no tracking, and
  // 'not-determined' counts as a no because the prompt has not been answered yet.
  if (inputs.platform === 'ios' && inputs.att !== 'granted' && inputs.att !== 'unavailable') {
    return { personalized: false, blockedBy: 'att-denied' };
  }

  return { personalized: true, blockedBy: null };
};

/**
 * Whether the iOS tracking prompt should be shown at all.
 *
 * Only after UMP has been answered (SPEC §41: "shown after UMP"), only on iOS, only when it
 * has not been answered already, and never to a minor — asking a 14-year-old for tracking
 * permission is a question that should not be put to them in the first place.
 */
export const shouldRequestAtt = (inputs: PersonalizationInputs): boolean =>
  inputs.platform === 'ios' &&
  inputs.att === 'not-determined' &&
  inputs.adsConsentObtained &&
  !inputs.isProtectedMinor;

/**
 * The `maxAdContentRating` to request.
 *
 * `G` for a learner under the protection age, so no ad the network considers unsuitable for
 * general audiences is served. `PG` otherwise — this is a product used by teenagers, and the
 * store age rating is 13+ (SPEC §41).
 */
export const maxContentRating = (isProtectedMinor: boolean): 'G' | 'PG' =>
  isProtectedMinor ? 'G' : 'PG';

/**
 * Whether to tag the request as directed to children under the relevant age.
 *
 * `tagForUnderAgeOfConsent` is the GDPR-specific flag. The product's floor is 13 (D10), so
 * `tagForChildDirectedTreatment` (COPPA, under 13) is never set — there are no under-13 users
 * to tag, and claiming otherwise would misdescribe the audience to Google.
 */
export const tagForUnderAgeOfConsent = (isProtectedMinor: boolean): boolean => isProtectedMinor;
