import { manageSubscriptionUrl } from '../manageUrl';

/**
 * Where "Manage subscription" leads (SPEC §29).
 *
 * The case that matters is the one this replaced: an Android customer must never be sent to
 * Apple. A customer who cannot find where to cancel is a customer who asks their bank
 * instead, and a chargeback costs more than the subscription was worth.
 */
describe('manageSubscriptionUrl', () => {
  it('prefers what the store itself reported', () => {
    // RevenueCat knows which store the purchase was made in — including for somebody who
    // bought on iOS and is now signed in on an Android phone.
    expect(manageSubscriptionUrl('android', 'https://apps.apple.com/account/subscriptions')).toBe(
      'https://apps.apple.com/account/subscriptions',
    );
  });

  it.each([
    ['ios', 'https://apps.apple.com/account/subscriptions'],
    ['android', 'https://play.google.com/store/account/subscriptions'],
  ] as const)('falls back to the %s subscriptions page', (platform, expected) => {
    expect(manageSubscriptionUrl(platform, null)).toBe(expected);
  });

  it('never sends an Android customer to Apple by default', () => {
    // The defect this function exists to fix.
    expect(manageSubscriptionUrl('android', null)).not.toContain('apple.com');
  });

  it.each(['', '   '])('treats %p from the store as no URL at all', (value) => {
    // An empty string would open a blank page and look like a broken button.
    expect(manageSubscriptionUrl('ios', value)).toBe(
      'https://apps.apple.com/account/subscriptions',
    );
  });

  it('has nowhere to send a customer on an unknown platform', () => {
    // The button is hidden rather than pointed somewhere arbitrary.
    expect(manageSubscriptionUrl('other', null)).toBeNull();
  });
});
