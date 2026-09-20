import { screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils';

import { SubscriptionCard } from '../SubscriptionCard';

/**
 * Subscription status in Settings (SPEC §29, §31).
 *
 * Two rules worth a rendered test rather than only a unit one: **restore is always reachable**
 * — somebody reinstalling has already paid and must not have to walk through an offer to get
 * their purchase back — and **nothing is sold to a Premium subscriber**, because there is
 * nothing above Premium to sell them.
 */
const mockGetEntitlements = jest.fn();

jest.mock('@/services', () => ({
  NO_SERVER_ENTITLEMENTS: {
    active: [],
    is_premium: false,
    is_ad_free: false,
    premium_expires_at: null,
    no_ads_expires_at: null,
    no_ads_product_id: null,
    updated_at: null,
  },
  services: {
    entitlements: {
      get: () => mockGetEntitlements() as unknown,
      refresh: () => Promise.resolve(mockGetEntitlements() as unknown),
    },
    billing: {
      restorePurchases: () => Promise.resolve(),
      getCustomerInfo: () => Promise.resolve({ managementUrl: null }),
    },
    analytics: { capture: jest.fn() },
  },
}));

jest.mock('@/store/sessionStore', () => ({
  useSessionStore: (selector: (state: { userId: string | null }) => unknown) =>
    selector({ userId: 'user-1' }),
}));

const entitlements = (patch: Record<string, unknown> = {}) => ({
  active: [],
  is_premium: false,
  is_ad_free: false,
  premium_expires_at: null,
  no_ads_expires_at: null,
  no_ads_product_id: null,
  updated_at: null,
  ...patch,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEntitlements.mockResolvedValue(entitlements());
});

describe('SubscriptionCard', () => {
  it('offers the plans and a restore to a free learner', async () => {
    await renderWithProviders(<SubscriptionCard />);

    expect(screen.getByTestId('subscription-upgrade')).toBeOnTheScreen();
    expect(screen.getByTestId('subscription-restore')).toBeOnTheScreen();
  });

  it('names Premium and stops selling once there is nothing above it', async () => {
    mockGetEntitlements.mockResolvedValue(
      entitlements({ active: ['no_ads', 'premium'], is_premium: true, is_ad_free: true }),
    );

    await renderWithProviders(<SubscriptionCard />);

    await waitFor(() =>
      // A regex, not the bare string: the badge also renders the star glyph, which counts as
      // text content and makes an exact match fail on something invisible.
      expect(screen.getByTestId('subscription-plan')).toHaveTextContent(/Premium/),
    );
    expect(screen.queryByTestId('subscription-upgrade')).toBeNull();
    // Still restorable — a reinstall on a new device needs this button to exist.
    expect(screen.getByTestId('subscription-restore')).toBeOnTheScreen();
  });

  it('tells a lifetime owner there is nothing to renew', async () => {
    mockGetEntitlements.mockResolvedValue(
      entitlements({
        active: ['no_ads'],
        is_ad_free: true,
        no_ads_expires_at: null,
        no_ads_product_id: 'no_ads_lifetime',
      }),
    );

    await renderWithProviders(<SubscriptionCard />);

    // A renewal date here would be an invented one (D2).
    await waitFor(() => expect(screen.getByText(/no renewal/i)).toBeOnTheScreen());
  });
});
