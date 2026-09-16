/**
 * Service contracts (SPEC §7).
 *
 * Every third-party SDK sits behind one of these interfaces. Components, features and routes
 * depend on the interface and never on the SDK — enforced by ESLint restricted imports.
 *
 * A service whose integration belongs to a later phase ships a clearly named no-op. No-ops
 * must never run in a production build; `assertNoNoopServicesInProduction()` enforces that.
 */

/** Implemented by every service so the production guard can detect no-op wiring. */
export interface ServiceIdentity {
  readonly serviceName: string;
  /** True for placeholder implementations that do nothing. */
  readonly isNoop: boolean;
}

/* ------------------------------------------------------------------ Monitoring (Sentry) */
export interface MonitoringService extends ServiceIdentity {
  initialize(): Promise<void>;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, context?: Record<string, unknown>): void;
  /** Pseudonymous Supabase user id only — never email or display name (SPEC §44). */
  setUser(userId: string | null): void;
}

/* ------------------------------------------------------------------ Analytics (PostHog) */
export type AnalyticsEvent =
  | 'app_opened'
  | 'consent_updated'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'guest_started'
  | 'signup_completed'
  | 'account_linked'
  | 'login_completed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'question_answered'
  | 'lives_depleted'
  | 'life_restored'
  | 'practice_started'
  | 'practice_completed'
  | 'daily_challenge_started'
  | 'daily_challenge_completed'
  | 'streak_extended'
  | 'streak_broken'
  | 'achievement_unlocked'
  | 'level_up'
  | 'exam_started'
  | 'exam_completed'
  | 'paywall_viewed'
  | 'paywall_dismissed'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'purchase_cancelled'
  | 'restore_started'
  | 'restore_completed'
  | 'rewarded_ad_started'
  | 'rewarded_ad_completed'
  | 'interstitial_shown'
  | 'notification_permission_result'
  | 'notification_opened'
  | 'force_update_shown';

/** Never include email, names or free-text answers (SPEC §43). */
export type AnalyticsProperties = Record<string, string | number | boolean | null>;

export interface AnalyticsService extends ServiceIdentity {
  initialize(): Promise<void>;
  /** No-op until the user has granted consent (SPEC §41, §43). */
  capture(event: AnalyticsEvent, properties?: AnalyticsProperties): void;
  identify(userId: string): void;
  reset(): void;
  setConsent(granted: boolean): void;
}

/* ------------------------------------------------------------------ Consent (Google UMP + ATT) */
export type ConsentStatus = 'unknown' | 'required' | 'obtained' | 'not-required';

export interface ConsentState {
  adsStatus: ConsentStatus;
  canRequestPersonalizedAds: boolean;
  analyticsGranted: boolean;
}

export interface ConsentService extends ServiceIdentity {
  initialize(): Promise<ConsentState>;
  requestIfNeeded(): Promise<ConsentState>;
  getState(): ConsentState;
  /** Settings entry point required by UMP (SPEC §29, §41). */
  openPrivacyOptions(): Promise<void>;
  setAnalyticsConsent(granted: boolean): Promise<void>;
}

/* ------------------------------------------------------------------ Ads (AdMob) */
export type AdPlacement = 'learn-list' | 'leaderboard';
export type RewardType = 'life' | 'practice-set' | 'bonus-xp';

export interface AdService extends ServiceIdentity {
  /** Only after consent is resolved, and after ATT when personalized ads are requested. */
  initialize(): Promise<void>;
  /** False for no_ads/premium entitlement, when ads_enabled is off, or consent is unmet. */
  canShowAds(): boolean;
  showBanner(placement: AdPlacement): void;
  hideBanner(placement: AdPlacement): void;
  showInterstitial(placement: string): Promise<boolean>;
  /** Resolves true only when the reward was earned; the grant itself is server-side. */
  showRewarded(rewardType: RewardType): Promise<boolean>;
}

/* ------------------------------------------------------------------ Billing (RevenueCat) */
export type EntitlementId = 'no_ads' | 'premium';

export interface StoreProduct {
  packageId: string;
  productId: string;
  /** Localized price string straight from the store — never hardcoded (SPEC §0.1.5). */
  localizedPrice: string;
  priceAmountMicros: number;
  currencyCode: string;
  billingPeriod: 'monthly' | 'annual' | 'lifetime';
  entitlements: EntitlementId[];
}

export interface CustomerEntitlements {
  active: EntitlementId[];
  isAdFree: boolean;
  isPremium: boolean;
}

export interface BillingService extends ServiceIdentity {
  initialize(): Promise<void>;
  identify(userId: string): Promise<void>;
  reset(): Promise<void>;
  getOfferings(): Promise<StoreProduct[]>;
  purchase(packageId: string): Promise<CustomerEntitlements>;
  restorePurchases(): Promise<CustomerEntitlements>;
  getCustomerInfo(): Promise<CustomerEntitlements>;
  onCustomerInfoChanged(listener: (info: CustomerEntitlements) => void): () => void;
  /** Calls the sync-entitlements Edge Function, then invalidates affected queries. */
  refreshEntitlements(): Promise<void>;
}

/* ------------------------------------------------------------------ Notifications (local only in V1) */
export interface ScheduledReminder {
  id: string;
  hour: number;
  minute: number;
}

export interface NotificationService extends ServiceIdentity {
  requestPermissions(): Promise<boolean>;
  hasPermissions(): Promise<boolean>;
  scheduleDailyReminder(hour: number, minute: number): Promise<string>;
  scheduleStreakReminder(hour: number, minute: number): Promise<string>;
  cancelAll(): Promise<void>;
  getScheduled(): Promise<ScheduledReminder[]>;
}

/* ------------------------------------------------------------------ Remote config / feature flags */
export interface AppConfigValues {
  ads_enabled: boolean;
  subscriptions_enabled: boolean;
  paywall_enabled: boolean;
  leaderboard_enabled: boolean;
  exams_enabled: boolean;
  daily_challenge_enabled: boolean;
  guest_mode_enabled: boolean;
  coding_challenges_enabled: boolean;
  offline_mode_enabled: boolean;
  free_module_count: number;
  lives_max: number;
  content_version: number;
  min_supported_app_version: string;
}

export interface ConfigService extends ServiceIdentity {
  /** Bundled defaults are used on first launch and whenever the fetch fails (SPEC §50). */
  initialize(): Promise<AppConfigValues>;
  get<K extends keyof AppConfigValues>(key: K): AppConfigValues[K];
  refresh(): Promise<AppConfigValues>;
}
