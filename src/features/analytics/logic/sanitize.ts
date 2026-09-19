import type { AnalyticsProperties } from '@/services';

/**
 * Keeping personal data out of analytics (SPEC §43, §41).
 *
 * SPEC §43 says "no email, names or free-text answers in event properties". That sentence is a
 * rule, and a rule enforced only by everybody remembering it is a rule that gets broken once
 * and then sits in a third party's database for years. So it is enforced here instead, in a
 * pure function every event passes through.
 *
 * The design is deliberately **deny by shape, not allow by name**: a per-event allow-list would
 * be stricter but would also block every new property behind a code change, and the pressure to
 * skip the check would win eventually. Instead anything that *looks* like personal data is
 * dropped, whatever it is called.
 *
 * Dropping rather than throwing is intentional too. An analytics call must never be able to
 * crash a lesson — the worst outcome of a mistake here should be a missing property, and in
 * development it is also a loud warning.
 */

/** Property names that are never acceptable, whatever the value looks like. */
const FORBIDDEN_KEYS = [
  'email',
  'mail',
  'name',
  'display_name',
  'username',
  'password',
  'token',
  'answer',
  'submitted',
  'prompt',
  'text',
  'body',
  'query',
  'note',
  'reason_text',
  'phone',
  'address',
  'ip',
];

/**
 * How long a string property may be.
 *
 * Every legitimate property in SPEC §43 is an enum-ish token: `multiple_choice`, `easy`,
 * `premium_monthly`, `out_of_lives`. Anything appreciably longer is prose, and prose is where
 * personal data hides.
 */
export const MAX_VALUE_LENGTH = 64;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/** A UUID is pseudonymous and fine as a distinct id, but not as a property value. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DropReason = 'forbidden-key' | 'email' | 'too-long' | 'identifier' | 'unsupported-type';

export interface SanitizeResult {
  safe: AnalyticsProperties;
  /** What was removed and why — surfaced in development, never sent anywhere. */
  dropped: { key: string; reason: DropReason }[];
}

const isForbiddenKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return FORBIDDEN_KEYS.some((forbidden) => normalized.includes(forbidden));
};

export const sanitizeProperties = (properties: AnalyticsProperties | undefined): SanitizeResult => {
  const safe: AnalyticsProperties = {};
  const dropped: SanitizeResult['dropped'] = [];

  if (!properties) return { safe, dropped };

  for (const [key, value] of Object.entries(properties)) {
    if (isForbiddenKey(key)) {
      dropped.push({ key, reason: 'forbidden-key' });
      continue;
    }

    if (value === null || typeof value === 'boolean') {
      safe[key] = value;
      continue;
    }

    if (typeof value === 'number') {
      // NaN and Infinity serialise to null and make a funnel silently wrong.
      safe[key] = Number.isFinite(value) ? value : null;
      continue;
    }

    if (typeof value !== 'string') {
      dropped.push({ key, reason: 'unsupported-type' });
      continue;
    }

    if (EMAIL.test(value)) {
      dropped.push({ key, reason: 'email' });
      continue;
    }

    // A lesson or question id as a PROPERTY would tie a row of behaviour to one learner more
    // tightly than the pseudonymous distinct id already does. Counts and enums are enough to
    // answer every KPI in SPEC §43.
    if (UUID.test(value)) {
      dropped.push({ key, reason: 'identifier' });
      continue;
    }

    if (value.length > MAX_VALUE_LENGTH) {
      dropped.push({ key, reason: 'too-long' });
      continue;
    }

    safe[key] = value;
  }

  return { safe, dropped };
};

/**
 * Whether a distinct id may be used to identify somebody.
 *
 * SPEC §43: the distinct id is the pseudonymous Supabase user id. An email address arriving
 * here would attach a real identity to every event ever captured, which is the one mistake in
 * this area that cannot be undone by deleting a property later.
 */
export const isSafeDistinctId = (id: string): boolean => UUID.test(id);
