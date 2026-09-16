# CODESPRINT — MASTER BUILD SPECIFICATION (v2)

> **Working name:** CodeSprint. Name clearance is a launch blocker (see §0.3).
> The brand name, store title and taglines must live in exactly one place (`src/constants/brand.ts` plus i18n files) so that a rename is a one-line change.

---

## HOW TO USE THIS DOCUMENT (instructions for Claude Code)

- Save this file in the repository as `docs/SPEC.md`. It is the single source of truth for product scope.
- Keep a short root `CLAUDE.md` (target: under ~150 lines) containing: the working rules (§59), the phase gate rule (§64), the key commands (dev, typecheck, lint, test, db reset, db test, content validate), and the import line `@docs/SPEC.md`.
- Maintain `docs/PROGRESS.md`: current phase, completed phases, decisions taken, open questions, pending human actions. Update it at the end of every phase so the work survives context resets and new sessions.
- Use plan mode (read-only) for Step 1 and at the start of every phase.

---

# 0. DECISIONS, DEFAULTS AND LAUNCH BLOCKERS

## 0.1 Decisions locked in v2

1. Gameplay is **server-authoritative** through PostgreSQL functions called as Supabase RPCs. Answer keys are never readable by the client. No dedicated backend server.
2. XP is written only through an **append-only XP ledger** with a unique constraint per reward event.
3. **Server state** (content, progress, leaderboard, config) → TanStack Query. **Client state** (active lesson session, UI state, cached settings) → Zustand.
4. Educational content is **content-as-code** (YAML files in the repo), validated and executed in CI, and published to Supabase by a script. Scripts + Supabase Studio are the V1 admin tooling.
5. Store prices are **never hardcoded**. The app displays localized prices from RevenueCat Offerings.
6. The paywall lists **only features that exist in the shipped build**.
7. Certificates, offline mode and push notifications are **V2**.
8. Reminders use **local scheduled notifications only** in V1.
9. No web framework in V1. Only static pages (privacy, terms, support, account-deletion request, `app-ads.txt`) on a free static host whose terms allow commercial use (for example Cloudflare Pages or GitHub Pages). Vercel's free Hobby plan is restricted to non-commercial use, so it is not the default.
10. Expo: **latest stable SDK, 57 or newer**. Do not target SDK 56 (known Hermes V1 memory regression affecting Reanimated/worklets). **Development builds** (`expo-dev-client`) are required; Expo Go is not supported because AdMob and RevenueCat need native code.

## 0.2 Open decisions

Claude Code must list these in `PLAN.md` with the default and wait for confirmation. If the user does not change them, the defaults apply.

| #   | Decision                                                    | Default                                                                                                                           |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Guest mode (Supabase anonymous sign-in before registration) | ON. Account required before purchase and for leaderboard visibility                                                               |
| D2  | No Ads product type                                         | Monthly subscription (€2.99 target). Alternative: one-time non-consumable "Remove Ads"                                            |
| D3  | Annual Premium plan at launch                               | YES (`premium_annual`)                                                                                                            |
| D4  | Free trial                                                  | None at launch. Trials are configured in the stores; the paywall renders trial terms dynamically if an offer exists               |
| D5  | Free content boundary                                       | Modules 1–6 free, the rest Premium (config `free_module_count`)                                                                   |
| D6  | Social login                                                | Sign in with Apple + Google. If Google is offered on iOS, Sign in with Apple must also be offered. Alternative: email-only for V1 |
| D7  | Analytics provider                                          | PostHog Cloud (EU region)                                                                                                         |
| D8  | Crash/error monitoring                                      | Sentry                                                                                                                            |
| D9  | Python semantics for content                                | Output must be identical on Python 3.12 and the latest stable 3.x                                                                 |
| D10 | Minimum user age                                            | 13                                                                                                                                |
| D11 | Personalized ads                                            | Only with consent, and only for users aged 16+                                                                                    |
| D12 | Google Play account type                                    | Organization (requires D-U-N-S; exempt from the 12-tester closed-test rule) vs Personal                                           |

## 0.3 Launch blockers (human actions — start immediately, in parallel with Phase 1)

- **Name clearance.** "CodeSprint" is already used by other coding-learning apps on Google Play and by coding events. Check EUIPO/TMview, USPTO, App Store and Google Play before producing store assets. Choose a clear name early.
- **Legal entity** (individual, PFA or SRL). It affects the EU DSA trader details that both stores display publicly, taxation, and the Google Play account type.
- **Google Play testing rule.** New personal developer accounts must run a closed test with at least 12 opted-in testers for 14 continuous days before production access. Organization accounts are exempt. If personal: recruit 15–20 testers early and start the closed test no later than the end of Phase 15.
- **Store accounts and agreements.** Apple Developer Program, Paid Apps agreement, tax and banking; Google Play payments profile. Subscriptions cannot be tested end-to-end before these are complete.
- **iOS build machine.** A Mac for local builds, or EAS Build in the cloud (free tier has monthly build limits).
- **Domain and transactional email** (custom SMTP for Supabase Auth; the built-in sender is not for production).
- **Physical test devices:** at least one Android phone and one iPhone.
- **Legal review** of privacy policy, terms, consent flow and age handling before launch.

---

# 1. PRODUCT

## Product name

**CodeSprint** (working name)

### App Store / Google Play title

**CodeSprint: Learn to Code**

### Main tagline

**Learn to Code. 5 Minutes a Day.**

### Short promotional line

**Bite-sized lessons. Daily challenges. Real coding progress.**

### Product positioning

CodeSprint is a mobile-first micro-learning platform that helps beginners and students build programming skills through short, interactive daily sessions.

The first release focuses exclusively on **Python**.

The architecture must support additional programming languages later without a rewrite.

---

# 2. ROLE

You are acting simultaneously as:

- a world-class senior software architect
- a senior React Native / Expo engineer
- a senior TypeScript engineer
- a senior Supabase/PostgreSQL engineer
- a senior mobile UX/UI designer
- a product manager for consumer learning apps
- a mobile monetization specialist
- a QA/test automation engineer
- a security and privacy engineer
- a DevOps/release engineer
- an app-store launch specialist

Your job is to design and implement a production-ready mobile application.

Do not build a toy project, mockup, or throwaway demo. Build a clean, scalable, maintainable commercial product that can be launched to real users and maintained by one developer.

---

# 3. PRODUCT VISION

Core idea:

> **Learn to Code. 5 Minutes a Day.**

The product combines micro-learning, quizzes, practice, daily challenges, progression (XP, levels, streaks, achievements), weekly leaderboards, exams, subscriptions and advertising.

The experience must feel modern, fast, polished, motivating and extremely easy to understand.

A user must be able to:

1. open the application
2. immediately understand what to do
3. start today's session
4. complete several exercises
5. receive XP
6. see progress
7. have a reason to return tomorrow

Do not add unnecessary complexity.

---

# 4. TARGET AUDIENCE

- **Complete beginners** who need structured guidance.
- **Students** learning Python for university, exams, coursework or personal development.
- **Beginner developers** who want short daily practice.

The product must remain accessible to teenagers, university students, adults and career changers.

Minimum age: 13 (D10). Users under 16 receive privacy-protective defaults (see §41). Content and tone must suit teenagers.

---

# 5. BUSINESS MODEL

Three tiers. All limits are configurable in `app_config`.

## FREE — €0

- Python Fundamentals modules 1 to `free_module_count` (default 6)
- lives system (§22)
- one Daily Challenge per day
- practice from completed lessons (limited by lives)
- sample exam: 10 questions, `free_exam_attempts_per_week` (default 1)
- XP, levels, streak, achievements, weekly leaderboard
- basic progress statistics
- advertisements

Do not add a separate daily exercise cap by default (`free_daily_exercise_cap = null`). Lives + content boundary + ads are already enough friction; stacking a fourth limit hurts habit formation.

## NO ADS — target €2.99/month

- everything in Free
- no advertisements

It does **not** unlock Premium content or unlimited lives. The paywall must state this plainly.

## PREMIUM — target €7.99/month, plus annual plan (D3)

- all Python Fundamentals modules
- full Python Fundamentals Exam (30 questions) with retries
- advanced (hard) practice sets and unlimited practice sessions
- detailed statistics (per-skill accuracy, weak areas, history)
- unlimited lives
- no advertisements

## Not in V1 (never shown on the paywall until shipped)

Certificates, offline content, additional courses, AI features.

## Pricing rules

- Prices are set in App Store Connect and Google Play Console, not in code. Target prices are documented in `MONETIZATION.md`.
- Use per-country store pricing; consider lower prices in lower-income markets (including Romania).
- Upgrading from No Ads to Premium must not double-bill: on iOS put all subscriptions in one subscription group with Premium ranked above No Ads; on Android use a product change through RevenueCat with an appropriate replacement mode.
- Product identifiers are permanent in the stores. Choose them carefully before creating them.

---

# 6. TECHNOLOGY STACK

Install native-compatible versions with `npx expo install`. Every added dependency must be justified in `PLAN.md` or `PROGRESS.md`.

## Mobile

| Concern             | Choice                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| Framework           | React Native + Expo (latest stable SDK ≥ 57), New Architecture              |
| Language            | TypeScript, `strict: true`, `noUncheckedIndexedAccess: true`                |
| Routing             | Expo Router (routes in `src/app`)                                           |
| Native dev workflow | `expo-dev-client` development builds, EAS Build/Submit/Update               |
| Client state        | Zustand (no Redux; no React Context for frequently changing state)          |
| Server state        | TanStack Query (caching, retries, loading/error states)                     |
| Validation          | Zod (env, content payloads, RPC responses)                                  |
| Animation           | `react-native-reanimated`, `lottie-react-native` (respect OS reduce-motion) |
| Images              | `expo-image`                                                                |
| i18n                | `i18next`, `react-i18next`, `expo-localization`                             |
| Secure storage      | `expo-secure-store` (session storage adapter; handle its value-size limit)  |
| Haptics / sound     | `expo-haptics`, `expo-audio`                                                |
| Network status      | `expo-network` or `@react-native-community/netinfo`                         |
| Notifications       | `expo-notifications` (local only in V1)                                     |
| Ads                 | `react-native-google-mobile-ads` (includes Google UMP consent APIs)         |
| iOS tracking prompt | `expo-tracking-transparency` (only if personalized ads are requested)       |
| Billing             | `react-native-purchases` (RevenueCat)                                       |
| Analytics           | `posthog-react-native` (EU host)                                            |
| Monitoring          | `@sentry/react-native`                                                      |

## Backend

Supabase: PostgreSQL, Auth (email, Apple, Google, anonymous), Row Level Security, Postgres functions (RPC), `pg_cron` for small maintenance jobs, Edge Functions **only** for: RevenueCat webhook, entitlement sync, account deletion.

Local development uses the Supabase CLI (Docker). Environments: local (dev), hosted staging (free plan acceptable), hosted production (paid plan — free projects pause after a week of inactivity; EU region).

## Tooling

ESLint (Expo config + import/no-cycle + restricted imports), Prettier, Jest (`jest-expo`), React Native Testing Library, pgTAP via `supabase test db`, Maestro for E2E, GitHub Actions CI, gitleaks for secret scanning.

## Not in V1

Next.js, Vercel, any always-on server, WatermelonDB or sync engines, AI APIs, push notification server.

---

# 7. ARCHITECTURE

Modular, feature-first. Routes are thin; domain logic is pure and tested; third-party SDKs are only touched inside `services/`.

```
src/
  app/                        # Expo Router routes only (thin: compose feature screens)
    (auth)/  (onboarding)/  (tabs)/  lesson/[id].tsx  practice/  exam/  paywall.tsx
  features/
    auth/ onboarding/ consent/ home/ learn/ lesson/ questions/ practice/
    progress/ streak/ lives/ achievements/ daily-challenge/ leaderboard/
    exams/ paywall/ subscriptions/ ads/ notifications/ profile/ settings/
      # each feature: components/  hooks/  api.ts  logic/ (pure, unit-tested)  types.ts  store.ts (if needed)
  components/ui/              # design-system primitives
  services/
    supabase/ billing/ ads/ analytics/ monitoring/ notifications/ consent/ config/
  store/                      # cross-feature Zustand stores (session, settings)
  i18n/                       # i18next setup + locales/en/*.json
  theme/                      # tokens, light and dark themes
  lib/  utils/  constants/  types/
supabase/
  migrations/
  functions/                  # revenuecat-webhook, sync-entitlements, delete-account
  tests/                      # pgTAP: RLS matrix, RPC grading, idempotency
  seed.sql
content/
  python-fundamentals/
    course.yaml
    modules/NN-slug/module.yaml
    modules/NN-slug/lessons/NN-slug.yaml
scripts/
  content/validate.ts  content/verify_python.py  content/publish.ts
web/                          # static pages: privacy, terms, support, delete-account, app-ads.txt
e2e/                          # Maestro flows
docs/
```

Rules:

- Components never import Supabase, RevenueCat, AdMob, PostHog or Sentry directly. Enforce with ESLint restricted imports.
- Services expose typed interfaces (`BillingService`, `AdService`, `AnalyticsService`, `MonitoringService`, `NotificationService`, `ConsentService`, `ConfigService`).
- A service whose integration belongs to a later phase may have a clearly named no-op implementation until that phase. No-op implementations must never be used in production builds.
- No circular dependencies. Keep files focused (guideline: split files beyond ~300 lines).
- Generate database types with `supabase gen types typescript` after every migration.

---

# 8. DESIGN SYSTEM

The UI must be modern, polished, minimal and mobile-first: clean, contemporary, friendly, technical but approachable, highly readable, strong hierarchy, subtle gamification, premium visual quality. It must not look like a generic educational template and must not copy another company's branding or proprietary UI.

Create:

- design tokens: color, typography scale, spacing scale, radius, elevation, motion durations
- icon system
- buttons, cards, chips, progress bars and rings, badges
- modal/bottom-sheet system, toast/snackbar system
- loading (skeleton), empty and error states
- **CodeBlock** component: monospace font, no wrapping, horizontal scroll, lightweight local Python syntax highlighter (no heavy web-oriented highlighting library), always left-to-right, screen-reader friendly
- answer feedback panel (correct / incorrect / explanation / hint)

Support light and dark mode; dark mode must be designed intentionally, not inverted.

Motion must respect the OS reduce-motion setting. Fonts must have licenses that allow app embedding (for example SIL OFL).

---

# 9. BRANDING

Display name: **CodeSprint: Learn to Code** · Tagline: **Learn to Code. 5 Minutes a Day.** · Secondary: **Bite-sized lessons. Daily challenges. Real coding progress.**

Tone: encouraging, modern, concise, motivating, technically credible, not childish. Appropriate for teenagers, university students, adults and career changers.

Use the brand consistently in onboarding, home, paywall, store assets, empty states and notifications — always through `brand.ts` and i18n keys, never hardcoded strings.

---

# 10. MAIN NAVIGATION

Bottom tabs:

1. Home
2. Learn
3. Leaderboard (hidden when `leaderboard_enabled` is false)
4. Profile

Progress is reachable from Home and Profile. The lesson player, practice, exam and paywall are full-screen modal routes (no tab bar, no banner ads).

---

# 11. ONBOARDING

Concise (≤ 6 screens), skippable where possible. Ask:

- **experience level:** Complete beginner / Beginner / Intermediate (replaces the separate "programming familiarity" question)
- **primary motivation:** University / Career / Interview preparation / Personal interest / Become better at programming
- **daily goal:** 5 / 10 / 15 minutes — stored as an XP target via config (default 5 → 30 XP, 10 → 60 XP, 15 → 90 XP). Minutes are not measured.
- **reminder time** — request notification permission only after the user picks a time, with a short explanation screen first
- **birth year** (age gate) — under 13: cannot create an account; 13–15: privacy-protective defaults (§41)
- **consent** (EEA/UK/CH): ads consent via Google UMP; analytics opt-in toggle

Intermediate users may choose a starting module (all earlier modules stay accessible). Placement quizzes are V2.

Store onboarding answers in `profiles`. Use them only for lightweight personalization (starting point, reminder copy). No recommendation engine.

---

# 12. AUTHENTICATION

Use Supabase Auth.

- **Guest mode (D1):** anonymous sign-in lets a new user start the first lesson immediately. After the first completed lesson (and before any purchase or leaderboard appearance) prompt to create an account; linking email/Apple/Google keeps the same user ID and progress.
- email/password with email verification (custom SMTP)
- password reset via deep link (PKCE flow); configure app scheme plus universal links / Android app links
- Sign in with Apple and Google (D6)
- secure session persistence (SecureStore-backed adapter), refresh handling, expired sessions, logout
- account deletion (§41)
- RevenueCat: `logIn(user.id)` after authentication, `logOut()` on sign-out
- enable Supabase Auth rate limits; add CAPTCHA if anonymous sign-ups are abused
- clean up anonymous users inactive for 30+ days with a `pg_cron` job (they count toward MAU)

Handle loading, invalid credentials, unverified email, network errors. Never store passwords manually.

---

# 13. HOME SCREEN

The most important screen. Display:

- current streak, total XP, level, lives (Free/No Ads only)
- today's goal as XP progress
- primary CTA: continue learning (next lesson)
- daily challenge card
- course progress
- practice CTA (review mistakes)

Example:

```
HEADER        🔥 12 day streak   ⭐ 2,840 XP   ❤️ 4
MAIN CARD     Today's Learning — Lesson 3.2: Type conversion   [ CONTINUE ]
GOAL          ████████░░ 48 / 60 XP today
PROGRESS      Python Fundamentals ████████░░ 72%
SECONDARY     Daily Challenge — Loops   +25 XP   [ Start Challenge ]
              Review mistakes (7)                 [ Practice ]
```

New users see a welcoming "Start your first lesson" state. The Home screen must never feel empty and must never show a blank screen while loading (skeletons).

---

# 14. LEARNING SYSTEM

Hierarchy:

Course → Module → Lesson (explanation blocks + questions) → Module checkpoint (short quiz) → Final Exam.

Daily Challenge and Practice are cross-cutting and draw from existing questions.

Initial course: **Python Fundamentals**. Improved sequencing (functions earlier because later modules depend on them; "Algorithms" narrowed to beginner problem solving):

1. Getting Started (what Python is, `print`, comments, reading errors)
2. Variables & Assignment
3. Data Types & Type Conversion
4. Operators & Expressions
5. Strings (basics, indexing, f-strings)
6. Conditions
7. Loops
8. Lists
9. Functions
10. Tuples & Sets
11. Dictionaries
12. More Strings & Comprehensions
13. Exceptions
14. Files
15. Modules & the Standard Library
16. OOP Basics
17. Problem Solving (searching, sorting, complexity intuition)

**Final Exam** is an exam, not a module.

---

# 15. LESSON DESIGN

Target length: **3–8 minutes**, 4–8 questions.

A lesson is an ordered list of blocks:

- `text` — short explanation (limited Markdown subset)
- `code` — example with optional "output" panel
- `callout` — note / tip / common mistake
- `question` — reference to a question

Progress bar at the top, completion screen at the end (XP earned, streak status, next lesson). Avoid walls of text; use progressive disclosure.

---

# 16. QUESTION ENGINE

A reusable engine. Each question type = renderer component + Zod payload schema + server-side grader (PL/pgSQL) + tests on both sides.

V1 types:

- **multiple_choice** — one correct option
- **multiple_select** — several correct options (all-or-nothing grading)
- **true_false**
- **predict_output** — show code, ask for output. Multi-line outputs are always multiple choice; free text only for short single-line outputs.
- **fill_blank** — missing code fragment. Default input is a tap-to-place token bank.
- **code_ordering** — arrange lines in the correct order
- **debugging** — select the faulty line and/or choose the correct fix
- **concept_matching** — match concepts to definitions

Reserved (schema only, not rendered, flag `coding_challenges_enabled = false`): **coding_challenge** (requires sandboxed execution — V2).

Free-text input rules: `autoCorrect={false}`, `autoCapitalize="none"`, `spellCheck={false}`, and server-side normalization (curly quotes → straight quotes, typographic dashes → `-`, trimming). Each answer key declares a `match_mode`: `exact`, `trimmed`, `whitespace_insensitive`, or `case_insensitive`, plus optional `accepted_answers`.

---

# 17. QUESTION MODEL

`questions`:

- `id` (stable UUID defined in the content file — never regenerated)
- `lesson_id`
- `type`
- `difficulty` (`easy` | `medium` | `hard`)
- `prompt` (localized JSONB)
- `code_snippet`
- `payload` (JSONB, type-specific, **contains no answers**: options, tokens, lines, pairs)
- `explanation` (localized JSONB — returned only after answering)
- `hint` (localized JSONB)
- `xp_reward` (nullable; derived from difficulty when null)
- `is_premium`, `is_active`, `is_challenge_eligible`, `is_exam_eligible`
- `skill_tags` (text[])
- `order_index`
- `review_status`
- `metadata` (JSONB)
- `content_hash`
- `created_at`, `updated_at`

`question_answer_keys` (`question_id`, `answer` JSONB, `match_mode`, `accepted_answers`): RLS enabled with **no client policies**; read only inside security-definer functions.

A generic `question_options` table is replaced by the type-specific `payload`, because eight heterogeneous question types fit poorly into one relational shape.

Educational content is never hardcoded inside React components.

---

# 18. ANSWER EXPERIENCE

The client sends the answer to `submit_answer` and renders the result. The "Check" button shows a pending state (target p95 < 400 ms; production database in an EU region).

Correct: success state, explanation, XP gained, progress update, subtle animation and haptic.

Incorrect: incorrect state, explanation of the correct answer, optional hint, no shaming, retry where appropriate.

Network error: keep the user's selection, offer retry, never deduct a life.

Use Reanimated/Lottie with restraint; respect reduce-motion.

---

# 19. XP SYSTEM

Deterministic, configured in `app_config`:

| Event                                     | XP                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Easy question, correct on first attempt   | 5                                                                                                                                           |
| Medium question, correct on first attempt | 10                                                                                                                                          |
| Hard question, correct on first attempt   | 15                                                                                                                                          |
| Correct on a retry                        | 50% of the above (rounded down)                                                                                                             |
| Lesson completion                         | 20                                                                                                                                          |
| Module checkpoint passed                  | 30                                                                                                                                          |
| Daily Challenge completed                 | 25                                                                                                                                          |
| Practice answer correct                   | 2 (daily cap 40)                                                                                                                            |
| Exam                                      | `round(score_pct / 100 × exam_xp_max)` (default `exam_xp_max` = 100), awarded only as the improvement over the user's best previous exam XP |
| Achievement                               | per achievement                                                                                                                             |
| Rewarded-ad bonus                         | capped per day; **does not count toward the leaderboard**                                                                                   |

Rules:

- Question XP is awarded at most once per user per question (lesson context).
- All XP is written through `xp_events(user_id, source_type, source_id, amount, counts_for_leaderboard, created_at)` with `UNIQUE (user_id, source_type, source_id)`. Duplicate submissions are no-ops.
- `user_stats.xp_total` and the weekly leaderboard row are updated in the same transaction.
- The client never writes XP.

---

# 20. LEVEL SYSTEM

Thresholds live in `app_config` (array). Defaults:

L1 0 · L2 100 · L3 250 · L4 500 · L5 850 · L6 1,300 · L7 1,850 · L8 2,500 · L9 3,250 · L10 4,100 — then increments grow by ~100 per level.

`getLevel(xp, thresholds)` and `getLevelProgress(xp, thresholds)` are pure, unit-tested functions. Level is derived for display; server-side rules (achievements) use XP, not levels, to avoid duplicated logic.

---

# 21. STREAK SYSTEM

Track current streak, longest streak, last qualifying local date.

- `profiles.timezone` holds an IANA timezone (validated against `pg_timezone_names`), updated by the client on app open.
- The server computes the user's local date.
- A day qualifies when the configured minimum is reached (default: one completed lesson **or** five answered questions).
- `user_daily_activity (user_id, local_date)` is unique. When a day first qualifies: last date = yesterday → +1; = today → no change; otherwise → 1.
- A broken streak is shown as 0 (computed lazily on read — no nightly job).
- Timezone changes are accepted and logged; do not overengineer.
- Streak freeze is V2.

Unit tests must cover midnight boundaries, DST transitions and timezone changes.

---

# 22. LIVES SYSTEM

Configurable:

- `lives_max` (default 5)
- regeneration: 1 life every `lives_regen_minutes` (default 240), computed lazily from `lives_updated_at` (no cron)
- consumed on wrong answers in the contexts listed in `lives_consume_in` (default: lesson, practice, challenge). Never in exams (exams use attempt limits). Never on network errors.
- first-session grace: lives are not consumed during the first `lives_grace_lessons` lessons (default 3)

Out of lives, the user can: wait (timer shown), watch a rewarded ad (+1 life, max `rewarded_life_restores_per_day` = 3, enforced server-side), review completed lessons without answering, or upgrade to Premium.

Premium: unlimited lives (checked server-side). No Ads: same rules as Free.

All lives logic runs inside the answer RPCs.

---

# 23. PRACTICE MODE

Required to deliver "unlimited exercises" for Premium.

- **Review mistakes:** questions the user answered incorrectly.
- **Mixed practice:** random questions from completed lessons.
- **Hard sets:** Premium only.

Free users practice within the lives system. XP per §19 (small, capped) so practice cannot be farmed.

---

# 24. DAILY CHALLENGE

- Keyed on the user's **local date**.
- Optional schedule table `daily_challenges (challenge_date, question_ids, bonus_xp)`. If no row exists, the server selects deterministically from `is_challenge_eligible` questions using a hash of the date, so there is always a challenge.
- Free users receive challenges from non-Premium questions only.
- One reward per user per local date: `UNIQUE (user_id, local_date)`.

---

# 25. ACHIEVEMENTS

Data-driven engine. Each achievement: `id`, `slug`, `name` (localized), `description` (localized), `icon_key` (local asset), `rule` (JSONB), `xp_reward`, `is_active`, `sort_order`.

Supported rule types in V1:

- `lessons_completed { gte }`
- `xp_total { gte }`
- `streak_days { gte }`
- `questions_answered { gte }`
- `perfect_lesson {}`
- `module_completed { module_slug }`
- `exams_completed { gte }`
- `exam_passed {}`

Evaluation runs in SQL inside the relevant RPCs, only for rule types affected by the event, once per call (no recursion when achievement XP is added). Unlocks are unique per user; XP goes through the ledger.

Initial set: First Lesson, First 100 XP, 3/7/30 Day Streak, 100/500 Questions, Python Beginner (module 3), Python Explorer (module 9), Perfect Lesson, First Exam, Exam Passed, 10 Exams Completed.

Adding an achievement with an existing rule type is a data change only. A new rule type is a small code change.

---

# 26. LEADERBOARD

Weekly XP leaderboard.

- Week = ISO week starting Monday 00:00 UTC.
- `leaderboard_weekly (week_start, user_id, xp)` is updated in the same transaction as counting XP events. No reset job: a new week is simply a new key.
- RPC `get_leaderboard()` returns the top 50, the current user's rank, and ±5 neighbours. Index `(week_start, xp DESC)`.
- Only registered users with a display name appear; guests are excluded.
- Settings option: "Hide me from the leaderboard".
- Anti-abuse: per-day leaderboard XP cap; implausible XP rates set `profiles.leaderboard_hidden`.
- Display names: 3–20 characters, allowed character set, profanity/reserved-word blocklist, "Report" action writing to `reports`; moderation via Supabase Studio.
- Never expose email addresses or auth identifiers.

Leagues/tiers are V2.

---

# 27. EXAM MODE

**Python Fundamentals Exam**

- `start_exam(exam_id)` creates an attempt server-side: selects questions from the `is_exam_eligible` pool, stores `question_ids`, `started_at`, `expires_at`; returns questions **without** answer keys.
- `submit_exam(attempt_id, answers)` grades server-side, enforces the time limit (small grace), returns score, pass/fail, per-skill weak areas and explanations.
- Default: 30 questions, 45-minute optional timer, pass threshold 70%.
- Free: 10-question sample exam, `free_exam_attempts_per_week` = 1.
- Premium: full exam, retries (optional cooldown `exam_retry_cooldown_hours`).
- XP per §19 (improvement over best only).
- No per-question feedback during the exam; results page afterwards.

---

# 28. PROGRESS SCREEN

Computed by RPC `get_progress_summary()` from user activity:

- total XP, level, streak
- course completion percentage
- module progress
- skill areas (from `skill_tags`), for example:

```
Variables      100%
Conditions      85%
Loops           70%
Lists           55%
Functions       30%
OOP              0%
```

- questions answered, accuracy
- exam performance

Free and No Ads users see the basic summary. Premium users additionally see per-skill accuracy, weak areas and history.

---

# 29. PROFILE & SETTINGS

Profile: avatar (preset avatars in V1 — no photo uploads, avoids UGC moderation and storage cost), display name, level, XP, streak, achievements, subscription status.

Settings:

- notifications (on/off, reminder time)
- theme (system / light / dark)
- sound, vibration
- language (hidden until a second locale ships)
- privacy: ad consent (UMP privacy options entry point), analytics consent, leaderboard visibility
- account: change email/password, link sign-in methods, export my data, delete account
- subscription: restore purchases, manage subscription (deep link to the store)
- legal: privacy policy, terms, licenses
- app version

---

# 30. ADS SYSTEM

`AdService` wraps AdMob:

- `initialize()` — only after consent is resolved (UMP), and after the iOS ATT prompt when personalized ads are requested
- `canShowAds()` — false for `no_ads` or `premium` entitlement, when `ads_enabled` is false, or when consent requirements are unmet
- `showBanner(placement)` / `hideBanner(placement)`
- `showInterstitial(placement)`
- `showRewarded(rewardType)`

Rules:

- Check entitlement **before loading** ads, not only before showing.
- Use Google's test ad unit IDs in development and register test devices. Never tap live ads.
- Banners: only on configured placements (default: Learn list, Leaderboard). Never on lesson, practice, exam, explanation or paywall screens.
- Interstitials: only at natural breaks (after the lesson completion screen is dismissed); `interstitial_min_minutes_between` (default 5), `interstitial_max_per_day` (default 4), none during the first `interstitial_grace_lessons` lessons (default 3), never right after launch.
- Rewarded ads: always opt-in. Rewards are granted by an RPC with server-side daily caps. AdMob server-side verification is V1.1.
- Possible rewards: restore a life, unlock one extra practice set, capped bonus XP (not counted for the leaderboard). Never grant permanent Premium content for an ad view.
- Users under 16, or users without consent: non-personalized ads only.
- Publish `app-ads.txt` on the developer website listed in the store listings.
- Remote kill switch: `ads_enabled`.

---

# 31. BILLING SYSTEM

Use RevenueCat (`react-native-purchases`) behind `BillingService`. No RevenueCat calls in components. No raw StoreKit / Play Billing code.

`BillingService`:

- `initialize()` — configure with the platform public SDK key
- `identify(userId)` / `reset()` — `logIn` / `logOut` on auth changes
- `getOfferings()` — localized products and prices
- `purchase(packageId)` — used by `purchaseNoAds` / `purchasePremium` helpers
- `restorePurchases()`
- `getCustomerInfo()` / `onCustomerInfoChanged(listener)`
- `refreshEntitlements()` — calls the `sync-entitlements` Edge Function, then invalidates affected queries

Source of truth:

- **UI** may react instantly to RevenueCat `CustomerInfo` (kept in Zustand).
- **Access control** (Premium content, unlimited lives, exam access) uses only the server table `user_entitlements`, written exclusively by Edge Functions, checked by `has_entitlement(uid, entitlement)` (security definer, stable).
- `revenuecat-webhook` Edge Function: verifies the authorization header, stores the event ID for idempotency, ignores payload ordering and **re-fetches the subscriber from the RevenueCat REST API**, then upserts `user_entitlements`.
- `sync-entitlements` Edge Function: called by the app after purchase/restore/app open (throttled) for immediate consistency; performs the same re-fetch for the calling user only.

Never trust AsyncStorage, SecureStore, Zustand or any client flag as the authoritative entitlement.

Handle: cancelled purchase (silent), pending purchase (explain), failed purchase (clear message + retry), restored purchase, expired subscription, renewal, grace period / billing retry (trust RevenueCat's active state), upgrade No Ads → Premium, account switching (document the RevenueCat transfer-behavior setting), interrupted flows (app killed mid-purchase → reconcile on next launch), offerings failing to load (error + retry, **never** fallback hardcoded prices).

Testing: iOS sandbox testers / StoreKit configuration, Google Play license testers, RevenueCat sandbox data. Revenue metrics (MRR, churn, trials) come from the RevenueCat dashboard — do not rebuild them.

Dev-only: the local database may contain entitlement fixtures for the seeded test users. They must never exist in production.

---

# 32. PRODUCTS & BILLING CONFIGURATION

Initial store products:

- `no_ads_monthly` — target €2.99/month
- `premium_monthly` — target €7.99/month
- `premium_annual` — target price decided in `MONETIZATION.md` (D3)

RevenueCat entitlements: `no_ads`, `premium`. Premium products grant **both** entitlements. Client helper: `isAdFree = no_ads || premium`.

`src/services/billing/config.ts` holds entitlement IDs, the offering ID and package roles. No product ID appears anywhere else in the codebase. Annual/other plans are added by configuration.

---

# 33. PAYWALL

A polished, honest paywall.

- Clear comparison: FREE vs NO ADS vs PREMIUM, listing only shipped features.
- States explicitly that No Ads does not unlock Premium lessons or unlimited lives.
- For each product: name, localized price from the store, billing period, price per month for annual (computed from store price), trial terms if an offer exists, auto-renewal statement, how to cancel.
- Restore purchases, manage subscription, Terms (EULA) and Privacy Policy links.
- Close button visible immediately.
- Loading, error (retry) and "already subscribed" states.
- Premium visually highlighted without manipulation.

Forbidden: fake countdowns, false scarcity, pre-selected upsells that hide cheaper options, hidden close buttons, misleading "free" labels.

Do not show the paywall before the user has completed at least one lesson (except when the user opens it deliberately).

---

# 34. FREE-TO-PREMIUM FUNNEL

Natural, non-interrupting upgrade moments (frequency cap `paywall_prompt_max_per_day`, default 1; never mid-lesson):

- after an interstitial ad: "Remove ads and keep your learning flow uninterrupted."
- after reaching the free module boundary: "Unlock all Python lessons."
- when out of lives: "Keep going with unlimited lives."
- when opening a hard practice set or the full exam: "Unlock Premium to continue."

The user must always understand why the upgrade is useful.

---

# 35. CONTENT SYSTEM & PIPELINE

Content is database-driven at runtime and **authored as code**.

## Format

```yaml
# content/python-fundamentals/modules/03-data-types/lessons/02-type-conversion.yaml
id: 5b0c1a1e-6f5e-4d8e-9f61-2b1f6a7c9d10
slug: type-conversion
title: { en: 'Type conversion' }
estimated_minutes: 5
blocks:
  - type: text
    body: { en: 'Use `int()`, `float()` and `str()` to convert values.' }
  - type: code
    code: |
      age = "21"
      print(int(age) + 1)
    output: '22'
    runnable: true
  - type: question
    question:
      id: 0e4f7f38-2d8a-4b43-8f0e-8f7d7a1b2c33
      type: predict_output
      difficulty: easy
      prompt: { en: 'What does this print?' }
      code_snippet: |
        print(str(3) + "4")
      payload: { input: text }
      answer: { value: '34', match_mode: trimmed }
      explanation: { en: '`str(3)` is the string "3"; `+` joins strings, giving "34".' }
      skill_tags: [data-types, type-conversion]
```

## Pipeline

1. **Validate** (`scripts/content/validate.ts`): Zod schemas per question type, unique and stable IDs, valid references, 4–8 questions per lesson, explanation required, difficulty distribution per module, no placeholder text.
2. **Verify** (`scripts/content/verify_python.py`): executes every `runnable` code block and every `predict_output` question on Python 3.12 **and** the latest stable 3.x (subprocess, timeout, no network, temp directory) and compares stdout with the stated output/answer; executes the correct order of `code_ordering` items where marked runnable; for `debugging` items marked runnable, the faulty version must fail or print the wrong result and the fixed version must pass.
3. **Review**: every item has `review_status` (`draft` | `reviewed`). Only reviewed items publish to production.
4. **Publish** (`scripts/content/publish.ts`, run locally or in CI with the secret key): upserts by stable ID, splits answer keys into `question_answer_keys`, never deletes (sets `is_active = false` so attempts keep their references), bumps `content_version` in `app_config`.

AI tools may help draft content during development. Nothing ships without automated verification and human review. The app itself contains no AI features in V1.

## Volume

- Launch: 17 modules, 60–100 lessons, 300–500 high-quality questions, exam pool ≥ 60, challenge pool ≥ 60.
- Development seed: at least two complete modules, every question type represented, exam pool ≥ 30, challenge pool ≥ 14.

Questions must be technically correct, pedagogically useful, non-repetitive, appropriate to difficulty and written in clear English. All user-facing content fields are localized JSONB so Romanian can be added later.

Client caching: TanStack Query with a long `staleTime`, keyed by `content_version`.

---

# 36. NETWORK HANDLING (OFFLINE MODE IS V2)

V1 is online-only.

- Detect connectivity; show a friendly "No internet connection" screen or inline banner with Retry.
- Never crash; never lose the current selection on a failed submit.
- Preserve safe local UI state where practical.

Do not build local queues, two-way sync, WatermelonDB or conflict resolution in V1.

---

# 37. CONTENT DIFFICULTY

Easy / Medium / Hard. Difficulty influences XP, ordering within lessons, exam composition, practice sets and analytics.

---

# 38. LOCALIZATION

- Initial release: English.
- Architecture ready for Romanian, Spanish, German, French and more.
- UI strings: i18next JSON namespaces; no string concatenation; ICU-style plurals; dates and numbers via `Intl`.
- Content: localized JSONB fields with English fallback; RPCs accept a `locale` argument.
- Romanian must render correct comma-below diacritics (ș, ț) in the chosen fonts.

No hardcoded user-facing text.

---

# 39. DATABASE DESIGN

Tables:

- `profiles` — display name, avatar key, birth year, locale, timezone, onboarding answers, settings, `leaderboard_hidden`, `is_anonymous` mirror
- `user_stats` — xp_total, current_streak, longest_streak, last_qualifying_date, lives, lives_updated_at
- `xp_events` — ledger (§19)
- `courses`, `modules`, `lessons` (metadata), `lesson_contents` (blocks JSONB)
- `questions`, `question_answer_keys`
- `user_question_attempts`
- `user_lesson_progress`
- `user_daily_activity`
- `daily_challenges`, `user_daily_challenge_claims`
- `achievements`, `user_achievements`
- `leaderboard_weekly`
- `exams`, `exam_attempts` (question_ids, answers, score, started_at, expires_at, submitted_at)
- `user_entitlements` (server-written only), `billing_events` (webhook idempotency log)
- `rewarded_ad_grants`
- `reports`
- `app_config` (config + feature flags)

Removed from v1 of the spec: `products` (RevenueCat Offerings are the source), `question_options` (replaced by `payload`), `leaderboard_entries` (replaced by `leaderboard_weekly`).

Conventions: UUID primary keys, `timestamptz`, `created_at`/`updated_at` with triggers, foreign keys with `ON DELETE CASCADE` for user-owned data, indexes on foreign keys and hot query paths, RLS enabled on **every** table, migrations only through the Supabase CLI (never edit an applied migration), generated TypeScript types.

`DATABASE.md` documents every table, its RLS policies and the RPCs that write to it.

---

# 40. SECURITY

Supabase Row Level Security is mandatory.

## Access matrix

| Data                                                                                       | Client read                                                        | Client write                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `courses`, `modules`, `lessons` (metadata, lock state)                                     | authenticated (incl. guests), active rows                          | none                                                             |
| `lesson_contents`, `questions`                                                             | only via `get_lesson` / practice / exam RPCs (entitlement checked) | none                                                             |
| `question_answer_keys`                                                                     | never                                                              | none                                                             |
| `profiles` (own)                                                                           | own row                                                            | whitelisted columns only (column grants or `update_profile` RPC) |
| other users' profiles                                                                      | only display name/avatar/level via leaderboard RPC                 | none                                                             |
| `user_stats`, `xp_events`, attempts, progress, daily activity, achievements, exam attempts | own rows                                                           | **none** — writes only inside security-definer RPCs              |
| `user_entitlements`, `billing_events`                                                      | own entitlements                                                   | none — Edge Functions only                                       |
| `app_config`                                                                               | public keys                                                        | none                                                             |
| `reports`                                                                                  | none                                                               | insert own                                                       |

## Rules

- Security-definer functions: `SET search_path = ''`, schema-qualified names, require `auth.uid()`, validate inputs, revoke `EXECUTE` from `anon`/`public` where not needed, per-user rate limits on answer/reward RPCs.
- Secret/service-role keys only in Edge Function secrets and local/CI scripts — never in the app, never in `EXPO_PUBLIC_*` variables.
- Admin role via `app_metadata.role = 'admin'` (set only with the secret key) for any admin tooling.
- Validate deep-link parameters.
- CI: gitleaks secret scan, `npm audit` (or equivalent) review.
- pgTAP tests prove the access matrix for: anonymous request, guest user, free user, premium user, and another user.

---

# 41. PRIVACY, CONSENT & STORE COMPLIANCE

This section defines engineering requirements. It is not legal advice; final texts and flows require review by a qualified lawyer.

## GDPR basics

- Privacy policy and terms (placeholders clearly marked until reviewed), linked in-app and in the store listings.
- Data minimization: no real names required, no photo uploads, no precise location, no contacts.
- EU data residency where available (Supabase EU region, PostHog EU).
- Data processing agreements with Supabase, RevenueCat, Google (AdMob), PostHog, Sentry, the email provider — tracked in `LEGAL.md`.
- **Export my data:** RPC returning the user's data as JSON (right of access/portability).
- **Account deletion:** in-app flow → `delete-account` Edge Function deletes the auth user and all user data (cascade), requests customer deletion in RevenueCat, and tells the user that store subscriptions must be cancelled in the store.
- **Web deletion request page** (Google Play requirement) on the static site.

## Consent

- Ads (EEA/UK/CH): Google UMP consent form before any ad request; privacy options entry point in Settings.
- iOS: App Tracking Transparency prompt only if personalized ads are requested, shown after UMP.
- Analytics: opt-in in the EEA; the analytics service is a no-op until consent is given.
- Crash reporting: PII scrubbed; basis documented in `LEGAL.md` for legal review.

## Minors

- Age gate at onboarding (birth year). Under 13: no account.
- Under 16 (conservative default for EEA digital-consent age): non-personalized ads only, analytics disabled unless valid consent is available, leaderboard visibility off by default.
- Play Console target audience: 13+ (not the Families program). Complete the store age-rating questionnaires accurately.

## Store compliance checklist

- Apple: privacy nutrition labels, privacy manifest (`ios.privacyManifests` in app config), subscription disclosures in-app and in metadata, Sign in with Apple if other social logins exist, in-app account deletion, restore purchases, demo account and review notes for App Review.
- Google Play: Data safety form, account deletion web link, ads declaration, content rating (IARC), target audience, subscription disclosures, closed-testing requirement (§0.3).
- Both stores: EU DSA trader status and public contact details.
- `app-ads.txt` on the developer website.

## Static web pages (`web/`)

Privacy policy, terms, support/contact, account deletion request, `app-ads.txt`. Plain static HTML, hosted on a free static host that permits commercial use.

---

# 42. ANTI-CHEAT / ABUSE

Reasonable V1 protections — do not overengineer:

- server-side grading; answer keys never sent to the client
- XP ledger with unique reward keys
- daily caps on practice XP, rewarded-ad rewards and leaderboard XP
- per-user rate limits on answer and reward RPCs
- exam time limits enforced server-side
- entitlement checks server-side
- leaderboard sanity flags and reports
- CAPTCHA for sign-ups if abuse appears

AdMob server-side verification for rewarded ads is V1.1.

---

# 43. ANALYTICS

`AnalyticsService` wraps PostHog (EU). It is a no-op until consent is granted.

Events:

```
app_opened, consent_updated, onboarding_started, onboarding_completed,
guest_started, signup_completed, account_linked, login_completed,
lesson_started, lesson_completed, question_answered (props: type, difficulty, correct, attempt_no),
lives_depleted, life_restored (props: source),
practice_started, practice_completed,
daily_challenge_started, daily_challenge_completed,
streak_extended, streak_broken, achievement_unlocked, level_up,
exam_started, exam_completed,
paywall_viewed (props: trigger), paywall_dismissed,
purchase_started, purchase_completed, purchase_failed, purchase_cancelled (props: product),
restore_started, restore_completed,
rewarded_ad_started, rewarded_ad_completed, interstitial_shown,
notification_permission_result, notification_opened,
force_update_shown
```

Rules: no email, names or free-text answers in event properties; the distinct ID is the pseudonymous Supabase user ID. Subscription cancellation/churn and revenue come from RevenueCat; retention and funnels from PostHog.

Track the product KPIs: D1/D7/D30 retention, onboarding completion, first-lesson completion, daily active users, session length, streak distribution, paywall conversion.

---

# 44. MONITORING

`MonitoringService` wraps Sentry:

- crashes and JS errors with source maps uploaded during EAS builds
- Edge Function errors
- PII scrubbing, no request bodies
- release health; alert when the crash-free session rate drops

---

# 45. PERFORMANCE

Targets:

- cold start to interactive Home < 2.5 s on a mid-range Android device (release build)
- answer RPC p95 < 400 ms
- lesson payload < 50 KB
- smooth 60 fps navigation and animations

Practices: fetch only what the screen needs (never the whole database), lazy-load routes, memoize expensive components, tuned lists, optimized images (`expo-image`), small RPC responses, no unnecessary re-renders (Zustand selectors).

---

# 46. ERROR HANDLING

Every network operation has loading, success, empty and error states, and retry where appropriate.

- Route-level error boundaries.
- Understandable, localized messages; no raw error text shown to users.
- Technical errors go to Sentry without secrets or personal data.
- Never leave the user on a blank screen.

---

# 47. ACCESSIBILITY

Target WCAG 2.1 AA where applicable:

- dynamic font scaling
- sufficient contrast in both themes
- touch targets ≥ 44×44 pt (iOS) / 48×48 dp (Android)
- screen-reader labels and roles, including code blocks and answer feedback
- feedback never relies on color alone (icons + text)
- reduce-motion support

---

# 48. NOTIFICATIONS

Local scheduled notifications (`expo-notifications`), opt-in only.

- Daily reminder at the user's chosen time: "Your 5-minute coding session is waiting."
- Evening streak reminder, scheduled only if today's goal is not yet met, cancelled/rescheduled when the user completes activity or opens the app: "Protect your streak today."
- "Your Daily Challenge is ready." — optional, part of the daily reminder budget.
- Maximum 2 notifications per day; Android notification channel; tapping opens the relevant screen.

Push notifications are V2.

---

# 49. ADMIN / CONTENT MANAGEMENT

V1 is optimized for solo-developer productivity, without an admin web app:

- create/edit courses, modules, lessons, questions → content files + `publish.ts`
- activate/deactivate, difficulty, Premium flag → content files (or quick toggles in Supabase Studio, then back-ported to files)
- Daily Challenge schedule, achievements, feature flags, moderation (hide user, rename) → Supabase Studio
- basic analytics → PostHog and RevenueCat dashboards + SQL views (for example `admin_daily_stats`)

A protected web admin UI is post-MVP and only if the above becomes a bottleneck.

---

# 50. FEATURE FLAGS & REMOTE CONFIG

`app_config` (public read, admin write), fetched once per app start, with bundled defaults for first launch and failures.

Flags: `ads_enabled`, `subscriptions_enabled`, `paywall_enabled`, `leaderboard_enabled`, `exams_enabled`, `daily_challenge_enabled`, `guest_mode_enabled`, `coding_challenges_enabled` (false), `offline_mode_enabled` (reserved, must remain false in V1), `available_course_ids`.

Numeric config: XP values, level thresholds, lives settings, ad frequency, free limits, daily goal mapping, `content_version`, `min_supported_app_version` (shows a force-update screen).

---

# 51. RELEASES & OVER-THE-AIR UPDATES

- EAS Build profiles: `development` (dev client), `preview` (internal testing, release-like), `production`.
- Separate bundle identifiers / application IDs per profile so dev and production apps can coexist on one device.
- EAS Submit for store uploads.
- EAS Update for JavaScript-only fixes, with a runtime-version policy that prevents shipping JS to incompatible native builds. Native changes always require a new store build.
- RPCs must stay backward compatible because old app versions remain installed: additive changes only, or new versioned functions (for example `submit_answer_v2`). Use `min_supported_app_version` to retire old clients.

---

# 52. SEEDING

- `supabase db reset` applies all migrations and seeds a clean local database automatically.
- The development seed is produced by the content pipeline from real content files (§35) — no Lorem ipsum, no "Question 1", no disguised test data.
- Seed script creates dev-only test users: free, no_ads, premium (entitlement fixtures clearly marked dev-only), and a guest.
- Seed enough content to exercise every major feature.

---

# 53. TESTING

## Unit (Jest)

XP calculation, level calculation, streak calculation (midnight, DST, timezone change), lives regeneration, progress calculation, entitlement mapping, answer normalization, exam scoring, ad frequency rules, paywall state mapping, content schemas.

## Database (pgTAP, `supabase test db`)

RLS access matrix for every table and role; grading for every question type; idempotency (double submit, double claim); caps and rate limits; entitlement-gated content; exam timing.

## Edge Functions (Deno tests)

Webhook authorization, idempotency, re-fetch logic, deletion flow.

## Content

`validate.ts` and `verify_python.py` on every change.

## Component (React Native Testing Library)

Question renderers, answer feedback, paywall states, onboarding steps.

## E2E (Maestro, on development/preview builds)

Onboarding, guest → registration, lesson flow, wrong answer and lives, daily challenge, paywall display, purchase restoration (sandbox), profile, account deletion.

## CI (GitHub Actions, every push/PR)

Typecheck, lint, unit tests, content validation and verification, pgTAP against a local Supabase instance, secret scan.

---

# 54. QUALITY GATES

Before declaring any phase complete:

- TypeScript compiles with zero errors
- lint passes
- all tests pass (unit, DB, content, and E2E where the phase touches covered flows)
- the app runs on a physical device via a development build without red screens or console errors
- navigation works
- migrations apply cleanly on a fresh database
- RLS tests pass
- authentication works
- subscription logic is safe (server-side entitlement)
- ads are disabled for entitled users
- no secrets in the repository or app bundle
- `docs/PROGRESS.md` updated

Never mark a feature complete solely because the UI exists.

---

# 55. DOCUMENTATION

- `README.md` — setup, commands, environments
- `ARCHITECTURE.md` — structure, state strategy, services, RPC design
- `DATABASE.md` — tables, RLS, RPCs, migrations, seed
- `CONTENT.md` — authoring format, pipeline, review process
- `MONETIZATION.md` — tiers, store products, RevenueCat setup, target prices, ad rules
- `LEGAL.md` — compliance checklist, processors, consent flows (not legal advice)
- `DEPLOYMENT.md` — EAS profiles, builds, OTA, store submission, closed testing
- `TESTING.md` — test layers, how to run, device test checklists
- `CONTRIBUTING.md` — conventions, commits, adding dependencies
- `docs/PROGRESS.md`, root `CLAUDE.md`

Documentation must cover setup, environment variables, Supabase, RevenueCat, AdMob, PostHog, Sentry, local development, migrations, seeding, builds, releases and known limitations.

---

# 56. ENVIRONMENT VARIABLES

Provide `.env.example`. Never commit real values. Validate variables at startup with Zod.

`EXPO_PUBLIC_*` variables are embedded in the app bundle and are **public by design**.

## Public (app)

| Variable                                              | Purpose                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV`                                 | `development` / `preview` / `production`                                                |
| `EXPO_PUBLIC_SUPABASE_URL`                            | Supabase project URL                                                                    |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                | Supabase publishable (anon) key                                                         |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`                      | RevenueCat public SDK key (iOS)                                                         |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`                  | RevenueCat public SDK key (Android)                                                     |
| `EXPO_PUBLIC_ADMOB_*_ID_IOS` / `_ANDROID`             | Production ad unit IDs (banner, interstitial, rewarded); dev builds use Google test IDs |
| `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` | Analytics (EU host)                                                                     |
| `EXPO_PUBLIC_SENTRY_DSN`                              | Monitoring                                                                              |
| `EXPO_PUBLIC_LEGAL_BASE_URL`                          | Static legal/support pages                                                              |

## Build-time app config (not secret)

AdMob app IDs (iOS/Android), bundle identifiers per profile, URL scheme, associated domains.

## Server-only secrets (never in the app)

| Secret                                       | Where it lives                                        |
| -------------------------------------------- | ----------------------------------------------------- |
| Supabase secret (service-role) key           | local scripts and CI secrets only                     |
| `REVENUECAT_SECRET_API_KEY`                  | Supabase Edge Function secrets                        |
| `REVENUECAT_WEBHOOK_AUTH`                    | Supabase Edge Function secrets + RevenueCat dashboard |
| `SENTRY_AUTH_TOKEN`                          | EAS environment (secret) for source maps              |
| `EXPO_TOKEN`                                 | CI secrets                                            |
| SMTP credentials, Apple/Google OAuth secrets | Supabase dashboard only                               |

---

# 57. DEVELOPMENT PHASES

Work strictly phase by phase (§64). Each phase ends with a device check the user performs on a physical phone.

| Phase | Scope                                                                                                  | Device check                                                               |
| ----- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 0     | Human prerequisites and open decisions (§0) — runs in parallel                                         | —                                                                          |
| 1     | Project setup & architecture (§58)                                                                     | Dev build installs and opens; tabs visible; theme follows system           |
| 2     | Design system                                                                                          | Component gallery screen (dev-only) in light and dark                      |
| 3     | Database foundation: local Supabase, schema v1, RLS, RPC skeletons, pgTAP                              | App reads `app_config` from local/staging DB                               |
| 4     | Authentication: guest, email, verification, reset deep link, social, secure session                    | Sign up, verify, log out/in, reset password, guest → account               |
| 5     | Onboarding incl. age gate and consent UI (wired to `ConsentService`)                                   | Complete onboarding; answers persist after restart                         |
| 6     | Content pipeline + development seed                                                                    | Seeded modules visible in Learn                                            |
| 7     | Course & lesson engine                                                                                 | Open a lesson; blocks render; locked Premium modules shown                 |
| 8     | Question engine + grading RPCs (all V1 types)                                                          | Answer every question type; correct/incorrect feedback                     |
| 9     | XP, levels, progress                                                                                   | XP and level update; progress screen correct                               |
| 10    | Streak, lives, achievements                                                                            | Streak increments; lives consumed/regenerate; achievement unlock animation |
| 11    | Home completion, Practice, Daily Challenge                                                             | Full Home; challenge claim once per day; review mistakes                   |
| 12    | Leaderboard, display names, reports                                                                    | Weekly ranking with test users; hide-me setting                            |
| 13    | Exam mode                                                                                              | Sample exam (free) and full exam (premium fixture); results page           |
| 14    | Billing: RevenueCat, entitlements, webhook, sync, paywall (No Ads + Premium)                           | Sandbox purchase, restore, upgrade; Premium content unlocks via server     |
| 15    | Ads + consent (UMP, ATT), rewarded rewards, entitlement gating                                         | Test ads for free user; none for entitled users; rewarded life             |
| 16    | Analytics coverage + monitoring review                                                                 | Events visible in PostHog after consent; none before                       |
| 17    | Local notifications                                                                                    | Reminder fires at chosen time; streak reminder cancelled after activity    |
| 18    | Privacy & legal: data export, account deletion, static pages, store compliance artefacts               | Export data; delete account end-to-end                                     |
| 19    | Content production to launch volume (may start in parallel after Phase 6; must finish before Phase 22) | Spot-check lessons across all modules                                      |
| 20    | Polish, accessibility, performance                                                                     | Screen reader pass; large text; reduce motion; performance targets         |
| 21    | E2E & regression hardening                                                                             | Maestro suite green                                                        |
| 22    | Production builds, TestFlight, Google Play closed testing                                              | Install from TestFlight / Play testing track                               |
| 23    | Store preparation & submission                                                                         | Listings, screenshots, forms complete                                      |

Store-side notes: subscriptions on Google Play can only be created after an app bundle has been uploaded to a testing track, so upload an internal testing build during Phase 14. If the Google Play account is personal, the 14-day closed test must start no later than the end of Phase 15.

---

# 58. PHASE 1 SCOPE

- Create the Expo app (TypeScript, Expo Router in `src/app`), strict `tsconfig`, path aliases.
- ESLint (import cycles, restricted SDK imports), Prettier, Jest (`jest-expo`), RNTL.
- Folder skeleton per §7, with README stubs only where helpful (no empty busywork files).
- Providers: TanStack Query, theme, i18n (English namespace), Zustand stores for settings/session.
- Service interfaces with documented no-op implementations for later phases.
- Env loading and Zod validation; `.env.example`.
- `app.config.ts` with `development` / `preview` / `production` variants (names, bundle IDs, scheme).
- `expo-dev-client`, `eas.json`; instructions to build and install development builds on Android and iOS (local or EAS).
- Sentry initialization if a DSN is available; otherwise listed as a pending human action.
- GitHub Actions CI: typecheck, lint, unit tests.
- Root `CLAUDE.md`, `docs/SPEC.md`, `docs/PROGRESS.md`, README skeleton.
- Placeholder tab screens (Home, Learn, Leaderboard, Profile) using real layout primitives — no fake data presented as real.
- A trivial unit test proving the test setup works, plus tests for env validation.

---

# 59. WORKING RULES FOR CLAUDE CODE

1. Inspect the existing repository before changing anything.
2. Never destroy working functionality merely to simplify implementation.
3. Prefer incremental changes.
4. Keep architecture clean.
5. Avoid giant monolithic files.
6. Use strict TypeScript.
7. Avoid `any` unless absolutely necessary (and explain why).
8. Handle errors explicitly.
9. Write tests for non-trivial business logic.
10. Do not leave TODOs for essential functionality.
11. Do not fake integrations. When credentials or accounts are missing, stop and list exactly what is needed. Official test/sandbox modes (AdMob test IDs, store sandboxes) are real integrations and are allowed.
12. Do not replace real functionality with mocked UI unless explicitly required for local development.
13. If a dependency is unnecessary, do not add it. Justify every new dependency.
14. Prefer stable, actively maintained packages; install native modules with `npx expo install`.
15. Keep operating cost in mind at every architectural decision.
16. Do not introduce an external API if the feature can be implemented locally or through Supabase.
17. Do not introduce AI features in the app in V1. (AI-assisted content drafting during development is allowed; §35.)
18. Do not introduce a dedicated backend server.
19. Do not overengineer.
20. Optimize for a solo developer maintaining the product.
21. Use Zustand for frequently changing client state and TanStack Query for server state.
22. Use Reanimated/Lottie thoughtfully for polished micro-interactions.
23. Use RevenueCat rather than implementing direct Apple/Google billing logic.
24. Keep the billing layer abstracted behind `BillingService`.
25. Do not implement offline synchronization in V1.
26. Enable RLS on every table; client writes to gameplay tables are forbidden — use security-definer RPCs.
27. Never place the Supabase secret key, RevenueCat secret key or any server secret in the app or in `EXPO_PUBLIC_*` variables.
28. Change the database only through new migrations; never edit applied migrations; regenerate types afterwards.
29. Never send answer keys to the client.
30. Never hardcode prices, product IDs outside billing config, or user-facing strings.
31. Use Google test ad unit IDs in all non-production builds.
32. Update `docs/PROGRESS.md` at the end of every phase.
33. If a requirement in this spec conflicts with platform policy, security or law, stop and flag it instead of implementing it.

---

# 60. PRODUCT ECONOMICS & COST CONTROL

Every decision considers infrastructure cost, database load, bandwidth, maintenance complexity and user value.

Prefer deterministic logic, database-driven content with client caching, small payloads, lazy computation (lives, streaks, leaderboard weeks) instead of scheduled jobs, local notifications instead of push infrastructure, and vendor dashboards instead of custom analytics.

Avoid paid AI APIs, GPU services, always-on servers, unnecessary background workers and unnecessary third-party APIs.

Expected early-stage fixed costs (verify current pricing before launch):

| Item                                                                   | Cost                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Supabase production project (paid plan; free projects pause when idle) | ~$25/month + usage                                           |
| Supabase local dev / staging                                           | free                                                         |
| Apple Developer Program                                                | $99/year                                                     |
| Google Play Console                                                    | $25 one-time                                                 |
| Domain                                                                 | ~€10–15/year                                                 |
| Static hosting, SMTP, PostHog, Sentry, EAS, AdMob                      | free tiers at early scale                                    |
| RevenueCat                                                             | free below a monthly revenue threshold, then a revenue share |

Watch: Supabase MAU (guest users count — clean them up), egress, EAS build quotas.

---

# 61. FUTURE EXPANSION (NOT V1)

Architecture must support future courses: C, C++, Java, JavaScript, SQL, Git, Linux, Networking.

Potential future features: AI Coach, sandboxed coding challenges, advanced projects, interview preparation, university-specific courses, certificates, offline mode, push notifications, streak freeze, leagues, placement tests, friend challenges, teams, social features, AdMob server-side verification, web admin UI.

Do not implement these in V1 unless explicitly instructed.

---

# 62. POSITIONING & STORE PRESENTATION

Primary promise: **Learn to Code. 5 Minutes a Day.**
Supporting statement: **Bite-sized lessons. Daily challenges. Real coding progress.**

Communicate consistently: short sessions, consistency, interactive learning, visible progress, programming fundamentals.

Store feature messaging:

- Learn Python step by step
- Practice every day
- Build your coding streak
- Track your progress
- Challenge yourself
- Learn without overwhelming courses

Avoid unsupported claims: guaranteed employment, "become a developer in 7 days", instant expertise, income or career outcomes.

Store preparation: screenshots for required device sizes (light and dark), optional preview video, keyword research, localized listing text ready for future locales, support URL, privacy URL, demo account and review notes explaining subscriptions and ads.

---

# 63. MVP DEFINITION

V1 is successful only when a new user can, end-to-end on real devices:

1. install the app
2. complete onboarding (goal, reminder, age gate, consent)
3. start Python and complete a first lesson (as a guest, if D1 is on)
4. create an account and keep their progress
5. complete lessons and answer questions of every V1 type
6. receive XP and level up
7. maintain a streak
8. unlock achievements
9. complete the Daily Challenge
10. practice mistakes
11. see progress
12. encounter Free limitations (module boundary, lives)
13. see ads only when not entitled, after consent
14. see honest No Ads / Premium offers
15. purchase through RevenueCat and get server-verified access
16. restore purchases
17. export their data and delete their account
18. continue using the application

---

# 64. FIRST ACTION & PHASE GATE RULES

Do NOT generate a large amount of code blindly.

### Step 1

Inspect the repository, identify the existing state, and create `PLAN.md` containing:

- the open decisions table (§0.2) with defaults
- the human prerequisites checklist (§0.3) and which ones block which phase
- the proposed folder structure
- the proposed architecture (state strategy, services, RPC design)
- the database schema v1 draft, RLS access matrix and RPC list
- required dependencies with a one-line justification each
- environment variables (public vs server-only)
- the exact implementation steps for PHASE 1
- risks and blockers (name clearance, Google Play testing rule, iOS build machine, content volume, compliance review, store account setup)
- the testing strategy for PHASE 1

### Step 2

STOP.

Present the plan in the chat and ask for approval.

## CRITICAL RULE FOR ALL PHASES

Operate strictly phase by phase.

After completing a phase:

1. run tests
2. run linters and typecheck
3. inspect the result
4. fix issues found within the current phase
5. update `docs/PROGRESS.md`
6. report what was implemented
7. report test/lint/typecheck results
8. report remaining limitations
9. give the **device test checklist** for this phase (exact steps to verify on a physical phone)
10. list **human actions required** before the next phase (accounts, keys, store setup)

Then **STOP** and ask exactly:

> **"Are you ready to proceed to PHASE [Next Phase]?"**

Do NOT proceed until the user explicitly types **yes** or **approved**.

Do not interpret silence, additional discussion, questions or unrelated messages as approval.

This rule exists so the user can test the application on a physical device after each milestone before more complexity is introduced.

---

# 65. AGENT BEHAVIOR

Do not:

- skip phases
- silently continue to the next phase
- implement future features while working on the current phase
- introduce unnecessary dependencies
- rewrite working code without a reason
- create fake production integrations
- hide errors
- declare success without verification

When uncertain between reasonable technical approaches, choose the one that is:

1. simplest
2. cheapest
3. maintainable
4. secure
5. scalable enough for an early-stage commercial product

When a spec requirement is ambiguous, state the interpretation chosen in `PROGRESS.md`; when it is risky (security, privacy, store policy, money), ask before implementing.

---

# FINAL INSTRUCTION

Begin with **Step 1 — Inspection and Planning**.

Inspect the repository. Do not implement the application yet.

Create `PLAN.md`.

Then STOP and present the plan for approval.
