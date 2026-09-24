# Legal and compliance

Engineering's side of privacy and store compliance (SPEC §41, §55). **Not legal advice.** The
texts in `web/` are drafts written from what the app actually does; a lawyer must review them,
and everything marked `[LIKE THIS]` there, before launch.

## Status

| Area                         | State                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Export my data               | **Done** — `export_my_data()`, Profile → Your data                                              |
| Delete account (in app)      | **Done** — `delete-account` Edge Function, Profile → Your data                                  |
| Delete account (web request) | **Page written** (`web/delete-account.html`) — needs hosting and a mailbox                      |
| Privacy policy, terms        | **Drafts** (`web/privacy.html`, `web/terms.html`) — need legal review                           |
| Open-source licences         | **Generated** — `web/licenses.html` by `npm run legal:licenses`; rerun after dependency changes |
| Support page, `app-ads.txt`  | **Written** — need hosting, the support address and the AdMob publisher id                      |
| Apple privacy manifest       | **Declared** in `app.config.ts` — verify with Xcode's privacy report (Ph 22)                    |
| Store privacy forms          | **Answers drafted below** — to be entered in the consoles (Phase 23)                            |
| Processor agreements (DPAs)  | **Not signed yet** — human action, list below                                                   |
| EU DSA trader details        | **Blocked** on the legal entity (PFA)                                                           |

## What the app stores

The authoritative list is `export_my_data()` (migration `20260924110000_privacy.sql`): it exports
every table that holds learner data, whole, so a column added later is included automatically.

| Data                                                                                            | Where                                 | Kept until                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------- |
| Account id, email, sign-in methods                                                              | Supabase Auth (EU)                    | Account deletion; guests after 30 idle days |
| Profile: display name, avatar, birth year, locale, timezone, onboarding answers, consent flags  | `profiles`                            | Account deletion                            |
| Answers, XP, streaks, lives, progress, achievements, challenge claims, exams, leaderboard weeks | user tables                           | Account deletion                            |
| Plan and purchase events                                                                        | `user_entitlements`, `billing_events` | Deletion; event ids kept, payload redacted  |
| Reports filed / about the learner                                                               | `reports`                             | Account deletion (either side)              |
| Rate-limit counters                                                                             | `rate_limit_counters`                 | Account deletion; not personal content      |
| Theme, language, haptics, reminder schedule                                                     | The device only                       | Uninstall                                   |
| Crash reports (PII scrubbed)                                                                    | Sentry                                | `[Sentry retention]`                        |
| Analytics events (consent only)                                                                 | PostHog EU                            | `[PostHog retention]`                       |

**Deletion is total by construction.** Every user table has `ON DELETE CASCADE` to `auth.users`
except `billing_events`, which keeps the event id for webhook idempotency; a `BEFORE DELETE`
trigger on `auth.users` redacts its payload first. Because the trigger is on the auth table, it
covers every way an account can disappear: in-app deletion, the age gate, the nightly clean-up
of abandoned guests, and a deletion from the Supabase dashboard. `supabase/tests/16_privacy.test.sql`
proves no row in any table still points at a deleted user — found from the catalogue, so a new
table is checked without anyone remembering to add it.

**Deletion order** (`supabase/functions/_shared/account.ts`): the RevenueCat customer first, then
the auth user. A RevenueCat failure leaves the account intact and the learner can retry. Without
`REVENUECAT_SECRET_API_KEY` the function says `revenuecat: not-configured` instead of pretending;
**production must have the key** (so must `sync-entitlements`).

## Processors — data processing agreements to sign

| Processor              | Role                      | Region / transfer                                                                     | DPA   |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------- | ----- |
| Supabase               | Database, auth, functions | EU (eu-central-1)                                                                     | `[ ]` |
| RevenueCat             | Subscription status       | US — `[DPF / SCCs]`                                                                   | `[ ]` |
| Google (AdMob, UMP)    | Ads, consent              | `[DPF / SCCs]`; Google is independent controller for some ad processing — `[confirm]` | `[ ]` |
| PostHog                | Analytics (consent only)  | EU                                                                                    | `[ ]` |
| Sentry                 | Crash reporting           | `[choose EU region]`                                                                  | `[ ]` |
| `[Email provider]`     | Auth emails (SMTP)        | `[region]`                                                                            | `[ ]` |
| Apple, Google (stores) | Payments                  | Merchant of record — own terms                                                        | n/a   |

## Consent and minors

- **Ads:** Google UMP form before any ad request in the EEA/UK/CH; the privacy-options entry
  point is in Profile → Privacy. Development builds force the EEA form (`UmpConsentService`).
- **ATT (iOS):** only when personalised ads are possible — after UMP consent, and never for a
  protected minor (`shouldRequestAtt`).
- **Analytics:** opt-in at onboarding and in Settings; the service is a no-op until then.
- **Age:** under 13, the account is deleted at the age gate and the refusal is shown. Under 16:
  analytics off, non-personalised ads only, hidden from the leaderboard by default.
- **Crash reporting:** on by default, with PII scrubbed (`sendDefaultPii: false`, request
  bodies stripped). Basis: legitimate interests — **for the lawyer to confirm.**

## Store answers (drafts, to enter in Phase 23)

### Google Play — Data safety

| Question                                          | Answer                                                      |
| ------------------------------------------------- | ----------------------------------------------------------- |
| Collects or shares required user data types       | Yes                                                         |
| Encrypted in transit                              | Yes (HTTPS everywhere)                                      |
| Users can request deletion                        | Yes — in app, and `https://[domain]/delete-account.html`    |
| Personal info: email address                      | Collected (optional — guests have none); account management |
| Personal info: user IDs                           | Collected; app functionality, analytics (consent)           |
| App activity: in-app actions, app interactions    | Collected; app functionality, analytics (consent)           |
| App info and performance: crash logs, diagnostics | Collected; diagnostics                                      |
| Device or other IDs: advertising ID               | Collected and shared with AdMob; advertising — `[confirm]`  |
| Financial info: purchase history                  | Collected; app functionality                                |
| Location, contacts, photos, messages, health      | Not collected                                               |

Also in Play Console: ads declaration **Yes**; target audience **13+, not the Families
programme**; content rating via IARC; account deletion URL.

### Apple — App Privacy ("nutrition label")

- **Data used to track you:** device ID (advertising) — only with ATT permission. `[confirm]`
- **Data linked to you:** contact info (email), identifiers (user ID), purchases, usage data
  (product interaction — analytics consent only), diagnostics.
- **Data not linked to you:** crash data, if Sentry's scrubbing is judged sufficient. `[confirm]`

### Apple — privacy manifest

`app.config.ts → ios.privacyManifests` declares the required-reason APIs the app's own code and
React Native use (UserDefaults, file timestamps, system boot time, disk space). The SDKs —
AdMob, RevenueCat, Sentry, PostHog — ship their own manifests. **Verify with Xcode's privacy
report on the first iOS build (Phase 22)**; App Store Connect rejects an upload whose manifests
are incomplete.

## For the lawyer

1. Legal bases in `web/privacy.html` — especially non-personalised ads and crash reporting.
2. International transfers (RevenueCat, Google, Sentry region).
3. Retention periods for Sentry, PostHog and Supabase backups.
4. Terms §4 (what happens if a paid feature is removed), §8 (liability), §10 (law, ODR).
5. Minimum age 13 with parental agreement below majority; the under-16 defaults.
6. Whether reports ABOUT a learner should be in their export as they are (reason and status,
   never the reporter).
7. EU DSA trader information for both stores, once the PFA exists.

## Hosting the pages

`web/` is plain static HTML: no build step, no external requests. Host it on a free static host
whose terms allow commercial use (SPEC §0.1.9 — Cloudflare Pages or GitHub Pages, not Vercel
Hobby), at the domain listed in both store listings, so that `https://[domain]/app-ads.txt`
resolves. Then set `EXPO_PUBLIC_LEGAL_BASE_URL=https://[domain]` in the EAS environments: the
app's Privacy, Terms and Support links appear once it is set, and a production build refuses to
start without it.
