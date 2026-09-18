# CodeSprint — PROGRESS

> Read this first in a new session. It survives context resets.

**Current phase:** Phase 14 complete **in code**, blocked on store credentials for its device
check — awaiting approval for Phase 15 (Ads + consent).
**Last updated:** 2026-09-18

---

## Phase status

| Phase | Scope                                | Status                                |
| ----- | ------------------------------------ | ------------------------------------- |
| 0     | Human prerequisites & open decisions | **In progress** (parallel, see below) |
| 1     | Project setup & architecture         | **Complete** — device check deferred  |
| 2     | Design system                        | **Complete** — pending device check   |
| 3     | Database foundation                  | **Complete** — pending device check   |
| 4     | Authentication                       | **Complete** — pending device check   |
| 5     | Onboarding, age gate, consent        | **Complete** — pending device check   |
| 6     | Content pipeline & development seed  | **Complete** — pending device check   |
| 7     | Course & lesson engine               | **Complete** — pending device check   |
| 8     | Question engine & grading RPCs       | **Complete** — pending device check   |
| 9     | XP, levels, progress                 | **Complete** — pending device check   |
| 10    | Streak, lives, achievements          | **Complete** — pending device check   |
| 11    | Home, Practice, Daily Challenge      | **Complete** — pending device check   |
| 12    | Leaderboard, display names, reports  | **Complete** — pending device check   |
| 13    | Exam mode                            | **Complete** — pending device check   |
| 14    | Billing, entitlements, paywall       | **Code complete** — blocked on stores |
| 15–23 | See `PLAN.md` / SPEC §57             | Not started                           |

---

## Development environment (confirmed 2026-09-17)

| Machine           | Role                        | Notes                                                                                                    |
| ----------------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Windows 11 PC** | Primary development         | Node 24.15.0, npm 11.12.1, git 2.53, Docker, Python 3.14.4 + 3.12.10 (via the `py` launcher)             |
| **MacBook**       | iOS builds and verification | Used per phase to build/run iOS. Specs to confirm (macOS, Xcode, chip)                                   |
| **Android phone** | Device checks               | Primary device target for Phases 1–13                                                                    |
| **iPhone**        | Device checks               | Available. Free personal-team signing (profile expires every 7 days) until the paid Apple account exists |

Sync between machines is via the private GitHub repository
**https://github.com/GabrielDiaconescu/codesprint** (created 2026-09-17). CI runs on every push
and is green: typecheck, lint, 102 tests, and a gitleaks scan of the full history.

**Business decisions (2026-09-17)**

| Item                                                                                               | Decision                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Legal entity                                                                                       | **PFA** (Romanian sole trader)                                                                                                                                                                                                                                                                                                                                                                                                       |
| Google Play account                                                                                | **Organization** — exempt from the closed-test requirement                                                                                                                                                                                                                                                                                                                                                                           |
| Apple Developer                                                                                    | Enrolling; Organization enrolment also needs the D-U-N-S                                                                                                                                                                                                                                                                                                                                                                             |
| Product name                                                                                       | **CodeSprint stays.** Free in both app stores, which is what matters. The domain namespace is crowded (`.com` parked for sale; `.app`, `.dev`, `.io`, `.co`, `.net` all registered), and a survey of 15 alternative names found 14 of 15 `.com`s taken — chasing a clean `.com` was abandoned deliberately. Reversible until store assets are produced in Phase 23, because every brand string goes through `src/constants/brand.ts` |
| Domain                                                                                             | **`codesprint.ro`** (~10 EUR/yr, uncontested). Hosts the legal pages, support page and `app-ads.txt`. Whatever domain is declared as the developer website in the store listings must be the one serving `app-ads.txt`, so this choice is now fixed                                                                                                                                                                                  |
| Docker                                                                                             | **Working.** Docker Desktop 4.91.0 + CLI/engine 29.8.0, WSL2 backend, `docker-desktop` distro running. The earlier "virtualization not detected" error was a missing WSL install, not a BIOS setting                                                                                                                                                                                                                                 |
| Supabase                                                                                           | Account linked to GitHub; project created in **Frankfurt (`eu-central-1`)** — confirmed 2026-09-17, satisfying the EU data-residency requirement in SPEC §41                                                                                                                                                                                                                                                                         |
| Because Windows is primary and the Mac is occasional, always `git pull` before switching machines. |

---

## Decisions taken

| #   | Decision                 | Value                                 | Notes                                                                                         |
| --- | ------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| D1  | Guest mode               | ON (default)                          | Approved with the plan                                                                        |
| D2  | No Ads product           | Monthly subscription €2.99            | Approved with the plan                                                                        |
| D3  | Annual Premium           | YES                                   | Approved with the plan                                                                        |
| D4  | Free trial               | None at launch                        | Paywall still renders trial terms dynamically                                                 |
| D5  | Free boundary            | Modules 1–6 (`free_module_count = 6`) | Config-driven, computed not stored                                                            |
| D6  | Social login             | Apple + Google (default stands)       | Not re-raised; revisit before Phase 4 if scope needs trimming                                 |
| D7  | Analytics                | PostHog Cloud EU                      |                                                                                               |
| D8  | Monitoring               | Sentry                                |                                                                                               |
| D9  | Python semantics         | 3.12 + latest stable 3.x              | **Resolved** — 3.12.10 and 3.14.4 both present; `py -3.12` / `py -3.14` on Windows            |
| D10 | Minimum age              | 13                                    |                                                                                               |
| D11 | Personalized ads         | Consent + 16+ only                    |                                                                                               |
| D12 | Google Play account type | **Organization**                      | Decided 2026-09-17. Exempt from the 12-tester / 14-day closed test. Requires a D-U-N-S number |

Plan approved 2026-09-16. Defaults apply for everything not marked OPEN.

---

## Open questions

1. **D-U-N-S number** — required for Organization enrolment on **both** stores. Free, but issuance
   takes days to weeks. Now on the critical path for Phase 14 and Phase 22 (see human actions).
2. **Public trader address (EU DSA).** A PFA is commonly registered at a home address, and both
   stores publish the trader's address, email and phone. Decide whether to register a different
   business address before the store listings go live.
3. **Sentry DSN** — not provided, so `MonitoringService` ships as a no-op. Supply
   `EXPO_PUBLIC_SENTRY_DSN` to enable it earlier than Phase 16.
4. **Domain + transactional SMTP** — needed at **Phase 4** (Supabase Auth email verification and
   password reset; the built-in sender is not for production) and again at Phase 18 for the static
   legal pages. The user asked to be reminded at that point.

---

## Phase 1 — what was implemented

- Expo **SDK 57.0.23** (verified current stable; 58 is preview-only), React Native 0.86.3,
  React 19.2.3, New Architecture (default in SDK 57 — the `newArchEnabled` flag no longer exists).
- Expo Router with routes under `src/app`; bottom tabs Home / Learn / Leaderboard / Profile;
  `+not-found` route; Leaderboard tab hides itself when `leaderboard_enabled` is false.
- `tsconfig` with `strict` + `noUncheckedIndexedAccess` + path aliases.
- ESLint flat config with `import/no-cycle` and the **SDK import boundary** (SPEC §7),
  Prettier, Jest (`jest-expo`) + React Native Testing Library.
- Design tokens (`src/theme`): spacing, radius, typography, motion, elevation, a11y minimums,
  and deliberately authored light **and** dark palettes. Component library is Phase 2.
- Providers: GestureHandlerRootView → SafeAreaProvider → I18nextProvider → QueryClientProvider
  → ThemeProvider. Route-level `ErrorBoundary` (SPEC §46).
- Zustand `settingsStore` (theme/sound/haptics) and `sessionStore` (auth shape for Phase 4).
- TanStack Query client with the query-key factory (`src/lib/queryClient.ts`).
- Service layer: typed contracts for Monitoring, Analytics, Consent, Ads, Billing,
  Notifications, Config + no-op implementations + **production no-op guard**.
- Phase-aware Zod env validation + `.env.example` (`src/lib/env.ts`).
- `app.config.ts` with development / preview / production variants — distinct bundle IDs
  and URL schemes so all three coexist on one device. `eas.json` with matching profiles.
- i18n: English namespaces (common, navigation, home, learn, leaderboard, profile).
- GitHub Actions CI: typecheck, lint, tests, gitleaks secret scan.
- `git init` + `.gitignore` (`.env` ignored, `.env.example` tracked — verified).

### Phase 1 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
tests       jest ..................... 7 suites, 40 tests, all passing
```

Test coverage of note: env validation failure modes, brand single-source invariant, no-op
services never faking success, config defaults, i18n completeness, and **13 tests proving the
SDK import boundary rejects each restricted package outside `src/services` and allows it inside**.

---

## Decisions and interpretations made during Phase 1

1. **`@expo/vector-icons` added** (not in the original Phase 1 dependency list). The bottom tab
   bar needs icons and it is the first-party Expo icon set that the Phase 2 icon system will
   build on. Justified per SPEC §59.13.
2. **`react-dom` pinned to 19.2.3.** npm auto-installed 19.3.0 as an optional peer of
   `@expo/metro-runtime` / `@expo/ui`, which conflicts with Expo's pinned React 19.2.3 and broke
   every subsequent install. Pinned explicitly rather than papering over it with
   `--legacy-peer-deps`. It is not bundled into native builds.
3. **ESLint stays on 9.x.** `eslint-plugin-import` (needed for `import/no-cycle`, SPEC §7)
   supports ESLint 9 and below. npm resolved this correctly on its own. Revisit when the plugin
   supports 10, or switch to `eslint-plugin-import-x`.
4. **`baseUrl` removed from tsconfig** — deprecated in TypeScript 6; `paths` are now relative.
   TypeScript 6 also stopped auto-discovering `@types`, so `types: ["jest", "node"]` is explicit.
5. **`Services` is a type alias, not an interface** — only type aliases get an implicit index
   signature, which the production no-op guard needs in order to iterate the registry generically.
6. **Settings are not persisted yet.** Persisting now would create a second source of truth that
   the Phase 4/5 profile sync would have to unpick.
7. **CI runs Node 22 (LTS)** while local development is on Node 24.15.0. Node 22 is the
   conservative baseline for Expo tooling; revisit if the two diverge in behaviour.
8. **`PRODUCTION_NOOP_ALLOWLIST` currently lists every service.** Intentional during early
   phases so preview builds do not trip the guard. **It must be empty before the first
   production release** — each phase removes its own entry.
9. **`@testing-library/react-native` v14 made `render` async.** Every component test must
   `await render(...)` or `screen` throws "render function has not been called". Recorded in
   `CLAUDE.md` because it will affect every component test in Phases 2, 8 and 11.

---

---

## Phase 2 — what was implemented (Design system)

Design tokens existed from Phase 1; Phase 2 adds the components that consume them.

**Fonts (SPEC §8)** — Inter (UI) and JetBrains Mono (code), both SIL OFL 1.1, embedded rather
than fetched. Inter was chosen partly because SPEC §38 requires correct Romanian comma-below
diacritics; JetBrains Mono disambiguates `0/O` and `1/l/I`, which matters when a learner reads a
snippet character by character. Only the six weights the type scale uses are bundled. The splash
screen is held until fonts load, so the first frame never renders in the system font.

**Primitives** — `Text` (the only text component; font scaling is never disabled), `Icon`
(typed wrapper over one icon set), `Button` (4 variants, loading/disabled states, never below the
48dp touch target), `Card`, `Badge`, `Chip`, `Divider`, `Screen`.

**Progress** — `ProgressBar` (Reanimated, honours reduce-motion) and `ProgressRing` (SVG stroke
offset). Both expose a percentage through `accessibilityValue`.

**States** — `Skeleton` / `SkeletonLines` (SPEC §13: never a blank screen while loading) and
`StateView`, the shared shape for empty, error and offline states; every one offers a way forward.
`PlaceholderState` is now a thin wrapper over it.

**Overlays** — `BottomSheet` (Modal + Reanimated + drag-to-dismiss, with backdrop and close
button so the gesture is never the only exit) and a toast system (`toastStore` + `ToastHost`,
queue capped at 3, announced as a polite live region).

**CodeBlock (SPEC §8)** — monospace, never wrapped, horizontal scroll, forced LTR, and exposed to
screen readers as ONE node reading the raw source rather than dozens of coloured spans. Optional
output panel and line numbers.

**Python syntax highlighter** — written locally (`src/lib/pythonHighlight.ts`, ~230 lines) instead
of pulling in a web-oriented highlighting library, as SPEC §8 requires. Handles keywords,
builtins, all string forms (triple-quoted, prefixed f/r/b/u, escapes), comments, numbers in every
literal form, decorators and operators.

**AnswerFeedback (SPEC §8, §18)** — presentational only. Result is carried by icon + text as well
as colour, an incorrect answer always gets the explanation and never shaming language, and the
panel is a polite live region.

**Component gallery** — `src/app/gallery.tsx`, reachable only from a `__DEV__`-guarded button on
the Profile tab. Renders every component plus a theme switcher and a reduce-motion readout.

### Phase 2 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
tests       jest ..................... 12 suites, 102 tests, all passing
bundle      expo export (android) .... succeeds
```

New tests: 32 for the Python tokenizer (including the lossless-output, never-throws and
always-terminates invariants), plus component tests covering the accessibility behaviours that
regress silently — button disabled/busy state, progress `accessibilityValue`, feedback shown as
text not colour alone, and the toast queue cap.

---

## Decisions and interpretations made during Phase 2

1. **The code surface stays dark in both themes.** One contrast-checked syntax palette instead of
   two, it matches how developers expect code to look, and it guarantees legibility whatever the
   app theme. Recorded in `src/theme/colors.ts` so it reads as a decision, not an oversight.
2. **Bottom sheet built in-house** rather than adding `@gorhom/bottom-sheet`. The V1 use cases
   need presentation plus drag-to-dismiss, not a snap-point system (SPEC §59.13, §59.19).
3. **`react-native-svg` added** — required for `ProgressRing` (SPEC §8 asks for rings) and needed
   again by the Phase 28 statistics screen. First-party Expo dependency.
4. **Weight lives in `fontFamily`, not `fontWeight`.** On Android a numeric weight applied to a
   named font file is ignored, which silently flattens the type hierarchy.
5. **Toast queue capped at 3.** A retry loop firing toasts could otherwise bury the UI.
6. **`clampProgress(Infinity)` returns 1, not 0.** Infinity means "past the maximum"; only `NaN`
   (no position on the scale) falls back to zero. Caught by a unit test.
7. **Jest needs `react-native-worklets/jest/resolver`.** Reanimated 4 sits on worklets, whose
   `.native.` modules require the native runtime. The official `react-native-reanimated/mock`
   does NOT work — it re-imports the real module. The resolver is the supported fix and is wired
   into `jest.config.js`.
8. **`StyleSheet.absoluteFillObject` is gone** from React Native 0.86's types; explicit
   `position/top/left/right/bottom` is used instead.
9. **Gallery strings are deliberately not localized.** The screen never ships to a user, and
   adding it to the i18n namespaces would pollute the translation files (SPEC §38).

---

## Phase 3 — what was implemented (Database foundation)

**Six migrations**, applying cleanly on a fresh database: enums and helpers, content tables,
user tables, `app_config` with seeded defaults, RLS policies, core functions.

**Two independent protection layers, not one.** Supabase's default privileges grant
`anon`/`authenticated` full DML on new public tables, so the RLS migration revokes that
wholesale and grants back only the specific reads the client needs. RLS then restricts those
reads to the caller's own rows. The observable consequence: an unauthorised read fails with a
**permission error (42501)**, not an empty result — the request is refused before RLS is even
consulted. A policy mistake alone cannot produce a write.

**`question_answer_keys`** has RLS enabled, `FORCE ROW LEVEL SECURITY`, **zero policies and
zero grants**. It is readable only from inside SECURITY DEFINER functions. A pgTAP test fails
if a future migration ever adds a policy.

**The XP ledger** (`award_xp`) is the single write path for XP in the product. Idempotency is
structural rather than procedural: `ON CONFLICT DO NOTHING` against
`UNIQUE (user_id, source_type, source_id)` means a replayed request awards nothing and returns
0 — no caller has to remember to check first. Ledger row, `user_stats.xp_total` and
`leaderboard_weekly` are written in the same transaction, so they cannot drift.

**Premium gating is computed, not stored.** `module_requires_premium` derives from
`app_config.free_module_count`, so moving the free boundary (D5) is a config change with no
migration and no content republish.

**Client-callable RPCs so far:** `get_app_config()`, `update_profile(jsonb)` (the only write
path into profiles — whitelists columns, validates the IANA timezone, and deliberately does
not expose `is_anonymous` or moderation flags), `sync_session(text)`. EXECUTE is default-deny;
internal helpers carry no client grant.

**App side:** real `SupabaseService` with a SecureStore session adapter that chunks values
around SecureStore's ~2 KB limit; `SupabaseConfigService` replacing the no-op; `useAppConfig`
TanStack Query hook; a dev-only backend status card on Home; generated
`src/types/database.types.ts` (1243 lines).

**CI** gained a database job: start Supabase, apply migrations on a fresh database, run pgTAP,
and fail if the generated types are stale.

### Phase 3 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 13 suites, 114 tests, all passing
database    supabase test db ......... 3 files, 51 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly on a fresh database
bundle      expo export (android) .... succeeds
```

---

## Decisions and interpretations made during Phase 3

1. **Grant revocation as a first-class layer.** SPEC §40 asks for RLS; relying on RLS alone
   would leave Supabase's permissive default grants in place. Revoking them means a single
   mistaken policy cannot expose a write path.
2. **`app_config` is readable by `anon`.** The force-update screen and first-launch flags must
   work before the guest session exists. Only `is_public` rows are visible, and
   `get_app_config()` filters private keys.
3. **Config parsing is forgiving per key.** One malformed row degrades one flag instead of
   bricking launch; unknown keys are ignored so a newer server does not break an older client
   (SPEC §51). `offline_mode_enabled` is forced to false client-side whatever the server says.
4. **SecureStore chunking.** A Supabase session can exceed SecureStore's ~2 KB per-value
   limit; without chunking the session silently fails to persist and the user is logged out on
   next launch.
5. **RPC skeletons interpreted as complete functions.** SPEC §57 calls for "RPC skeletons", but
   §59.10 forbids TODOs for essential functionality. Rather than stub functions that return
   nothing, Phase 3 ships the functions it actually needs — config, entitlements, module
   gating, the XP ledger, profile writes — fully implemented. Feature RPCs arrive in their own
   phases.
6. **`questions.payload` carries a CHECK constraint** rejecting `answer`, `correct`,
   `solution` and similar keys. The payload is client-visible, so an authoring mistake there
   would leak answers; the constraint is cheap and the failure mode is catastrophic.
7. **pgTAP assertions on anon reads are `throws_ok`, not empty-set checks.** The first draft
   asserted zero rows and failed — because the grant layer denies the query outright. The
   stronger behaviour was correct; the test was updated to assert it.

## Phase 4 — what was implemented (Authentication)

**Database** — `20260917120600_auth_support.sql`

- `handle_user_updated()` trigger mirrors `auth.users.is_anonymous` onto `profiles`, so a guest
  who signs up becomes rankable on the leaderboard.
- `delete_stale_anonymous_users(days)` purges abandoned guests, scheduled by pg_cron at 03:17
  UTC. Activity comes from `profiles.last_seen_at`, not `auth.users.last_sign_in_at`.
- 16 new pgTAP tests (`04_auth_support.test.sql`), 67 in total.

**Auth configuration** — `supabase/config.toml`

Anonymous sign-ins on, email confirmation on, manual linking on, minimum password length 8 with
`letters_digits`, and the three build-variant schemes allow-listed as redirect targets.

**Service layer** — `src/services/auth/`

- `SupabaseAuthService` implements the full `AuthService` contract. It never leaks a provider
  error: everything throws `AuthFailure` with one of ten mapped codes.
- `errors.ts` maps provider codes, network failures and bare HTTP statuses to our vocabulary.
- `deepLink.ts` parses auth callbacks defensively — first-occurrence-wins on repeated keys,
  a shape check on the code, errors preferred over a co-present code.

**Feature** — `src/features/auth/`

Pure validation mirroring the server rules, form state, mutations, and the session bootstrap
that restores the session, subscribes to changes and drives token refresh from foreground state.

**Screens** — `(auth)/sign-in`, `sign-up`, `forgot-password`, `reset-password`, `verify-email`,
plus `auth-callback` and `link-account` outside the group. Routing is guarded declaratively with
`Stack.Protected` in the root layout.

**Design system** — `TextField`, with autocapitalisation, autocorrect and spellcheck off, a
reveal toggle for passwords, and errors announced as part of the field.

### Phase 4 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 18 suites, 241 tests, all passing
database    supabase test db ......... 4 files, 67 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly on a fresh database
bundle      expo export (android) .... succeeds
```

Beyond the automated suites, the flows were exercised against the running local stack:

| Flow                 | Result                                                                |
| -------------------- | --------------------------------------------------------------------- |
| Anonymous sign-in    | session issued, `is_anonymous = true`, profile mirrored               |
| Email sign-up        | no session, confirmation email delivered to Mailpit                   |
| Weak password        | rejected with `weak_password`, mapping to our `weak-password`         |
| Custom redirect      | `codesprint-dev://auth-callback?flow=signup` accepted by allow-list   |
| Password reset       | `type=recovery` email returning `flow=recovery`                       |
| **Guest to account** | **same user id, XP preserved, `is_anonymous` flipped in both tables** |

## Decisions and interpretations made during Phase 4

1. **A guest account is created on tap, not on launch.** SPEC §12 says anonymous sign-in lets a
   new user start immediately, which could be read as signing in on first launch. Every
   anonymous user is a billable Supabase MAU for 30 days (SPEC §60), so auto-creating one for
   every install — including bounces — costs money for nothing. "Continue as guest" is an
   explicit button instead.
2. **Social login is deferred, not faked** (SPEC §59.11). The contract and the UI slot exist;
   the providers need credentials that do not exist yet. Listed under human actions.
3. **`flow` is round-tripped through `redirectTo`.** Supabase does not distinguish a signup
   confirmation from a password recovery in the callback, and the two must not land on the same
   screen — a recovery link that silently signed the user in would leave them holding a password
   they do not know. The app appends its own parameter and reads it back.
4. **`pendingPasswordReset` holds the router.** A recovery link creates a real session, so
   "signed in" is not sufficient to enter the app. The flag survives token refreshes and is
   cleared by setting the password or by signing out.
5. **Account enumeration is not "fixed".** Supabase returns success with no session when an
   address is already registered. Reporting "email taken" would be friendlier, and would also
   let anyone test which addresses have accounts. The provider's behaviour is kept.
6. **Client password rules are a copy of the server's, and a test proves it.**
   `validation.test.ts` reads `supabase/config.toml`; drift would mean the form accepts what the
   provider then rejects, with an error the user cannot act on.
7. **`fireEvent` is async in RNTL v14, like `render`.** A missing `await` asserts against the
   pre-event state and passes misleadingly. Recorded in `CLAUDE.md`.
8. **Editing `config.toml` needs a full stack restart.** `npm run db:reset` does not reload it;
   the Auth container reads it only at startup. The symptom is confusing — anonymous sign-in
   rejected as disabled while the file plainly enables it. Documented in `docs/DATABASE.md`.

## Phase 5 — what was implemented (Onboarding, age gate, consent)

**Database** — `20260917120700_onboarding.sql`

- `min_user_age` (13) and `minor_protection_age` (16) seeded into `app_config`.
- `age_from_birth_year()` and `is_minor()`, the latter failing closed on an unknown birth year.
- `update_profile` replaced (not edited — SPEC §59.28) so it **forces** the §41 defaults for
  minors: analytics off, hidden from the leaderboard, ads restricted to non-personalised.
- `reject_underage_account()` deletes the caller, because SPEC §41 requires the account not to
  exist rather than merely be blocked.
- 26 new pgTAP tests (`05_onboarding_age_gate.test.sql`), 93 in total.

**Service layer** — `src/services/profile/`

`SupabaseProfileService` reads `profiles` directly (RLS scopes it to the caller) and writes
only through `update_profile`. Rows are validated with Zod on the way in, and unknown enum
values degrade to `null` so a row written by a newer build cannot lock an older client out of
its own profile.

**Feature** — `src/features/onboarding/` holds the pure age logic mirroring the server, the
six-step sequence, a Zustand draft store and the mutations. `src/features/profile/` adds the
profile query and the session heartbeat.

**Screens** — six steps (`age`, `experience`, `motivation`, `goal`, `reminder`, `consent`)
plus `blocked`, which sits outside every router guard so it survives the sign-out that
precedes it.

**Design system** — `Toggle`, and `Card` gained `accessibilityRole` / `selected` so a
single-select list can be a radio group rather than a row of buttons.

### Phase 5 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 23 suites, 343 tests, all passing
database    supabase test db ......... 5 files, 93 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly on a fresh database
bundle      expo export (android) .... succeeds
```

Exercised against the running stack through the real HTTP API:

| Case                                       | Result                                            |
| ------------------------------------------ | ------------------------------------------------- |
| 15-year-old asking for analytics + ranking | forced to `false` / `true` / `restricted`         |
| the same user trying again later           | refused again                                     |
| adult making identical requests            | all three granted                                 |
| 12-year-old writing a profile              | refused with `22023 below the minimum age`        |
| 12-year-old's account                      | deleted, cascading to `profiles` and `user_stats` |

## Decisions and interpretations made during Phase 5

1. **The birth-year field accepts any four-digit year, including under-age ones.** A picker
   offering only permitted years teaches a twelve-year-old to pick a different one. A gate
   nobody can fail is not a gate.
2. **Input errors and being under age are different outcomes.** `validateBirthYear` handles
   typos; `classifyAge` handles age. Phrasing "you are twelve" as a validation error would be
   both wrong and unkind.
3. **Answers are submitted once, at the end.** Writing each step as it is answered would leave
   a half-filled profile behind for everyone who abandons the flow, and cost six round trips
   instead of one. The age gate is the exception: it acts immediately, because the account
   must not exist.
4. **The analytics toggle is shown to minors, disabled, with an explanation.** Hiding it would
   look like a setting that was never offered. The disabling is cosmetic — the database
   enforces the same result regardless of what the client sends.
5. **Reminder times are presets, not a wheel picker.** A native date-time picker is a whole
   extra native dependency for a question whose useful answers are "morning", "after work"
   and "before bed".
6. **No notification permission is requested yet.** SPEC §11 requires the explanation before
   the OS prompt; the prompt belongs to Phase 17, where the notification service becomes real.
   The copy commits to asking, not to notifying, so nothing is promised that cannot yet be
   delivered (SPEC §59.11).
7. **`unstable_settings.initialRouteName` is set on both route groups.** Without it a group
   opens on whichever route sorts first alphabetically — which would have put
   `forgot-password` ahead of `sign-in`, and was working only by luck for onboarding.
8. **The session heartbeat is not optional plumbing.** `profiles.last_seen_at` is what the
   guest purge reads, so without `sync_session` on app open an active guest would be deleted
   after thirty days along with their progress.
9. **A deleted account's token stays valid until it expires.** PostgREST checks the signature,
   not whether the user still exists, so `reject_underage_account` is always followed by a
   local sign-out — placed in a `finally`, so even a failed delete cannot leave someone
   inside the app.

## Phase 6 — what was implemented (Content pipeline & development seed)

**Authoring format** — `src/lib/content/schema.ts`

Zod schemas for every file and all eight question types, under `src/lib` rather than `scripts/`
because the app renders the same shapes from Phase 7. Everything is `.strict()`: a typo like
`explaination:` fails rather than silently publishing a question with no explanation.

**Pipeline** — `scripts/content/`

| Script             | Job                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------ |
| `load.ts`          | Reads the YAML tree, collecting every problem rather than the first                  |
| `validate.ts`      | Cross-file rules: ids, references, question counts, difficulty mix, placeholder text |
| `runnables.ts`     | Emits a JSON manifest of everything Python should be made to prove                   |
| `verify_python.py` | Executes it all on 3.12 **and** 3.14 (D9), standard library only                     |
| `build.ts`         | Maps content to database rows, splitting answers from payloads                       |
| `seed.ts`          | Generates `supabase/seed.sql` from the real files                                    |
| `publish.ts`       | Upserts into Supabase; never deletes; bumps `content_version`                        |

**Content** — two complete modules of Python Fundamentals: _Getting Started_ and
_Variables & Assignment_. 8 lessons, 40 questions, all eight types, exam pool 38, challenge
pool 39, every item reviewed.

**Seed** — `supabase/seed.sql` is generated, never hand-written, and carries three test
accounts (free / no_ads / premium) whose entitlement rows are tagged `store = 'dev-seed'`.

**App** — `ContentService` plus the Learn screen, which now lists the published modules with
lesson counts and lock state instead of a placeholder.

### Phase 6 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 26 suites, 398 tests, all passing
database    supabase test db ......... 5 files, 93 pgTAP tests, all passing
content     content:validate ......... 1 course, 2 modules, 8 lessons, 40 questions (8/8 types)
python      content:verify ........... 35 snippets on Python 3.12 and 3.14
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

Checked against the running stack:

| Check                                         | Result                                         |
| --------------------------------------------- | ---------------------------------------------- |
| Seed applies                                  | 40 questions, 40 answer keys, 2 exams, 3 users |
| Dev accounts sign in                          | all three                                      |
| Signed-in client reads `question_answer_keys` | denied, 42501                                  |
| Signed-in client reads `questions`            | denied, 42501 (RPC only, as designed)          |
| Signed-in client reads `modules`              | allowed                                        |
| Any published payload containing an answer    | none                                           |

The verifier was itself tested against deliberately broken cases — a lesson claiming the wrong
output, code that crashes, code that waits for input, and a debugging question with no actual
bug. It caught all four and exits non-zero.

## Decisions and interpretations made during Phase 6

1. **The Python verifier takes a JSON manifest rather than parsing YAML.** `runnables.ts`
   emits it, so the schemas live in one place and the verifier needs no third-party Python
   packages on any machine or in CI.
2. **Runnable `debugging` questions verify BOTH sides.** The broken version must actually fail
   or print the wrong thing, and the fix must work. A "find the bug" exercise whose code runs
   perfectly teaches the learner to distrust their own correct reading.
3. **Lesson blocks reference questions by id rather than embedding them.** It keeps the lesson
   payload under the 50 KB cap (SPEC §45) and makes it structurally impossible for an answer
   to ride along inside a lesson body.
4. **Module directories encode their order, and the loader checks it.** `01-getting-started`
   must match `order_index: 1`, or the filesystem order and the teaching order drift silently.
5. **A lesson file not listed in `module.yaml` is an error.** It is nearly always a forgotten
   entry rather than a deliberate draft, and the pipeline would otherwise ignore it in silence.
6. **The seed generator sets eight empty-string token columns on `auth.users`.** GoTrue scans
   them into Go strings rather than pointers, so NULL makes every sign-in fail with an opaque
   500 — from rows that look perfectly correct in Studio. This cost real time to find.
7. **`yaml` is mapped to its CommonJS build in `jest.config.js`.** jest-expo resolves packages
   the way a browser would, which picks the ESM bundle and then cannot parse it.
8. **The free/premium lock on the Learn screen is display only.** It is computed from
   `free_module_count` for the padlock; access is decided by `can_access_module()` on the
   server, so a client lying to itself gains only a wrong icon.

## Phase 7 — what was implemented (Course & lesson engine)

**Database** — `20260917120800_lesson_engine.sql`

- `get_lesson(uuid, text)`: the only client path to lesson bodies and questions. Checks
  `can_access_module()`, resolves question references, and returns **no** explanations, hints
  or answer keys.
- `localized_text` and `localize_deep`, which collapse localized JSONB to one locale on the
  server so the payload stays small once a second language exists.
- 22 new pgTAP tests (`06_lesson_engine.test.sql`), 115 in total.

**Service layer** — `getLesson` and `getModuleLessons`, with the RPC response parsed by a
`.strict()` Zod schema. The schema would reject an explanation if the server ever started
sending one — a second, independent place the leak would surface.

**Screens**

- `module/[id]` — the lessons inside a module, with a Premium banner when locked.
- `lesson/[id]` — the reader: progress bar, blocks, completion screen. Full-screen and outside
  the tabs, so there is no tab bar and no banner ad while reading (SPEC §10, §30).

**Block renderers** — prose with a limited Markdown subset, code with output, callouts in
three variants, and question previews.

**`src/lib/markdown.ts`** — the Markdown subset SPEC §15 allows: bold and inline code, with
blank lines as paragraph breaks and single newlines unwrapped.

### Phase 7 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 29 suites, 437 tests, all passing
database    supabase test db ......... 6 files, 115 pgTAP tests, all passing
content     content:validate ......... unchanged, still valid
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

Checked against the running stack through the real HTTP API:

| Case                                          | Result                               |
| --------------------------------------------- | ------------------------------------ |
| Free user, free module                        | opens                                |
| Free user, premium module (boundary narrowed) | `42501 this module requires premium` |
| Premium user, premium module                  | opens                                |
| Explanation / hint / answer in the payload    | none                                 |
| Payload size for a seeded lesson              | 3.8 KB, against a 50 KB cap          |

## Decisions and interpretations made during Phase 7

1. **Phase 7 is the reader, not the player.** Blocks render and progress tracks reading;
   answering is Phase 8. Question blocks show the prompt and the code with an honest note,
   and offer no control at all — a control that looks live and does nothing is worse than one
   that admits it arrives later (SPEC §59.12).
2. **The completion screen shows no XP.** XP, streaks and progress are Phase 9. A zero would
   read as a bug, so the screen says what is not counting yet.
3. **Reading progress is driven by scroll.** A lesson short enough to fit one screen counts as
   fully read, rather than sitting at 0% forever.
4. **Locked modules still list their lessons.** Showing what Premium contains is the honest way
   to present the boundary; hiding it makes the course look shorter and gives the user nothing
   to weigh. Tapping through is what the server refuses.
5. **Errors from `get_lesson` are distinguished by code.** `42501` is a paywall and `P0002` is
   a withdrawn lesson — different screens, so the service maps them rather than throwing one
   opaque failure. The lesson query does not retry: neither will ever succeed on a second try.
6. **Localisation happens on the server.** `localize_deep` applies one rule to whole structures
   rather than field by field, so a newly added field cannot be forgotten, and the payload
   carries one language instead of all of them.
7. **Inline code renders in the monospace face, not merely a colour.** In a programming course
   the difference between `print` the function and print the English word is the content, and
   colour alone does not carry it (SPEC §47).
8. **i18n is initialised in `jest.setup.js`.** Components read copy through `useTranslation`,
   so without it they rendered raw keys and every assertion on visible text was meaningless.
   Using the real instance also makes a missing key a failing test rather than a key on screen.

## Phase 8 — what was implemented (Question engine & grading)

**Database** — `20260917120900_question_grading.sql`

- `submit_answer(uuid, jsonb, answer_context, text)`: grades on the server, records the
  attempt, awards question XP through the ledger in lesson context, and returns the verdict
  with the explanation, the hint and — only now — the answer key.
- `grade_answer` for all eight V1 types; `normalize_answer_text` for curly quotes, dashes and
  the four match modes; `question_xp` for the first-attempt / retry rule.
- 57 new pgTAP tests (`07_question_grading.test.sql`), 172 in total.

**Question engine** — `src/features/questions/`

- Payload schemas per type (answer-free), the answer-value union, `isAnswerComplete`, and a
  seeded shuffle for ordering and matching questions.
- Renderers: `ChoiceList` (choose-one / choose-many / true-false / predict-output-choice /
  choose-fix), `CodeLine`, `PredictOutput`, `FillBlank`, `CodeOrdering`, `Debugging`,
  `ConceptMatching`, and the `QuestionRenderer` dispatcher.
- `useSubmitAnswer`: one request, no automatic retry, haptics on the verdict.

**Lesson player** — restructured around pages: runs of explanation, then one question at a
time. `buildLessonPages` is pure and tested, so the progress bar is a page index rather than a
scroll position. The completion screen shows the first-try score and the XP the server
actually awarded.

**Design system** — `TextField` gained a monospace mode; `Card` keeps its accessibility label,
role and state when it is not pressable.

### Phase 8 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 37 suites, 511 tests, all passing
database    supabase test db ......... 7 files, 172 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

Exercised through the real HTTP API with a fresh guest:

| Case                                  | Result                                                |
| ------------------------------------- | ----------------------------------------------------- |
| true_false, right, first try          | correct, 5 XP, attempt 1                              |
| multiple_choice, wrong                | incorrect, 0 XP, hint returned, solution returned     |
| the same question, then right         | correct, **2 XP** (5 × 0.5 floored), attempt 2        |
| predict_output with curly quotes      | incorrect — quotes straightened, still not the output |
| predict_output padded with whitespace | correct under `trimmed`                               |
| predict_output choice, by option id   | correct — server resolved the option text             |
| code_ordering, right                  | correct, 10 XP                                        |
| a non-object answer                   | `22023 answer must be a JSON object`                  |
| ledger rows / xp_total                | 5 rows, 24 XP — one row per correct answer            |

## Decisions and interpretations made during Phase 8

1. **One attempt per question inside a lesson; retries happen in Practice.** SPEC §18 says
   "retry where appropriate" and §19 pays 50% for "correct on a retry". Read together with §23
   ("Review mistakes: questions the user answered incorrectly"), the coherent model is: answer
   once in the lesson, see the explanation, move on; the retry — at half XP — is the practice
   session later. Attempts are therefore counted across contexts.
2. **The explanation and the key come back after every attempt, right or wrong.** SPEC §17:
   "returned only after answering"; §18 asks for the explanation on both outcomes and for the
   correct answer to be shown. The renderers mark the answer sheet from `solution`.
3. **Malformed answers grade as incorrect; only a non-object raises.** A missing field is
   "wrong", and recording it as an attempt is the honest outcome. A string where an object was
   expected is a client bug, and a `22023` makes it visible.
4. **Choice-style predict_output submits the option id, not its text.** The server resolves the
   authored English text. Comparing a translated label to a program's output would break the
   day Romanian ships.
5. **Tap, never drag.** Ordering and matching are tap-to-place. Dragging is fiddly on a phone,
   unreliable with a screen reader, and needs a native gesture library for every learner in
   exchange for a flourish.
6. **Shuffles are seeded by question id.** Authors write ordering lines and definitions in their
   natural — i.e. answer — order. A shuffle that changed per render would move lines under a
   finger; one seeded by the id is stable everywhere and never yields the authored order.
7. **No automatic retry on a failed submission.** The selection is kept and Check is offered
   again. An automatic retry could grade one tap twice. On a network error the server never saw
   the answer, so nothing was recorded or deducted (SPEC §18).
8. **A non-pressable Card keeps its accessibility.** Found by a test: once an option was graded
   (and so disabled), it fell back to a bare View and lost its label, silencing the answer
   sheet for a screen reader. Now fixed at the source.
9. **XP shown on the completion screen is the sum the server returned**, never a client tally.
   Lesson-completion XP, streaks and progress rows are Phase 9 and the screen says so.

## Phase 9 — what was implemented (XP, levels, progress)

**Database** — `20260917121000_progress.sql`

- `complete_lesson(uuid)`: records the lesson, pays `xp_lesson_completion` **once**, computes
  whether it was perfect from the attempts table.
- `get_progress_summary(text)`: the whole Progress screen in one round trip, with per-skill
  accuracy omitted server-side for non-Premium users (SPEC §28).
- `get_user_stats()`: the small, hot one for the header on Home and Profile.
- `submit_answer` replaced (not edited) so every attempt now moves the counters Progress reads.
- `touch_daily_activity`: accumulates a day keyed on the user's **local** date.
- 36 new pgTAP tests (`08_progress.test.sql`), 208 in total.

**Level system** — `src/features/progress/logic/levels.ts`

Pure and unit-tested, because SPEC §20 makes the level a derived value that the server never
stores. It extends the configured curve past its last entry, so a learner who passes level 20
keeps levelling instead of sitting at a permanent maximum.

**Screens**

- `progress` — level and XP, four headline numbers, course completion, per-module bars, skill
  areas, and an honest Premium explanation instead of a blurred number.
- Home and Profile now carry the XP/level card and a route into Progress.
- The lesson player calls `complete_lesson` when the last page is reached, and the completion
  screen shows the first-try score, the XP the **server** awarded, and a perfect-lesson line.

### Phase 9 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 39 suites, 555 tests, all passing
database    supabase test db ......... 8 files, 208 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

A fresh guest answering all five questions of lesson 1.1 correctly, through the real HTTP API:

| Step                        | Result                                         |
| --------------------------- | ---------------------------------------------- |
| five correct answers        | 5 + 5 + 5 + 10 + 5 = 30 XP                     |
| `complete_lesson`, first    | +20 XP, perfect, 5/5 first try, total **50**   |
| `complete_lesson`, again    | **+0 XP**, `already_completed`, total still 50 |
| progress summary            | 1 lesson, 5/5 questions, course 1/8            |
| skills with accuracy (free) | **0** — Premium-only, omitted server-side      |
| daily activity              | 1 lesson, 5 questions, 50 XP on the local date |

## Decisions and interpretations made during Phase 9

1. **`questions_answered` counts attempts, not distinct questions.** Accuracy then means what
   it says: answer one question wrong and then right, and you have answered twice and been
   right once.
2. **A lesson pays once, but can be completed many times.** Re-reading is worth encouraging, so
   `complete_lesson` stays callable; the ledger simply refuses to pay again, and
   `lessons_completed` and `completed_at` do not move.
3. **Perfect is sticky.** Once every question has been right first time, a later re-read with a
   wrong answer does not revoke it — it is a record of something that happened.
4. **Course completion counts only reachable lessons.** Counting Premium modules a free learner
   cannot open would pin them below 50% forever, which is discouraging and not informative.
5. **Per-skill accuracy is withheld by the server, not by the client.** A free user's response
   simply has nulls, and the screen explains what Premium adds rather than blurring a number
   that is already on the device.
6. **The level curve is extrapolated past its last configured entry.** SPEC §20 says increments
   grow by ~100 per level; without that a learner past level 20 would stop levelling.
7. **`complete_lesson` retries once; `submit_answer` does not.** Completion is idempotent by
   construction, so a retry after a dropped response can only produce the right answer. Grading
   is not, so an automatic retry there could record two attempts for one tap.
8. **Home gained the XP card now, not in Phase 11.** The phase's whole point is that XP visibly
   moves, and the device check asks to see it. Today's goal, the daily challenge and the
   next-lesson card remain Phase 11, and the screen says so.

## Phase 10 — what was implemented (Streak, lives, achievements)

**Database** — `20260917121100_streak_lives_achievements.sql`

- Streaks: `current_streak_for` (lazy read) and `evaluate_streak` (qualify and extend), both
  on the user's local date.
- Lives: `regenerate_lives`, `consume_life` and `lives_state`, all lazy from a timestamp.
- Achievements: the thirteen-entry catalogue, `achievement_rule_met` for the eight V1 rule
  types, `evaluate_achievements`, and `get_achievements` for the screen.
- `submit_answer` and `complete_lesson` replaced to wire all three in; `get_user_stats` and
  `get_progress_summary` now report the **live** streak and lives.
- 55 new pgTAP tests (`09_streak_lives_achievements.test.sql`), 263 in total.

**App**

- `LivesIndicator` — hearts with one spoken label, and a countdown that ticks through
  `useSyncExternalStore` rather than reading the clock during render.
- `AchievementToast` — a short spring that respects reduce-motion and announces the unlock to
  a screen reader.
- `AchievementList` — locked achievements shown, dimmed, with their state in the label.
- The level card on Home and Profile now carries the streak and lives; Progress gained the
  achievement section; the lesson player shows lives once they are in play and celebrates
  unlocks on the completion screen.

### Phase 10 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 41 suites, 583 tests, all passing
database    supabase test db ......... 9 files, 263 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

A fresh guest through the real HTTP API:

| Step                                  | Result                                             |
| ------------------------------------- | -------------------------------------------------- |
| five correct answers                  | streak 1, lives 5/5, nothing unlocked yet          |
| completing the lesson                 | perfect, unlocked `first-lesson`, `perfect-lesson` |
| a wrong answer during the grace       | lives **5** — nothing taken                        |
| the same, after three lessons         | lives **4**, with a regeneration time set          |
| a wrong answer at zero                | lives **0** — never negative                       |
| nine hours away                       | lives **2** — two 4-hour intervals credited        |
| catalogue                             | 13 total, 2 unlocked, 11 shown as locked           |
| achievement XP through the ledger     | 30                                                 |
| a streak last extended three days ago | stored says 9, **live reads 0**                    |

## Decisions and interpretations made during Phase 10

1. **All three systems are lazy.** A streak breaks when it is read, not when a job runs; lives
   return from arithmetic on a timestamp. No cron, no drift, and nothing to fail overnight.
2. **The regeneration clock advances by what it spent, not to `now()`.** Otherwise a user who
   opens the app every ten minutes would never regenerate anything, because each check would
   throw away the partial interval.
3. **Losing the first life starts the clock; losing a later one does not.** Restarting it on
   every loss would push the next regeneration away each time someone answered.
4. **Lives are shown only once they are in play.** Five full hearts in front of a beginner in
   the grace period implies a threat that does not exist.
5. **Achievements evaluate once per call.** Unlocking an XP achievement can cross the next XP
   threshold; that one unlocks on the next event rather than recursing, which is what SPEC §25
   asks for and what keeps the work bounded.
6. **Streak rules read the live streak, not the stored number.** A pgTAP test pins it: a user
   whose row says 9 but who stopped three days ago unlocks nothing.
7. **The catalogue ships in the migration, not through the content pipeline.** The rule _types_
   are code; adding an achievement that reuses one is a data change. Two entries name modules
   whose content arrives in Phase 19 and simply cannot unlock until then — correct, not a gap.
8. **Locked achievements are shown with their real names.** A grid of question marks tells a
   learner less than the name does, and hiding them leaves nothing to aim at.
9. **The countdown uses `useSyncExternalStore`.** The linter caught `Date.now()` during render
   as impure — and a countdown frozen at the value it had when the screen opened is wrong
   anyway, since someone waiting for a life is watching that number.

## Phase 11 — what was implemented (Home, Practice, Daily Challenge)

**Database** — `20260917121200_practice_and_challenge.sql`

- `get_home_summary`: stats, lives, daily goal, next lesson, course progress, mistake count
  and challenge state in **one** round trip.
- Practice: `get_practice_set` (review / mixed / hard), `mistake_count`, `award_practice_xp`
  and `practice_xp_today` for the daily cap.
- Daily Challenge: `daily_challenge_questions` (scheduled row, else a deterministic pick),
  `get_daily_challenge` and `claim_daily_challenge`.
- `submit_answer` replaced so a correct answer pays by its **context** — lesson rate, flat
  practice rate, or nothing for a challenge, whose bonus is paid on claim.
- 48 new pgTAP tests (`10_practice_and_challenge.test.sql`), 311 in total.

**App**

- **Home** rebuilt: greeting, level card with streak and lives, today's goal as an XP bar, the
  next-lesson CTA (an invitation for a new learner), the Daily Challenge card, course progress
  and the practice CTA with its badge.
- **Practice** and **Challenge** screens, both full-screen and outside the tabs.
- `QuestionRunner`, shared by both: they differ in what the server does with the answers, not
  in how the questions are asked, so the eight renderers and the feedback panel are identical
  to a lesson.

### Phase 11 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 42 suites, 604 tests, all passing
database    supabase test db ......... 10 files, 311 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

A fresh guest through the real HTTP API:

| Step                                   | Result                                        |
| -------------------------------------- | --------------------------------------------- |
| Home, brand new                        | `is_new`, first lesson offered, goal 0/30     |
| after one lesson with one mistake      | next lesson moves on, goal met, 1 to review   |
| review set                             | 1 question, **no explanation, no answer key** |
| answering it correctly                 | 2 XP, and the review count drops to 0         |
| a free learner asking for a hard set   | `42501 hard practice requires premium`        |
| claiming the challenge before doing it | `22023 the challenge is not finished yet`     |
| claiming after finishing               | 25 XP, streak 1                               |
| claiming again                         | 0 XP, `already_claimed`, still one claim row  |
| practice XP from 39 of 40              | paid `1, 0, 0` — truncates, then stops        |

## Decisions and interpretations made during Phase 11

1. **The practice cap truncates rather than refusing.** A learner one point short of the cap
   gets that one point. Refusing outright would be arbitrary and would feel like a bug.
2. **Practice XP is keyed by question AND date.** A question can be practised again tomorrow,
   unlike the lesson reward, which is once per question forever (SPEC §19).
3. **Review means mistakes, and clears.** A question leaves the review set the moment it is
   answered correctly, so the Home badge counts down rather than accumulating forever.
4. **Practice never reaches past the paywall.** Filtered on `can_access_module` and the
   per-question premium flag, so a mixed set can only contain questions the learner could
   already have answered in a lesson.
5. **The challenge is deterministic, not scheduled.** Ordering the eligible pool on
   `md5(date || question id)` means there is always a challenge, it is the same for everyone
   on that local date, and nobody has to remember to create one. A scheduled row still wins.
6. **The bonus is claimed, not paid automatically**, so the learner sees what they earned —
   and `claim_daily_challenge` checks that every question was actually answered today in
   challenge context, so the card cannot be opened and closed for 25 XP.
7. **Home is one RPC.** Five parallel requests on a cold connection is five chances to show a
   spinner where an answer should be (SPEC §45).
8. **A new learner gets an invitation, not a resume button.** `is_new` drives the greeting and
   the CTA copy, so the first screen reads "Start your first lesson" rather than "Continue"
   next to a row of zeroes (SPEC §13).
9. **Practice and the Challenge share one runner.** They differ in what the server does with
   the answers, never in how a question is asked — a question should not behave differently
   depending on where the learner met it.

## Phase 12 — what was implemented (Leaderboard, display names, reports)

**Database** — `20260917121300_leaderboard.sql`

- `get_leaderboard(limit)`: the weekly ranking — top rows, the caller's own position, and the
  ±5 around them when they fall outside the slice. A row carries a display name, an avatar key,
  an XP figure and the pseudonymous user id. Nothing else, ever.
- `display_name_problem(text)`: the single definition of an acceptable name — 3–20 characters,
  locale-aware `[[:alnum:]]` plus `. _ -` between them, then the `display_name_blocklist` and
  `display_name_profanity` config lists, compared after folding case and separators.
- `profiles_validate_display_name`: a trigger, so `set_display_name`, `update_profile` and any
  future moderation rename all go through that one rule.
- `set_display_name(text)`: its own RPC with its own error codes, because the screen has to
  tell "too short" apart from "already taken".
- `report_user(uuid, text, text)`: files a moderation report. A second open report from the
  same reporter files nothing, and an ineligible target gives the same `P0002` as an unknown
  id, so it cannot be used to probe which user ids exist.
- `award_xp` replaced to apply `leaderboard_daily_xp_cap` (2000): the learner keeps every
  point in the ledger and in `user_stats`; only the `leaderboard_weekly` increment is clamped.
- 58 new pgTAP tests (`11_leaderboard.test.sql`), 369 in total.

**Seed**

- The three dev accounts now have display names and a birth year, and 60 fixture accounts
  populate the current week's board — a ranking with one row proves nothing, and the neighbour
  slice only renders for somebody the top 50 does not reach.

**App**

- **Leaderboard tab**: the ranking, pull-to-refresh, the caller's row highlighted and
  announced, medals on the top three beside the rank rather than instead of it, and an
  explicit gap marker between the top slice and a distant caller.
- **Absence states**: guest / no display name / hidden / no XP yet, each with its own copy and,
  where there is one, its own fix.
- **Display-name sheet**: validates locally while typing, and renders the server's verdict as
  a sentence per rule rather than "invalid".
- **Report sheet**: four reasons plus an optional note. Closes with a thank-you and no status,
  because the queue is write-only by design.
- **Profile**: display name, avatar and "Hide me from the leaderboard" together in one card.
- `LeaderboardService` in the registry — real, not a no-op.

### Phase 12 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
unit        jest ..................... 47 suites, 664 tests, all passing
database    supabase test db ......... 11 files, 369 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

Through the real HTTP API, signed in as the seeded accounts:

| Step                                 | Result                                                  |
| ------------------------------------ | ------------------------------------------------------- |
| the seeded board                     | 60 ranked, 50 returned, `#1 Sprinter 01 (1496 XP)`      |
| the payload searched for `@`         | **not present**; row keys are exactly the five expected |
| earning 200 XP                       | `me: #55`, neighbours 51–60                             |
| `set_display_name('ad')`             | `22023 display name rejected: too_short`                |
| `set_display_name('Ana<b>')`         | `22023 ... invalid_characters`                          |
| `set_display_name('m.o.d')`          | `22023 ... reserved`                                    |
| `set_display_name('Sprinter 01')`    | `23505 display name taken`                              |
| `set_display_name('Ada Mărioară')`   | accepted — diacritics are a name, not a bad character   |
| hiding yourself                      | `hidden`, `me: null`, absent from another user's board  |
| ...and the board still loads for you | 50 rows — hiding removes you from it, not it from you   |
| a guest with 5000 XP                 | `is_guest`, not ranked, can still look                  |
| reporting, then reporting again      | one row in the queue, not two                           |
| reporting yourself                   | `22023 invalid report target`                           |
| reading `reports` as a client        | `42501 permission denied for table reports`             |
| +1500, +400, +300, +200 in one day   | ledger 1500/1900/2200/2400, ranked 1500/1900/2000/2000  |

## Decisions and interpretations made during Phase 12

1. **The cap limits the ranking, never the learner.** SPEC §42 asks for a per-day leaderboard
   XP cap. Taking XP away would also take levels and achievements, which punishes a long
   study session. The ledger and `user_stats` get the full amount; only `leaderboard_weekly`
   is clamped.
2. **The cap clamps against the uncapped running total**, which makes the day's credited total
   come to exactly `least(earned_today, cap)` without storing a second counter.
3. **Validation lives in a trigger, not only in the RPC.** `update_profile` already accepted a
   display name and moderation will eventually write one directly; one rule on the column
   beats three copies at three entry points.
4. **The blocklist is short and the profanity list is shorter.** A real profanity filter
   cannot be won in one language, let alone the several this will ship in, and a false
   positive blocks a real person from their own name. The Report action and Studio are the
   answer to the rest (SPEC §26, §49).
5. **Names are validated as `[[:alnum:]]`, not as ASCII.** "Mărioară" and "Δημήτρης" are
   ordinary names. What is excluded is markup, control characters and the invisible
   codepoints used to clone somebody else's name.
6. **A rejection is a code, not a sentence** (SPEC §38) — and the client has a local copy of
   the length and character rules only, because those never change. The blocklists stay in
   `app_config`, where they can be edited without an app release.
7. **The user id is returned for ranked rows.** The Report action needs a target. It is the
   pseudonymous Supabase id that analytics already uses (SPEC §43), it identifies nobody
   outside this database, and it is never rendered.
8. **Absence has four answers, not one.** "Choose a name", "you hid yourself", "guests are not
   ranked" and "no XP yet" have four different fixes; one empty state would leave a learner
   who hid themselves months ago with no idea why they are missing.
9. **The report queue is write-only, including for the reporter.** A readable list would tell
   anyone who had been reported, and by how many people.
10. **The hide-me toggle is disabled, with the reason, for a learner under
    `minor_protection_age`.** The server forces `leaderboard_hidden` for them whatever the
    client sends (SPEC §41), so a live switch would flick on and snap back — which reads as a
    broken app rather than as a protection. It fails closed on an unknown birth year, exactly
    as `public.is_minor()` does.
11. **`profiles.display_name` is no longer in `ProfilePatch`.** One client path, with error
    codes a name field can actually use.
12. **The seed fills the board.** 60 fixture accounts with no `auth.identities` row, so they
    cannot sign in — rows that exist to be ranked. Their XP is written straight to
    `leaderboard_weekly`, which is the one place the seed departs from real gameplay, and the
    honest trade against 1,200 ledger rows on every reset.

## Phase 13 — what was implemented (Exam mode)

**Database** — `20260917121400_exams.sql`

- `start_exam(exam_id)`: freezes the question set on the attempt and returns the paper — no
  explanation, no hint text, no answer key. An attempt already open is **resumed**, with the
  same questions and the same clock; one whose clock has run out is graded on the way past.
- `exam_question_set`: draws from the exam-eligible pool, filtered by `can_access_module` and
  the premium flag, filling `exam_difficulty_mix` (30/45/25) per bucket and topping up at
  random where a bucket is short. Shuffled across buckets so the paper does not run
  easy-to-hard.
- `save_exam_progress(attempt, answers)`: merges answers into the attempt as the learner moves
  through the paper, so a crash costs a question rather than 45 minutes.
- `submit_exam(attempt, answers)`: grades every question, computes the per-skill breakdown,
  records `user_question_attempts` in `exam` context, pays score XP, evaluates the streak and
  the exam achievements, and returns the results page. Idempotent.
- `get_exam_results(attempt)`: reopens a graded attempt without regrading or repaying. The
  four-argument builder behind it is internal, so a client cannot hand itself an XP figure.
- `exam_unavailable_reason`: the single definition of why an exam is locked — Premium, the
  free weekly limit, the retry cooldown, the kill switch, or too few questions. Both the
  overview and `start_exam` call it, so a card can never offer what the RPC would refuse.
- `config_bool`, `exam_submit_grace_seconds` (60) and `exam_difficulty_mix` added to config.
- 64 new pgTAP tests (`12_exams.test.sql`), 433 in total.

**App**

- **Exam list** at `/exam`, reached from the foot of Learn — the Final Exam is an exam, not
  the eighteenth module (SPEC §14). Locked exams are shown with the reason, not hidden.
- **`ExamRunner`**: deliberately not built on the lesson's `QuestionPage`, whose whole job is
  to check an answer and show a verdict. No Check button, no feedback panel, no hint, no
  lives — just the eight renderers, free movement back and forth, and one hand-in.
- **`ExamTimer`**: reads the server's deadline, ticks once a minute until the last five and
  every second after that, and submits at zero.
- **Results**: the score as a ring, how many questions short of a pass, the three weakest
  skills, the XP, any achievements — then a full review with every explanation.
- `ExamService` in the registry — real, not a no-op.

### Phase 13 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --check ......... clean
unit        jest ..................... 52 suites, 749 tests, all passing
database    supabase test db ......... 12 files, 433 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

Through the real HTTP API, signed in as the seeded accounts:

| Step                                        | Result                                            |
| ------------------------------------------- | ------------------------------------------------- |
| free learner opens the full exam            | `42501 exam unavailable: requires_premium`        |
| premium opens it                            | 30 questions, deadline set                        |
| the paper searched for an explanation / key | **neither present**                               |
| sample exam answered perfectly              | 100%, passed, +100 XP                             |
| achievements it unlocked                    | `first-100-xp`, `first-exam`, `exam-passed`       |
| resubmitting the same attempt               | +0 XP, still one ledger row                       |
| free learner starts a second one            | `22023 exam unavailable: no_attempts_left`        |
| 60% → 90% → 70% on the full exam            | +60, then **+30**, then **+0** — total exam XP 90 |
| 30 correct answers sent 10 minutes late     | scored 3.33% — only the one saved in time counted |
| killing the app and reopening               | same attempt, same paper, saved answers returned  |
| 30 wrong answers                            | lives 5 → 5                                       |
| another learner's attempt                   | `P0002 attempt not found`                         |

## Decisions and interpretations made during Phase 13

1. **Answers are saved mid-exam.** SPEC §27 submits everything at once and that has not
   changed, but `exam_attempts.answers` already existed and a 45-minute exam evaporating when
   the app is killed would be the worst experience in the product (SPEC §36). One small RPC,
   called on each move between questions.
2. **Past the grace period the saved answers are marked, and the late payload ignored.** The
   alternatives were to reject the submission — throwing away real work — or to accept it,
   which makes the time limit decorative.
3. **An expired open attempt is graded, not resumed.** Time running out is a result. Grading
   it at the next `start_exam` means the learner's next action tells them the truth.
4. **A resumed attempt is the same paper.** Which also means force-quitting because you
   disliked the questions gets you the same questions back. The two are the same rule.
5. **XP is the improvement over the best across ALL exams**, not per exam. SPEC §19 says "the
   user's best previous exam XP", and the cross-exam reading is the one that stops a learner
   farming 100 XP a week off the ten-question sample.
6. **Difficulty is a target, not a guarantee.** With 38 eligible questions the buckets are
   often short, so the mix is filled where it can be and topped up at random — a short paper
   would be worse than an imperfect mix.
7. **The exam runner is not the lesson player.** `QuestionPage` exists to check an answer and
   show the verdict; reusing it and disabling half of it would have left the grading call one
   prop away from firing during an exam.
8. **No back button while an exam is running.** Leaving is "hand in", not "undo" — and since
   the clock keeps running server-side either way, a stray swipe should not look like an exit.
9. **A question this build cannot render is shown as such and marked unanswered**, rather than
   crashing the exam. The other 29 still count.
10. **Locked exams are listed, with the reason.** Hiding the Premium exam from a free learner
    would make the tier harder to understand, not easier to sell (SPEC §33).
11. **The results page is written for somebody who has just failed**: how many questions short
    rather than the arithmetic, three things to revise rather than a table, and a "warning"
    tone rather than "danger" — nobody is being told off (SPEC §9).
12. **`exam_results` is internal; `get_exam_results` is the grant.** The builder takes the XP
    and unlocked achievements as arguments because `submit_exam` has just computed them, and a
    client must not be able to pass its own.

## Phase 14 — what was implemented (Billing, entitlements, paywall)

The first phase that genuinely depends on credentials nobody has yet. It was built in two
halves: everything that does not need a store account, and then the RevenueCat service itself —
written, type-checked against the real SDK, and deliberately **not wired in**, because a
service configured with no API key cannot be verified and must not pretend otherwise
(SPEC §59.11).

**Database** — `20260917121500_billing.sql`

- `apply_entitlements(user, payload)`: reconciles a user against the **full** set RevenueCat
  reports. Anything absent is revoked — deactivated rather than deleted, so the row keeps which
  store it came from. This is what makes webhook ordering irrelevant.
- `entitlement_state(user)` / `get_entitlements()`: what the server says somebody holds.
  `is_ad_free` is computed as `no_ads OR premium` in one place (SPEC §32).
- `record_billing_event(...)`: the idempotency log, returning `recorded` **and**
  `already_processed` separately — so a retry of a delivery that _failed_ is not mistaken for
  a duplicate and quietly dropped.
- `config_bool`, plus explicit `service_role` grants: revoking from `PUBLIC` removes the
  privilege from `service_role` too, which would have made every Edge Function call fail.
- 45 new pgTAP tests (`13_billing.test.sql`), 478 in total.

**Edge Functions** — `supabase/functions/`

- `revenuecat-webhook`: authenticates with a shared secret compared in constant time and
  **failing closed** when unset, logs the delivery, then **re-fetches the whole subscriber**
  from the REST API and reconciles it. Status codes chosen for RevenueCat's retry behaviour.
  A `TRANSFER` re-syncs **both** accounts, since a subscription moving changes what each holds.
- `sync-entitlements`: the same reconciliation for the caller, whose id comes from their
  verified JWT — there is no user id parameter to forge.
- `config.toml` sets `verify_jwt = false` for the webhook (RevenueCat holds no Supabase
  session) and `true` for the sync.
- Their logic lives in `_shared/`, free of Deno globals, so it is type-checked and unit-tested
  by the ordinary `npm test` run: 48 tests.

**App**

- `EntitlementService` — **real**, and separate from `BillingService` on purpose: knowing what
  somebody has paid for must work now, while the store SDK waits for keys.
- `src/services/billing/config.ts` — every product identifier in the codebase, and nothing
  else. No price anywhere.
- The **paywall**: plans from Offerings, localized prices from the store, the per-month
  equivalent of the annual plan, an explicit "No Ads does not unlock Premium lessons or
  unlimited lives", restore, manage, terms, and an immediate close control.
- `RevenueCatBillingService` — written and type-checked, registry still on the no-op.

### Phase 14 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --check ......... clean
unit        jest ..................... 56 suites, 830 tests, all passing
database    supabase test db ......... 13 files, 478 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

The Edge Functions, probed over real HTTP against the local stack:

| Request                                    | Result                                          |
| ------------------------------------------ | ----------------------------------------------- |
| webhook, no `Authorization`, secret unset  | `500 webhook not configured` — **fails closed** |
| webhook, wrong secret                      | `401 unauthorized`                              |
| webhook, correct secret, no RevenueCat key | `500 webhook not configured`                    |
| webhook, `Bearer <secret>`                 | accepted past auth                              |
| webhook, `GET`                             | `405 method not allowed`                        |
| `sync-entitlements`, no token              | `401 unauthorized`                              |

Reconciliation, through the database:

| Step                                    | Result                                      |
| --------------------------------------- | ------------------------------------------- |
| premium + no_ads applied                | both active, `is_ad_free` true              |
| empty payload applied                   | both revoked, rows kept with their history  |
| downgrade to no_ads only                | premium gone, no_ads active                 |
| expiry in the past, `is_active: true`   | grants nothing                              |
| unknown entitlement id                  | skipped, nothing written, no error          |
| duplicate webhook delivery, unprocessed | `recorded: false, already_processed: false` |
| duplicate after processing              | `recorded: false, already_processed: true`  |

## Decisions and interpretations made during Phase 14

1. **`EntitlementService` is separate from `BillingService`.** The obvious design puts them
   together; it is wrong. The store SDK is a no-op without keys, but reading what the server
   says somebody holds must work today — otherwise the seeded Premium account looks free.
2. **The registry still points at `NoopBillingService`.** A service configured with no API key
   cannot be verified, and shipping it wired-in would be claiming an integration works when
   nobody has run it once. `PRODUCTION_NOOP_ALLOWLIST` still lists `billing`.
3. **`react-native-purchases` is installed but not imported by anything.** So it is
   type-checked against the real SDK, and it is **not in the bundle** — which was confirmed by
   grepping the export. Expo Go still runs the app. Flipping one registry line changes both.
4. **The webhook fails CLOSED with no secret.** "Not configured" must never mean "let
   everything through": an unauthenticated endpoint that writes entitlements is a way for
   anyone who finds the URL to grant themselves Premium.
5. **`record_billing_event` returns two facts, not one.** "Already seen" is not "already
   done". With a single boolean, a delivery whose sync failed halfway would be waved through
   as a duplicate on the retry and the entitlement would never land.
6. **Reconciliation, never deltas.** Absence in the re-fetched subscriber revokes. Applying
   events as a sequence eventually produces a subscriber state that never existed.
7. **A `TRANSFER` syncs both accounts.** Syncing only the destination would leave the previous
   owner with access they no longer have (SPEC §31, account switching).
8. **The informational-event list has exactly one entry (`TEST`).** It is an allow-list of
   things to SKIP, so an event type RevenueCat adds later causes a harmless extra API call
   rather than a subscriber whose access silently never updates.
9. **Edge Function logic lives in `_shared/`, free of Deno globals.** Deno is not installed
   here and adding a second toolchain to test forty lines would be the wrong trade. The
   result is better anyway: the code that decides who has paid is covered by the same
   `npm test` everything else is. The Deno entry points are excluded from `tsconfig` and
   ESLint, and are thin enough to read in one screen.
10. **An unknown entitlement id is skipped at both ends.** A dashboard can be configured with
    tiers an installed app predates; an old client must not fail its whole sync over one.
11. **The paywall has no fallback price, anywhere.** Offerings that fail to load produce an
    error state with a retry (SPEC §31). Inventing a price is worse than showing none.
12. **A cancelled purchase produces no message at all.** The customer knows what they just
    did; a toast saying "purchase failed" reads as an error they caused.
13. **No Ads is shown to a Premium subscriber as "included", not "owned" and never as
    buyable.** They do hold it — Premium grants both — but the honest word is different.
14. **`MONETIZATION.md` was written now**, not at launch: it is the setup checklist for the
    store paperwork that has to happen before this phase can be device-tested at all.

## Known limitations

Rewritten at the end of each phase, so this describes the product as it stands today.

**Integrations not built yet** (SPEC §59.11 — no fakes; the contract and the UI slot exist):

- **RevenueCat is written but not switched on.** `RevenueCatBillingService` is complete and
  type-checked against the real SDK; the registry still points at `NoopBillingService`
  because there are no API keys, no store products and therefore nothing to verify against.
  Flipping it is one line, listed as step 10 of `docs/MONETIZATION.md`. Until then the
  paywall loads no offerings and shows its "could not load the plans" state — which is the
  correct behaviour, not a placeholder.
- Ads and UMP consent (15), analytics and monitoring (16), local notifications (17), plus
  billing above. Those six services are still the no-op implementations listed in
  `PRODUCTION_NOOP_ALLOWLIST`, which must be **empty** before the first production release.
- **Sign in with Apple and Google (D6).** Both need credentials that do not exist yet: an
  Apple Developer account with the Sign in with Apple capability, and Google OAuth client ids.
  Email, password and guest are complete and fully exercised.
- Email verification and password reset use **Mailpit**, the local inbox, because no domain or
  transactional SMTP exists yet. That is a real integration locally; production is blocked
  until SMTP is configured.

**Consequences of the above, visible in the app:**

- Out of lives there is nowhere to go: the wait is explained, but the rewarded-ad restore
  needs Phase 15 and the upgrade needs a working store account.
- The paywall exists and is reachable, but nothing can be bought on it until RevenueCat is
  configured. The funnel triggers from SPEC §34 are implemented and unit-tested; wiring
  them to the screens that fire them is part of Phase 15, where the ad triggers arrive.
- Ads consent (Google UMP) is not asked during onboarding. It belongs with the ads
  integration, which must show it before the first ad request.
- The reminder time is stored, but nothing is scheduled and no notification permission is
  requested (Phase 17).

**Content and features still to come:**

- The seed carries 2 modules, 8 lessons and 40 questions — enough to exercise every feature,
  not launch volume. The remaining 15 modules are Phase 19. The exam pool is 38 against a
  30-question full exam, so two sittings overlap heavily; SPEC §35 wants 60+ at launch.
- Two achievements name modules whose content arrives in Phase 19 and cannot unlock before
  then. "10 Exams Completed" needs ten sittings, which the free weekly limit makes a
  Premium-only achievement in practice.
- `daily_challenges` supports scheduling a specific set or bonus per date. Nothing is
  scheduled; the deterministic pick covers it.
- Onboarding does not let an intermediate learner choose a starting module (SPEC §11). Their
  answer is stored and unused; every module up to the free boundary is reachable anyway.
- Profile still shows a placeholder for the rest of Settings (SPEC §29) — theme, sound,
  notifications, account management and the legal links arrive with Phases 17, 18 and 20.
- Avatars are an initial on a colour derived from `avatar_key`, not preset artwork. No photo
  uploads in V1 by design (SPEC §29); the preset set is a content decision, not a code one.
- Sounds (SPEC §29) are not wired; haptics are.
- `lottie-react-native` and `expo-image` are still not installed. Nothing has needed them:
  Reanimated covers the achievement unlock, and there are no remote images to load.

**Housekeeping:**

- `npm audit` reports **14 moderate** advisories, all inside Expo's own build tooling
  (`@expo/cli` and its `query-string` / `decode-uri-component` / `uuid` / `xcode` chain).
  They are build-time code, not shipped app code, and cannot be resolved without an Expo
  release — `npm audit fix --force` would downgrade Expo itself. Recheck each SDK upgrade.
- **The app has not been run on a physical device yet.** Every device checklist from Phase 1
  onward is outstanding, deferred by agreement. Fonts, contrast, dynamic type and
  reduce-motion in particular can only be verified on hardware.

---

## Human actions required before the next phases

**Critical path — start now:**

- **Register the PFA, then request a D-U-N-S number** (free, via Dun & Bradstreet). The D-U-N-S
  cannot be requested before the entity legally exists, so these are strictly sequential:
  PFA registration → D-U-N-S (days to weeks) → Organization enrolment on both stores.
  This chain is the longest lead time in the project and gates Phases 14 and 22.
- **Decide the public trader address.** Under the EU DSA both stores publish the trader's name,
  address, email and phone. If the PFA is registered at a home address, that address becomes
  public. A separate registered office avoids that.

**Before Phase 3 (the next phase):**

- None. Docker is running and the Supabase project is in the EU region.

**Before Phase 12 (the next phase):**

- None.

**Still outstanding from Phase 4 — needed before a production release, not before Phase 5:**

- **Domain + transactional SMTP.** Supabase Auth needs a custom SMTP sender for email
  verification and password reset; the built-in sender is not permitted in production.
  Local development uses Mailpit, so this does not block building.
- **Sign in with Apple** — needs the paid Apple Developer account (gated behind the
  PFA → D-U-N-S chain above), a Services ID and a signing key.
- **Sign in with Google** — needs OAuth client ids from Google Cloud Console (free, and
  can be done before the store accounts exist).
- If Google sign-in ships on iOS, **Sign in with Apple must ship too** (App Store rule).

**Before Phase 6:** ~~install Python 3.12~~ — **done**: 3.12.10 and 3.14.4 both verified.

**Before Phase 14:** Apple Developer and Google Play accounts fully active, including paid-apps
agreement, tax and banking. Google Play requires a bundle uploaded to a testing track before
subscription products can be created.

**Before Phase 18:** legal review of privacy policy, terms, consent flow and age handling.

**Before EAS builds:** `npx eas-cli login`, then `npx eas init` to populate `EAS_PROJECT_ID`.

---

## Phase 1 device test checklist

Run on a physical **Android** phone, and on **iPhone** from the MacBook.

### Android (from the Windows PC)

1. `npx eas-cli login`, then `npx eas init`, then
   `npx eas build --profile development --platform android`.
2. Install the resulting APK on the phone.
3. Run `npm run dev` on the PC and connect the dev client (same Wi-Fi network).
4. App opens with no red screen and no console errors.
5. Four tabs — Home, Learn, Leaderboard, Profile — all navigable.
6. Each tab shows its placeholder copy in English, loaded from i18n.
7. Switch the phone between light and dark mode: colours follow the system immediately.
8. The app appears in the launcher as **"CodeSprint (Dev)"**.
9. Increase the system font size: text scales without clipping.

### iOS (from the MacBook)

1. `git pull` so the Mac has the current commit, then `npm install`.
2. `npx expo run:ios` — builds locally and launches the Simulator. No Apple account needed.
3. For the physical iPhone: open the generated `ios/*.xcworkspace` in Xcode (the exact name
   comes from the variant's app name), select your personal team under Signing &
   Capabilities, pick the iPhone as the run target, and run. On a free Apple ID the
   provisioning profile expires after 7 days; re-run from Xcode to reinstall.
4. Repeat checks 4–9 above on iOS.
5. Confirm the app appears as **"CodeSprint (Dev)"** and that dark mode follows iOS settings.

> `ios/` is gitignored (it is generated). Running `expo run:ios` regenerates it on the Mac,
> so the two machines never fight over native project files.

---

## Phase 2 device test checklist

Open the app, go to **Profile → Component gallery (dev)**. The gallery only appears in
development builds.

1. Every section renders: typography, buttons, badges/chips, progress, code, answer feedback,
   cards, loading, overlays, states.
2. **Fonts loaded** — text is Inter, not the system font. Code blocks are JetBrains Mono.
3. **Diacritics** — the line `ă â î ș ț / Ă Â Î Ș Ț` shows ș and ț with a **comma below**, not a
   cedilla. This is the SPEC §38 requirement for Romanian.
4. **Theme** — tap system / light / dark at the top; colours change immediately. Then change the
   phone's own theme and confirm "system" follows it.
5. **Code block** — the long line scrolls horizontally and does **not** wrap. Syntax colours are
   readable. The output panel shows `34`.
6. **Buttons** — "Tap to show loading" becomes a spinner and cannot be pressed again while busy.
   The disabled button does nothing.
7. **Bottom sheet** — opens, drags down to dismiss, tapping the backdrop closes it.
8. **Toasts** — tap info/success/error; they stack, auto-dismiss, and never exceed 3 at once.
9. **Dynamic type** — set the phone's font size to the largest setting. Text scales and nothing
   is clipped or overlapping.
10. **Reduce motion** — enable it in accessibility settings. The gallery header shows
    "Reduce motion: on", the progress bar jumps instead of animating, and the skeleton stops
    pulsing.
11. **Screen reader** (TalkBack / VoiceOver) — the code block is read as one block of source,
    progress announces a percentage, and the answer feedback announces "Correct"/"Not quite"
    as words rather than relying on colour.

---

## Phase 3 device test checklist

**Important:** a physical phone cannot reach `127.0.0.1` — that is the phone itself. Before
testing on hardware, point `.env` at this PC's LAN address:

```
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.32:54321
```

(This machine's LAN address at the time of writing. Confirm with `ipconfig`; the `172.22.x`
address is Docker's virtual adapter and will not work.) Phone and PC must be on the same
Wi-Fi, and Windows Firewall must allow inbound connections on port 54321. Restart Metro after
editing `.env` — Expo inlines `EXPO_PUBLIC_*` at build time.

1. `npx supabase start` on the PC, then `npm run dev`.
2. Open the app; the Home tab shows a **BACKEND (DEV)** card.
3. The badge reads **Database** (green), not **Defaults** (red).
4. `content_version` shows `0`, `free_module_count` shows `6`, `lives_max` shows `5`.
5. **Prove it is really reading the database, not the bundled defaults** — they are
   deliberately identical, so the badge alone is not proof:
   - Open Studio at http://127.0.0.1:54323 → Table editor → `app_config`
   - Change `free_module_count` from `6` to `9` and save
   - Pull to refresh / reopen the app: the card must now show `9`
   - Change it back to `6`
6. Set `leaderboard_enabled` to `false` in Studio and reopen the app: the **Leaderboard tab
   disappears** (SPEC §10). Set it back to `true`.
7. Stop Supabase (`npx supabase stop`) and reopen the app: the badge turns red and shows
   **Defaults**, with the explanatory note — the app still works rather than showing a blank
   screen (SPEC §46).

---

## Phase 4 device test checklist

Local Supabase must be reachable from the phone: `EXPO_PUBLIC_SUPABASE_URL` has to be the PC's
LAN address, not `127.0.0.1`. Restart Metro after editing `.env`.

**Opening an emailed link is the awkward part.** Mailpit runs on the PC, so the link is on the
wrong device. Either browse to `http://<PC-LAN-IP>:54324` on the phone and tap the link there,
or copy it and fire it with `npx uri-scheme open "<link>" --android` (or `--ios`).

### Guest

1. Fresh install: the sign-in screen appears — not a blank screen, not the tabs.
2. **Continue as guest** lands on Home.
3. Profile tab shows a **Guest** badge and a "Save your progress" button.
4. Force-quit and reopen: still a guest, no sign-in screen.

### Sign-up and verification

5. Sign out, then **Create an account**, and enter an email with the password `sprint2026`.
6. Password rules: `short` gives "Use at least 8 characters"; `sprintsprint` gives
   "Include at least one letter and one number".
7. Submitting shows the "Confirm your email" screen.
8. Opening the link from Mailpit on the phone opens the app, signs in, and lands on Home.
9. Profile shows the email address with no "unconfirmed" badge.

### Sign-in and reset

10. Sign out, then sign in with the same credentials: Home.
11. A wrong password gives "That email and password don't match an account." and the email
    field keeps its value.
12. **Forgot your password?**, enter the address, and the screen says "Check your email".
13. Opening the reset link opens the app on **Choose a new password** — _not_ on Home.
    This is the one that matters: landing on Home would mean a recovery session slipped through.
14. Set a new password: lands on Home. Sign out and sign in again with it.

### Guest to account — the D1 flow

15. Sign out, continue as guest, then Profile and **Create account**.
16. Enter an email and password: "Confirm your email".
17. Confirm via the link. Profile now shows the email and the **Guest** badge is gone.
18. In Studio (`http://127.0.0.1:54323`), `profiles` holds **one** row for that user with
    `is_anonymous = false`. A second row would mean the conversion created a new account and
    threw away the guest's progress.

### Robustness

19. With Wi-Fi and mobile data off, signing in says "No internet connection" rather than
    crashing.
20. Opening the same confirmation link a second time says "That link has expired or was already
    used", with a way back to sign in.
21. Signing out as a **guest** warns that progress will be lost for good; signing out as a
    registered user does not.
22. With a screen reader on, each field announces its label, and an invalid field announces the
    error together with it.

---

## Phase 5 device test checklist

Onboarding runs once per account, so use a **fresh guest** for each pass: sign out, then
"Continue as guest" again.

### The happy path

1. Sign in (or continue as guest) on a new account: the first screen is **the age gate**, not
   Home and not a welcome carousel.
2. The progress bar reads "Step 1 of 6" and fills as you advance.
3. Enter a year that makes you an adult, then answer experience, motivation and daily goal.
   Continue stays disabled until each screen has an answer.
4. On the reminder screen, pick a time — or tap **No reminders, thanks**, which is a real
   answer and must let you continue.
5. On the consent screen the analytics toggle is **off by default** and you can switch it on.
6. Tap **Start learning**: you land on Home.
7. Force-quit and reopen: you go straight to Home. Onboarding does not run again.
8. In Studio (`http://127.0.0.1:54323`), the `profiles` row holds your answers and
   `onboarding_completed_at` is set.

### The age gate — the part that matters

9. New guest. Enter `2014` (or whatever makes you 12 this year).
10. You land on a screen saying you will need to wait. There is **no way onward** — no back
    button, no swipe back.
11. In Studio, the `auth.users` row for that account is **gone**, and so are its `profiles` and
    `user_stats` rows. A surviving row means the deletion did not happen.
12. Reopen the app: you are signed out, at the sign-in screen.

### Minor protections — the other part that matters

13. New guest. Enter a year that makes you 15.
14. Answer through to the consent screen. The analytics toggle is **off and greyed out**, with
    an explanation naming the age.
15. Finish onboarding. In Studio, that profile has `analytics_consent = false`,
    `leaderboard_hidden = true` and `ads_consent_status = restricted`.
16. Now try to defeat it from Studio's SQL editor as that user — the protections live in
    `update_profile`, so a direct RPC call with `analytics_consent: true` must still come back
    `false`.

### Input handling

17. On the age screen, try `96`, `2O05` (letter O) and `2030`: each gives its own message, and
    none of them says you are too young.
18. Leaving the field empty and tapping Continue says "Enter the year you were born."

### Robustness and accessibility

19. Turn off Wi-Fi and mobile data on the consent screen, then tap **Start learning**: an error
    appears and the button stays usable. Restore the network and it completes.
20. With a screen reader on, each option row announces its label, its description, and whether
    it is selected — not just "button".
21. Increase the system font size to maximum: no step clips its text or loses its Continue
    button.
22. Dark mode: every step is legible, and the selected option is distinguishable by more than
    colour.

---

## Phase 6 device test checklist

The seed is applied by `npm run db:reset`, so make sure that has run since the last content
change.

### Learn shows the real course

1. Open the **Learn** tab. It shows "Python Fundamentals" with a description, then two module
   cards — not a placeholder.
2. Module 01 reads _Getting Started_, 4 lessons. Module 02 reads _Variables & Assignment_,
   4 lessons.
3. Pull down to refresh: the list reloads without flickering to an error.
4. Tapping a module does nothing yet. That is correct for this phase — the lesson player is
   Phase 7.

### It really comes from the database

5. In Studio (`http://127.0.0.1:54323`), open `modules` and change the title of
   `getting-started`.
6. In `app_config`, increment `content_version`.
7. Reopen Learn. The new title appears — proving the screen reads published content and that
   `content_version` is what invalidates the cache.
8. Set `modules.is_active = false` for one module. It disappears from the list.

### The free boundary

9. In `app_config`, set `free_module_count` to `1`.
10. Reopen Learn: module 02 now carries a **Premium** badge and a padlock; module 01 does not.
11. Set it back to `6`: both are unlocked again. No module is ever hidden — the boundary is
    shown, not concealed.

### The test accounts

12. Sign out, then sign in as `premium@codesprint.test` with `sprint2026`. It works.
13. Repeat for `free@codesprint.test` and `noads@codesprint.test`.
14. In Studio, `user_entitlements` shows `store = 'dev-seed'` for the premium account — the
    tag that distinguishes a fixture from a real purchase.

### Robustness

15. Stop Supabase (`npx supabase stop`) and open Learn: an error state with a **Try again**
    button, not a blank screen or a crash.
16. Start it again and tap Try again: the modules come back.
17. With a screen reader on, a module card announces its title, its lock state and its lesson
    count in one phrase.
18. Large text and dark mode: the cards stay legible and nothing clips.

---

## Phase 7 device test checklist

### Opening a lesson

1. **Learn** tab → tap **Getting Started**. A list of four lessons appears, numbered, each with
   a summary and an estimated time.
2. Tap **What is Python?**. The lesson opens full screen — **no tab bar** along the bottom.
3. The header shows the module name; the title and summary sit at the top of the content.
4. Prose reads as continuous paragraphs, not broken mid-sentence at odd points.
5. Inline code (`print`) is in the monospace font with a tinted background.
6. A code example shows the code and, under it, its output.
7. The callout ("Python does not need to be compiled...") is visually distinct from prose.
8. Questions appear with their difficulty, the kind of question, the prompt, and a note saying
   answering arrives next. **There is no button to tap** — nothing pretends to accept an answer.

### Progress and completion

9. Scroll down. The bar at the top fills as you go.
10. At the bottom, tap **Finish lesson** → a completion screen, with a note that XP and streaks
    are not counting yet.
11. Tap **Back to the module** → the lesson list.

### The paywall boundary — the part that matters

12. In Studio (`http://127.0.0.1:54323`) → `app_config`, set `free_module_count` to `1`.
13. Force-quit and reopen the app. In **Learn**, module 02 now shows a **Premium** badge.
14. Tap module 02. The lesson list still appears, with a banner explaining it is Premium.
    Content is shown, not hidden.
15. Tap a lesson inside it → **"This module is Premium"**, not the lesson.
    This is the one to watch: seeing the lesson content here would mean the server gate failed.
16. Sign out, sign in as `premium@codesprint.test` (password `sprint2026`), and open the same
    lesson. It opens.
17. Set `free_module_count` back to `6`.

### Robustness

18. Stop Supabase and open a lesson: an error with **Try again**, not a blank screen.
19. In Studio set `lessons.is_active = false` for one lesson, reopen the app, and open it from a
    stale list → **"Lesson not found"**, distinct from the Premium message.
20. Rotate the device / use large text: code blocks scroll horizontally rather than wrapping,
    and no text clips.
21. Dark mode: syntax colours stay readable and callouts remain distinguishable.
22. With a screen reader on, a callout announces its kind ("Common mistake") before its text.

---

## Phase 8 device test checklist

Use a **fresh guest** so every question is a first attempt. The dev accounts have history from
earlier checks.

### Every type, answered

1. Open **Getting Started → What is Python?**. The lesson now moves page by page: a run of
   explanation, then **Continue**, then a question on its own page with the progress bar
   advancing per page.
2. **True/false** — tap True, tap **Check**. Green "Correct!", the explanation, "+5 XP", and a
   short vibration. Tap **Continue**.
3. **Multiple choice** — deliberately pick a wrong option. Red "Not quite", the explanation, the
   **hint**, the correct option marked with a check and yours with a cross. No XP. No "try
   again" button: one attempt per question inside a lesson.
4. **Predict output (typed)** — type `Python` with a space before it. Correct: whitespace is
   forgiven. On another run, type `python` in lower case: wrong, and the expected output is
   shown underneath.
5. **Multiple select** — pick two of the three correct options. Wrong (all-or-nothing); the
   missed one is marked "correct answer, not chosen".
6. Continue to **Showing output with print**: **predict output (choice)** offers outputs in
   monospace; **fill the blank** fills the blank live in the code as you tap a token;
   **code ordering** — tap lines into "Your program", tap a placed line to remove it; Check is
   disabled until every line is placed.
7. **Comments** lesson: **debugging** — tap the commented-out line. Correct; the line is marked.
8. **Reading an error message**: **concept matching** — tap a concept, then a definition. The
   pair gets a number on both sides; tap the concept again to undo. Check enables only when all
   three are paired.
9. Finish the lesson: the completion screen shows "N of M correct on the first try" and the
   XP total, and says lesson-completion XP and streaks are not counting yet.

### The rules, from the database side

10. In Studio, `xp_events` has one row per correct answer for your user, `source_type =
'question'`, and `user_stats.xp_total` equals their sum.
11. Reopen the same lesson and answer a question you got right before. "Correct!" but **0 XP**
    — and still one ledger row for it.
12. `user_question_attempts` shows every submission, right and wrong, with `attempt_no`
    increasing per question.

### Robustness — the part that matters

13. Choose an answer, **turn off Wi-Fi and mobile data**, tap Check. An error line appears,
    **your selection is still there**, and Check is available again. In Studio, no attempt row
    was created — the server never saw it.
14. Turn the network back on, tap Check: graded normally, exactly one attempt row.
15. Tap Check and immediately tap it again: it is disabled while pending. One attempt row.
16. On the keyboard, type `‘Python’` with the phone's curly quotes: the server straightens them
    (you will see this is _still_ wrong, because the quotes themselves are wrong — the point is
    that a bare `Python` typed with an "improved" apostrophe elsewhere is not penalised).

### Accessibility

17. With a screen reader on, before checking: each option announces as a radio button (or
    checkbox) with its selected state. After checking: the correct option announces "Correct
    answer, chosen" / "not chosen", yours "Your answer, incorrect".
18. Ordering: a placed line announces "Line 2: height = 5. Tap to remove."; a bank line
    announces "... Tap to add."
19. Matching: a paired concept announces "SyntaxError matched with ... Tap to undo."
20. Large text and dark mode: code lines scroll horizontally rather than wrapping; markings are
    distinguishable by icon, not only colour.

---

## Phase 9 device test checklist

Use a **fresh guest**: the point is to watch numbers move from zero.

### XP moves, visibly

1. Continue as guest. **Home** shows a level ring at **Level 1** and **0 XP**.
2. Open **Learn → Getting Started → What is Python?** and answer all five questions correctly.
   Each feedback panel shows the XP it earned.
3. Finish the lesson. The completion screen shows **5 of 5 correct on the first try**, the XP
   total including the +20 for completing, and **"Perfect lesson"**.
4. Go back to Home. The ring now reads **Level 1, 50 XP**, and the bar towards level 2 has
   moved. It updates without restarting the app.
5. Complete a second lesson to cross 100 XP: the ring flips to **Level 2** and the bar resets
   near the start.

### It pays once

6. Reopen the same lesson and walk to the end again. The completion screen shows **no XP**
   (or only XP from questions you had not answered before).
7. In Studio (`http://127.0.0.1:54323`), `xp_events` holds **one** row with
   `source_type = 'lesson'` per lesson, and `user_stats.xp_total` equals the sum of all rows.
8. `user_lesson_progress.completed_at` for that lesson has **not** changed.

### The Progress screen

9. From Home or Profile, tap **See your progress**.
10. Level and XP match Home. The four numbers — lessons, questions, accuracy, streak — match
    what you did. Accuracy is correct ÷ answered, so a wrong answer lowers it.
11. **Course completion** reads "N of 8 lessons". Modules show their own bars, Premium ones
    with a padlock.
12. **Skill areas** lists tags with a bar each. Areas you have not reached read 0%.
13. As a free user, the skills card ends with the Premium explanation and **no per-skill
    accuracy numbers**.
14. Sign in as `premium@codesprint.test` (`sprint2026`) and reopen Progress: the skill rows now
    carry "N of M attempts correct".

### The rules, checked in the database

15. Set `free_module_count` to `1` in `app_config`, reopen Progress: **course completion total
    drops to 4** — a free learner is measured against what they can reach, not the whole
    catalogue. Set it back to `6`.
16. In `user_daily_activity` there is one row for today with your lessons, questions and XP.
17. Change `profiles.timezone` to `Pacific/Auckland` for your user, answer one more question,
    and a **second row** appears on Auckland's date. (Set it back afterwards.)

### Robustness

18. Stop Supabase and open Progress: an error state with **Try again**, not a blank screen.
19. Finish a lesson with the network off: the completion screen still appears, and the XP line
    shows only what was already graded. Reconnect, reopen the lesson and finish it — the
    completion is recorded then, and still only pays once.
20. Large text and dark mode: the level ring, the four stat tiles and the skill bars stay
    legible and nothing clips.
21. With a screen reader on, each stat tile announces "Accuracy: 80%" as one phrase rather than
    an icon and a number separately.

---

## Phase 10 device test checklist

Use a **fresh guest**. Most of this is about watching numbers that only move once.

### The streak

1. Continue as guest. Home shows **no streak** — nothing has qualified yet.
2. Answer four questions and stop. Still no streak: the bar is five questions **or** one
   lesson.
3. Answer a fifth. The streak becomes **1** and the flame appears on Home.
4. Answer more in the same session. The streak stays at **1** — a day counts once.
5. In Studio (`http://127.0.0.1:54323`), `user_daily_activity` shows today with
   `qualified = true`.
6. Set `user_stats.last_qualifying_date` back by **one** day and reopen the app: the streak is
   still shown. Set it back by **three** days: it reads **0**, with nothing having run
   overnight. `longest_streak` is unchanged — it is a record.

### Lives

7. As a new guest, answer a question **wrong**. You keep all five hearts: the first three
   lessons are a grace period.
8. In Studio set `user_stats.lessons_completed` to `3`, then answer wrong again. A heart is
   lost and a countdown appears next to it.
9. Keep answering wrong until you reach zero. Lives never go negative.
10. Set `lives_updated_at` back by **9 hours**. Reopen the app: **two** hearts have returned
    (one per four-hour interval), and the countdown reflects the remaining part of the third.
11. Sign in as `premium@codesprint.test` (`sprint2026`) and answer wrong: the hearts are
    replaced by an **infinity** symbol and nothing is ever taken.

### Achievements — the unlock animation

12. As a fresh guest, answer all five questions of **What is Python?** correctly, then finish.
13. On the completion screen, **two achievement cards animate in**: _First Lesson_ and
    _Perfect Lesson_, each with its XP.
14. With the OS **reduce-motion** setting on, repeat: the cards appear in their final state
    immediately rather than animating faster.
15. With a **screen reader** on, the unlock is spoken — "Achievement unlocked: First Lesson".
16. Open **Progress**. The achievements section reads "2 of 13 unlocked", the two earned ones
    are highlighted, and the other eleven are listed, dimmed, with their real names and
    descriptions.
17. In Studio, `xp_events` has rows with `source_type = 'achievement'` — the reward went
    through the ledger like everything else.
18. Redo the same lesson. **Nothing unlocks again** and no further achievement XP appears.

### Robustness and accessibility

19. Stop Supabase and open Progress: an error state with **Try again**, not a blank screen.
20. With a screen reader, the hearts announce as one phrase — "3 lives of 5. Next life in 2
    hours." — rather than five separate icons.
21. Large text and dark mode: the level card, the hearts row and the achievement list stay
    legible and nothing clips.

---

## Phase 11 device test checklist

Use a **fresh guest**: half of this is about what a brand-new learner sees.

### Home, from empty to full

1. Continue as guest. Home greets you with **"Ready to start?"** and the primary card reads
   **Start your first lesson** — not "Continue" next to a row of zeroes.
2. Today's goal shows **0 / 30 XP**. Course progress reads 0 of 8. The review button is
   disabled, with "Nothing to review".
3. Tap **Start** and finish the lesson, getting **one question wrong** on purpose.
4. Back on Home: the greeting is **"Welcome back"**, the next lesson has moved to _Showing
   output with print_, the goal bar is full and says the goal is met, and the review card now
   offers **1 question to revisit**.

### Practice

5. Tap **Practice**. The question you got wrong appears, with the same renderer, Check button
   and feedback panel as in the lesson.
6. Answer it **correctly**. The feedback shows **+2 XP** — the flat practice rate, not the
   lesson rate for that difficulty.
7. Finish the set. The summary shows your score and the XP earned.
8. Back on Home, the review card reads **"Nothing to review"** — getting it right cleared it.
9. Tap **Mixed practice**: questions from lessons you have finished, in a fresh order each
   time you open it.
10. In Studio, set `app_config.xp_practice_daily_cap` to `2`, then practise two more correct
    answers: the first pays, the second pays **0**. The answers still count towards the
    streak. Set the cap back to `40`.

### The Daily Challenge

11. On Home the challenge card shows **+25 XP** and a **Start challenge** button.
12. Open it: **three** questions.
13. Leave without finishing, then reopen: it is still claimable, and it is **the same three
    questions** — the pick is deterministic for the date.
14. Finish all three, then tap **Claim your bonus**: **+25 XP**, and the streak line updates.
15. Tap back into the challenge: it now says **"Already done today"** before showing any
    questions.
16. Home shows the challenge card as **Done for today**, disabled.
17. In Studio, `user_daily_challenge_claims` has exactly **one** row for you, and `xp_events`
    exactly one row with `source_type = 'challenge'`.

### The rules

18. In Studio set `free_module_count` to `1`. Reopen Home: course progress counts only the
    four reachable lessons. Open Mixed practice: **no question comes from module 2**. Set it
    back to `6`.
19. Sign in as `premium@codesprint.test` (`sprint2026`), finish a lesson, then open Practice:
    the **Hard set** option works. As a free learner it shows the Premium explanation instead.

### Robustness

20. Stop Supabase and open Home: an error state with **Try again**, not a blank screen or a
    half-empty layout.
21. Lose your lives (answer wrong repeatedly after the grace), then practise: the hearts show
    on the question screen and the wait is explained.
22. Large text and dark mode: every Home card stays legible, and nothing clips.

---

## Phase 12 device test checklist

Sign in as **free@codesprint.test** (password `sprint2026`). The seed puts 60 fixture learners
on this week's board, so there is a real ranking to look at — and you start below the top 50,
which is the only way to see the neighbour slice.

### The ranking

1. Open the **Leaderboard** tab. The list loads with **Sprinter 01** at the top on 1,496 XP,
   medals on the first three, and 50 rows.
2. Pull down to refresh. The list reloads without flashing an empty state.
3. Finish a lesson, then come back. Your own row appears, **outlined and labelled "You"**, in
   the lower group — with a line above it saying how many learners are in between.
4. Scroll. The highlight and the "… in between" marker survive scrolling; there are no
   duplicated names where the two groups meet.

### Your name

5. The header card says **"Choose a display name"**. Tap it.
6. Type `ad` → _"A bit longer, please — at least 3 characters."_ appears as you type, with an
   icon, not colour alone.
7. Type `Ana<b>` → _"Use letters, numbers, spaces, and . \_ - only."_
8. Type `admin` → nothing locally, but **Save** returns _"That name is reserved."_ — the
   blocklist is on the server.
9. Type `Sprinter 07` → _"Someone already has that name."_
10. Type `Ana Mărioară` → saves. Romanian diacritics are a name, not an invalid character.
11. Go back to the Leaderboard. You are now ranked, under that name.

### Hide me from the leaderboard

12. **Profile** → the Leaderboard card shows your avatar, your name and the toggle.
13. Turn **"Hide me from the leaderboard"** on. Go to the Leaderboard tab: it now says **"You
    are hidden from the leaderboard"** — and the list is still there to browse.
14. Check your XP and level on Profile: **unchanged**. Hiding costs nothing but the ranking.
15. Turn it back off. Your row returns at the same rank.

### Reporting

16. On any other learner's row, tap the **…** control. The sheet names them.
17. Pick a reason, add a note, send. A toast says thank you and the sheet closes — there is no
    status to check afterwards, by design.
18. Report the same person again. It is accepted quietly; nothing is filed twice.
19. Your own row has **no** … control at all.

### Accessibility

20. Turn the screen reader on (TalkBack / VoiceOver). Swipe through the list: each row reads
    as **one** item — _"Rank 3, Ada Lovelace, 1,240 XP"_ — and your own adds _"This is you."_
21. The … control announces _"Report Ada Lovelace"_, not "button".
22. Turn text size up to the largest setting. Rows grow; the rank, name and XP stay readable
    and nothing is clipped.
23. Switch to dark mode. The highlighted row is still clearly yours.

### Robustness

24. Turn airplane mode on and open the Leaderboard. You get **"Could not load the
    leaderboard"** with a **Try again** button — never a blank screen.
25. Turn it back on and tap Try again. The board loads.
26. Sign out and continue as a **guest**. The Leaderboard says **"Guests are not ranked"** and
    still lets you browse. Profile offers no display name — there is nothing to name.

---

## Phase 13 device test checklist

Two accounts, because half of this is about the Premium boundary: **free@codesprint.test** and
**premium@codesprint.test** (password `sprint2026`).

### The list

1. **Learn** → scroll to the bottom. A **Final Exam** card sits below the modules. Tap **Go to
   exams**.
2. Two exams: the 10-question sample and the 30-question full paper. Each shows its question
   count, its timer (or "No time limit") and its pass mark.
3. As the free learner, the full exam is marked **Premium**, its button is disabled, and it
   says so in words — not just greyed out.

### Sitting the sample exam (free)

4. Tap **Start exam**. Ten questions, one per screen, with **no Check button** and no feedback
   panel anywhere.
5. Answer one, tap **Next**, then **Back**. Your answer is still there.
6. Get to the end. The button reads **Hand in**, and the progress line above says how many of
   the ten you have answered.
7. Hand in. The results page shows a percentage ring, passed or not, and how many you got
   right.
8. If you failed, it tells you **how many more correct answers you needed** — a number, not a
   percentage sum.
9. Tap **Review every question**. Every question is listed with a tick or a cross **and the
   word**, plus the explanation.
10. Go back to the exam list. The sample exam now says **you have used this week's attempt**
    and offers nothing to tap.

### The clock (premium)

11. Sign in as **premium@codesprint.test** and start the **full** exam. A countdown appears at
    the top reading about **45:00**.
12. Answer a few questions, then **force-quit the app**. Reopen it, go back to the exam and
    tap **Resume exam**.
13. It is the **same paper**, the countdown has kept running, and the answers you gave are
    still selected. You open on the first question you had not answered.
14. Answer everything and hand in. The XP line says what you earned.
15. Take it again and score **lower**. The results page shows the lower score, and the XP line
    is **absent** — an exam pays only on improvement.
16. Take it again and score **higher**. The XP is the **difference**, not the whole score.

### Lives and limits

17. Deliberately get several questions wrong in an exam. Check the hearts on Home afterwards:
    **unchanged**. Exams never cost a life.
18. As the free learner, confirm the sample exam is still locked until Monday.

### Accessibility

19. Turn the screen reader on during an exam. The countdown announces **"12:34 remaining"**,
    not a bare number — and it only interrupts you in the last minute.
20. On the results page, "Passed" / "Not passed yet" is spoken, and each reviewed question
    announces **"Question 3, incorrect"** rather than relying on a red icon.
21. Turn text size to the largest setting. The question, the options and the countdown all
    stay readable with nothing clipped.

### Robustness

22. Turn airplane mode on mid-exam and tap **Next** a few times. Nothing breaks, and your
    answers stay on screen.
23. Turn it back on and hand in. The exam submits.
24. Turn airplane mode on and try to open the exam list: **"Could not load the exams"** with a
    **Try again** button, never a blank screen.

---

## Phase 14 device test checklist

**Most of this cannot be done yet.** The sandbox purchase, restore and upgrade all need an
Apple Developer account and a Google Play account, which need the PFA and a D-U-N-S number
(see _Human actions_). What follows is split into what works today and what waits.

### Today, with no store account at all

1. Sign in as **premium@codesprint.test** (`sprint2026`). Every Premium gate is open: all
   modules in Learn, the full exam, hard practice, unlimited lives. That is `user_entitlements`
   doing its job with no RevenueCat anywhere in the picture.
2. Sign in as **free@codesprint.test**. The same screens are locked, with their own
   explanations.
3. Sign in as **noads@codesprint.test**. Content is locked exactly as for Free — No Ads buys
   no lessons. This is the single most misunderstood thing about the tier, so check it.
4. Open the paywall from Profile. It shows **"Could not load the plans"** with a **Try again**
   button. That is correct: there is no store to quote a price, and the app will not invent
   one.
5. Confirm the close control is visible the moment the paywall opens, before anything loads.
6. Read the No Ads card copy once the plans do load (after step 7 below) — it must say it does
   not unlock Premium lessons or unlimited lives.

### Once the store accounts exist

7. Set the RevenueCat keys, create the products, and flip `billing` to
   `RevenueCatBillingService` (`docs/MONETIZATION.md` has the ten steps).
8. Build a **development build** — `npx expo run:android` or an EAS dev build. Expo Go cannot
   load native modules (SPEC §0.1.10), so this is the point where it stops being an option.
9. Open the paywall. Three plans, each with a price **formatted by the store in your own
   currency**, and the annual one showing its per-month equivalent.
10. Buy **No Ads** with a sandbox account. Ads stop. Learn is still locked past module 6.
11. Open the paywall again: No Ads shows as **your current plan**, and Premium offers
    **"Upgrade to Premium"** with the note that it replaces rather than adds.
12. Upgrade. Check the store receipt — you are charged a prorated upgrade, **not twice**.
13. Premium content unlocks **only after the server sync**, not the instant the store returns.
    That is the point: kill the app mid-purchase and reopen it, and the entitlement still
    arrives via the webhook.
14. **Delete and reinstall** the app, sign in, tap **Restore purchases**. Everything comes
    back.
15. Sign in as a _different_ account on the same device. Confirm the subscription does not
    silently follow it — and if it does transfer, that the first account loses access.
16. In Supabase Studio, look at `billing_events`: one row per delivery, each with
    `processed_at` set.
