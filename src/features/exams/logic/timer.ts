/**
 * The exam clock, as pure arithmetic (SPEC §27).
 *
 * The deadline is the SERVER's — `expires_at` comes back from `start_exam` and the server
 * re-checks it at submission, so nothing here can buy a learner extra time or take it away.
 * What these functions do is decide what the countdown should read, which is a display
 * question and therefore testable without a device, a timezone or a clock that moves.
 *
 * Every function takes `now` explicitly rather than calling `Date.now()`, so a test can sit
 * on a boundary rather than race it.
 */

export const remainingMs = (expiresAt: string | null, now: number): number | null => {
  if (expiresAt === null) return null;

  const deadline = Date.parse(expiresAt);
  // An unparseable timestamp must not render "NaN:NaN" over an exam. Treating it as untimed
  // is the safe failure: the server still enforces the real deadline.
  if (Number.isNaN(deadline)) return null;

  return Math.max(deadline - now, 0);
};

export const hasExpired = (expiresAt: string | null, now: number): boolean =>
  remainingMs(expiresAt, now) === 0;

/** `mm:ss`, or `h:mm:ss` past an hour. Never negative, never a bare number of seconds. */
export const formatRemaining = (ms: number): string => {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  const pad = (value: number): string => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

/**
 * When the countdown should start drawing attention.
 *
 * Two thresholds rather than a gradient: an exam is stressful enough without a colour that
 * creeps. Below five minutes it is a warning, below one it is urgent — and both are paired
 * with the number itself, never carried by colour alone (SPEC §47).
 */
export type TimerTone = 'normal' | 'warning' | 'urgent';

export const WARNING_MS = 5 * 60_000;
export const URGENT_MS = 60_000;

export const timerTone = (ms: number | null): TimerTone => {
  if (ms === null) return 'normal';
  if (ms <= URGENT_MS) return 'urgent';
  if (ms <= WARNING_MS) return 'warning';
  return 'normal';
};

/**
 * How often the countdown needs to re-render.
 *
 * A 45-minute exam ticking every second is 2,700 re-renders of a screen that is otherwise
 * static. Above the warning threshold the minute is all anybody reads, so it updates once a
 * minute; below it, every second, because that is when the seconds start to matter.
 */
export const tickIntervalMs = (ms: number | null): number =>
  ms !== null && ms <= WARNING_MS ? 1000 : 30_000;
