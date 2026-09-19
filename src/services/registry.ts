import { SupabaseAuthService } from './auth/SupabaseAuthService';
import { RevenueCatBillingService } from './billing/RevenueCatBillingService';
import { GoogleAdService } from './ads/GoogleAdService';
import { PostHogAnalyticsService } from './analytics/PostHogAnalyticsService';
import { SupabaseEntitlementService } from './billing/SupabaseEntitlementService';
import { SupabaseConfigService } from './config/SupabaseConfigService';
import { UmpConsentService } from './consent/UmpConsentService';
import { SentryMonitoringService } from './monitoring/SentryMonitoringService';
import { SupabaseContentService } from './content/SupabaseContentService';
import { SupabaseExamService } from './exams/SupabaseExamService';
import { SupabaseHomeService } from './home/SupabaseHomeService';
import { SupabaseLeaderboardService } from './leaderboard/SupabaseLeaderboardService';
import { SupabaseProfileService } from './profile/SupabaseProfileService';
import { SupabaseProgressService } from './progress/SupabaseProgressService';
import { ExpoNotificationService } from './notifications/ExpoNotificationService';
import type {
  AdService,
  AuthService,
  AnalyticsService,
  BillingService,
  ConfigService,
  ConsentService,
  ContentService,
  EntitlementService,
  ExamService,
  HomeService,
  LeaderboardService,
  MonitoringService,
  NotificationService,
  ProfileService,
  ProgressService,
  ServiceIdentity,
} from './types';

/**
 * Service registry (SPEC §7).
 *
 * One place that decides which implementation each service uses, so swapping a no-op for the
 * real SDK is a one-line change in the phase that ships it.
 */
// Declared as a type alias, not an interface: the production guard iterates the registry
// generically, and only type aliases get an implicit index signature.
export type Services = {
  monitoring: MonitoringService;
  auth: AuthService;
  profile: ProfileService;
  content: ContentService;
  progress: ProgressService;
  home: HomeService;
  exams: ExamService;
  leaderboard: LeaderboardService;
  analytics: AnalyticsService;
  consent: ConsentService;
  ads: AdService;
  billing: BillingService;
  entitlements: EntitlementService;
  notifications: NotificationService;
  config: ConfigService;
};

export const services: Services = {
  monitoring: SentryMonitoringService, // Phase 16 — real (inert without a DSN)
  auth: SupabaseAuthService, // Phase 4 — real
  profile: SupabaseProfileService, // Phase 5 — real
  content: SupabaseContentService, // Phase 6 — real
  progress: SupabaseProgressService, // Phase 9 — real
  home: SupabaseHomeService, // Phase 11 — real
  exams: SupabaseExamService, // Phase 13 — real
  leaderboard: SupabaseLeaderboardService, // Phase 12 — real
  analytics: PostHogAnalyticsService, // Phase 16 — real (inert without a key or consent)
  consent: UmpConsentService, // Phase 15 — real
  ads: GoogleAdService, // Phase 15 — real
  billing: RevenueCatBillingService, // Phase 14 — real
  entitlements: SupabaseEntitlementService, // Phase 14 — real; the server is the authority
  notifications: ExpoNotificationService, // Phase 17 — real
  config: SupabaseConfigService, // Phase 3 — real
};

/**
 * Services that are allowed to still be no-ops in a production build.
 *
 * **Empty since Phase 17**, and it must stay that way: every service now has a real
 * implementation. The list is kept rather than deleted because the guard reads it, and
 * because a future phase that introduces a service will need somewhere to declare the gap
 * explicitly instead of leaving it invisible.
 */
export const PRODUCTION_NOOP_ALLOWLIST: (keyof Services)[] = [];

export class NoopServiceInProductionError extends Error {
  constructor(public readonly offenders: string[]) {
    super(
      `No-op services are wired in a production build: ${offenders.join(', ')}. ` +
        'A no-op must never ship to users (SPEC §7).',
    );
    this.name = 'NoopServiceInProductionError';
  }
}

/**
 * Fails loudly when a placeholder implementation reaches a production build (SPEC §7).
 * Pure and testable: the environment is passed in rather than read from process.env.
 */
export const findNoopServicesInProduction = (
  registry: Record<string, ServiceIdentity>,
  allowlist: readonly string[],
): string[] =>
  Object.entries(registry)
    .filter(([key, service]) => service.isNoop && !allowlist.includes(key))
    .map(([key, service]) => `${key} (${service.serviceName})`);

export const assertNoNoopServicesInProduction = (environment: string): void => {
  if (environment !== 'production') return;

  const offenders = findNoopServicesInProduction(services, PRODUCTION_NOOP_ALLOWLIST);
  if (offenders.length > 0) {
    throw new NoopServiceInProductionError(offenders);
  }
};
