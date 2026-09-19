import { z } from 'zod';

import { livesState } from '../content/lessonSchema';

/**
 * Rewarded-ad allowance and grants (SPEC §19, §22, §30).
 *
 * The allowance is read BEFORE an ad is offered, so a rewarded button is never shown for a
 * reward the server would then refuse. Making somebody sit through thirty seconds of
 * advertising and then telling them the cap was reached is the worst possible order of
 * events, and it is entirely avoidable.
 */

export const REWARD_TYPES = ['life', 'bonus_xp'] as const;
export type RewardKind = (typeof REWARD_TYPES)[number];

export const rewardedAllowance = z
  .object({
    ads_enabled: z.boolean(),
    life: z
      .object({
        available: z.boolean(),
        used: z.number().int().nonnegative(),
        cap: z.number().int().nonnegative(),
      })
      .strict(),
    bonus_xp: z
      .object({
        available: z.boolean(),
        amount: z.number().int().nonnegative(),
        earned: z.number().int().nonnegative(),
        cap: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const rewardedGrant = z
  .object({
    reward_type: z.enum(REWARD_TYPES),
    granted: z.number().int().nonnegative(),
    lives: livesState,
    allowance: rewardedAllowance,
  })
  .strict();

export type RewardedAllowance = z.infer<typeof rewardedAllowance>;
export type RewardedGrant = z.infer<typeof rewardedGrant>;

/** Why the server refused, as a code the client localizes (SPEC §38, §46). */
export const REWARD_REFUSALS = [
  'ads_disabled',
  'cap_reached',
  'lives_full',
  'unlimited_lives',
  'unknown_reward',
  'unknown',
] as const;

export type RewardRefusal = (typeof REWARD_REFUSALS)[number];

const PREFIX = 'rewarded unavailable: ';

export const toRewardRefusal = (error: unknown): RewardRefusal => {
  if (error === null || typeof error !== 'object') return 'unknown';

  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string') return 'unknown';

  const index = message.indexOf(PREFIX);
  if (index === -1) return 'unknown';

  const reason = message.slice(index + PREFIX.length).trim();
  return (REWARD_REFUSALS as readonly string[]).includes(reason)
    ? (reason as RewardRefusal)
    : 'unknown';
};
