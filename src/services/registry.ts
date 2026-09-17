import { SupabaseConfigService } from './config/SupabaseConfigService';
import {
  NoopAdService,
  NoopAnalyticsService,
  NoopBillingService,
  NoopConsentService,
  NoopMonitoringService,
  NoopNotificationService,
} from './noop';
import type {
  AdService,
  AnalyticsService,
  BillingService,
  ConfigService,
  ConsentService,
  MonitoringService,
  NotificationService,
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
  analytics: AnalyticsService;
  consent: ConsentService;
  ads: AdService;
  billing: BillingService;
  notifications: NotificationService;
  config: ConfigService;
};

export const services: Services = {
  monitoring: NoopMonitoringService, // Phase 16 (earlier if a Sentry DSN is provided)
  analytics: NoopAnalyticsService, // Phase 16
  consent: NoopConsentService, // Phase 15
  ads: NoopAdService, // Phase 15
  billing: NoopBillingService, // Phase 14
  notifications: NoopNotificationService, // Phase 17
  config: SupabaseConfigService, // Phase 3 — real
};

/**
 * Services that are allowed to still be no-ops in a production build.
 *
 * This list must be EMPTY before the first production release. It exists so that preview
 * builds during early phases do not trip the guard, while making the remaining gap explicit
 * and reviewable rather than invisible.
 */
export const PRODUCTION_NOOP_ALLOWLIST: (keyof Services)[] = [
  'monitoring',
  'analytics',
  'consent',
  'ads',
  'billing',
  'notifications',
];

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
