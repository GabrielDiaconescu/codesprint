import { z } from 'zod';

/**
 * The weekly leaderboard payload (SPEC §26).
 *
 * `.strict()` is doing real work here, not tidiness. This is the one payload in the product
 * that carries other people's data, and the rule it has to keep is that an email address or
 * an auth identifier never reaches a device. A strict shape means that if a future migration
 * ever widens the SELECT behind `get_leaderboard`, the app stops with a parse error instead of
 * quietly rendering — or logging — a field nobody meant to send.
 */

export const leaderboardRow = z
  .object({
    rank: z.number().int().positive(),
    /**
     * The pseudonymous Supabase user id, needed as a target for the Report action. It is the
     * same value analytics uses as a distinct id (SPEC §43) and identifies nobody outside the
     * database — but it is never rendered.
     */
    user_id: z.string(),
    display_name: z.string(),
    avatar_key: z.string(),
    xp: z.number().int().nonnegative(),
  })
  .strict();

export const leaderboard = z
  .object({
    /** ISO week start (Monday), as the server computed it. */
    week_start: z.string(),
    total_ranked: z.number().int().nonnegative(),
    top: z.array(leaderboardRow),
    /** The caller's own row, or null when they have earned nothing this week. */
    me: leaderboardRow.nullable(),
    /** The ±5 around the caller, empty when `top` already holds them. */
    neighbours: z.array(leaderboardRow),
    eligible: z.boolean(),
    /** The three reasons someone can be absent, so the screen offers the right fix. */
    has_display_name: z.boolean(),
    hidden: z.boolean(),
    is_guest: z.boolean(),
  })
  .strict();

export const displayNameResult = z.object({ display_name: z.string() }).strict();

export type LeaderboardRow = z.infer<typeof leaderboardRow>;
export type Leaderboard = z.infer<typeof leaderboard>;

/**
 * Why a display name was refused.
 *
 * The server returns a code rather than a sentence (SPEC §38) — these are the codes, and the
 * `leaderboard` namespace turns each into localized copy.
 */
export const DISPLAY_NAME_PROBLEMS = [
  'required',
  'too_short',
  'too_long',
  'invalid_characters',
  'reserved',
  'not_allowed',
  'taken',
  'unknown',
] as const;

export type DisplayNameProblem = (typeof DISPLAY_NAME_PROBLEMS)[number];

/** The reasons a name can be reported (SPEC §26). Stored verbatim in `reports.reason`. */
export const REPORT_REASONS = ['offensive_name', 'impersonation', 'spam', 'other'] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
