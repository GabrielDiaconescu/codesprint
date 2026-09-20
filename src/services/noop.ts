import { DEFAULT_APP_CONFIG } from './config/defaults';
import type {
  AdService,
  AnalyticsService,
  AppConfigValues,
  BillingService,
  ConfigService,
  ConsentService,
  ConsentState,
  CustomerEntitlements,
  MonitoringService,
  NotificationService,
} from './types';

/**
 * No-op service implementations (SPEC §7).
 *
 * These exist so early phases can compose the full app shell before an integration lands.
 * They are deliberately obvious in the debugger (`isNoop: true`, `Noop*` names) and are
 * blocked from production builds by assertNoNoopServicesInProduction().
 *
 * They must never silently pretend an integration succeeded: anything that would grant
 * access or money rejects instead of resolving.
 */

const noopUnavailable = (service: string, method: string) =>
  new Error(
    `${service}.${method}() is not implemented yet. A no-op service was called in a build ` +
      `that expects the real integration. See docs/PROGRESS.md for the phase that ships it.`,
  );

export const NoopMonitoringService: MonitoringService = {
  serviceName: 'MonitoringService',
  isNoop: true,
  async initialize() {},
  captureException(error) {
    if (__DEV__) console.warn('[NoopMonitoring] captureException', error);
  },
  captureMessage(message) {
    if (__DEV__) console.warn('[NoopMonitoring] captureMessage', message);
  },
  setUser() {},
};

export const NoopAnalyticsService: AnalyticsService = {
  serviceName: 'AnalyticsService',
  isNoop: true,
  async initialize() {},
  capture(event, properties) {
    if (__DEV__) console.log('[NoopAnalytics]', event, properties ?? {});
  },
  identify() {},
  reset() {},
  setConsent() {},
};

const NOOP_CONSENT_STATE: ConsentState = {
  adsStatus: 'unknown',
  canRequestPersonalizedAds: false,
  analyticsGranted: false,
  // Fails closed: with no consent service, no ad may be requested at all.
  canRequestAds: false,
  privacyOptionsRequired: false,
};

export const NoopConsentService: ConsentService = {
  serviceName: 'ConsentService',
  isNoop: true,
  async initialize() {
    return NOOP_CONSENT_STATE;
  },
  async requestIfNeeded() {
    return NOOP_CONSENT_STATE;
  },
  getState() {
    return NOOP_CONSENT_STATE;
  },
  async openPrivacyOptions() {},
  async setAnalyticsConsent() {},
};

export const NoopAdService: AdService = {
  serviceName: 'AdService',
  isNoop: true,
  async initialize() {},
  // Safe default: no consent resolved means no ads.
  canShowAds() {
    return false;
  },
  showBanner() {},
  hideBanner() {},
  async showInterstitial() {
    return false;
  },
  // Never fabricate a reward — the grant is server-side anyway (SPEC §30).
  async showRewarded() {
    return false;
  },
};

const NO_ENTITLEMENTS: CustomerEntitlements = {
  active: [],
  isAdFree: false,
  isPremium: false,
  managementUrl: null,
};

export const NoopBillingService: BillingService = {
  serviceName: 'BillingService',
  isNoop: true,
  async initialize() {},
  async identify() {},
  async reset() {},
  // Empty, not fake: the paywall must show its error state rather than invented prices.
  async getOfferings() {
    return [];
  },
  async purchase() {
    throw noopUnavailable('BillingService', 'purchase');
  },
  async restorePurchases() {
    return NO_ENTITLEMENTS;
  },
  async getCustomerInfo() {
    return NO_ENTITLEMENTS;
  },
  onCustomerInfoChanged() {
    return () => {};
  },
  async refreshEntitlements() {},
};

export const NoopNotificationService: NotificationService = {
  serviceName: 'NotificationService',
  isNoop: true,
  async requestPermissions() {
    return { granted: false, canAskAgain: false };
  },
  async hasPermissions() {
    return { granted: false, canAskAgain: false };
  },
  async scheduleReminder() {
    throw noopUnavailable('NotificationService', 'scheduleReminder');
  },
  async cancelAll() {},
  async getScheduled() {
    return [];
  },
  onOpened() {
    return () => {};
  },
  async consumeInitialOpen() {
    return null;
  },
};

/** Serves bundled defaults until Phase 3 wires app_config. */
export const NoopConfigService: ConfigService = {
  serviceName: 'ConfigService',
  isNoop: true,
  async initialize() {
    return DEFAULT_APP_CONFIG;
  },
  get<K extends keyof AppConfigValues>(key: K): AppConfigValues[K] {
    return DEFAULT_APP_CONFIG[key];
  },
  async refresh() {
    return DEFAULT_APP_CONFIG;
  },
};
