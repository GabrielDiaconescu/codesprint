import { z } from 'zod';

/**
 * What the SERVER says a learner has paid for (SPEC §31).
 *
 * Deliberately separate from anything RevenueCat returns. `CustomerInfo` from the SDK may make
 * the UI react instantly after a purchase, but this — `get_entitlements`, reading
 * `user_entitlements` — is the only thing any gate consults, and it is the only thing that
 * survives a reinstall, a device swap or a client that has been tampered with.
 */

export const ENTITLEMENT_IDS = ['no_ads', 'premium'] as const;

export const serverEntitlements = z
  .object({
    active: z.array(z.enum(ENTITLEMENT_IDS)),
    is_premium: z.boolean(),
    /** `no_ads OR premium` — computed server-side so no caller has to remember (SPEC §32). */
    is_ad_free: z.boolean(),
    premium_expires_at: z.string().nullable(),
    /**
     * Null WHILE `no_ads` is active means it never lapses: a lifetime purchase (D2).
     * The paywall reads this to decide whether Premium replaces what they hold or sits
     * alongside a non-consumable they keep either way.
     */
    no_ads_expires_at: z.string().nullable(),
    no_ads_product_id: z.string().nullable(),
    /** Null for somebody who has never had an entitlement row of any kind. */
    updated_at: z.string().nullable(),
  })
  .strict();

export type ServerEntitlements = z.infer<typeof serverEntitlements>;

/** What a learner with nothing looks like. Also the safe answer when a read fails. */
export const NO_SERVER_ENTITLEMENTS: ServerEntitlements = {
  active: [],
  is_premium: false,
  is_ad_free: false,
  premium_expires_at: null,
  no_ads_expires_at: null,
  no_ads_product_id: null,
  updated_at: null,
};
