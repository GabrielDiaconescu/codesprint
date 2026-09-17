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

/* ------------------------------------------------------------------ Auth (Supabase) */

/**
 * Normalised auth failures (SPEC §12, §46).
 *
 * The UI must never render a raw provider message: they are English-only, change without
 * notice, and occasionally leak implementation detail. Every failure is mapped to one of
 * these codes, which map 1:1 to i18n keys.
 */
export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'email-taken'
  | 'weak-password'
  | 'same-password'
  | 'rate-limited'
  | 'expired-link'
  | 'guest-disabled'
  | 'network'
  | 'unknown';

export interface AuthUser {
  id: string;
  email: string | null;
  /** True while the user is a guest (SPEC §12, D1). */
  isAnonymous: boolean;
  emailConfirmed: boolean;
}

export type AuthChangeReason =
  | 'initial'
  | 'signed-in'
  | 'signed-out'
  | 'token-refreshed'
  | 'user-updated'
  | 'password-recovery';

/** What an auth deep link turned out to be, once consumed. */
export type DeepLinkOutcome =
  | { kind: 'ignored' }
  | { kind: 'signed-in' }
  | { kind: 'recovery' }
  | { kind: 'error'; code: AuthErrorCode };

export interface SignUpResult {
  user: AuthUser | null;
  /** True when a confirmation email was sent and there is no session yet. */
  needsConfirmation: boolean;
}

export interface AuthService extends ServiceIdentity {
  /** The restored session, if SecureStore still holds a valid refresh token. */
  getUser(): Promise<AuthUser | null>;
  onChange(listener: (user: AuthUser | null, reason: AuthChangeReason) => void): () => void;

  /** Guest sign-in, so a new user can start the first lesson immediately (SPEC §12, D1). */
  signInAnonymously(): Promise<AuthUser>;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;

  /**
   * Guest -> permanent account. Keeps the SAME user id, so every xp_events row, attempt and
   * streak day earned as a guest stays with the user (SPEC §12).
   */
  linkEmail(email: string, password: string): Promise<SignUpResult>;

  resendConfirmation(email: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** Valid only inside a recovery session opened by the reset deep link. */
  updatePassword(newPassword: string): Promise<void>;

  /**
   * Consumes the parameters of an auth callback and reports what the link was for.
   *
   * Takes router params rather than a raw URL because Expo Router owns deep-link routing:
   * the callback arrives as a screen with search params, on cold start and warm alike.
   */
  consumeAuthCallback(params: Record<string, string | string[] | undefined>):
    Promise<DeepLinkOutcome>;

  signOut(): Promise<void>;

  /**
   * Drives Supabase's token auto-refresh from foreground state. Refreshing while
   * backgrounded wastes battery and fails on a sleeping radio.
   */
  setAppActive(active: boolean): void;
}

/* ------------------------------------------------------------------ Profile (Supabase) */

/** SPEC §11: the onboarding answers, used only for lightweight personalisation. */
export const EXPERIENCE_LEVELS = ['complete_beginner', 'beginner', 'intermediate'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const MOTIVATIONS = ['university', 'career', 'interview', 'personal', 'improve'] as const;
export type Motivation = (typeof MOTIVATIONS)[number];

/** Minutes are never measured; they map to an XP target through config (SPEC §11). */
export const DAILY_GOAL_MINUTES = [5, 10, 15] as const;
export type DailyGoalMinutes = (typeof DAILY_GOAL_MINUTES)[number];

/**
 * Ad consent as the SERVER sees it.
 *
 * `restricted` is set by the database for users below `minor_protection_age` and cannot be
 * cleared by the client — it is what Phase 15 checks before requesting a personalised ad.
 */
export type AdsConsentStatus = 'unknown' | 'required' | 'obtained' | 'denied' | 'restricted';

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarKey: string;
  birthYear: number | null;
  locale: string;
  timezone: string;
  experienceLevel: ExperienceLevel | null;
  motivation: Motivation | null;
  dailyGoalMinutes: number;
  /** 'HH:MM', or null when the user declined a reminder. */
  reminderTime: string | null;
  onboardingCompleted: boolean;
  leaderboardHidden: boolean;
  analyticsConsent: boolean;
  adsConsentStatus: AdsConsentStatus;
  isAnonymous: boolean;
}

export interface OnboardingAnswers {
  birthYear: number;
  experienceLevel: ExperienceLevel;
  motivation: Motivation;
  dailyGoalMinutes: DailyGoalMinutes;
  reminderTime: string | null;
  analyticsConsent: boolean;
}

/** The subset of a profile a user may change after onboarding (SPEC §29). */
export interface ProfilePatch {
  displayName?: string;
  avatarKey?: string;
  locale?: string;
  timezone?: string;
  reminderTime?: string | null;
  dailyGoalMinutes?: DailyGoalMinutes;
  leaderboardHidden?: boolean;
  analyticsConsent?: boolean;
}

export interface ProfileService extends ServiceIdentity {
  get(): Promise<UserProfile | null>;
  update(patch: ProfilePatch): Promise<UserProfile>;
  completeOnboarding(answers: OnboardingAnswers): Promise<UserProfile>;
  /**
   * Deletes the caller's account because they are below the minimum age (SPEC §11, §41).
   * Irreversible, and deliberately so: the account must not exist.
   */
  rejectUnderageAccount(): Promise<void>;
  /** App-open heartbeat; also reports the device timezone (SPEC §21). */
  syncSession(timezone: string): Promise<UserProfile>;
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
  /** SPEC D10 / §41 — the age gate thresholds. */
  min_user_age: number;
  minor_protection_age: number;
  content_version: number;
  min_supported_app_version: string;
}

export interface ConfigService extends ServiceIdentity {
  /** Bundled defaults are used on first launch and whenever the fetch fails (SPEC §50). */
  initialize(): Promise<AppConfigValues>;
  get<K extends keyof AppConfigValues>(key: K): AppConfigValues[K];
  refresh(): Promise<AppConfigValues>;
}
