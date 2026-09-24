# Architecture

How the app is put together and why (SPEC §7). The database side — every table, policy and
function — is in `docs/DATABASE.md`; content authoring is in `docs/CONTENT.md`; billing is in
`docs/MONETIZATION.md`. This document is the map between them.

## The shape in one picture

```
 src/app (routes, thin)
    │ composes
    ▼
 src/features/<feature>/components ──► hooks ──► services (typed interfaces)
                       │                 │              │
                       │                 │              ├─ Supabase RPCs ─► Postgres (rules, grading, XP)
                       ▼                 ▼              ├─ Edge Functions ─► RevenueCat REST
                    logic/ (pure)   TanStack Query /    ├─ RevenueCat, AdMob + UMP SDKs
                                    Zustand stores      └─ PostHog, Sentry, expo-notifications
```

Three rules hold it together, and each is enforced by a machine rather than by memory:

1. **Third-party SDKs are imported only inside `src/services/`.** ESLint's
   `no-restricted-imports` fails the build otherwise, and `src/__tests__/architecture.test.ts`
   proves it independently. A component that needs RevenueCat needs a `BillingService` method.
2. **No import cycles** (`import/no-cycle`).
3. **Gameplay is decided on the server.** The client submits; Postgres grades, awards XP,
   spends lives and checks entitlements. Nothing the client stores is trusted for any of it.

## Source layout

```
src/
  app/            Expo Router routes. Thin: read params, pick a screen, handle navigation.
  features/       One folder per product area (auth, onboarding, learn, lesson, questions,
                  practice, exams, home, progress, leaderboard, paywall, subscriptions, ads,
                  analytics, notifications, profile, settings, config).
    <feature>/
      components/ Screens and pieces of screens.
      hooks/      TanStack Query hooks and glue between components and services.
      logic/      Pure functions — levels, streak display, ad frequency, paywall state,
                  version comparison… Unit-tested without React.
  components/ui/  Design-system primitives (buttons, cards, progress, sheets, toasts, states).
  services/       The only code that touches SDKs. `types.ts` holds the interfaces,
                  `registry.ts` picks the implementation for each.
  store/          Cross-feature Zustand stores: session, settings, ads, toasts.
  i18n/           i18next setup and `locales/{en,ro}/*.json`.
  theme/          Tokens — colour, type, spacing, radius, elevation, motion — light and dark.
  lib/            Env validation, the query client and keys, the Python highlighter, Markdown.
  constants/      `brand.ts`: the only place the product name lives.
supabase/         Migrations, pgTAP tests, Edge Functions, generated seed.
content/          The course, as YAML (content-as-code).
scripts/          Content pipeline, E2E runner, licence generator, release check.
web/              Static legal pages and app-ads.txt.
e2e/              Maestro flows.
```

## State

| Kind of state                                      | Lives in                  | Why                                                                   |
| -------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| Server data: lessons, progress, stats, leaderboard | TanStack Query            | Caching, retries, loading and error states, invalidation after writes |
| Remote config (`app_config`)                       | TanStack Query            | Fetched once per start; bundled defaults when offline or first launch |
| Session mirror (user id, guest or not)             | Zustand `sessionStore`    | Renders the right screen before a round trip; never authoritative     |
| Settings (theme, sound, haptics, language)         | Zustand `settingsStore`   | Changes often, read everywhere, persisted locally                     |
| The lesson in progress (current step, selection)   | component state / Zustand | Pure UI; lost on purpose when the lesson is left                      |
| Entitlements for **display**                       | RevenueCat `CustomerInfo` | Instant paywall feedback after a purchase                             |
| Entitlements for **access**                        | `user_entitlements` table | Written only by Edge Functions; read by the RPCs that gate content    |

Query keys live in `src/lib/queryClient.ts`. Content queries include `content_version`, so
publishing new content changes the key and every client refetches — no cache to clear by hand.

## Services

Each service is an interface in `src/services/types.ts` with one implementation chosen in
`src/services/registry.ts`:

| Service                                    | Implementation                 | Notes                                                       |
| ------------------------------------------ | ------------------------------ | ----------------------------------------------------------- |
| `auth`                                     | Supabase Auth                  | Guest (anonymous), email, deep-link reset, account deletion |
| `content`                                  | Supabase RPCs                  | `get_lesson`, `submit_answer`, `complete_lesson`, practice  |
| `profile`                                  | Supabase RPCs                  | `update_profile`, `sync_session`, `export_my_data`          |
| `progress`, `home`, `exams`, `leaderboard` | Supabase RPCs                  | One service per screen family                               |
| `config`                                   | Supabase RPC `get_app_config`  | Zod-validated, falls back to bundled defaults               |
| `billing`                                  | RevenueCat                     | Offerings, purchase, restore — never raw StoreKit/Play code |
| `entitlements`                             | Supabase + `sync-entitlements` | The server's view, which is the one that counts             |
| `ads`                                      | Google Mobile Ads              | Test ids outside production, whatever the env says          |
| `consent`                                  | Google UMP (+ ATT on iOS)      | Resolved before any ad request                              |
| `analytics`                                | PostHog (EU)                   | A no-op until consent; no personal data in events           |
| `monitoring`                               | Sentry                         | PII scrubbed; inert without a DSN                           |
| `notifications`                            | expo-notifications             | Local only: daily reminder, streak reminder                 |

A service whose phase had not arrived yet used to be a named no-op. None is left, and
`assertNoNoopServicesInProduction` refuses to start a production build that wires one.

## How an answer travels

The path that matters most, end to end:

1. `QuestionPage` renders the question from its type-specific `payload`, which never contains
   the answer.
2. The learner taps **Check**; the hook calls `services.content.submitAnswer`.
3. `submit_answer` (security definer) looks up the answer key in `question_answer_keys` —
   a table no client role can read — normalises and grades the answer, spends a life if the
   rules say so, and writes the attempt.
4. In the same transaction, a correct first answer writes one row to `xp_events`
   (`UNIQUE (user_id, source_type, source_id)` makes a double submit a no-op), updates
   `user_stats` and the weekly leaderboard row, and evaluates the achievements the event can
   affect.
5. The RPC returns the verdict, the explanation and what changed; the hook invalidates the
   affected queries. A network failure keeps the selection and never costs a life.

Refusals come back as SQLSTATE codes (`LV000` out of lives, `RL000` rate limited) and are
mapped to typed errors in `src/services/content/answerRefusal.ts`.

## RPC design

- **Security definer, `search_path = ''`, schema-qualified names, `auth.uid()` required.**
  `EXECUTE` is granted to `authenticated` only where a client needs it.
- **Old app versions stay installed.** Functions change additively; a breaking change is a new
  function (`submit_answer_v2`), and `min_supported_app_version` retires builds that still
  call the old one (see `docs/DEPLOYMENT.md`).
- **Responses are validated with Zod** at the service boundary, so a schema drift fails loudly
  in one place rather than as an `undefined` three screens later.
- Database types are generated (`npm run db:types`) after every migration.

## Builds and configuration

- `app.config.ts` derives the variant (development / preview / production) from
  `EXPO_PUBLIC_APP_ENV`: name, bundle id and scheme differ so all three install side by side.
- `src/lib/env.ts` validates the environment at startup with Zod. A production build with a
  missing key refuses to start with a clear message instead of failing later.
- Over-the-air updates use a **fingerprint** runtime version, so JavaScript can never reach a
  build whose native code it does not match. Details in `docs/DEPLOYMENT.md`.

## Where the rest is written down

| Topic                                   | Document               |
| --------------------------------------- | ---------------------- |
| Tables, policies, functions, migrations | `docs/DATABASE.md`     |
| Content format and pipeline             | `docs/CONTENT.md`      |
| Tiers, products, RevenueCat, ad rules   | `docs/MONETIZATION.md` |
| Privacy, deletion, processors           | `docs/LEGAL.md`        |
| Test layers, E2E, device checklists     | `docs/TESTING.md`      |
| Builds, TestFlight, Play, updates       | `docs/DEPLOYMENT.md`   |
| Conventions for changing the code       | `CONTRIBUTING.md`      |
| Scope                                   | `docs/SPEC.md`         |
