/**
 * Where a customer manages their subscription (SPEC §29, §31).
 *
 * Three cases, and the order matters:
 *
 *   1. RevenueCat knows — it reports the URL for the store the purchase was actually made in,
 *      which is the only source that can be right for a customer who bought on iOS and is now
 *      signed in on Android;
 *   2. it does not, because nothing is active or the purchase was a one-off — then the
 *      platform's own subscriptions page, which at least lands them in the right account;
 *   3. neither applies, and the button should not be shown at all.
 *
 * Before Phase 20 this was a single Apple URL in a translation file, which sent every Android
 * customer to a page that knew nothing about them.
 */

/** Apple's per-account subscriptions page. Universal — it needs no product identifier. */
const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';

/**
 * Google Play's subscriptions page.
 *
 * Without a package name it lands on the list of all the customer's subscriptions, which is
 * correct and needs nothing from billing config.
 */
const PLAY_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions';

export type SubscriptionPlatform = 'ios' | 'android' | 'other';

export const manageSubscriptionUrl = (
  platform: SubscriptionPlatform,
  managementUrl: string | null,
): string | null => {
  // Trimmed because a store can hand back an empty string, which would open a blank page.
  const fromStore = managementUrl?.trim();
  if (fromStore) return fromStore;

  if (platform === 'ios') return APPLE_SUBSCRIPTIONS;
  if (platform === 'android') return PLAY_SUBSCRIPTIONS;

  return null;
};
