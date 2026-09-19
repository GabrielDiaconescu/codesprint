import {
  LAUNCH_QUIET_MS,
  canRequestAds,
  shouldShowInterstitial,
  type InterstitialContext,
  type InterstitialRules,
} from '../frequency';

/**
 * Interstitial pacing (SPEC §30).
 *
 * Every test here is the app deciding NOT to show an ad. That is the point: an interstitial is
 * the most intrusive thing this product does to a learner who has not paid, and the difference
 * between "acceptable" and "uninstalled" is entirely when it appears.
 */

const NOW = Date.parse('2026-09-19T12:00:00Z');

const rules: InterstitialRules = { minMinutesBetween: 5, maxPerDay: 4, graceLessons: 3 };

const context = (patch: Partial<InterstitialContext> = {}): InterstitialContext => ({
  lastShownAt: null,
  shownToday: 0,
  lessonsCompleted: 10,
  sessionStartedAt: NOW - 10 * 60_000,
  now: NOW,
  adsAllowed: true,
  ...patch,
});

describe('shouldShowInterstitial', () => {
  it('shows at a natural break for an established learner', () => {
    expect(shouldShowInterstitial(context(), rules)).toEqual({ show: true });
  });

  it('never shows to somebody who may not be shown ads at all', () => {
    // Entitlement, kill switch and consent all fold into this flag, and it is checked first.
    expect(shouldShowInterstitial(context({ adsAllowed: false }), rules)).toEqual({
      show: false,
      reason: 'not-allowed',
    });
  });

  describe('the beginner grace period', () => {
    it.each([0, 1, 2])('says nothing after lesson %i', (lessonsCompleted) => {
      expect(shouldShowInterstitial(context({ lessonsCompleted }), rules)).toEqual({
        show: false,
        reason: 'grace',
      });
    });

    it('opens up once the third lesson is done', () => {
      expect(shouldShowInterstitial(context({ lessonsCompleted: 3 }), rules)).toEqual({
        show: true,
      });
    });
  });

  describe('the daily cap', () => {
    it('allows the fourth', () => {
      expect(shouldShowInterstitial(context({ shownToday: 3 }), rules)).toEqual({ show: true });
    });

    it('refuses the fifth', () => {
      expect(shouldShowInterstitial(context({ shownToday: 4 }), rules)).toEqual({
        show: false,
        reason: 'daily-cap',
      });
    });

    it('is a cap, not a counter — being over it still refuses', () => {
      expect(shouldShowInterstitial(context({ shownToday: 99 }), rules)).toEqual({
        show: false,
        reason: 'daily-cap',
      });
    });
  });

  describe('the quiet period after launch', () => {
    it('refuses in the first seconds of a session', () => {
      // SPEC §30: never right after launch. An ad attached to opening the app reads as the
      // app's purpose rather than as the price of something the learner just did.
      expect(shouldShowInterstitial(context({ sessionStartedAt: NOW - 5_000 }), rules)).toEqual({
        show: false,
        reason: 'just-launched',
      });
    });

    it('allows once the quiet period has passed', () => {
      expect(
        shouldShowInterstitial(context({ sessionStartedAt: NOW - LAUNCH_QUIET_MS - 1 }), rules),
      ).toEqual({ show: true });
    });
  });

  describe('the gap between ads', () => {
    it('refuses within the configured minutes', () => {
      expect(shouldShowInterstitial(context({ lastShownAt: NOW - 4 * 60_000 }), rules)).toEqual({
        show: false,
        reason: 'too-soon',
      });
    });

    it('allows once the gap has elapsed', () => {
      expect(shouldShowInterstitial(context({ lastShownAt: NOW - 5 * 60_000 }), rules)).toEqual({
        show: true,
      });
    });

    it('treats "never shown" as long enough ago', () => {
      expect(shouldShowInterstitial(context({ lastShownAt: null }), rules)).toEqual({
        show: true,
      });
    });
  });

  it('reports the FIRST reason it refuses, so the dev panel names one cause', () => {
    const blocked = context({
      adsAllowed: false,
      lessonsCompleted: 0,
      shownToday: 99,
      sessionStartedAt: NOW,
    });
    expect(shouldShowInterstitial(blocked, rules)).toEqual({ show: false, reason: 'not-allowed' });
  });

  describe('config, not the defaults it happens to ship with', () => {
    const strict: InterstitialRules = { minMinutesBetween: 60, maxPerDay: 1, graceLessons: 10 };

    it('honours a stricter daily cap', () => {
      expect(shouldShowInterstitial(context({ shownToday: 1 }), strict)).toEqual({
        show: false,
        reason: 'daily-cap',
      });
    });

    it('honours a longer grace period', () => {
      expect(shouldShowInterstitial(context({ lessonsCompleted: 9 }), strict)).toEqual({
        show: false,
        reason: 'grace',
      });
    });

    it('honours a longer gap', () => {
      expect(shouldShowInterstitial(context({ lastShownAt: NOW - 30 * 60_000 }), strict)).toEqual({
        show: false,
        reason: 'too-soon',
      });
    });
  });
});

describe('canRequestAds', () => {
  /**
   * SPEC §30 is specific that this is checked before LOADING, not before showing. An ad
   * fetched for a paying subscriber has already cost them bandwidth and told an ad network
   * they exist, even if it is never rendered.
   */
  it('is false for anybody who has paid to remove ads', () => {
    expect(canRequestAds({ isAdFree: true, adsEnabledRemotely: true, consentResolved: true })).toBe(
      false,
    );
  });

  it('is false while the remote kill switch is off', () => {
    expect(
      canRequestAds({ isAdFree: false, adsEnabledRemotely: false, consentResolved: true }),
    ).toBe(false);
  });

  it('is false until consent has been resolved one way or the other', () => {
    expect(
      canRequestAds({ isAdFree: false, adsEnabledRemotely: true, consentResolved: false }),
    ).toBe(false);
  });

  it('is true only when all three agree', () => {
    expect(
      canRequestAds({ isAdFree: false, adsEnabledRemotely: true, consentResolved: true }),
    ).toBe(true);
  });
});
