import { Platform } from 'react-native';
import {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

import { isDevelopment } from '@/lib/env';

import type { ConsentService, ConsentState, ConsentStatus } from '../types';

import type { AttStatus } from '@/features/ads/logic/personalization';

/**
 * Google UMP consent, plus iOS App Tracking Transparency (SPEC §41).
 *
 * The order is fixed and it matters: **UMP first, ATT second**. Two permission sheets arriving
 * together is how both get dismissed, and Apple requires ATT to be the last thing asked before
 * tracking begins. `shouldRequestAtt` enforces that the second only happens after the first has
 * been answered.
 *
 * This service never decides whether an ad is personalized — `decidePersonalization` does, from
 * the state reported here plus the learner's age. Keeping the decision pure is what makes it
 * testable, and it is a decision worth being able to test.
 */

const toStatus = (status: AdsConsentStatus): ConsentStatus => {
  switch (status) {
    case AdsConsentStatus.OBTAINED:
      return 'obtained';
    case AdsConsentStatus.REQUIRED:
      return 'required';
    case AdsConsentStatus.NOT_REQUIRED:
      return 'not-required';
    default:
      return 'unknown';
  }
};

const toAttStatus = (status: string): AttStatus => {
  switch (status) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'restricted':
      return 'restricted';
    case 'undetermined':
      return 'not-determined';
    default:
      return 'unavailable';
  }
};

const EMPTY: ConsentState = {
  adsStatus: 'unknown',
  canRequestPersonalizedAds: false,
  analyticsGranted: false,
  canRequestAds: false,
  privacyOptionsRequired: false,
};

let state: ConsentState = EMPTY;

/** Folds one UMP info response into our own shape. */
const fromInfo = (
  info: {
    status: AdsConsentStatus;
    canRequestAds: boolean;
    privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus;
  },
  analyticsGranted: boolean,
): ConsentState => ({
  adsStatus: toStatus(info.status),
  canRequestPersonalizedAds: info.status === AdsConsentStatus.OBTAINED,
  analyticsGranted,
  canRequestAds: info.canRequestAds,
  privacyOptionsRequired:
    info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
});

let attStatus: AttStatus = 'unavailable';

export const UmpConsentService: ConsentService = {
  serviceName: 'UmpConsentService',
  isNoop: false,

  async initialize() {
    // `debugGeography` forces the EEA form to appear on a device that is not in the EEA,
    // which is the only way to see the flow a European learner sees without flying there.
    const info = await AdsConsent.requestInfoUpdate(
      isDevelopment() ? { debugGeography: AdsConsentDebugGeography.EEA } : undefined,
    );

    state = fromInfo(info, state.analyticsGranted);

    if (Platform.OS === 'ios') {
      attStatus = toAttStatus((await getTrackingPermissionsAsync()).status);
    }

    return state;
  },

  async requestIfNeeded() {
    // Shows the form only where one is required; elsewhere it resolves immediately.
    const info = await AdsConsent.gatherConsent();

    state = fromInfo(info, state.analyticsGranted);
    return state;
  },

  getState() {
    return state;
  },

  async openPrivacyOptions() {
    // The Settings entry point UMP requires, so consent can be withdrawn as easily as it was
    // given (SPEC §29, §41).
    await AdsConsent.showPrivacyOptionsForm();

    state = fromInfo(await AdsConsent.getConsentInfo(), state.analyticsGranted);
  },

  async setAnalyticsConsent(granted) {
    // Only held here; the authority is `profiles.analytics_consent`, which the server forces
    // to false for a minor whatever the client says (SPEC §41).
    state = { ...state, analyticsGranted: granted };
  },
};

/** The ATT state read at initialize, for `decidePersonalization`. */
export const trackingStatus = (): AttStatus => attStatus;

/**
 * Shows the iOS tracking prompt, and records what was answered.
 *
 * Deliberately not part of `ConsentService`: whether to ask at all is
 * `shouldRequestAtt`'s decision, and this only carries it out.
 */
export const requestTracking = async (): Promise<AttStatus> => {
  if (Platform.OS !== 'ios') return 'unavailable';

  attStatus = toAttStatus((await requestTrackingPermissionsAsync()).status);
  return attStatus;
};
