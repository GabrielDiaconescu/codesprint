import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

import { getEnv, isProduction } from '@/lib/env';
import type { AdPlacement } from '../types';

/**
 * Ad unit configuration (SPEC §30, §56, §59.31).
 *
 * The rule this file exists to make unbreakable: **every non-production build serves Google's
 * test ads.** Tapping a live ad in development is what gets an AdMob account suspended, and
 * the account is not something you get back by apologising — so the choice is made once,
 * here, from `EXPO_PUBLIC_APP_ENV`, rather than left to whoever is wiring up a screen.
 *
 * `TestIds` comes from the SDK rather than being copied out of Google's documentation, so the
 * strings cannot drift and there is no hardcoded ad unit anywhere in this codebase.
 */

export type AdFormat = 'banner' | 'interstitial' | 'rewarded';

/**
 * Where a banner may appear (SPEC §30).
 *
 * A closed list, deliberately. Banners are forbidden on lessons, practice, exams, the
 * explanation panel and the paywall — the screens where a learner is concentrating or being
 * asked for money. Making the permitted places an enumeration means a new screen cannot
 * quietly acquire one.
 */
export const BANNER_PLACEMENTS: readonly AdPlacement[] = ['learn-list', 'leaderboard'];

export const isBannerPlacementAllowed = (placement: string): placement is AdPlacement =>
  (BANNER_PLACEMENTS as readonly string[]).includes(placement);

const productionUnit = (format: AdFormat): string | undefined => {
  const env = getEnv();
  const ios = Platform.OS === 'ios';

  switch (format) {
    case 'banner':
      return ios ? env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS : env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID;
    case 'interstitial':
      return ios
        ? env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS
        : env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID;
    case 'rewarded':
      return ios
        ? env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS
        : env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID;
  }
};

const TEST_UNITS: Record<AdFormat, string> = {
  banner: TestIds.BANNER,
  interstitial: TestIds.INTERSTITIAL,
  rewarded: TestIds.REWARDED,
};

/**
 * The ad unit to request.
 *
 * Falls back to the test unit when a production id is missing rather than requesting an
 * empty string: a build that forgot to set one should show a test ad and be obviously wrong,
 * not fail silently. Env validation catches it first in a real production build.
 */
export const adUnitId = (format: AdFormat): string =>
  (isProduction() ? productionUnit(format) : undefined) ?? TEST_UNITS[format];

/** True when this build is serving Google's test inventory — surfaced in the dev banner. */
export const usesTestAds = (): boolean => !isProduction() || productionUnit('banner') === undefined;
