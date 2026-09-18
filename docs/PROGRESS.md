# CodeSprint — PROGRESS

> Read this first in a new session. It survives context resets.

**Current phase:** Phase 9 complete — awaiting approval for Phase 10 (Streak, lives, achievements).
**Last updated:** 2026-09-17

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
| 10–23 | See `PLAN.md` / SPEC §57             | Not started                           |

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

## Known limitations

- Services other than Config are still no-ops: billing (14), ads (15), analytics and
  monitoring (16), notifications (17), consent (15).
- **Sign in with Apple and Google (D6) are not built.** Both need credentials that do not
  exist yet: an Apple Developer account with the Sign in with Apple capability, and Google
  OAuth client ids. Rather than fake them (SPEC §59.11) the contract and the UI slot are
  ready and the providers are listed under human actions. Email, password and guest are
  complete and fully exercised.
- Email verification and password reset use **Mailpit**, the local inbox, because no domain
  or transactional SMTP exists yet. That is a real integration locally, but production is
  blocked until SMTP is configured.
- No content: the tables exist but are empty until the Phase 6 pipeline seeds them.
- `supabase/seed.sql` does not exist yet, so `db:reset` warns about it. Harmless, and the
  file arrives with the content pipeline.
- Home, Leaderboard and Profile still show honest "ships in Phase N" placeholders. Learn now
  shows real published modules.
- Streaks are stored and displayed but never advance: `user_daily_activity.qualified` is
  written by Phase 10, which decides what makes a day count. The Progress screen says so.
- Lives are not consumed on a wrong answer yet (Phase 10). `submit_answer` takes the context
  that Phase 10 will key lives on, so it slots in without a signature change.
- Achievements are not evaluated (Phase 10), though `is_perfect` and the counters they will
  read are now recorded.
- Home shows XP and level only. The daily goal, the challenge card and the next-lesson CTA
  are Phase 11.
- Practice mode, where a failed question is retried for half XP, is Phase 11. Until then a
  question answered wrong in a lesson has no in-app route to a retry.
- Sounds (SPEC §29) are not wired; haptics are.
- Onboarding does not yet let an intermediate user choose a starting module (SPEC §11):
  there is no content to choose from until Phase 6. Their answer is stored and will drive
  that choice then.
- The reminder time is stored, but nothing is scheduled and no notification permission is
  requested — that is Phase 17.
- Ads consent (Google UMP) is not asked during onboarding. It belongs with the ads
  integration in Phase 15, which must show it before the first ad request.
- Design system exists but is unused by product screens — the tabs still show placeholders
  until Phases 7–13 build the real screens on top of it.
- Lottie animations and `expo-image` are not installed yet; they arrive when a screen needs
  them (achievements in Phase 10, avatars in Phase 12).
- `npm audit` reports **14 moderate** advisories, all inside Expo's own build tooling
  (`@expo/cli` and its `query-string` / `decode-uri-component` / `uuid` / `xcode` chain).
  They are build-time code, not shipped app code, and cannot be resolved without an Expo
  release — `npm audit fix --force` would downgrade Expo itself. Recheck each SDK upgrade.
- **The app has not been run on a physical device yet.** Phase 1 and Phase 2 device checks are
  both outstanding, deferred by agreement. Fonts, contrast, dynamic type and reduce-motion in
  particular can only be verified on hardware.
- GitHub repository not created yet, so CI has never actually run.

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

**Before Phase 10 (the next phase):**

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
