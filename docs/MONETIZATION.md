# CodeSprint — MONETIZATION

How the product makes money, what each tier actually includes, and how to set it up. Written
for the person doing the store paperwork, who is currently also the person writing the code.

Target prices here are **targets**. Real prices live in App Store Connect and Google Play, are
localized per country by the stores, and reach the app only through RevenueCat Offerings.
Nothing in the codebase contains a price (SPEC §0.1.5).

---

## The three tiers

| Tier        | Target price      | What it is                                                |
| ----------- | ----------------- | --------------------------------------------------------- |
| **Free**    | €0                | Modules 1–6, lives, ads, one exam attempt a week          |
| **No Ads**  | €2.99 / month     | Free, without advertising. Nothing else changes           |
| **Premium** | €7.99 / month     | Everything: all modules, full exam, hard practice, no ads |
| **Premium** | annual, see below | The same, paid once a year                                |

### Free

Modules 1 to `free_module_count` (6). Lives (§22). One Daily Challenge a day. Practice from
completed lessons, limited by lives. The 10-question sample exam, `free_exam_attempts_per_week`
(1) times a week. XP, levels, streaks, achievements, the weekly leaderboard, basic statistics.
Advertising.

There is deliberately **no** daily exercise cap (`free_daily_exercise_cap = null`). Lives, the
module boundary and ads are already three kinds of friction; a fourth would stop the habit
forming, and a habit is what eventually converts.

### No Ads

Free, minus the advertising. **It does not unlock Premium lessons or unlimited lives**, and the
paywall says so in as many words on the card itself. That sentence is not there for legal
cover — it is there because assuming otherwise is the most likely reason somebody asks for a
refund.

### Premium

All 17 modules. The full 30-question exam with retries. Hard practice sets and unlimited
practice. Detailed statistics — per-skill accuracy, weak areas, history. Unlimited lives. No
ads.

### Never on the paywall until it ships

Certificates, offline content, additional courses, AI features. The paywall lists only what
exists in the build the customer is holding (SPEC §5, §33).

---

## Store products

Identifiers are **permanent**. Neither store lets you rename or reuse one, so these were chosen
once and live in exactly one file: `src/services/billing/config.ts`.

| Role            | Product id        | RevenueCat package   | Grants               |
| --------------- | ----------------- | -------------------- | -------------------- |
| No Ads monthly  | `no_ads_monthly`  | `$rc_monthly_no_ads` | `no_ads`             |
| Premium monthly | `premium_monthly` | `$rc_monthly`        | `no_ads` + `premium` |
| Premium annual  | `premium_annual`  | `$rc_annual`         | `no_ads` + `premium` |

**Premium grants both entitlements.** That is why `isAdFree` is `no_ads OR premium` everywhere,
and why a Premium subscriber sees No Ads marked "included" rather than being sold it again.

The annual price is a decision still open (D3). The paywall computes and shows the per-month
equivalent from `priceAmountMicros`, in the same currency, and only shows a "save N%" badge
when the monthly plan is on screen to compare against and the saving is genuinely positive.

### Upgrading without double billing

- **iOS:** put all three subscriptions in **one subscription group**, with Premium ranked above
  No Ads. The store then handles the change as an upgrade, with a prorated refund.
- **Android:** a product change with a replacement mode, which RevenueCat applies when it knows
  the purchase replaces an existing one.

The paywall labels this "Upgrade to Premium" and states that it replaces the current
subscription rather than adding to it (SPEC §5, §33).

---

---

## Testing before the stores exist — the Test Store

RevenueCat's **Test Store** is a simulated storefront that needs no Apple Developer account, no
Play Console and no products in either. Purchases behave like real ones all the way through:
they update the subscriber, fire the webhook, and land in `user_entitlements`. That is enough
to exercise the entire chain — buy, restore, upgrade, server sync, gates opening — while the
PFA and D-U-N-S paperwork is still in flight.

### Setting it up

1. In the RevenueCat dashboard create the two entitlements, **named exactly**: `no_ads` and
   `premium`.
2. Create three Test Store products. Their ids are free-form here — the app matches on
   _package_ identifiers, not product ids — but keeping them the same as the real ones is less
   confusing later.
3. Attach them to entitlements: the No Ads product to `no_ads`; **both** Premium products to
   `no_ads` **and** `premium`.
4. Create an offering with identifier `default` and three packages whose identifiers are
   exactly:

   | Package identifier   | Product         |
   | -------------------- | --------------- |
   | `$rc_monthly_no_ads` | No Ads monthly  |
   | `$rc_monthly`        | Premium monthly |
   | `$rc_annual`         | Premium yearly  |

   **These three strings are what the app matches on** (`roleForPackage` in `config.ts`). A
   package with any other identifier is dropped from the paywall rather than rendered with no
   copy.

5. Put the Test Store key in `.env`:
   ```
   EXPO_PUBLIC_REVENUECAT_TEST_KEY=test_...
   ```
6. Build a development build. `npx expo run:android`, or EAS. Expo Go cannot load native
   modules (SPEC §0.1.10), and from this phase on the RevenueCat SDK is in the bundle.

### The guard rail

A production build carrying `EXPO_PUBLIC_REVENUECAT_TEST_KEY` **fails to start**. Env
validation rejects it, and `selectSdkKey` ignores it in production as a second lock, both
covered by unit tests. A released app taking simulated purchases would either charge real
money for nothing or charge none at all and look broken; neither is a thing to find out from a
review.

### What the Test Store cannot tell you

- Whether your real store products are configured correctly.
- Apple's subscription-group ranking, which is what makes the No Ads → Premium upgrade a
  prorated change rather than two charges. **This still has to be tested in a real sandbox.**
- Google's base-plan and replacement-mode behaviour.
- Anything about App Review, pricing per country, or tax.

It proves the plumbing. The store paperwork still has to be proved separately.

## RevenueCat setup

1. Create the project. **EU region** where offered (SPEC §41).
2. Add the iOS and Android apps, with their bundle identifiers.
3. Create the two entitlements: `no_ads` and `premium`.
4. Create the three products above, attach them to the entitlements, remembering that both
   Premium products grant **both** entitlements.
5. Create the `default` offering with the three packages.
6. Copy the **public** SDK keys into `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
7. Set the **secret** key and a webhook secret as Edge Function secrets:
   ```
   npx supabase secrets set REVENUECAT_SECRET_API_KEY=sk_... REVENUECAT_WEBHOOK_AUTH=<long random string>
   ```
8. Point the RevenueCat webhook at
   `https://<project>.supabase.co/functions/v1/revenuecat-webhook`, with the same secret in the
   Authorization field.
9. Decide the **transfer behaviour** for when a subscription is seen on a second account
   (SPEC §31). The webhook handles `TRANSFER` by re-syncing both accounts either way.
10. Flip `billing` from `NoopBillingService` to `RevenueCatBillingService` in
    `src/services/registry.ts`, and remove `'billing'` from `PRODUCTION_NOOP_ALLOWLIST`.

### The secret that must never be public

`REVENUECAT_SECRET_API_KEY` can read and modify any subscriber in the account. It lives only in
Supabase Edge Function secrets. If it ever appears in an `EXPO_PUBLIC_*` variable, in the app
bundle or in this repository, it is compromised and must be rotated (SPEC §56, §59.27).

---

## How access is actually decided

This is the part worth reading twice.

```
Store → RevenueCat → webhook → apply_entitlements → user_entitlements → has_entitlement → gate
                        ↑                                  ↑
             re-fetches the whole                 the ONLY authority
              subscriber, never                   for what unlocks
             trusting the event
```

- RevenueCat's `CustomerInfo` may make the **UI** react instantly after a purchase, because a
  purchase should feel finished the moment it is.
- It decides **nothing**. Every gate — modules, the full exam, hard practice, unlimited lives,
  ads — reads `user_entitlements` server-side through `has_entitlement`.
- A client that lies about its `CustomerInfo` gets a nicer-looking paywall and not one extra
  lesson.

The webhook **re-fetches the subscriber** rather than applying the event it received, and
`apply_entitlements` reconciles the whole set, so anything absent is revoked. That is what
makes out-of-order deliveries harmless: a RENEWAL arriving after the CANCELLATION it precedes
cannot resurrect a lapsed subscription, because neither event is what is being applied.

`sync-entitlements` is the same reconciliation for one user, called by the app after a
purchase, after a restore and on app open, so nobody waits on a webhook to see what they paid
for.

---

## Ads (Phase 15, summarised here for the money picture)

Free and No-Ads-expired users see ads; `no_ads` or `premium` never do, checked **before
loading** rather than before showing. Banners only on the Learn list and the Leaderboard —
never on a lesson, practice, exam, explanation or the paywall. Interstitials only at natural
breaks, at most `interstitial_max_per_day` (4), never in the first
`interstitial_grace_lessons` (3) lessons. Rewarded ads are always opt-in and their rewards are
granted server-side with daily caps.

---

## The upgrade funnel (SPEC §34)

Prompts appear at natural moments, never mid-lesson, at most `paywall_prompt_max_per_day` (1) a
day, and never before the learner has finished a lesson — somebody who has not seen what the
app does cannot judge whether the paid version is worth it.

| Trigger           | When                                         |
| ----------------- | -------------------------------------------- |
| `module_locked`   | They reached the free module boundary        |
| `out_of_lives`    | They ran out of lives                        |
| `premium_feature` | They opened a hard practice set or full exam |
| `after_ad`        | An interstitial just finished                |
| `manual`          | They tapped through themselves — no limits   |

`shouldPrompt` in `src/features/paywall/logic/prompts.ts` is the single implementation, and it
is unit-tested for every one of those restrictions.

**Forbidden, and tested for where testable:** fake countdowns, false scarcity, pre-selected
upsells that hide a cheaper option, hidden close buttons, misleading "free" labels (SPEC §33).

---

## Costs and thresholds

| Item                    | Cost                                                 |
| ----------------------- | ---------------------------------------------------- |
| RevenueCat              | Free below a monthly revenue threshold, then a share |
| Apple Developer Program | $99 / year                                           |
| Google Play Console     | $25 one-off                                          |
| Supabase production     | ~$25 / month + usage                                 |

Revenue, MRR, churn and trial metrics come from the **RevenueCat dashboard**. Do not rebuild
them (SPEC §31) — retention and funnels come from PostHog, and the two answer different
questions.

---

## Testing

- **iOS:** sandbox testers in App Store Connect, or a StoreKit configuration file for the
  simulator. A physical iPhone plus a sandbox account is enough; a Mac is not required, because
  EAS Build produces the build.
- **Android:** license testers in the Play Console. Subscriptions can only be created **after**
  an app bundle has been uploaded to a testing track, so upload an internal testing build
  during this phase.
- **Locally, with no store at all:** the seeded accounts carry entitlement fixtures tagged
  `store = 'dev-seed'` (`free@`, `noads@`, `premium@codesprint.test`). They exercise every gate
  in the product without a single real purchase.

> **Before the first production release:** confirm no `dev-seed` rows exist in the production
> database. They would hand out Premium for free (SPEC §31, §52).
