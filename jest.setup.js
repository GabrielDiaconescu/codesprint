// RNTL v13+ registers its Jest matchers (toBeOnTheScreen, ...) automatically on import,
// so no extend-expect entry point is needed.

// Tests must never depend on the developer's local .env.
process.env.EXPO_PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

// Initialise i18n once for the whole suite.
//
// Components read their copy through useTranslation, so without this they render raw keys
// ("answering.comingSoon") and every assertion on visible text is meaningless. Initialising
// the real instance rather than stubbing it means the tests also assert the actual English
// strings, which catches a missing key as a failing test instead of a key on screen.
require('./src/i18n').initI18n();

/**
 * AdMob and App Tracking Transparency are native modules: `TurboModuleRegistry.getEnforcing`
 * throws the moment they are imported under Jest, which would take out any test that reaches
 * the service registry.
 *
 * Mocked rather than tested. The SDK is not ours to verify — what IS ours is the policy that
 * decides whether an ad may be shown, whether it may be personalized and how often it may
 * interrupt, and all of that lives in pure functions in `features/ads/logic` with real tests.
 */
jest.mock('react-native-google-mobile-ads', () => {
  const noop = () => () => {};
  const ad = {
    addAdEventListener: noop,
    load: jest.fn(),
    show: jest.fn(),
  };

  return {
    __esModule: true,
    default: () => ({
      initialize: jest.fn().mockResolvedValue([]),
      setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
    }),
    TestIds: {
      BANNER: 'test/banner',
      INTERSTITIAL: 'test/interstitial',
      REWARDED: 'test/rewarded',
    },
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'earned_reward' },
    MaxAdContentRating: { G: 'G', PG: 'PG' },
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    BannerAd: () => null,
    InterstitialAd: { createForAdRequest: () => ad },
    RewardedAd: { createForAdRequest: () => ad },
    AdsConsent: {
      requestInfoUpdate: jest.fn(),
      gatherConsent: jest.fn(),
      getConsentInfo: jest.fn(),
      showPrivacyOptionsForm: jest.fn(),
    },
    AdsConsentStatus: {
      UNKNOWN: 0,
      REQUIRED: 1,
      NOT_REQUIRED: 2,
      OBTAINED: 3,
    },
    AdsConsentDebugGeography: { DISABLED: 0, EEA: 1 },
    AdsConsentPrivacyOptionsRequirementStatus: {
      UNKNOWN: 'UNKNOWN',
      REQUIRED: 'REQUIRED',
      NOT_REQUIRED: 'NOT_REQUIRED',
    },
  };
});

jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
  requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));

/**
 * Sentry starts a cleanup interval the moment it is imported, which leaks a timer into every
 * test that reaches the service registry and makes Jest warn about a worker that would not
 * exit. Left alone it is the kind of thing that turns into a flaky CI run later.
 *
 * Mocked for the same reason as AdMob: the SDK is not ours to verify. What IS ours is the PII
 * scrubbing around it, and `beforeSend` is exercised through `SentryMonitoringService`.
 */
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
}));

/** PostHog opens a queue timer on construction; same reasoning. */
jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    optIn: jest.fn(),
    optOut: jest.fn(),
  })),
}));

/**
 * expo-notifications is a native module too, and importing it under Jest throws before a
 * single assertion runs.
 *
 * The scheduling POLICY — what to send, when, and the two-a-day budget — is pure and tested
 * for real in `features/notifications/logic`. This mock covers only the OS calls around it,
 * and returns "granted" so the reconciler under test takes its interesting path.
 */
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('scheduled-id'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
}));
