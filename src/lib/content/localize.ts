/**
 * Reads a localized JSONB field (SPEC §38).
 *
 * Content fields are stored as `{ "en": "...", "ro": "..." }`. English is the fallback for
 * every locale, because a missing translation must show the original rather than a blank —
 * an empty lesson title is worse than an untranslated one.
 */

export const FALLBACK_LOCALE = 'en';

export type LocalizedValue = Record<string, string>;

export const localize = (value: unknown, locale: string): string => {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return '';

  const record = value as Record<string, unknown>;

  const preferred = record[locale];
  if (typeof preferred === 'string' && preferred.length > 0) return preferred;

  const fallback = record[FALLBACK_LOCALE];
  if (typeof fallback === 'string' && fallback.length > 0) return fallback;

  // A field with neither the requested locale nor English is a content bug, but returning
  // *something* readable beats an empty row on screen.
  const first = Object.values(record).find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
  );
  return first ?? '';
};
