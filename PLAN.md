# CodeSprint — PLAN.md

**Status:** Step 1 (Inspection & Planning) complete. Awaiting approval before Phase 1.
**Spec:** `docs/SPEC.md` (v2, 1486 lines — copied verbatim, single source of truth).
**Date:** 2026-09-16

---

## 1. Repository inspection — what exists today

`C:\Users\Alexandru\CodeSprint` is **completely empty** and is **not a git repository**. There is no prior code, no `package.json`, no history. This is a greenfield build, so nothing in the spec conflicts with existing work.

`docs/SPEC.md` has been created (verbatim copy of the master spec). No other files written.

### Machine / toolchain audit

| Tool                 | Found                     | Verdict                                                                                             |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| Node.js              | v24.15.0                  | OK. Confirm Expo 57 tooling is happy on install; Node 22 LTS is the fallback if any warning appears |
| npm                  | 11.12.1                   | OK (npm 12.0.2 available, not required)                                                             |
| git                  | 2.53.0.windows.2          | OK — but `git init` still needed (Phase 1)                                                          |
| Python               | 3.14.4 only               | **Gap.** D9 requires content verified on **3.12 AND latest stable 3.x**. 3.12 is missing            |
| Docker               | **not installed**         | **Blocker for Phase 3.** Supabase CLI local dev requires it                                         |
| Supabase CLI         | not installed             | Will be added as a devDependency (`supabase` 2.117.0) — no global install needed                    |
| EAS CLI              | not installed             | Will run via `npx eas-cli@24.6.0` — no global install needed                                        |
| Android Studio / adb | not installed             | Not strictly required, but recommended (platform-tools) for fast device installs                    |
| Java                 | present (Oracle javapath) | Not needed unless building Android locally                                                          |
| OS                   | Windows 11 Pro            | **No macOS → no local iOS builds.** iOS goes through EAS Build                                      |

### Version facts verified against the npm registry (today)

- **Expo SDK 57.0.23 is the current stable release** (`expo@latest`). SDK 58 exists only as `preview.2`. This satisfies spec §0.1.10 (≥57, never 56) — we target **SDK 57**.
- React Native 0.87.1, expo-router 57.0.21, jest-expo 57.0.5, expo-dev-client 57.0.19.
- Later-phase SDKs available: react-native-purchases 10.9.1, react-native-google-mobile-ads 16.5.0, posthog-react-native 4.74.0, @sentry/react-native 8.26.0.
- Support libs: zustand 5.0.15, @tanstack/react-query 5.103.1, zod 4.6.5.

Exact versions will be pinned by `npx expo install` at Phase 1, which resolves the SDK-57-compatible version of each package rather than blindly taking `latest`.

---

## 2. Open decisions (§0.2) — defaults apply unless you change them

If you say nothing, I proceed with the **Default** column.

| #   | Decision                       | Default I will use                                                                  | Why / what it costs to change later                                                                                                                 |
| --- | ------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Guest mode (anonymous sign-in) | **ON.** Account required before purchase and before leaderboard visibility          | Cheap to turn off later via `guest_mode_enabled`. Raises Supabase MAU — mitigated by the 30-day anonymous cleanup job                               |
| D2  | No Ads product type            | **Monthly subscription**, €2.99 target                                              | Product IDs are permanent in the stores. Switching to a one-time non-consumable later means a _new_ product, not an edit                            |
| D3  | Annual Premium at launch       | **YES** (`premium_annual`)                                                          | Adds one store product + one paywall row. Best added now, since IDs are permanent                                                                   |
| D4  | Free trial                     | **None at launch.** Paywall renders trial terms dynamically if an offer ever exists | Trials are store-side config; the code path exists from day one either way                                                                          |
| D5  | Free content boundary          | **Modules 1–6 free**, 7–17 Premium (`free_module_count = 6`)                        | Pure config — changeable any time without a release                                                                                                 |
| D6  | Social login                   | **Apple + Google**                                                                  | If Google ships on iOS, Apple _must_ too (App Review rule). Email-only is the cheaper V1 alternative — tell me if you want to defer social to V1.1  |
| D7  | Analytics                      | **PostHog Cloud (EU)**                                                              | Behind `AnalyticsService`; swappable                                                                                                                |
| D8  | Crash/error monitoring         | **Sentry**                                                                          | Behind `MonitoringService`; swappable                                                                                                               |
| D9  | Python semantics               | **Identical output on 3.12 and latest stable 3.x (3.14)**                           | Requires installing Python 3.12 locally — see blockers                                                                                              |
| D10 | Minimum age                    | **13**                                                                              | Drives the age gate and store questionnaires                                                                                                        |
| D11 | Personalized ads               | **Consent + 16 or older only**                                                      | Conservative EEA default; reduces ad revenue slightly, reduces legal risk a lot                                                                     |
| D12 | Google Play account type       | **Undecided — I need your answer**                                                  | Organization (needs D-U-N-S) is _exempt_ from the 12-tester/14-day closed test. Personal is not. This changes the Phase 15–22 timeline by ~2+ weeks |

**D12 and D6 are the two I'd like an explicit answer on.** D12 changes the release schedule; D6 changes Phase 4's scope.

---

## 3. Human prerequisites (§0.3) — what blocks what

Start the top four **now**, in parallel with Phase 1. Nothing here blocks Phases 1–13.

| #   | Action                                                                                                                               | Blocks                                                                                               | Start by                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------- |
| H1  | **Name clearance** — "CodeSprint" is already used by other coding apps and events. Check EUIPO/TMview, USPTO, App Store, Google Play | Phase 23 (store assets); a late rename wastes design work                                            | **Now**                       |
| H2  | **Legal entity** (individual / PFA / SRL)                                                                                            | D12, EU DSA trader details, Phase 23                                                                 | **Now**                       |
| H3  | **Google Play Console account** ($25 one-time) + decide D12                                                                          | Phase 14 (subscriptions can only be created after a bundle is uploaded to a testing track), Phase 22 | **Now**                       |
| H4  | **Apple Developer Program** ($99/yr) + Paid Apps agreement, tax & banking                                                            | Phase 14 **and all iOS device testing** (see R3)                                                     | **Now**                       |
| H5  | **Docker Desktop** (or Rancher Desktop / Podman)                                                                                     | **Phase 3** — hard blocker                                                                           | Before Phase 3                |
| H6  | **Python 3.12** installed alongside 3.14                                                                                             | **Phase 6** — hard blocker for D9 verification                                                       | Before Phase 6                |
| H7  | **Android phone** + USB debugging (and ideally `adb`)                                                                                | Phase 1 device check                                                                                 | Before Phase 1 sign-off       |
| H8  | **iPhone**                                                                                                                           | iOS device checks (deferred to Phase 14 — see R3)                                                    | Before Phase 14               |
| H9  | **Domain + transactional SMTP** (Supabase's built-in sender is not for production)                                                   | Phase 4 (email verification, password reset), Phase 18 (static pages)                                | Before Phase 4                |
| H10 | **RevenueCat account** + store products created                                                                                      | Phase 14                                                                                             | Before Phase 14               |
| H11 | **AdMob account** + app + ad units                                                                                                   | Phase 15 (test IDs work before this)                                                                 | Before Phase 15               |
| H12 | **PostHog (EU) + Sentry accounts**                                                                                                   | Phase 16 (Sentry DSN optional in Phase 1)                                                            | Before Phase 16               |
| H13 | **Supabase account** — staging (free) + production (paid, EU region)                                                                 | Phase 3 (staging), Phase 22 (production)                                                             | Before Phase 3                |
| H14 | **Legal review** of privacy policy, terms, consent flow, age handling                                                                | Phase 23 submission                                                                                  | Before Phase 18 ends          |
| H15 | **If D12 = Personal:** recruit 15–20 testers, start the 14-day closed test                                                           | Production access                                                                                    | No later than end of Phase 15 |

---

## 4. Proposed folder structure

Matches §7 exactly. Directories are created **when a phase needs them**, not as empty stubs (§58: "no empty busywork files").

```
CodeSprint/
├── CLAUDE.md                  # working rules, phase gate, key commands, @docs/SPEC.md
├── PLAN.md                    # this file
├── app.config.ts              # dev/preview/production variants
├── eas.json
├── package.json  tsconfig.json  .eslintrc / eslint.config.js  .prettierrc  jest.config.js
├── .env.example               # never real values
├── docs/
│   ├── SPEC.md  PROGRESS.md  ARCHITECTURE.md  DATABASE.md  CONTENT.md
│   ├── MONETIZATION.md  LEGAL.md  DEPLOYMENT.md  TESTING.md  CONTRIBUTING.md
├── src/
│   ├── app/                   # Expo Router routes ONLY — thin, compose feature screens
│   │   ├── _layout.tsx  +not-found.tsx
│   │   ├── (auth)/  (onboarding)/
│   │   ├── (tabs)/            # index(Home) learn leaderboard profile
│   │   ├── lesson/[id].tsx  practice/  exam/  paywall.tsx
│   ├── features/              # auth onboarding consent home learn lesson questions
│   │   │                      # practice progress streak lives achievements
│   │   │                      # daily-challenge leaderboard exams paywall
│   │   │                      # subscriptions ads notifications profile settings
│   │   └── <feature>/         # components/ hooks/ api.ts logic/ types.ts store.ts
│   ├── components/ui/         # design-system primitives
│   ├── services/              # supabase billing ads analytics monitoring
│   │                          # notifications consent config
│   ├── store/                 # cross-feature Zustand: session, settings
│   ├── i18n/                  # setup + locales/en/*.json
│   ├── theme/                 # tokens, light, dark
│   └── lib/  utils/  constants/  types/
├── supabase/
│   ├── migrations/  functions/  tests/  seed.sql  config.toml
├── content/python-fundamentals/
│   ├── course.yaml  modules/NN-slug/module.yaml  modules/NN-slug/lessons/NN-slug.yaml
├── scripts/content/           # validate.ts  verify_python.py  publish.ts
├── web/                       # static: privacy, terms, support, delete-account, app-ads.txt
├── e2e/                       # Maestro flows
└── .github/workflows/ci.yml
```

### Import boundaries (enforced, not just documented)

ESLint `no-restricted-imports` will make these **build failures**, per §7:

- `src/app/**` and `src/features/**/components/**` may not import `@supabase/supabase-js`, `react-native-purchases`, `react-native-google-mobile-ads`, `posthog-react-native`, `@sentry/react-native`.
- Only `src/services/**` may import those packages.
- `eslint-plugin-import` `import/no-cycle` bans circular dependencies.
- Path aliases: `@/app`, `@/features`, `@/components`, `@/services`, `@/store`, `@/theme`, `@/lib`, `@/utils`, `@/constants`, `@/types`, `@/i18n`.

---

## 5. Proposed architecture

### 5.1 State strategy (§0.1.3)

| Kind of state    | Tool                        | Examples                                                                                                                                                      |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server state** | TanStack Query              | content, progress, leaderboard, app_config, entitlements, offerings                                                                                           |
| **Client state** | Zustand                     | active lesson session (current block, selections, attempt counts), settings cache, auth session mirror, RevenueCat `CustomerInfo` mirror, UI (modals, toasts) |
| **Never**        | React Context for hot state | Context only for theme + i18n providers, which change rarely                                                                                                  |

Query-key conventions, so cache invalidation is mechanical rather than guesswork:

```
['config']                                  staleTime: 5 min
['content', contentVersion, 'course', id]   staleTime: Infinity  (keyed by content_version §35)
['content', contentVersion, 'lesson', id]   staleTime: Infinity
['user', uid, 'home']                       invalidated by: submit_answer, complete_lesson
['user', uid, 'progress']                   invalidated by: complete_lesson, submit_exam
['user', uid, 'stats' | 'achievements']     invalidated by: any XP-awarding RPC
['leaderboard', weekStart]                  staleTime: 60 s
['entitlements', uid]                       invalidated by: purchase, restore, refreshEntitlements
```

Because `content_version` is part of the key, publishing content invalidates every client's content cache without any push mechanism — that is the whole cache-busting design, and it costs nothing.

### 5.2 Service layer

Every third-party SDK lives behind a typed interface in `src/services/`. Each gets a real implementation in its phase and a **clearly named no-op** (`NoopAdService`, etc.) before then. Per §7, a guard asserts no-ops are never used in a production build — I'll implement that as a startup check that throws in `production` when a no-op is registered, so it fails loudly in CI/preview rather than silently shipping.

| Service               | Interface (abridged)                                                      | Real impl. phase   |
| --------------------- | ------------------------------------------------------------------------- | ------------------ |
| `ConfigService`       | `get<T>(key)`, `refresh()`, bundled defaults                              | 3                  |
| `SupabaseService`     | typed client, SecureStore session adapter, `rpc<T>()` with Zod parsing    | 3                  |
| `ConsentService`      | `requestIfNeeded()`, `status()`, `openPrivacyOptions()`                   | 5 UI / 15 real UMP |
| `NotificationService` | `schedule`, `cancelAll`, `permissions()`                                  | 17                 |
| `AnalyticsService`    | `capture(event, props)`, `identify`, `optIn/optOut` — no-op until consent | 16                 |
| `MonitoringService`   | `captureException`, `setUser(pseudonymous)`, scrubbing                    | 1 (if DSN)         |
| `BillingService`      | §31 method list                                                           | 14                 |
| `AdService`           | §30 method list                                                           | 15                 |

### 5.3 RPC design principles

- Every gameplay write is a **`SECURITY DEFINER`** function with `SET search_path = ''`, fully schema-qualified names, `auth.uid()` required, inputs validated, `EXECUTE` revoked from `anon`/`public` where the function needs a real user.
- Client tables carry **no write policies** for gameplay data. The client physically cannot write XP, progress, lives or attempts.
- Every RPC response is parsed with **Zod on the client** before it reaches React. A schema drift becomes a caught error, not a white screen.
- **Backward compatibility (§51):** old app versions stay installed. Changes to an RPC must be additive (new optional args with defaults, new response fields). A breaking change ships as `submit_answer_v2`, with `min_supported_app_version` used to retire old clients.
- Answer keys never leave the database. `get_lesson` returns `payload` (options/tokens/lines) but never `question_answer_keys`; `explanation` is returned **only** in the `submit_answer` response.

---

## 6. Database schema v1 (draft)

Conventions (§39): UUID PKs, `timestamptz`, `created_at`/`updated_at` with a shared trigger, `ON DELETE CASCADE` on user-owned data, indexes on FKs and hot paths, **RLS enabled on every table**, migrations only via the Supabase CLI.

### 6.1 Content tables

| Table                  | Key columns                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `courses`              | `id`, `slug` uniq, `title` jsonb, `description` jsonb, `language`, `icon_key`, `order_index`, `is_active`                                                                                                                           |
| `modules`              | `id`, `course_id`→courses, `slug`, `title` jsonb, `description` jsonb, `order_index`, `is_premium_override` bool null, `estimated_minutes`, `is_active`                                                                             |
| `lessons`              | `id`, `module_id`→modules, `slug`, `title` jsonb, `summary` jsonb, `order_index`, `estimated_minutes`, `review_status`, `content_hash`, `is_active`                                                                                 |
| `lesson_contents`      | `lesson_id` PK→lessons, `blocks` jsonb, `content_hash`                                                                                                                                                                              |
| `questions`            | exactly §17 — incl. `payload` jsonb (**no answers**), `explanation` jsonb, `hint` jsonb, `difficulty`, `skill_tags` text[], `is_premium`, `is_active`, `is_challenge_eligible`, `is_exam_eligible`, `review_status`, `content_hash` |
| `question_answer_keys` | `question_id` PK→questions, `answer` jsonb, `match_mode`, `accepted_answers` jsonb. **RLS on, zero policies**                                                                                                                       |
| `exams`                | `id`, `course_id`, `slug`, `title` jsonb, `question_count`, `time_limit_minutes`, `pass_threshold_pct`, `requires_entitlement` text null, `is_active`                                                                               |

**Premium gating is computed, not duplicated:** effective premium = `COALESCE(modules.is_premium_override, modules.order_index > free_module_count)`, read from `app_config`. Moving the free boundary (D5) is then a config change with zero migration and zero republish.

**Sample vs full exam** are two `exams` rows (`python-fundamentals-sample`, 10 q, no entitlement; `python-fundamentals-full`, 30 q, `requires_entitlement = 'premium'`), not a code branch.

### 6.2 User tables

| Table                         | Key columns                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                    | `id` PK = `auth.users.id`, `display_name`, `avatar_key`, `birth_year`, `locale`, `timezone` (IANA, validated vs `pg_timezone_names`), `experience_level`, `motivation`, `daily_goal_minutes`, `reminder_time`, `onboarding_completed_at`, `leaderboard_hidden`, `analytics_consent`, `ads_consent_status`, `is_anonymous`, `last_seen_at` |
| `user_stats`                  | `user_id` PK, `xp_total`, `current_streak`, `longest_streak`, `last_qualifying_date`, `lives`, `lives_updated_at`, `lessons_completed`, `questions_answered`, `questions_correct`                                                                                                                                                         |
| `xp_events`                   | `id`, `user_id`, `source_type`, `source_id`, `amount`, `counts_for_leaderboard`, `week_start`, `created_at` — **`UNIQUE (user_id, source_type, source_id)`**                                                                                                                                                                              |
| `user_question_attempts`      | `id`, `user_id`, `question_id`, `context` (lesson/practice/challenge/exam), `is_correct`, `attempt_no`, `submitted_answer` jsonb, `created_at`                                                                                                                                                                                            |
| `user_lesson_progress`        | PK `(user_id, lesson_id)`, `status`, `questions_correct`, `questions_total`, `is_perfect`, `started_at`, `completed_at`                                                                                                                                                                                                                   |
| `user_daily_activity`         | PK `(user_id, local_date)`, `lessons_completed`, `questions_answered`, `xp_earned`, `qualified`                                                                                                                                                                                                                                           |
| `daily_challenges`            | `challenge_date` PK, `question_ids` uuid[], `bonus_xp`                                                                                                                                                                                                                                                                                    |
| `user_daily_challenge_claims` | PK `(user_id, local_date)`, `xp_awarded`, `question_ids`, `completed_at`                                                                                                                                                                                                                                                                  |
| `achievements`                | `id`, `slug` uniq, `name` jsonb, `description` jsonb, `icon_key`, `rule` jsonb, `xp_reward`, `is_active`, `sort_order`                                                                                                                                                                                                                    |
| `user_achievements`           | PK `(user_id, achievement_id)`, `unlocked_at`                                                                                                                                                                                                                                                                                             |
| `leaderboard_weekly`          | PK `(week_start, user_id)`, `xp` — index `(week_start, xp DESC)`                                                                                                                                                                                                                                                                          |
| `exam_attempts`               | `id`, `user_id`, `exam_id`, `question_ids` uuid[], `answers` jsonb, `score_pct`, `passed`, `skill_breakdown` jsonb, `started_at`, `expires_at`, `submitted_at`                                                                                                                                                                            |
| `user_entitlements`           | PK `(user_id, entitlement)`, `is_active`, `expires_at`, `product_id`, `store`, `updated_at` — **Edge Functions only**                                                                                                                                                                                                                     |
| `billing_events`              | `event_id` PK (idempotency), `user_id`, `event_type`, `payload` jsonb, `received_at`, `processed_at`                                                                                                                                                                                                                                      |
| `rewarded_ad_grants`          | `id`, `user_id`, `reward_type`, `local_date`, `granted_at` — index `(user_id, local_date, reward_type)`                                                                                                                                                                                                                                   |
| `reports`                     | `id`, `reporter_id`, `reported_user_id`, `reason`, `note`, `status`, `created_at`                                                                                                                                                                                                                                                         |
| `app_config`                  | `key` PK, `value` jsonb, `is_public` bool, `updated_at`                                                                                                                                                                                                                                                                                   |

Dropped per spec: `products`, `question_options`, `leaderboard_entries`.

### 6.3 RLS access matrix (to be proven by pgTAP, §40)

| Table                                                                                      | `anon` | guest                  | free       | premium    | other user                               |
| ------------------------------------------------------------------------------------------ | ------ | ---------------------- | ---------- | ---------- | ---------------------------------------- |
| `courses`/`modules`/`lessons` (active)                                                     | ✗      | read                   | read       | read       | read                                     |
| `lesson_contents`, `questions`                                                             | ✗      | **RPC only**           | RPC only   | RPC only   | ✗                                        |
| `question_answer_keys`                                                                     | ✗      | ✗                      | ✗          | ✗          | ✗                                        |
| `profiles`                                                                                 | ✗      | own R / whitelisted W  | same       | same       | ✗ (name+avatar via leaderboard RPC only) |
| `user_stats`, `xp_events`, attempts, progress, daily activity, achievements, exam attempts | ✗      | **own read, no write** | same       | same       | ✗                                        |
| `user_entitlements`                                                                        | ✗      | own read               | own read   | own read   | ✗                                        |
| `billing_events`                                                                           | ✗      | ✗                      | ✗          | ✗          | ✗                                        |
| `app_config` (`is_public`)                                                                 | read   | read                   | read       | read       | read                                     |
| `reports`                                                                                  | ✗      | insert own             | insert own | insert own | ✗                                        |

pgTAP will assert all five columns for every table — including the negative cases, which are the ones that actually matter.

### 6.4 RPC list

**Read (SECURITY DEFINER, entitlement-aware, answer keys stripped):**
`get_app_config()` · `get_course_overview(course_id, locale)` · `get_lesson(lesson_id, locale)` · `get_home_summary(locale)` · `get_progress_summary(locale)` · `get_leaderboard(week_start)` · `get_practice_set(mode, limit, locale)` · `get_daily_challenge(locale)` · `get_achievements(locale)` · `export_my_data()`

**Write (SECURITY DEFINER, the only path to gameplay state):**
`submit_answer(question_id, answer, context, session_id)` → `{is_correct, explanation, xp_awarded, lives_remaining, achievements_unlocked[]}` · `complete_lesson(lesson_id)` · `start_exam(exam_id)` · `submit_exam(attempt_id, answers)` · `complete_daily_challenge()` · `grant_rewarded_ad_reward(reward_type)` · `update_profile(patch)` (whitelisted columns) · `sync_session(timezone, app_version)` · `report_user(user_id, reason, note)`

**Internal helpers (never granted to clients):**
`_grade_answer()` per question type · `_award_xp()` (ledger + `user_stats` + `leaderboard_weekly` in one transaction) · `_regen_lives()` / `_consume_life()` · `_user_local_date()` · `_evaluate_achievements(rule_types[])` · `has_entitlement(uid, entitlement)` (STABLE)

**The one transaction that matters** — `submit_answer` does all of this atomically: regenerate lives lazily → check entitlement/lives → grade against `question_answer_keys` → record the attempt → award XP through the ledger (unique key = no double-award on retry) → update `user_stats` + `leaderboard_weekly` → mark daily activity and recompute streak → evaluate only the achievement rule types this event can affect → return the result with the explanation. A duplicate submit is a no-op by construction, not by client discipline.

---

## 7. Dependencies

### 7.1 Installed in Phase 1 (each justified, per §59.13)

Installed with `npx expo install` so versions match SDK 57, not `latest`.

| Package                                                                                                                                                                                                              | Why                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `expo`, `react`, `react-native`                                                                                                                                                                                      | Framework (SDK 57)                                                       |
| `expo-router`                                                                                                                                                                                                        | File-based routing, §7                                                   |
| `expo-dev-client`                                                                                                                                                                                                    | Required — Expo Go can't host AdMob/RevenueCat native code (§0.1.10)     |
| `expo-system-ui`, `expo-status-bar`, `expo-splash-screen`, `expo-constants`, `expo-linking`                                                                                                                          | Baseline app shell, theming, deep-link config                            |
| `expo-localization` + `i18next` + `react-i18next`                                                                                                                                                                    | §38, no hardcoded strings from day one                                   |
| `zustand`                                                                                                                                                                                                            | Client state (§0.1.3)                                                    |
| `@tanstack/react-query`                                                                                                                                                                                              | Server state (§0.1.3)                                                    |
| `zod`                                                                                                                                                                                                                | Env validation now; content + RPC parsing later                          |
| `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`                                                                                                  | Router/navigation peers; Reanimated needed from the start (Babel plugin) |
| `@sentry/react-native`                                                                                                                                                                                               | Only if a DSN exists; otherwise deferred and listed as a human action    |
| **dev:** `typescript`, `@types/react`, `eslint`, `eslint-config-expo`, `eslint-plugin-import`, `prettier`, `eslint-config-prettier`, `jest`, `jest-expo`, `@testing-library/react-native`, `@types/jest`, `supabase` | Toolchain, lint boundaries, tests, local DB CLI                          |

### 7.2 Deliberately deferred to their phase

`@supabase/supabase-js` + `expo-secure-store` (3) · `expo-image`, `lottie-react-native`, `expo-haptics`, `expo-audio` (2–8, when first used) · `react-native-purchases` (14) · `react-native-google-mobile-ads`, `expo-tracking-transparency` (15) · `posthog-react-native` (16) · `expo-notifications` (17) · `expo-network`/`netinfo` (as needed).

Anything not on these lists gets justified in `PROGRESS.md` before it's added.

---

## 8. Environment variables (§56)

`EXPO_PUBLIC_*` values are **embedded in the app bundle and are public by design** — that is exactly why no secret may ever be named `EXPO_PUBLIC_*`.

**Public (app):** `EXPO_PUBLIC_APP_ENV` · `EXPO_PUBLIC_SUPABASE_URL` · `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` · `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` · `EXPO_PUBLIC_ADMOB_{BANNER,INTERSTITIAL,REWARDED}_ID_{IOS,ANDROID}` · `EXPO_PUBLIC_POSTHOG_KEY` / `_HOST` · `EXPO_PUBLIC_SENTRY_DSN` · `EXPO_PUBLIC_LEGAL_BASE_URL`

**Build-time, not secret:** AdMob app IDs, bundle IDs per profile, URL scheme, associated domains — in `app.config.ts`.

**Server-only secrets — never in the app, never `EXPO_PUBLIC_*`:** Supabase secret (service-role) key → local scripts + CI secrets · `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_AUTH` → Supabase Edge Function secrets · `SENTRY_AUTH_TOKEN` → EAS secret · `EXPO_TOKEN` → CI · SMTP + OAuth secrets → Supabase dashboard only.

**Phase-aware validation.** A single Zod schema that demanded every variable would make Phase 1 unbootable. So: `EXPO_PUBLIC_APP_ENV` is always required; each later variable becomes required in the phase that introduces it, and in `production` builds the schema requires the full set. This keeps early phases runnable **and** makes a misconfigured production build fail at startup rather than at the user.

---

## 9. PHASE 1 — exact implementation steps

Scope is §58 and nothing more. No Supabase, no ads, no billing, no fake data presented as real.

1. `git init`, `.gitignore` (node_modules, `.env*` except `.env.example`, `.expo`, build output), first commit.
2. Scaffold Expo SDK 57 + TypeScript + Expo Router, routes relocated to `src/app`.
3. `tsconfig.json`: `strict: true`, **`noUncheckedIndexedAccess: true`**, path aliases (§4); mirror aliases in `babel.config.js` and `jest.config.js`.
4. ESLint (`eslint-config-expo` + `import/no-cycle` + the restricted-import boundaries from §4) and Prettier. Verify the boundary rule **actually fails** on a deliberate violation before moving on.
5. Folder skeleton per §7 — only directories a Phase 1 file lives in.
6. `src/constants/brand.ts` — the single home of the name, store title and taglines (§9), plus the matching `en` i18n keys. A rename stays a one-line change.
7. `src/theme/` — tokens + light/dark themes (values only; the component library is Phase 2). Theme follows the OS.
8. Providers in `src/app/_layout.tsx`: QueryClient (with the §5.1 defaults), theme, i18n, error boundary, safe area.
9. Zustand stores: `settingsStore` (theme, sound, haptics), `sessionStore` (auth placeholder for Phase 4).
10. `src/services/` interfaces + documented no-op implementations + the **production no-op guard** (§5.2).
11. `src/lib/env.ts` — Zod, phase-aware (§8); `.env.example` with every variable and `EXPO_PUBLIC_APP_ENV=development`.
12. `app.config.ts` with `development` / `preview` / `production`: distinct names, **distinct bundle IDs/app IDs so all three can coexist on one phone**, URL scheme.
13. `eas.json` with the three profiles; `npx expo install expo-dev-client`.
14. Sentry init **if** a DSN is provided; otherwise the no-op `MonitoringService` and H12 stays open.
15. Placeholder tab screens (Home, Learn, Leaderboard, Profile) using real layout primitives and honest empty states — no mocked stats dressed up as real data (§59.12).
16. `.github/workflows/ci.yml`: typecheck → lint → unit tests on every push/PR. (gitleaks and pgTAP join in Phase 3.)
17. Root `CLAUDE.md` (<150 lines: working rules §59, phase gate §64, key commands, `@docs/SPEC.md`), `docs/PROGRESS.md`, `README.md` skeleton.
18. Build and install the **Android development build** on your phone; verify the device checklist.

**Phase 1 device check (§57):** dev build installs and opens · four tabs visible and navigable · theme follows the system light/dark switch · no red screens, no console errors · app name and tagline come from `brand.ts` · all three build profiles can coexist.

### 9.1 Phase 1 testing strategy (§53)

- **Unit (Jest + jest-expo):** env validation — valid config passes, missing `APP_ENV` fails, malformed URL fails, production requires the full set; `brand.ts` exports non-empty values; one pure util test proving the harness works.
- **Component (RNTL):** `_layout` renders with providers without crashing; a tab screen renders its empty state.
- **Static:** `tsc --noEmit` zero errors; ESLint zero errors, **including a proving test that a restricted import is rejected**.
- **CI:** all of the above on every push.
- Not in Phase 1: pgTAP (Phase 3), Maestro (Phase 21).

**Commands to be wired:** `dev`, `typecheck`, `lint`, `test`, `db:reset`, `db:test`, `content:validate` (the last three land in Phases 3 and 6 but are named now so `CLAUDE.md` stays stable).

---

## 10. Risks and blockers

| #       | Risk                                                               | Impact                                                                                            | Mitigation                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **R1**  | **Docker is not installed** — Supabase CLI local dev needs it      | **Hard blocker for Phase 3.** No local DB, no `supabase db reset`, no `supabase test db`          | Install Docker Desktop (free for individuals/small business under Docker's own thresholds) or Rancher Desktop/Podman before Phase 3. CI is unaffected — GitHub Actions runners ship Docker                   |
| **R2**  | **Python 3.12 is missing** (only 3.14.4 present)                   | **Hard blocker for Phase 6** — D9 dual-version verification can't run                             | Install 3.12 alongside 3.14; `verify_python.py` targets both explicitly. CI uses a `setup-python` matrix regardless                                                                                          |
| **R3**  | **No Mac, and no Apple Developer account yet**                     | iOS dev builds can't be installed on a physical iPhone (device provisioning needs a paid account) | Run device checks for Phases 1–13 on **Android only**; add iOS at Phase 14, where the Apple account is needed anyway. Build iOS via EAS from day one so the config is exercised early, even if not installed |
| **R4**  | **Name "CodeSprint" is likely taken** in this exact category       | Rework of store assets, icon, screenshots, i18n copy late in the project                          | All naming already funnels through `brand.ts` + i18n (Phase 1 step 6), so a rename is one line + assets. Still: settle H1 before Phase 23                                                                    |
| **R5**  | **Google Play 12-tester / 14-day closed test** (if D12 = Personal) | Adds 2+ weeks before production access                                                            | Decide D12 now. If Personal: recruit testers during Phase 10–14 and start the closed test by end of Phase 15                                                                                                 |
| **R6**  | **Content volume: 300–500 verified questions across 17 modules**   | By a wide margin the largest single effort — bigger than any code phase                           | Phase 19 starts in parallel right after Phase 6. Every item is machine-verified (`validate.ts` + `verify_python.py`) and human-reviewed (`review_status`); only `reviewed` publishes to production           |
| **R7**  | **Store account setup gates end-to-end billing**                   | Phase 14 can be written but not fully verified                                                    | Start H3/H4/H10 now. Google Play needs a bundle on a testing track before subscriptions can even be created — upload an internal build during Phase 14                                                       |
| **R8**  | **Legal review of privacy/terms/consent/age handling**             | Submission blocker; also a genuine GDPR exposure                                                  | Placeholders clearly marked as such; `LEGAL.md` tracks processors and DPAs from Phase 1; H14 completes before Phase 18 ends. _This plan is engineering, not legal advice_                                    |
| **R9**  | **Supabase MAU inflated by guest accounts** (D1)                   | Cost creep at the paid tier                                                                       | 30-day anonymous cleanup `pg_cron` job (§12), built in Phase 4 rather than retrofitted                                                                                                                       |
| **R10** | **EAS Build free-tier limits**                                     | Slow iteration if builds are burned carelessly                                                    | A dev client only needs rebuilding when **native** deps change. JS changes reload instantly, and EAS Update covers JS-only fixes                                                                             |
| **R11** | **RPC backward compatibility** — old app versions stay installed   | A breaking RPC change bricks users who haven't updated                                            | Additive-only changes or `_v2` functions (§5.3), plus `min_supported_app_version` force-update. Enforced from the first migration                                                                            |
| **R12** | **Node 24 vs Expo 57 tooling**                                     | Low — possible install-time warnings                                                              | Confirm during Phase 1 install; drop to Node 22 LTS if anything complains                                                                                                                                    |

---

## 11. Interpretations and deviations I'm flagging (§65)

1. **`docs/SPEC.md` written now.** The spec's own "HOW TO USE" header instructs it. `CLAUDE.md` and `docs/PROGRESS.md` are Phase 1 deliverables per §58, so they are _not_ created yet.
2. **Phase 1 installs no backend/monetization SDKs.** §58 doesn't list them, and §59.13 says don't add unneeded dependencies. They arrive in their phases behind the service interfaces.
3. **Phase-aware env validation** (§8) — a strict all-or-nothing schema would make Phase 1 unbootable, which can't be the intent of §56.
4. **Module premium status is computed** from `free_module_count`, not stored per module (§6.1), so D5 stays a config change.
5. **iOS device checks deferred to Phase 14** (R3) — a hardware/account constraint, not a scope reduction. Every phase's iOS _code_ is still written and built.
6. **`git init` is part of Phase 1**, since CI and the spec's commit conventions assume a repository.
7. **Daily-challenge XP is claimed via `complete_daily_challenge()`** rather than inferred inside `submit_answer`, keeping the `UNIQUE (user_id, local_date)` reward guarantee in exactly one place.

---

## 12. What I need from you to start Phase 1

**Required:**

- **D12** — Google Play account type: Organization or Personal? (changes the release timeline by 2+ weeks)
- **D6** — Apple + Google social login in V1, or email-only and defer social to V1.1?
- Approval of this plan.

**Optional now, needed soon:**

- `EXPO_PUBLIC_SENTRY_DSN` if you want Sentry live in Phase 1 (otherwise the no-op ships and H12 stays open).
- Confirmation that defaults D1–D5, D7–D11 stand as written.
- An Android phone available for the Phase 1 device check (H7).

**Start in parallel today, regardless of approval:** H1 (name clearance), H2 (legal entity), H3/H4 (store accounts). These have the longest lead times and none of them block Phase 1 code.

---

_Next action after approval: PHASE 1 — Project setup & architecture (§58)._
