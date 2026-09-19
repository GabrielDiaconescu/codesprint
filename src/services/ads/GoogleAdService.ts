import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import {
  decidePersonalization,
  maxContentRating,
  shouldRequestAtt,
  tagForUnderAgeOfConsent,
} from '@/features/ads/logic/personalization';

import { requestTracking, trackingStatus } from '../consent/UmpConsentService';
import type { AdService, RewardType } from '../types';

import { adUnitId } from './config';

/**
 * Google AdMob (SPEC §30).
 *
 * The only file in the app allowed to import `react-native-google-mobile-ads` — enforced by
 * ESLint and proven by `src/__tests__/architecture.test.ts`.
 *
 * What it deliberately does NOT contain is policy. Whether a learner may see an ad at all,
 * whether it may be personalized, and how often an interstitial may interrupt are decided by
 * the pure functions in `features/ads/logic`, which have tests. This file loads and shows what
 * it is told to, and it refuses to do even that until `initialize()` has run.
 *
 * Rewarded ads grant nothing here. AdMob reports that the reward was earned; the server
 * decides whether to honour it, under a daily cap (SPEC §30, §42).
 */

interface Gate {
  isAdFree: boolean;
  adsEnabledRemotely: boolean;
  isProtectedMinor: boolean;
  adsConsentObtained: boolean;
  consentResolved: boolean;
}

let gate: Gate = {
  // Fails closed until told otherwise: before the entitlement and consent are known, the
  // safest assumption is that this learner must not be shown an ad.
  isAdFree: true,
  adsEnabledRemotely: false,
  isProtectedMinor: true,
  adsConsentObtained: false,
  consentResolved: false,
};

let initialized = false;

/** Kept so a non-personalized request stays non-personalized (SPEC §41). */
const requestOptions = () => {
  const decision = decidePersonalization({
    isProtectedMinor: gate.isProtectedMinor,
    adsConsentObtained: gate.adsConsentObtained,
    att: trackingStatus(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });

  return {
    requestNonPersonalizedAdsOnly: !decision.personalized,
    tagForUnderAgeOfConsent: tagForUnderAgeOfConsent(gate.isProtectedMinor),
  };
};

/**
 * Tells the service who it is serving.
 *
 * Called by `useAdsBootstrap` whenever the entitlement, the remote flag, the learner's age or
 * their consent changes. Everything else here reads this and nothing else.
 */
export const setAdGate = (next: Gate): void => {
  gate = next;
};

export const GoogleAdService: AdService = {
  serviceName: 'GoogleAdService',
  isNoop: false,

  async initialize() {
    if (initialized) return;

    // ATT comes AFTER UMP (SPEC §41), which `shouldRequestAtt` enforces by requiring consent
    // to have been obtained first.
    if (
      shouldRequestAtt({
        isProtectedMinor: gate.isProtectedMinor,
        adsConsentObtained: gate.adsConsentObtained,
        att: trackingStatus(),
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      })
    ) {
      await requestTracking();
    }

    await mobileAds().setRequestConfiguration({
      maxAdContentRating:
        maxContentRating(gate.isProtectedMinor) === 'G'
          ? MaxAdContentRating.G
          : MaxAdContentRating.PG,
      // The product's floor is 13 (D10), so there are no under-13 users to tag as
      // child-directed — claiming otherwise would misdescribe the audience to Google.
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: tagForUnderAgeOfConsent(gate.isProtectedMinor),
    });

    await mobileAds().initialize();
    initialized = true;
  },

  canShowAds() {
    return initialized && !gate.isAdFree && gate.adsEnabledRemotely && gate.consentResolved;
  },

  showBanner() {
    // Banners are a rendered component (`BannerSlot`), not an imperative call: they live in
    // the layout of the two screens allowed to have one, and unmount with them.
  },

  hideBanner() {
    // Same — unmounting the component is what hides it.
  },

  async showInterstitial() {
    if (!this.canShowAds()) return false;

    // Loaded fresh each time rather than kept warm: an ad held across a paywall purchase
    // would be one loaded for somebody who has since paid to not see it.
    const ad = InterstitialAd.createForAdRequest(adUnitId('interstitial'), requestOptions());

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (shown: boolean) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        resolve(shown);
      };

      const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => ad.show());
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => done(true));
      // A failure to fill is completely normal and must never surface to the learner.
      const offError = ad.addAdEventListener(AdEventType.ERROR, () => done(false));

      const unsubscribe = () => {
        offLoaded();
        offClosed();
        offError();
      };

      ad.load();
    });
  },

  async showRewarded(_rewardType: RewardType) {
    if (!this.canShowAds()) return false;

    const ad = RewardedAd.createForAdRequest(adUnitId('rewarded'), requestOptions());

    return new Promise<boolean>((resolve) => {
      let earned = false;
      let settled = false;

      const done = () => {
        if (settled) return;
        settled = true;
        unsubscribe();
        // True only if the reward event fired. Closing early earns nothing, which is the
        // whole contract of a rewarded ad.
        resolve(earned);
      };

      const offLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show());
      const offEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, done);
      const offError = ad.addAdEventListener(AdEventType.ERROR, done);

      const unsubscribe = () => {
        offLoaded();
        offEarned();
        offClosed();
        offError();
      };

      ad.load();
    });
  },
};

/** Test-only: lets a test start from a known state. */
export const resetAdServiceForTests = (): void => {
  initialized = false;
};
