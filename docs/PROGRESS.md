# CodeSprint — PROGRESS

> Read this first in a new session. It survives context resets.

**Current phase:** Phase 23 complete — the last phase in SPEC §57. The store listings (English
and Romanian), the screenshots, and every store form with its answer are ready in the
repository (`docs/STORE.md`). The screenshots surfaced defects that are now fixed — a
sixteen-second answer, unreadable inline code, raw Markdown in 309 explanations, a band under
every header — and one that is flagged: the app icon is still Expo's template. What remains is
human: the icon, accounts, the production project, keys, the content and legal reviews, then
submission — in the order under "Human actions".
Since then (2026-10-10): the password is changed in the app, and the legal pages were reviewed
against Romanian and EU law and translated into Romanian (`docs/LEGAL-REVIEW.md`) — four
decisions there are yours, the minimum age above all.
**Last updated:** 2026-10-10

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
| 14    | Billing, entitlements, paywall       | **Complete** — live on the Test Store |
| 15    | Ads, consent, rewarded rewards       | **Complete** — pending device check   |
| 16    | Analytics + monitoring               | **Complete** — pending device check   |
| 17    | Local notifications                  | **Complete** — pending device check   |
| 20    | Polish, accessibility, performance   | **Complete** — pending device check   |
| —     | Playful 3D restyle (SPEC §8, §13)    | **Complete** — pending device check   |
| 19    | Content to launch volume             | **Complete** — drafts await review    |
| —     | Romanian interface (SPEC §38)        | **Complete** — verified on emulator   |
| 21    | E2E & regression hardening           | **Complete** — see verification       |
| —     | Out of lives, rate limits (decided)  | **Complete**                          |
| 18    | Privacy & legal                      | **Complete** — pages await hosting    |
| 22    | Production builds, TestFlight, Play  | **Complete** — builds await accounts  |
| 23    | Store preparation & submission       | **Complete** — submission is human    |
| —     | Password change, legal review        | **Complete** — decisions await you    |

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

| #   | Decision                 | Value                                 | Notes                                                                                                                |
| --- | ------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| D1  | Guest mode               | ON (default)                          | Approved with the plan                                                                                               |
| D2  | No Ads product           | Monthly subscription €2.99            | Approved with the plan                                                                                               |
| D3  | Annual Premium           | YES                                   | Approved with the plan                                                                                               |
| D4  | Free trial               | None at launch                        | Paywall still renders trial terms dynamically                                                                        |
| D5  | Free boundary            | Modules 1–6 (`free_module_count = 6`) | Config-driven, computed not stored                                                                                   |
| D6  | Social login             | Apple + Google (default stands)       | Not re-raised; revisit before Phase 4 if scope needs trimming                                                        |
| D7  | Analytics                | PostHog Cloud EU                      |                                                                                                                      |
| D8  | Monitoring               | Sentry                                |                                                                                                                      |
| D9  | Python semantics         | 3.12 + latest stable 3.x              | **Resolved** — 3.12.10 and 3.14.4 both present; `py -3.12` / `py -3.14` on Windows                                   |
| D10 | Minimum age              | 13                                    |                                                                                                                      |
| D11 | Personalized ads         | Consent + 16+ only                    |                                                                                                                      |
| D12 | Google Play account type | **Organization**                      | Decided 2026-09-17, reaffirmed 2026-09-20. Exempt from the 12-tester / 14-day closed test. Requires a D-U-N-S number |

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

## Phase 14 follow-up — lifetime No Ads (D2)

A one-time non-consumable No Ads product was added in RevenueCat, which D2 allows as an
alternative to the monthly subscription. Supporting it turned out to be more than a config
entry:

- `roleForPackage` returned null for the unknown package, so `buildPlans` **silently dropped
  it** — the product would simply not have appeared, with no error anywhere.
- `asStoreProducts` mapped every non-annual package to `'monthly'`, so a lifetime product would
  have printed "per month" under a one-off price. Not a cosmetic slip: a false statement about
  what the customer is agreeing to.
- **The important one.** `planState` treated any held `no_ads` as a replaceable subscription,
  so a lifetime owner opening the paywall would have read _"Upgrade to Premium — this replaces
  your current subscription, you are not charged for both."_ That is untrue for a
  non-consumable: they keep it and pay for Premium as well. A new `add-on` state says the
  honest thing instead (SPEC §33).
- `entitlement_state` gained `no_ads_expires_at` and `no_ads_product_id`
  (`20260917121600_lifetime_entitlements.sql`). Null expiry while active means lifetime; that
  one fact is what the paywall branches on. Additive, so nothing existing changed shape.
- `isUpgradeFrom` was deleted. It duplicated what `planState` decides and would have become
  the stale copy of a rule that now has a subtlety in it.
- The "owned" badge reads **"You already have this"** rather than "Your current plan", which
  would be untrue on whichever of the two No Ads products the customer did not buy.

5 new pgTAP tests (483 total), 6 new unit tests (860 total).

## Phase 15 — what was implemented (Ads, consent, rewarded rewards)

**Database** — `20260917121700_rewarded_ads.sql`

- `claim_rewarded_ad(type)`: grants a life or bonus XP for a watched ad, under a per-day cap
  on the learner's **local** date. A refusal writes nothing, so the cap cannot be walked past
  by retrying and a mistake does not cost one of the three daily goes.
- `rewarded_allowance()`: what is still available, read **before** an ad is offered. Making
  somebody sit through thirty seconds of advertising and then refusing the reward is the worst
  possible order of events, and it is entirely avoidable.
- Rewarded XP is awarded with `counts_for_leaderboard => false` — minutes of advertising must
  never outrank minutes of learning (SPEC §19, §26).
- 37 new pgTAP tests (`14_rewarded_ads.test.sql`), 520 in total.

**The policy, as pure functions** — `src/features/ads/logic/`

This is where Phase 15 actually lives. The SDK wrapper holds no opinion; these decide:

- `shouldShowInterstitial` — the beginner grace period, the daily cap, the minimum gap, and a
  30-second quiet period after launch (SPEC §30's "never right after launch", given a number).
- `canRequestAds` — entitlement, kill switch and consent, checked **before loading** rather
  than before showing.
- `decidePersonalization` — minor, UMP consent and iOS ATT, with anything unknown counting as
  "no".
- `shouldRequestAtt` — iOS only, after UMP, once, and never to a minor.

**Services**

- `UmpConsentService` — Google UMP, then ATT, in that order. `debugGeography: EEA` in
  development so the European form can be seen without flying there.
- `GoogleAdService` — `TestIds` from the SDK rather than strings copied from documentation, so
  there is no hardcoded ad unit anywhere in the codebase.
- `AdBanner` in `src/services/ads/` — the only React component allowed to import the SDK, which
  is what the architecture rule caught when the banner first lived in `features/`.

**App**

- Banners on the Learn list and the Leaderboard, **and nowhere else**. `BANNER_PLACEMENTS` is a
  closed list and `BannerSlot` throws in development on anything else.
- The slot takes **no space at all** until an ad has loaded — a reserved empty strip for a
  paying learner, or for one whose ad failed to fill, is worse than the ad.
- An interstitial after the lesson completion screen is dismissed, never before.
- `RewardedLifeCard` when lives hit zero: wait (the countdown is already there), watch an ad,
  or upgrade.
- `web/app-ads.txt`, with the publisher id to replace.

### Phase 15 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --check ......... clean
unit        jest ..................... 59 suites, 898 tests, all passing
database    supabase test db ......... 14 files, 520 pgTAP tests, all passing
migrations  supabase db reset ........ applies cleanly, seed included
bundle      expo export (android) .... succeeds
```

Through the database, as a free learner:

| Step                                   | Result                                         |
| -------------------------------------- | ---------------------------------------------- |
| allowance with full lives              | life **not** offered; bonus XP offered         |
| three rewarded lives                   | 2, 3, 4 — one each                             |
| the fourth                             | `22023 cap_reached`, no grant written          |
| claiming with full lives               | `22023 lives_full` — the daily go is not burnt |
| a Premium learner claiming a life      | `22023 unlimited_lives`                        |
| three rewarded XP grants               | 10 + 10 + 10, exactly the cap                  |
| the fourth                             | refused rather than paying a partial amount    |
| `leaderboard_weekly` after 30 bonus XP | **no row at all**                              |
| yesterday's grants                     | do not count against today's allowance         |
| `ads_enabled = false`                  | rewards refused, and the allowance says so     |

## Decisions and interpretations made during Phase 15

1. **The SDK wrapper holds no policy.** Whether an ad may be shown, whether it may be
   personalized and how often it may interrupt are pure functions with tests. `GoogleAdService`
   loads and shows what it is told to.
2. **"Never right after launch" is 30 seconds.** SPEC §30 gives no number. Long enough that an
   ad is attached to something the learner did rather than to opening the app; short enough not
   to become a fourth de-facto cap.
3. **Anything unknown means non-personalized.** A non-personalized ad earns less; a
   personalized one served without a basis is a regulatory and store-policy problem. The
   asymmetry is not close.
4. **A minor is checked before consent.** A 14-year-old tapping "accept" does not make
   personalised advertising to them lawful (SPEC §41, D11).
5. **`tagForChildDirectedTreatment` is always false.** The product's floor is 13 (D10), so
   there are no under-13 users to tag — claiming otherwise would misdescribe the audience to
   Google. `tagForUnderAgeOfConsent` is what applies, and it follows the age.
6. **The banner slot has zero height until an ad loads.** A reserved empty strip is a worse
   experience than the ad it is reserving space for.
7. **Interstitials are paced in Zustand, not on the server, and it is not persisted.** That
   makes the daily cap a floor rather than a ceiling: force-quitting between lessons could
   exceed four. The alternative costs a round trip on the happiest screen in the product to
   pace an advert, and everything that genuinely must not be gamed — XP, lives, entitlements —
   is already server-side (SPEC §42).
8. **A rewarded refusal writes no grant.** Claiming with full lives does not cost one of the
   three daily goes for a mistake the UI should have prevented.
9. **The allowance is read before the ad, not after.** `rewarded_allowance()` exists for
   exactly this.
10. **Ad units come from the SDK's `TestIds`**, not from strings copied out of Google's docs,
    so they cannot drift and there is no hardcoded unit in the codebase.
11. **`AdBanner` lives in `src/services/ads/`.** A banner has to be rendered, so the SDK
    component has to reach a screen somehow — the architecture rule caught it in `features/`
    and the fix was to move the one SDK touch, not to add an exception.
12. **The native modules are mocked in Jest.** `TurboModuleRegistry.getEnforcing` throws on
    import, which would take out every test reaching the registry. The SDK is not ours to
    verify; the policy around it is, and that is covered.

## Phase 16 — what was implemented (Analytics + monitoring)

No database changes. The whole phase is about what leaves the device, and the most important
part of it is a pure function.

**Keeping personal data out** — `src/features/analytics/logic/sanitize.ts`

SPEC §43 says "no email, names or free-text answers in event properties". That is a rule, and a
rule enforced only by everybody remembering it is one that gets broken once and then sits in a
third party's database for years. So every event passes through `sanitizeProperties`, which
drops:

- any property whose **name** suggests personal data (`email`, `name`, `answer`, `token`, …),
  whatever the value;
- any **value** containing an email address, under any key;
- any string longer than 64 characters — every legitimate property in SPEC §43 is an enum-ish
  token, and prose is where personal data hides;
- any **UUID** used as a property, because the pseudonymous distinct id already links events to
  one learner and a lesson id would tie them more tightly than any KPI needs.

It is **deny by shape, not allow by name**: a per-event allow-list would be stricter but would
block every new property behind a code change, and the pressure to skip the check would
eventually win. `isSafeDistinctId` refuses anything that is not a Supabase user id, because an
email as the distinct id is the one mistake here that deleting a property afterwards cannot
undo.

**Services**

- `PostHogAnalyticsService` — EU host (the SDK default is US, so this is not optional).
  Consent is checked on **every call**, not at startup, so withdrawal takes effect at once.
  Events raised before consent are **dropped, not queued**: a queue that flushed on consent
  would send behaviour from before the learner agreed to it, which is what opt-in exists to
  prevent.
- `SentryMonitoringService` — `sendDefaultPii: false`, request bodies, cookies and headers
  stripped in `beforeSend`, and a last regex pass over messages and exception values. It does
  **not** wait for consent: a crash report is a stack trace, not a behavioural profile, and
  SPEC §41 lists its basis separately for that reason.
- Both are real and wired in. `PRODUCTION_NOOP_ALLOWLIST` is now down to `['notifications']`.

**Instrumentation**

`app_opened`, `onboarding_completed`, `lesson_started`, `lesson_completed`,
`question_answered`, `paywall_viewed` (with its trigger), `purchase_started` /
`_completed` / `_failed` / `_cancelled`, `restore_started` / `_completed`, `exam_started` /
`_completed`, `rewarded_ad_started` / `_completed`, `interstitial_shown`, `consent_updated`.

`useCaptureOnce` exists because a re-render must not produce a second `..._viewed` event and
quietly double a funnel denominator.

**Privacy settings** — a card on Profile with the analytics opt-in and the UMP privacy-options
entry point. Disabled with its reason for a learner under `minor_protection_age`, since the
server forces their consent to false whatever the client sends.

### Phase 16 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --check ......... clean
unit        jest ..................... 60 suites, 930 tests, all passing
database    supabase test db ......... 14 files, 520 pgTAP tests, all passing (unchanged)
bundle      expo export (android) .... succeeds
```

## Decisions and interpretations made during Phase 16

1. **PII protection is a pure function, not a convention.** It is the one thing in this phase
   that cannot be fixed after the fact: an event already sent cannot be un-sent.
2. **Deny by shape, not allow by name.** An allow-list per event would be stricter and would
   rot — every new property would need a code change, and eventually somebody would bypass it.
3. **Events before consent are dropped, not queued.** Flushing a queue the moment consent is
   granted would send behaviour from before the learner agreed to it.
4. **Consent is re-checked on every call**, so withdrawal is immediate rather than effective
   at the next launch.
5. **Monitoring does not wait for consent, analytics does.** A stack trace is not a
   behavioural profile; SPEC §41 treats them separately and so does this.
6. **`profiles.analytics_consent` is the authority, not the SDK's own flag.** The server forces
   it false for a minor, so the client mirrors the profile rather than the other way round.
7. **UUIDs are dropped from properties.** The distinct id already identifies the learner; a
   lesson or question id in a property adds linkage no KPI in SPEC §43 needs.
8. **The Sentry DSN stays optional even in production.** A build without it reports nothing,
   which is worse than having it — but is not a reason to refuse to start. The PostHog key, by
   contrast, is required, because analytics is a shipped feature.
9. **Traces are sampled at 10% in production and 0% elsewhere.** Performance monitoring is the
   part of Sentry that costs money at volume (SPEC §60).

## Phase 17 — what was implemented (Local notifications)

No database changes and no server involvement at all. Every reminder is scheduled on the
device by the device, which is why the feature costs nothing to run (SPEC §60) and keeps
working with no network.

**The policy is pure** — `src/features/notifications/logic/`

`plannedReminders(context)` returns everything that should currently be scheduled, and most
of its tests are the app deciding to say **nothing**. That is the feature: SPEC §48 caps the
day at two notifications, and an app that nags is one that gets its notifications turned off.

- The **daily** reminder fires at the time the learner chose.
- The **streak** reminder fires in the evening, and only when there is something to protect:
  dropped at streak zero, dropped once today's goal is met.
- A daily reminder already late in the day would put the two within two hours of each other —
  one interruption, not two reminders. The streak one is **pushed back** rather than dropped,
  because evening is a common choice for a learning app and dropping it would quietly remove
  the feature for half the users. Past 22:00 it is dropped, which is the one case where
  silence really is better.

`reconcileReminders` then makes the device agree with the plan: cancel everything, schedule
the plan. Idempotent, and it cannot drift — whatever state a crash or an old version left
behind, one pass puts it right.

**The reconciler runs at the root**, not on a screen. It reads the profile (the chosen time)
and Home (today's goal and the streak), both already in the cache, so finishing a lesson
invalidates Home, the plan loses its streak reminder and the device is updated. That is the
whole "cancelled after activity" behaviour from the SPEC §57 device check: no cancel call at
any call site, and none to forget.

**Permission is asked once the learner has chosen a time** (SPEC §11), on Continue in
onboarding, never on launch. Skipping the step asks for nothing — there is no reminder to
deliver, so there is no reason to spend the one prompt the platform allows.

**Settings** (SPEC §29) is a card on Profile: a switch, the five times, and — only for
somebody the OS will no longer prompt — an explanation and a button to system settings.

**Analytics**: `notification_permission_result` (with its source) and `notification_opened`
(with the kind), each raised from exactly one place.

**`PRODUCTION_NOOP_ALLOWLIST` is now empty.** Every service in the registry is real.

### Phase 17 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --check ......... clean
unit        jest ..................... 63 suites, 995 tests, all passing
database    supabase test db ......... unchanged (no migration in this phase)
```

## Decisions and interpretations made during Phase 17

1. **`reminder_time = null` IS the off switch.** No second "notifications enabled" flag, so
   the two can never disagree, and the setting follows the learner to a new phone. It is also
   already how skipping the onboarding step is stored. The cost: switching off and on again in
   a later session picks the default time rather than their old one.
2. **The streak reminder is pushed back, not dropped, when the daily one is close.** Found by
   a test: the first version silently removed the evening reminder for everybody who chose
   18:00-22:00.
3. **Permission carries `canAskAgain`, not just `granted`.** Without it, "never asked" and
   "refused for good" look identical, and somebody who merely skipped the onboarding step
   would be sent to system settings when one tap would have done.
4. **Refusing the OS prompt writes nothing.** A switch left on while the OS delivers nothing
   is the worst outcome here: the learner believes they are being reminded and quietly loses
   their streak.
5. **The destination is resolved when the notification is tapped**, from its kind — not stored
   as a route when it was scheduled. A reminder queued a week ago then still opens the right
   screen after an update that moved a route, and there is no route string from outside to
   validate (SPEC §40).
6. **A reminder that arrives while the app is open is not shown.** "Your 5-minute coding
   session is waiting", on top of the session they are already in, reads as a bug.
7. **The Android channel is `DEFAULT` importance and silent.** A heads-up banner that
   interrupts what somebody is doing is how an app earns a long-press and "turn these off".
8. **The reminder copy travels with each schedule call** rather than being set on the service
   beforehand, so no ordering mistake can bake an empty title into a real notification.
9. **The notification icon reuses the monochrome adaptive layer.** Android draws the icon from
   its alpha channel only; a full-colour app icon arrives as a white square.

## Phase 20 — what was implemented (Polish, accessibility, performance)

No database changes. Three defects were found by measuring things that had only been claimed.

**Contrast is now arithmetic, not a comment** — `src/theme/contrast.ts`

The palettes carried a comment saying they met WCAG AA. Measuring every pair the app actually
renders found three that did not, all in the light theme:

- `success` on `successSurface` was **4.39:1** — under AA for the label inside a success
  badge, which is exactly where that pair is used. Darkened to 5.8:1.
- the **streak** and **xp** badge labels were **3.1:1** and **4.35:1**. The fix was not a
  darker orange — an orange dark enough to read as a word is no longer an orange. `Badge` now
  colours the label and the icon separately: the flame keeps the accent (a graphic needs 3:1,
  WCAG 1.4.11) and the label takes a colour that can be read (4.5:1, 1.4.3).
- a text field's outline was **1.25:1** against the surface. A field is identified by its
  outline and nothing else, which makes it a user interface component under 1.4.11 — so there
  is now a separate `borderStrong` at 3.3:1 for controls, while cards keep the light
  decorative edge.

76 assertions cover it, in both themes, including every syntax colour on the code surface.

**Two touch and text fixes**

- The leaderboard's report button was 44×44 — the iOS minimum, missing Android's 48dp. It now
  comes from the theme token, which is the larger of the two.
- A module's number sat in a fixed 32×32 box. It is text, so it grew with the OS font size and
  clipped "01" to "0" at the larger accessibility sizes. Minimum size and padding instead.

**A paying customer was shown as free for the first minute after every launch**

`useEntitlements` and `useAppConfig` both supply placeholder data so no screen has to branch
on `undefined`. TanStack treats `initialData` as _freshly fetched_, so with a `staleTime` it
skipped the request entirely — 60 seconds for entitlements, 5 minutes for remote config,
including `min_supported_app_version`. `initialDataUpdatedAt: 0` marks the placeholder as
already stale: render it now, fetch immediately. Access control was never affected — it is
server-side — but the paywall was offering plans to people who already owned them.

**Manage subscription sent Android customers to Apple**

The URL was a hardcoded Apple link in a translation file. It now comes from RevenueCat's
`managementURL`, which is right for the store the purchase was actually made in, with the
platform's own subscriptions page as the fallback and no button at all when there is nowhere
to send them. An app that makes cancelling hard gets a chargeback rather than a cancellation.

**Settings, finished** (SPEC §29)

Profile no longer ends in a placeholder. It carries subscription status (from the **server's**
entitlements, so a purchase made on another device shows up), restore purchases — reachable
without walking through an offer — manage subscription, reminders, theme, vibration, privacy,
leaderboard visibility and the version line support asks for.

Theme and vibration now **persist**, which they never did: they are read before the first
frame, so a stored dark theme is not a flash of white.

**Performance**

- The exam review rendered all 30 questions at once, most with a code snippet, which meant
  running the syntax highlighter thirty times before the first frame — on the screen that
  appears the moment somebody finishes an exam. It is a windowed list now.
- Lesson payloads have a **50 KB budget** (SPEC §45), enforced by `content:validate` and
  reported by the test suite, so Phase 19 sees the headroom shrinking rather than discovering
  it gone. The largest lesson today is well inside it.

**Removed:** `PlaceholderState`, the "ships in a later phase" component. Its last user was the
Profile screen, and there is nothing left to promise.

### Phase 20 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --check ......... clean
unit        jest ..................... 68 suites, 1099 tests, all passing
content     content:validate ......... valid, and now inside the payload budget
database    supabase test db ......... unchanged (no migration in this phase)
bundle      expo export (android) .... succeeds
```

## Decisions and interpretations made during Phase 20

1. **Contrast is a test, not a claim.** A colour nudged half a shade for looks is exactly the
   change nobody re-measures, so the palette now fails the build instead of a user.
2. **A label and an icon in the same badge may be different colours.** WCAG asks 4.5:1 of text
   and 3:1 of a graphic; forcing one colour to satisfy both would have cost the brand accents.
3. **`borderStrong` is separate from `border`.** Putting a 3:1 outline round every card would
   make the whole app look boxed in; only controls that are identified by their outline need
   it.
4. **Device settings stay on the device.** Theme and vibration are not synced to `profiles`: a
   tablet in dark mode and a phone in light mode is a preference, not a conflict.
5. **No sound in V1.** SPEC §29 lists a sound setting, and `expo-audio` is in the stack, but
   there are no audio assets and inventing them is not a code decision. A switch for something
   that does not happen is worse than no switch, so the setting is absent rather than dead —
   see the human actions below.
6. **The version line carries the build number**, falling back to the environment name. Two
   TestFlight builds share a version and differ only in the build, which is the one thing
   support needs.
7. **A Premium subscriber is offered nothing.** There is nothing above Premium, and an upgrade
   button that leads to what they already own reads as a billing error.
8. **Restore purchases lives in Settings as well as the paywall.** Somebody reinstalling has
   already paid; making them look at an offer first to get their own purchase back is the kind
   of thing that ends in a support email.

## Restyle — playful 3D gamified UI (SPEC §8, §13)

Not a numbered phase. SPEC §8 and §13 were rewritten on 2026-09-20 from "modern, polished,
minimal" to a vibrant, physical, gamified direction, which made the Phase 2 design system and
the Phase 11 Home screen non-conformant. This is the work that closed that gap, taken before
Phase 19 deliberately: authoring 300 questions against a design that is about to change means
re-checking every lesson layout twice.

No database changes. No behaviour changes — every route, query and RPC is untouched.

**The one idea: two boxes, not a blur** — `src/theme/tokens.ts`

Everything raised in the app is now drawn as a `Deep`-coloured **rim** with the real **face**
on top of it, offset by `depth.press`. Pressing translates the face down by exactly that
number, so the rim is swallowed and the object looks pushed into the page. The container
reserves the rim as padding, so pressing a button never moves anything around it.

The travel is **instant, not animated**. A key does not ease into its own keycap, and 150 ms
of spring on the way down is the difference between mechanical and laggy. It also means there
is no animation to suppress under reduce-motion: a press is a state change, which SPEC §47
exempts, not a decorative transition.

`Button`, `Card`, `IconButton` and `RewardCoin` all share it.

**A palette that separates paint from ink** — `src/theme/colors.ts`

The whole risk of a saturated style is that saturated colour cannot carry small text: a
golden-yellow dark enough to read as a word has stopped being golden. So every colour now
declares which job it has. Tokens ending in `Fill`, `Glow` or `Deep`, and the gamification
accents, are **paint** — held to 3:1 (WCAG 1.4.11). Everything else may end up under a word
and is held to 4.5:1 (1.4.3).

That let the primary be a genuine cobalt (`#1C5FF5`) rather than a compromise: 5.2:1 against
white in **both** directions, so the same blue works as a button fill under white text and as
a link on a white card. A brighter sky blue can do neither.

New tokens: `challenge` (the Daily Challenge needs its own heat — two blue buttons of equal
weight on one screen read as the same action twice), `successFill`, `surfaceDeep`, `xpGlow`,
`onGold`, and per-theme `*Pressed` shades.

**The contrast test caught a real defect, again**

Reusing the light theme's pressed shades in dark mode put **dark ink on a dark held button**:
`textInverse` on `dangerDeep` measured **1.92:1**. The failure only exists while a finger is
down, which is exactly the state nobody screenshots. Dark mode now presses _lighter_, the same
direction `primaryPressed` always went there, and the pressed state of every variant is
asserted.

**Icons are drawn, and prove they are visible** — `src/components/ui/GameIcon.tsx`

Six cartoony icons (flame, heart, coin, bolt, star, trophy) built as SVG: a saturated face, a
darker rim, and a white glint always in the upper left, because a shape lit from two
directions looks flat. Deliberately **not emoji** — emoji render as a different picture on
every OS version, are announced literally by screen readers, and cannot be recoloured for dark
mode.

Their colour policy is exported as token _names_, so the contrast test can assert the rule
they actually rely on: in every theme, at least one of face or rim clears 3:1 against every
surface the icon lands on. Which one does the work flips with the theme — the rim in light,
the face in dark — and requiring both would have banned the bright faces the style is made of.

**Nunito replaces Inter**, and `typography.score` (Nunito Black, 34pt) exists for numbers that
are meant to feel earned. Inter was uninstalled rather than left in the bundle. Nunito covers
Latin Extended-A, so SPEC §38's Romanian comma-below diacritics exist — still to be confirmed
visually when the locale ships.

**Home, rebuilt** — `src/features/home/components/`

Header with the greeting and three round toggles; `PlayerCard` (level in a solid puck, XP as a
score, streak, lives as draining hearts); `GoalCard` that turns gold when the goal is met;
`NextLessonCard` with the largest button in the app; `ChallengeCard` in orange with the reward
as a physical coin. Then course progress and practice.

The order is the argument: who you are, how today is going, the one thing to do now, the extra
thing, then the slower context. Nothing below the challenge has to be read to start.

**Wireframe icons are gone.** 37 files swept from `-outline` to filled. Three names were
protected and commented in place — `ellipse-outline`, `square-outline` and `heart-outline` are
the _empty_ states of a radio, a checkbox and a spent life, and filling them would tell the
learner they had already chosen something.

**Native colour updated too.** `app.config.ts` carried the old palette in the splash, the
adaptive icon and the notification tint. Those are evaluated by the Expo CLI at build time and
cannot read the theme, so they are duplicated by hand with a comment saying so — otherwise the
first thing a user sees is the old white flashing into the new cream.

### Restyle verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --write ......... clean
unit        jest ..................... 70 suites, 1170 tests, all passing
contrast    118 assertions ........... both themes, including every pressed state
bundle      expo export (android) .... succeeds, fonts bundled
database    supabase test db ......... unchanged (no migration)
```

## Decisions and interpretations made during the restyle

1. **The rim is a hard offset, never a blur.** A blurred shadow says "floating above"; an
   offset says "solid, with a side". Mixing the two in one app reads as two design systems.
2. **The press does not animate.** See above — and it removes the only place this style would
   have had to negotiate with reduce-motion.
3. **Progress fills are exempt from 3:1, and the test says why.** A fill bright enough for this
   style cannot reach 3:1 against any track light enough to sit on a white card; that is
   arithmetic. What 1.4.11 requires is that the _component_ be identifiable, which the track's
   `borderStrong` outline does at 3.7:1, and the value is never colour-only — every bar in the
   app renders a text label and exposes `accessibilityValue`.
4. **`onGold` does not flip with the theme.** It is ink for text drawn on a coin, and the coin
   is bright in both themes. It is deliberately not reused on `warningSurface`, which does
   flip.
5. **Button labels are uppercased visually, never in the accessibility label.** The face uses
   `textTransform`; the label keeps its own casing, so a screen reader does not spell it out.
6. **The language toggle ships hidden.** SPEC §29 and §38 keep language hidden until a second
   locale exists, and `showLanguageToggle` derives that from the shipped i18n resources rather
   than a flag — so it appears the day Romanian lands, already sized into the layout, instead
   of a release later.
7. **The greeting has a name-free form.** Guest mode is on by default (D1), so "Hello !" would
   have been the first thing most new users read. Two i18n keys, not one key with an empty
   interpolation.
8. **Lives drain rather than disappear.** A row that shrinks tells you how many you have; a row
   that drains tells you how many you have _lost_, which is what the system is for.
9. **Home hides the navigator's header.** It draws its own with the greeting and the toggles,
   so the built-in one was the word "Home" twice.

## Hosted staging (SPEC §6) — live since 2026-09-23

Not a numbered phase. A backend the app can reach from any network, so a preview build works
on a phone that is not on the developer's Wi-Fi — which is what a demo, a tester, and Phase 22
all need.

|           |                                                                                          |
| --------- | ---------------------------------------------------------------------------------------- |
| Project   | `uzmqmmvpunkxogvtbypl`, Supabase free plan                                               |
| Region    | `eu-central-1` (Frankfurt) — EU residency, SPEC §41                                      |
| Schema    | all 18 migrations, applied with `supabase db push` via the session pooler                |
| Content   | `content_version` 1 — 2 modules, 8 lessons, 40 questions, 2 exams, via `content:publish` |
| Auth      | anonymous sign-in **on** (D1); email uses Supabase's built-in sender                     |
| App build | `preview` profile, pinned to the EAS `preview` environment in `eas.json`                 |

Credentials live only in `.env.staging`, which is gitignored and excluded from the EAS archive
(checked). The EAS `preview` environment holds the two PUBLIC values and nothing else.

**What was deliberately left out**

1. **`seed.sql` was not run.** Besides content it creates three test accounts whose password is
   written in the repository, one of them with a Premium fixture. On a project reachable from
   the internet that is a free Premium login for anyone who has seen the repo. Content went
   through `content:publish` instead, which is the pipeline production will use anyway.
2. **No RevenueCat key in `preview`.** The SDK warns that it crashes when a Test Store key is
   used "in production", and a preview APK is a release build. With no key, `initialize()`
   throws, `useBillingBootstrap` catches it, and the paywall shows its load-error state with a
   retry — honest, and not a crash. Real store keys arrive with the store accounts.
3. **Edge Functions are not deployed.** `sync-entitlements` and `revenuecat-webhook` need a
   Supabase access token to deploy and RevenueCat secrets to run. Without them nothing breaks;
   server-side entitlements simply never change on staging.

**Verified from the outside, with only the publishable key** — the way the app sees it:

```
PASS guest sign-in works
PASS app_config readable (44 keys)
PASS sync_session
PASS get_home_summary returns a next lesson ("What is Python?")
PASS get_lesson opens the first lesson
PASS lesson payload carries no answer keys
PASS answer keys are NOT readable by a client        (403)
PASS questions table not directly readable           (403)
PASS client cannot grant itself Premium              (403)
```

**Re-publishing content to staging**

```
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run content:publish
```

Both values are in `.env.staging`. Schema changes go through `supabase db push --db-url` with
the pooler URL from the same file — never by editing an applied migration (SPEC §59.28).

## Phase 19 — what was implemented (Content to launch volume)

**Seventeen modules, as SPEC §14 lays them out.** Modules 03–17 are new; 01–02 were the
development seed.

```
                 SPEC §35 launch target    now
modules          17                         17
lessons          60–100                     76
questions        300–500                    435   (all 8 types, every module mixes difficulty)
exam pool        ≥ 60                       433
challenge pool   ≥ 60                       434
```

Every runnable code block and every `predict_output`, `code_ordering` and `debugging`
question — 443 snippets — runs on Python 3.12 **and** 3.14 and prints exactly what the
content claims. The debugging questions are proven both ways: the broken code really fails
or prints the wrong thing, and the fix really prints the stated output.

**All 395 new questions are `review_status: draft`.** SPEC §35 is explicit that nothing ships
without human review, so none of it is marked reviewed. `publish.ts --production` would
publish only the reviewed 40; staging carries everything, so the drafts can be read in the
real app. That review is now the longest item between here and a store build.

**Verified on hardware, against staging.** A second preview build was installed on the
emulator and walked through as a new guest: consent, onboarding, Home, a lesson, and the
Learn list showing all seventeen modules with 07–17 locked as Premium (D5) and Google's test
banner in the list (SPEC §59.31).

**What determinism cost, and where**

Output that differs between interpreters or between runs cannot be verified, so the content
avoids it on purpose:

- **Sets are printed through `sorted()`.** The iteration order of a set of strings changes
  between runs.
- **Exception handlers print the content's own message**, never Python's error text, which is
  not promised to stay the same across versions.
- **Nothing asks a learner to predict a random value.** The `random` lessons print properties
  that hold for every outcome — a roll is between 1 and 6, a shuffle keeps the same sum.
- **Dates are fixed**, never `date.today()`.
- **No object is printed without a `__str__`.** The default representation contains a memory
  address.
- **File lessons create the files they read**, so each snippet runs alone in the verifier's
  temporary directory.

**The validator learned four rules, three of them from real defects**

Writing 400 questions is exactly the volume at which "caught by eye" stops working. Each rule
below was added before or during the phase, and each is proven by a test that plants the
fault in a copy of the real content and asserts the rule names it
(`validateRules.test.ts`).

1. **Every answer must point at something the learner can pick** (`answerRefs.ts`). The schema
   checked an answer's shape, never what it referred to: a `multiple_choice` with a typo in
   its `option_id`, a `code_ordering` missing a line, or a choice-style `predict_output` whose
   right option differs from `answer.value` by one space would all publish and then be graded
   wrong for every correct learner. The last check reproduces the server's
   `normalize_answer_text` exactly, because that is what grading compares.
2. **No Markdown lists or headings in lesson text.** The renderer does bold, inline code and
   paragraphs only. This found a **shipped defect**: "Reading an error message", a reviewed
   seed lesson, introduced three exception types as a bulleted list that every learner had
   been seeing as one run-on line with dashes in it.
3. **A code block that shows an output must be runnable.** A non-runnable block with an output
   shows learners whatever the author typed. One slipped into the draft of module 17 — a
   nested loop shown printing `10 10000` instead of `100 10000`, marked non-runnable, so the
   verifier would never have run it. Caught before commit.
4. **"Reviewed in full" became the rule SPEC §35 actually sets.** The old test demanded every
   question be reviewed, which drafted content can never satisfy without lying. It now checks
   that the reviewed part alone is still a publishable course, and that no reviewed question is
   stranded inside a draft lesson where it would never ship.

**Two defects found by running the release-like build, both fixed**

- **The onboarding reminder step showed raw translation keys** — "00.label" five times. Since
  Phase 17 the times are `HH:MM`, and i18next splits keys on `:` to find a namespace, so
  `reminder.options.08:00.label` looked up `00.label` in a namespace called
  `reminder.options.08`. The resource tests passed throughout because the keys existed in the
  JSON; nothing checked that the key the screen built could reach them. Every onboarding option
  key now goes through `optionKey()`, which strips both characters i18next splits on, and a
  test resolves every option of all four questions through the real i18n instance.
- **The tab bar sat under Android's gesture bar.** The restyle gave it a fixed height, which
  replaces the one React Navigation computes — the one that included the bottom safe area.

Both were invisible in Jest and in the dev client over Metro, and both were found in minutes
on the preview APK. That is an argument for making a preview build part of every phase's
device check from now on.

### Phase 19 verification results

```
typecheck   tsc --noEmit ............. 0 errors
lint        eslint --max-warnings=0 .. 0 errors, 0 warnings
format      prettier --check ......... clean
unit        jest ..................... 73 suites, 1210 tests, all passing
content     content:validate ......... valid — 17 modules, 76 lessons, 435 questions
python      content:verify ........... 443 snippets, identical on 3.12 and 3.14
staging     content:publish .......... content_version 4, all 17 modules live
device      preview APK on emulator .. onboarding, Home, lesson, Learn with Premium locks
database    supabase test db ......... unchanged (no migration in this phase)
```

## Decisions and interpretations made during Phase 19

1. **Drafts stay drafts.** I wrote the content, so I cannot also be its reviewer. Marking it
   reviewed to satisfy a test would have been the test lying.
2. **Four to five lessons per module, five to six questions per lesson.** That lands at 76
   lessons and 435 questions — inside both SPEC ranges with room either way — and keeps every
   lesson inside SPEC §15's 3–8 minutes.
3. **Difficulty is roughly 35% easy, 45% medium, 20% hard in every module.** The validator
   only requires some easy, some medium and nothing above 75% of one kind; the rest is a
   choice, and hard questions are where the traps live (`-2 ** 2`, `"10" < "9"`, `find()`
   returning 0, a stable sort).
4. **`code_ordering` never uses indented lines.** The renderer and the verifier both join lines
   in answer order, and leading spaces are the easiest thing to lose on the way. Every ordering
   question is a chain in which each line needs the one before, so exactly one order works.
5. **Debugging distractors are checked for accidentally being right.** Twice an option would
   also have fixed the stated symptom (swapping the grade letters; printing instead of
   returning); the prompts now state the full rule so only one change satisfies it.
6. **`lambda` is not introduced.** Sorting by a key uses a named function. One more syntax on
   the last module was not worth what it adds for a beginner.

## Romanian interface (SPEC §29, §38) — added 2026-09-23

Asked for outside the phase plan ("mi-ai adăugat și limba română/engleză?"). Scope chosen by
the user: **the interface in Romanian; lessons stay English for now.**

- **All 18 namespaces translated** (`src/i18n/locales/ro/`, 592 strings). Informal "tu",
  comma-below ș/ț only, Romanian plural forms (`one` / `few` / `other`: "1 zi", "3 zile",
  "20 de zile").
- **Language preference** in `settingsStore`: `system` (follows the phone), `en` or `ro`.
  Stored on the device, like the theme — it belongs to the phone, not the account. Applied
  during `hydrate()`, before the splash lifts, so the first frame is already in the right
  language. A stored locale this build no longer ships falls back to `system`.
- **Home**: the EN/RO toggle that SPEC §13 kept hidden "until a second locale ships" is now
  visible. **Profile**: a Language card (phone language / English / Română), each language
  named in itself, and a note that lessons are English for now — shown only while the
  interface is not English.
- **Query keys carry the locale** for Home, Practice and the Daily Challenge, so switching
  refetches in the new language instead of showing the old cache.
- **Plural rules on Hermes** (`src/i18n/pluralRules.ts`). Hermes has no `Intl.PluralRules`,
  so i18next fell back to `one`/`other` and the phone said "0 de zile" and "4 de lecții". The
  FormatJS polyfill installs itself only where the engine lacks the rules, with data for `en`
  and `ro` only. Found on the emulator — Jest runs on Node, whose `Intl` is complete.

### Verification

- `npm run verify`: typecheck clean, lint clean (0 warnings), **75 suites / 1284 tests**.
- New tests: locale parity (every key, `{{variable}}` and plural category of English exists in
  Romanian, and nothing extra), no cedilla ş/ţ, language-preference parsing and storage, the
  Language card, the Home toggle, and `pluralRules.test.ts`, which removes
  `Intl.PluralRules` to stand in for Hermes and proves both the failure and the fix.
  Deleting the `ro` data import makes two of its tests fail.
- Emulator (dev build against staging): onboarding → Home in English; the toggle switches
  every visible string at once; "0 zile" and "4 lecții" after the polyfill; the choice
  survives a force-stop; the Profile Language card shows all three options with the note.
- In passing: 9 un-awaited `fireEvent` calls fixed (CLAUDE.md), and an `act()` warning in
  `ReminderSettingsCard.test.tsx` that predated this work — tests now wait for the mutation
  to settle, not only to be called. `renderWithProviders` returns its `queryClient` for that.

### Decisions

1. **New dependency: `@formatjs/intl-pluralrules`.** JavaScript only, no native code. Needed
   because Hermes lacks `Intl.PluralRules`; without it every Romanian count with a `few` form
   is wrong. Writing CLDR rules by hand would have to be repeated for every future locale.
2. **Onboarding is not given a language switch.** A phone set to Romanian gets Romanian from
   the first screen (`system` is the default); a switch there would be a seventh step.
3. **The language is not synced to `profiles.locale`.** Content RPCs take the locale per
   call, and a device preference in the account would make two phones disagree.

## Phase 21 — what was implemented (E2E & regression hardening)

### The E2E suite (SPEC §53)

- **Maestro 2.10**, eight flows in `e2e/flows/`, run by **`npm run e2e`** (`scripts/e2e/run.ts`):
  preflight (device, installed dev build, Maestro, local Supabase, with a 30 s leash on adb) →
  `supabase db reset` → E2E fixtures → its own Metro on port 8082 against local Supabase →
  flows → JUnit report in `e2e/results/`. It refuses to reuse a Metro already on the port, so a
  bundle built against staging can never write test accounts there.
- **Answers are generated from the content**, not typed into flows (`scripts/e2e/steps.ts` →
  `e2e/generated/`, gitignored). Module 1 is the E2E course: reviewed, free, and between its
  four lessons it holds all eight question types, so one flow exercises every renderer against
  the real grading functions.
- **Fixtures** (`scripts/e2e/fixtures.ts`): the seeded free and premium accounts have finished
  onboarding; the free account has finished three lessons **through `submit_answer` and
  `complete_lesson`**, so the lives grace period is over; the Daily Challenge is pinned to three
  known questions for yesterday, today and tomorrow.
- **Flows:** onboarding as a guest · age gate · module 1 with every question type · wrong
  answers down to 0 lives · Daily Challenge claimed once · paywall and restore · interface
  language · guest keeps progress after creating an account (confirmed through Mailpit).
- New `testID`s only where a flow needed one: tab buttons, the feedback and state-view actions
  (derived from their parent's id), onboarding skip, the refusal screen, the challenge bonus.
- `docs/TESTING.md`: every test layer, how to run it, and the E2E setup and pitfalls.

### Regressions found and fixed

The suite earned its keep before it was green. Each of these was live in the app:

1. **CI had been red since Phase 19.** Modules 03–17 went to staging through `publish`, but
   `supabase/seed.sql` still held two modules, and `npm run verify` never looked. Regenerated;
   the pipeline test now compares the file with `renderSeed()`, so a stale seed fails the
   ordinary test run. Three pgTAP assertions that hardcoded the old seed's size now count from
   the catalogue.
2. **The age gate showed a child the sign-in screen.** The refusal navigated in a `mutate()`
   callback, and the sign-out inside the mutation unmounted the screen that owned it, so the
   callback never ran — the account was deleted, but the child landed one tap from "Continue as
   guest" with no explanation. Now the refusal is shown first and the sign-out follows
   (`logic/refuseUnderage.ts`, unit-tested for order, including a failed delete).
3. **Guest → account did nothing visible.** `verify-email` lived in the signed-out `(auth)`
   group, so a signed-in guest was silently refused the route: the confirmation email went out,
   the screen stayed on the form. Moved outside the guards; for a guest it offers "Keep
   learning" instead of "Use a different email", and resends as `email_change`, not `signup`.
4. **Opening the confirmation link left the app on "Signing you in…" for good.** The
   callback screen's effect listed the session status among its dependencies — but exchanging
   the code is what changes the status (guest → registered), so the exchange cancelled its own
   result. The server had signed the user in; the screen never moved. Now only unmounting stops
   it; a component test reproduces the status change mid-exchange, and fails on the old code.
   Together with 3, the D1 guest-to-account journey had never worked end to end.
5. **The paywall dropped the SPEC §33 statement for lifetime No Ads.** The "does not unlock
   Premium lessons or unlimited lives" line was keyed on `no_ads_monthly`; the offering sells
   `no_ads_lifetime` (D2). Now decided by what a plan grants (`needsNoAdsDisclaimer`), and the
   one-off purchase says **"Buy once"**, not "Subscribe".
6. **The lesson completion screen** still said "Practice and the daily challenge arrive in the
   next release" (both shipped in Phase 11), read "You've read What is Python?." and offered
   "Back to the module" while returning wherever the lesson was opened from. Its centred layout
   also slid the button upwards as the score and achievements arrived — under a finger, or a
   test, already on its way to it. Now top-anchored, "Nice work. Your progress is saved.",
   "Continue".
7. **`interstitial_shown` was sent on every lesson completion**, ad or no ad. Now only when one
   was shown (SPEC §43).
8. Nine un-awaited `fireEvent` calls (CLAUDE.md), and an `act()` warning that predated the
   phase: tests now wait for mutations to settle (`renderWithProviders` returns its client).

### Verification

- **E2E: 8 of 8 flows passed** in one run (`npm run e2e`, 15 min 30 s, Pixel 7 emulator,
  Android 15, development build against local Supabase): onboarding 1 m 4 s · age gate 43 s ·
  module 1 with every question type 5 m 34 s · wrong answers and lives 2 m 9 s · Daily
  Challenge 1 m 32 s · paywall and restore 1 m 11 s · interface language 1 m 11 s · guest keeps
  progress 2 m 23 s. Restore was checked to fail honestly: no local RevenueCat secret.
- It took ten runs to get there. Items 2–7 above were bugs in the app; the rest was the
  flows learning the emulator — see Decisions, and `docs/TESTING.md`, "When it goes wrong".
- `npm run verify`: typecheck clean, lint clean, **78 suites / 1322 tests** (was 75 / 1284).
- New tests: the E2E generator (every question type's mapping, lesson paging, fixtures, and
  that every `runFlow` resolves and parses), the age-gate refusal order, the auth callback
  surviving a session change mid-exchange, the paywall wording rules, and seed freshness.
- CI green again after the seed fix (all four jobs), for the first time since Phase 19.

### Decisions

1. **E2E runs on the development build against local Supabase**, not on the preview build
   against staging: deterministic state (reset + fixtures), no test accounts on staging, and
   Mailpit for auth email. A release-like E2E run belongs with the store builds (Phase 22).
2. **No E2E in CI.** It needs an Android emulator and a native build per run; the flows run
   locally before a phase is closed. CI keeps everything that does not need a device.
3. **Flows target `testID`s**, except Google's consent form and toasts, which the app does not
   draw. The consent form is always declined: development builds force the EEA form, and the
   non-personalised path is also what every under-16 learner gets.
4. **The dev build is opened through its own `codesprint-dev://` scheme.** The preview build
   also claims `exp+codesprint`, and Android then stops to ask which app should open the link.
5. **No `hideKeyboard` in any flow.** On Android it presses Back; when the keyboard is not up
   at that instant, Back leaves the screen — on the first onboarding step, the app. Enter does
   what a person does instead: it submits a form, or closes the keyboard on the answer box.
6. **Restore is checked against what the local stack can honestly do.** It needs the RevenueCat
   secret key in the local Edge Functions. The runner looks: with the key, the flow expects
   "nothing to restore"; without it, the plain failure message — and says so in its output.
7. **New dependency: none.** Maestro is a developer tool installed outside the repository.

### Found, not fixed — needs a decision

**Both resolved on 2026-09-24** — see "Decisions after Phase 21" below.

- **Out of lives does not stop anyone answering.** At 0 lives the card appears (the flow
  asserts it), but the next question can be answered as normal; a wrong answer just costs
  nothing more (a Phase 10 decision: "never negative"). SPEC §22 lists what a learner _can_ do
  when out of lives — wait, watch an ad, review without answering, upgrade — which reads as
  answering being blocked, and without that, Premium's "unlimited lives" has no value.
  **Recommendation:** block answering in lesson, practice and challenge at 0 lives, server-side
  in `submit_answer`, with the out-of-lives card as the screen's state.
- **No per-user rate limits on the answer and reward RPCs** (SPEC §40, §42). Grading is
  server-side and the ledger is idempotent, so this is abuse-resistance rather than a hole, but
  the SPEC asks for it. **Recommendation:** a small migration with a per-user, per-minute cap
  on `submit_answer` and the reward RPCs, before the store builds (Phase 22).

## Decisions after Phase 21 — out of lives, rate limits (2026-09-24)

Both approved by the user and implemented before Phase 18 (commit `e8b4775`):

- **Out of lives means out of answers** (SPEC §22). At 0 lives, answering in lesson, practice
  and challenge context is refused (`LV000`); the answer that spends the last life is still
  taken, a regenerated life reopens answering, and exams and Premium are unaffected. The app
  shows the out-of-lives card at the Check button and keeps the selection.
- **Per-user rate limits** (SPEC §40, §42): 60 answers and 10 rewarded grants a minute, both in
  `app_config`, 0 disables (`RL000`). The app says "slow down", not "check your connection".
- Both are `BEFORE INSERT` triggers on the rows they guard (`user_question_attempts`,
  `rewarded_ad_grants`), so every writing path is covered and no RPC had to be copied. A refusal
  rolls back its own call. pgTAP `15_lives_gate_and_rate_limits` (20 assertions); the E2E lives
  flow now opens the next lesson at 0 lives and checks the refusal.

## Phase 18 — what was implemented (Privacy & legal)

- **Export my data** — `export_my_data()` returns every table of learner data, whole
  (`to_jsonb`, so a future column is included automatically), as one JSON document. Reports
  about the learner are exported without the reporter; no answer key is ever included; 10
  exports an hour. Profile → **Your data** → Export saves it as a dated `.json` file through the
  system share sheet.
- **Delete my account** — the `delete-account` Edge Function deletes the RevenueCat customer
  first, then the auth user; the deletion cascades through every user table. Confirmed in a
  sheet that says it is final and does **not** cancel a store subscription. Without the
  RevenueCat key it answers `revenuecat: not-configured` rather than pretending.
- **Nothing personal survives a deletion**, whatever deletes the account: a `BEFORE DELETE`
  trigger on `auth.users` redacts the purchase-event payloads (the one table that keeps rows,
  for webhook idempotency). pgTAP `16_privacy` finds every user table from the catalogue and
  proves none still points at a deleted user.
- **Static pages** in `web/`: support, privacy policy, terms of use, account deletion (the page
  Google Play requires), `app-ads.txt`. Drafts written from what the app actually does, with
  every unknown marked `[LIKE THIS]`, for the lawyer. Plain HTML, light and dark, no external
  requests.
- **In the app**: Privacy, Terms and Support links in Profile → About, Terms and Privacy on the
  paywall — only where the pages are hosted. `EXPO_PUBLIC_LEGAL_BASE_URL` is now required in
  production (`SHIPPED.legalPages`).
- **Apple privacy manifest** declared in `app.config.ts` (required-reason APIs).
- **`docs/LEGAL.md`**: status, data inventory, processors and DPAs, consent and minors, draft
  answers for Google's Data safety form and Apple's privacy label, points for the lawyer,
  hosting instructions.

### Found on the way

- The paywall's Terms and Privacy links were built as `` `${legalBase}/terms.html` `` and read
  "undefined/terms.html" wherever the URL was unset. Now `legalUrls()` returns null there and no
  link is shown.
- `billing_events` only nulled its `user_id` on deletion, so the purchase history inside the
  payload outlived the account. Now redacted by the trigger above.

### Verification

- **E2E: 9 of 9 flows passed** in one run (`npm run e2e`, about 18 minutes): onboarding 1 m ·
  age gate 42 s · module 1 with every question type 5 m 32 s · wrong answers and lives,
  including the refusal at 0 lives, 2 m 20 s · Daily Challenge 1 m 28 s · paywall and restore
  1 m 14 s · interface language 1 m 10 s · guest keeps progress 2 m 23 s · **export my data,
  then delete the account** 2 m 24 s.
- `delete-account` over real HTTP against the local stack: a fresh anonymous user is deleted
  (`{"deleted":true,"revenuecat":"not-configured"}`), gone from `auth.users` afterwards; no
  token → 401.
- pgTAP: **16 files, 556 tests** (was 14 / 520), including `15_lives_gate_and_rate_limits`
  (20) and `16_privacy` (16).
- `npm run verify`: typecheck clean, lint clean, **85 suites / 1349 tests** (was 78 / 1322).
- New tests: the refusal mapping, QuestionPage's refused states, the deletion order and the
  RevenueCat customer call, the Your data card, the legal links and URLs, the licences page
  generator, the production requirement for the legal pages URL.
- A new development build (for `expo-sharing`), installed on the emulator. Its first cold
  starts timed out as "not responding" until compiled ahead of time; the E2E runner now does
  that itself (`docs/TESTING.md`).
- CI green on all four jobs for the Phase 18 commits.

### Decisions

1. **New dependency: `expo-sharing`** (first-party Expo). A GDPR export must work for any
   account; sharing it as text goes through a Binder transaction capped near 1 MB on Android,
   which a year of an active learner's answers exceeds. A file of any size goes to Files,
   Drive or email. `expo-file-system` was already installed through `expo`; it is now declared.
   It meant a new development build.
2. **RevenueCat before the database** in the deletion: a failure there leaves the account intact
   to retry, instead of a customer record keyed by an id nobody can see any more.
3. **The purchase log is redacted, not deleted**: its event ids are what make a replayed
   RevenueCat webhook a no-op (SPEC §31).
4. **A report about a learner is in their export without its reporter** — their data, but not
   the other person's identity. On the lawyer's list.
5. **Legal pages in English only** for now, like the lessons; Romanian when the lawyer has
   reviewed the English.
6. **Open-source licences as a generated page** (`npm run legal:licenses` → `web/licenses.html`,
   329 packages with their licence texts), linked from Profile → About. The whole production
   tree, build tools included: an extra attribution costs nothing, a missing one is a breach.

## Phase 22 — what was implemented (Production builds, TestFlight, Play testing)

Everything a production build needs that can exist before the store accounts do. The build
itself, TestFlight and the Play internal track wait on the accounts (Human actions).

- **Production build profile** (`eas.json`): store distribution, an Android App Bundle, the
  EAS `production` environment, the `production` update channel, and build numbers that EAS
  owns and increments (`appVersionSource: remote`, `autoIncrement`). **Submit profile**: iOS to
  App Store Connect; Android to the **internal** track as a **draft**, so nothing reaches a
  tester until you start the rollout.
- **Version `1.0.0`** in `app.config.ts` — the store version people see. Build numbers are
  separate and never collide.
- **Over-the-air updates** (SPEC §51): `expo-updates` with a **fingerprint** runtime version,
  checked on launch and applied on the next one — no blank screen waiting on the network.
  `npm run release:update` publishes to production and always passes the production
  environment (see Decisions).
- **Force-update screen** (SPEC §50, §51): below `min_supported_app_version` the app shows
  why, that progress is safe, and a button to the store listing instead of the app.
  `force_update_shown` is captured (SPEC §43). New config key `ios_app_store_id` (migration
  `20260924120000`), because an App Store link needs the numeric id that exists only once the
  listing does; without it the screen says where to update rather than showing a dead button.
- **Sentry source maps and native symbols** uploaded while a release build is made (SPEC §44):
  the Sentry Expo plugin, and Sentry's Metro serializer, which stamps each bundle with a debug
  id so a crash from a store build or an OTA update is matched to exactly its source map.
  Development and preview builds skip the upload; production requires it.
- **Export compliance** declared (`usesNonExemptEncryption: false` — HTTPS only), so App Store
  Connect stops asking on every build.
- **`npm run release:check`**: reads the EAS production environment through the EAS CLI,
  validates it with the app's own startup schema, and adds what the schema cannot know —
  Google test ids left in, a production build pointed at staging, the Sentry build variables,
  placeholders left in the legal pages and `app-ads.txt`, and content still in draft. It never
  prints a value; where the app's schema quotes one, the check redacts it.
- **Documentation** (SPEC §55): `docs/DEPLOYMENT.md` (production Supabase, the EAS production
  environment variable by variable, builds, signing, TestFlight, Play internal and closed
  testing, OTA updates and rollback, retiring old builds, the release checklist),
  `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`; README brought up to date.

### Found on the way

- **An OTA update published from a laptop would have reached nobody.** The runtime
  fingerprint includes the plugin options fed by build variables (the AdMob app ids, the
  Sentry slugs). Verified: the same commit gives runtime `001955a7…` without
  `ADMOB_APP_ID_ANDROID` and `6f49e992…` with it. `eas update` run with the local environment
  publishes to a runtime no store build has. `release:update` pins `--environment production`.
- **Source maps were never uploaded.** Phase 16 wired the Sentry SDK but not its build
  plugin, so every production crash would have arrived as minified line 1.
- **The force-update screen did not exist**, though `min_supported_app_version` and the
  `force_update_shown` event had been in config and the analytics list since Phase 3.
- `docs/MONETIZATION.md` still told you to swap a no-op billing service that was replaced in
  Phase 14; the README still said "Phase 1 of 23".
- **The E2E launch had been passing by luck.** `clearState` resets the development client's
  "show menu at launch" preference to on, so its menu opened over the first screen whenever
  the bundle arrived early enough — and its "Open React Native dev menu" row matched the
  check meant for React Native's own menu, which then looked for a Close button that does
  not exist. Two failures in a row today. The launch link now passes `disableAutoLaunch=1`,
  and the overlay subflow tells the two menus apart.

### Verification

- `npm run verify`: typecheck clean, lint clean, **88 suites / 1373 tests** (was 85 / 1349).
  New: version comparison and store URLs (8), the force-update screen (3), the release check
  (13).
- pgTAP: **16 files, 556 tests** after a reset with the new migration.
- `expo prebuild` for Android with the production variant: the Sentry Gradle step, the
  `expo-updates` manifest entries (runtime version, update URL, check on launch) all present.
  iOS prebuild cannot run on Windows; EAS runs it in the cloud.
- `npm run release:check` against the real EAS production environment (empty today): every
  blocker it lists is real — they are the Human actions below.
- Every EAS CLI command and flag in `docs/DEPLOYMENT.md` checked against the installed CLI
  (24.7.0).
- **E2E: 9 of 9 flows passed** in one run (32 m 30 s, a slower emulator than last time) on the
  existing development build, after the `_layout.tsx` change and the launch fix below:
  onboarding 1 m 42 s · age gate 1 m 12 s · module 1, every question type 8 m 46 s · lives
  4 m 12 s · Daily Challenge 2 m 40 s · paywall and restore 2 m 18 s · language 2 m 39 s ·
  guest keeps progress 4 m 33 s · export and delete 4 m 28 s.
- The Android bundle exports with the Sentry serializer and carries its debug id.

### Decisions

1. **New dependency: `expo-updates`** (first-party Expo) for SPEC §51's OTA fixes.
   **`expo-application`** is now declared: it was already installed and linked through
   `expo-notifications`, and the force-update check reads the native version from it. No new
   code runs on a build that lacks it.
2. **Fingerprint runtime version**, not `appVersion`: an update can never reach a build whose
   native code it does not match, whatever anyone remembers to bump. The cost is that any
   native change — a module, `app.config.ts`, `eas.json` — needs a new store build before
   updates reach it, which is true anyway.
3. **Updates apply on the next launch** (`fallbackToCacheTimeout: 0`), never by blocking the
   one in progress.
4. **A production build fails without Sentry's upload variables.** A store build whose crashes
   cannot be read is not worth shipping; the failure is at build time, where it costs nothing.
   `release:check` reports them first.
5. **`EXPO_PUBLIC_*` values are plaintext in EAS.** They are compiled into the app for anyone
   to read; hiding them protects nothing and stops them being validated. `SENTRY_AUTH_TOKEN`
   is the one `secret` variable. No server secret is in the EAS environment at all.
6. **Android goes to the internal track as a draft.** Closed and production tracks are a
   decision made in Play Console, not a side effect of `eas submit`.

## Phase 23 — what was implemented (Store preparation & submission)

- **Store listings as files** (`store/`): English and Romanian text for both stores, the age
  rating questionnaire, the category and the App Review notes, with the product name from
  `brand.ts`, the tagline from the i18n files and the module count from `content/`.
  `npm run store:build` writes **`store.config.json`** — the App Store listing in EAS Metadata's
  format, pushed with `eas metadata:push` and clean under `eas metadata:lint` — and Google
  Play's text in fastlane's layout (`store/google-play/<locale>/`). **`store.config.js`** adds
  the App Review contact from the environment, so no name or phone number is committed.
- **Tests hold the listing to the rules** (43): every store limit, no price, no promise SPEC
  §62 rules out, no feature that has not shipped, No Ads plainly not Premium, each store's own
  subscription terms and never the other platform's name, Terms and Privacy links in every
  description, ș and ț rather than ş and ţ, generated files never stale.
- **Screenshots from the real app** — `npm run store:screenshots`: on the emulator and the
  local database, a learner twelve lessons in (every lesson played through the real answer
  functions; only the six earlier streak days and the name set directly) is walked through
  Home, a lesson, a right answer, Learn and Progress by a Maestro flow generated from content,
  in both languages and both themes. `scripts/store/compose.ts` cuts off Android's bars (an App
  Store screenshot may not show another platform), frames each screen and captions it in the
  app's Nunito and palette, at exactly 1290 × 2796 and 1080 × 1920; plus Google Play's feature
  graphic and 512 px icon. Generated, not committed.
- **`docs/STORE.md`**: every section of App Store Connect and Play Console with its answer —
  what is pushed, what is typed by hand, the four in-app products with their texts in both
  languages (within Apple's 30/45 limits), Data safety, content rating, target audience, ads,
  Advertising ID, account deletion, what to do if App Review asks for Premium, and how
  guideline 1.2 (user-generated content) is met.
- **`release:check` now covers the store too**: the website and copyright not set, a store
  website that differs from the one the app links to, store images not generated, and the
  template icon.
- The E2E runner's device, database and Metro plumbing moved to `scripts/e2e/harness.ts`, shared
  with the screenshot capture; E2E flow 04 passes through it.

### Found on the way

- **An answer took sixteen seconds for a learner with ~70 answers behind them** — and it grew
  with every answer (SPEC §45 asks for 400 ms). `local_date_for` validated its timezone against
  `pg_timezone_names`, which reads the timezone database from disk (~30 ms a call), and the
  daily caps call it once per row of the learner's XP history: 501 calls for one answer.
  Migration `20260924130000_fast_local_date` catches the error instead: same signature, same
  dates (the DST and unknown-zone tests are unchanged and pass). The same answer now takes
  **12.6 ms**. pgTAP `17_answer_performance` gives a learner 1,500 XP events and puts a ceiling
  on the time. Invisible to every test so far because no test account had a history.
- **Inline code in lessons was a solid black box in the light theme** — `+`, `//`, `%` drawn in
  the dark body ink on the code surface, which the restyle made dark in both themes (contrast
  1.23:1), and on Android the chip sat a line too high because the span had its own line
  height. Inline code now has its own token, `inlineCode` (a warm chip in light, a lifted one
  in dark, ink at 10.5:1 and 12.9:1), on the paragraph's line height. `CodeLine`, the rows of
  ordering and debugging questions, had the dark-on-dark ink too; it now uses the code blocks'
  own. Each has a test that fails without the fix.
- **Prompts, explanations and hints printed their Markdown as it was** — backticks around
  every piece of code, in 110 prompts, 309 explanations and 40 hints of 435 questions. Only
  lesson prose went through the renderer. `RichText` moved to the design system and now sets
  all of it — lesson, question page, feedback, exam and exam review; a prompt keeps its
  heading role and its code is set at heading size. One explanation also read "Six goes into
  twenty three whole times" (twenty-three?); now "6 goes into 20 three whole times".
- **An empty band under every navigation header** — Learn, Leaderboard, Profile, Progress, a
  lesson: `Screen` padded for the status bar that the header had already cleared (the "empty
  band under the Learn header" listed since Phase 19). It now pads only where no header does.
- **The development client's own overlays were in the runs:** its floating debug button sat over
  the top right of every screen (over the app's Settings button in the first screenshots), and
  React Native's error toasts — a failed RevenueCat Test Store request, for one — could be
  opened full-screen by a swipe. The launch link now passes `disableFab=1`, and the runners set
  `EXPO_PUBLIC_AUTOMATION=1`, under which a development build keeps the toasts off screen (they
  still reach Metro's log; a production build with the flag refuses to start).
- **Maestro died silently mid-step** when it printed its steps live (no `--format`); the capture
  now calls it as the E2E runner does.
- **The app icon is still Expo's template** — the blue mark `create-expo-app` generated in
  Phase 1, in the launcher, the splash, the favicon, and now the store icon and feature graphic
  made from it. Not ours to ship (SPEC §8). Not replaced here: an icon is a design decision tied
  to the name, which is not cleared. `release:check` now blocks while any of the six template
  files is unchanged (by hash).
- `docs/DATABASE.md`'s migration table had stopped at `…121700`; the four since are listed.

### Verification

- `npm run verify`: typecheck clean, lint clean, **93 suites / 1440 tests** (was 88 / 1373) —
  the listing rules (43), the store images (8), the release check's store and icon findings,
  `RichText`, `Screen`, `CodeLine`, the `inlineCode` contrast, the automation flag.
- pgTAP: **17 files, 562 tests** (was 16 / 556), including `17_answer_performance`.
- **E2E: 9 of 9 flows passed** (17 m 12 s, freshly booted emulator) after every app change of
  this phase: onboarding 1 m 1 s · age gate 36 s · module 1, every question type 5 m 6 s ·
  lives 2 m 11 s · Daily Challenge 1 m 24 s · paywall and restore 1 m 6 s · language 1 m 6 s ·
  guest keeps progress 2 m 18 s · export and delete 2 m 22 s.
- **Store images**: all four languages × themes captured from the app and composed — 43
  images, sizes checked by tests; every raw capture inspected (no dev overlay, the same
  learner throughout).
- `npx eas-cli metadata:lint`: **no issues** with the App Review contact set; without it, a clear
  refusal instead of an incomplete push.
- `npm run content:check`: 443 snippets verified on Python 3.12 and 3.14 after the reworded
  explanation.
- `npm run release:check`: 27 blockers — the 24 of Phase 22, the website and copyright in
  `store/store.yaml`, and the template icon. Each is a Human action below.
- The screenshot learner's twelve lessons, replayed through the real RPCs: 0.14 s after the
  fix, four minutes before it.

### Decisions

1. **New dev dependency: `@resvg/resvg-js`** (MPL-2.0, prebuilt binaries, no system libraries)
   to render the store images from SVG with the app's own font. Never in the app bundle.
2. **EAS Metadata for the App Store**, not typing: the listing, age rating and review notes are
   versioned and reviewed like code. Google Play has no equivalent in EAS, so its text is
   files to paste (or push with fastlane supply later — same layout).
3. **Age rating 13+** by override, whatever the questionnaire computes: the app refuses accounts
   under 13 (D10). User-generated content declared **yes** (display names), with the moderation
   guideline 1.2 asks for.
4. **Romanian listing**, saying plainly that the lessons are in English.
5. **Light screenshots uploaded, dark generated** alongside; iPhone only (no tablet support).
6. **Screenshots are not committed**: they are derived from code and content and regenerate in
   one command — after a rename, a content change or a restyle.

## After Phase 23 — password change in the app, legal review (2026-10-10)

Asked for after the last phase: managing the account without a website, and a review of the
privacy policy and terms against Romanian and EU law.

**Managing the account needs no website.**

- **Changing the password is in the app** (Profile → Change password; SPEC §29).
  `AuthService.changePassword` signs in again with the current password — so an unlocked phone
  in someone else's hands is not enough — then sets the new one, then signs out every **other**
  device on the account (`signOut({ scope: 'others' })`). No email, no web page. A wrong
  current password has its own message (`wrong-password`) instead of "invalid credentials".
  Guests have no password and see no button.
- **Deleting the account** has been in the app since Phase 18, and "Forgot password" sends a
  link that opens the app (`codesprint://`), not a website.
- **What still needs a website is the stores**: a privacy policy URL (both), a support URL
  (App Store), a web page where deletion can be requested without the app (Google Play), and
  `app-ads.txt` for AdMob. `web/` is that site — static, free to host on Cloudflare Pages or
  GitHub Pages, even without a domain. A domain is still worth having for the SMTP sender.

**Found on the way: a bottom sheet's text field sat under the keyboard.** A React Native
`Modal` is a window of its own, so the system never moves its content out of the keyboard's
way; the new E2E flow could not reach the password sheet's button. `BottomSheet` now rises by
the keyboard's height (`useKeyboardHeight`: on iOS as the keyboard starts to move, on Android
once it has). The display-name and report sheets, which also have text fields, get the same fix.

**And a stopped container read as a missing key.** After a Docker restart the local Edge
Functions container stayed down — `supabase start` does not bring it back while the rest of the
stack is up — so the E2E runner reported "RevenueCat key not set" and flow 09 failed at its last
step, deletion. The runner now checks that container first and says how to restart it.

**The legal review** — `docs/LEGAL-REVIEW.md`, written in Romanian because its reader is the
Romanian lawyer who confirms it (the one exception to English documentation):

- **Every legal page rewritten against what the app actually does, and translated**:
  `web/ro/` holds the privacy policy, terms, deletion and support pages in Romanian. The app's
  legal links open the interface language's version (`legalUrls`), and so does each store
  listing (`npm run store:build`). The licences page stays one, in English.
- **Privacy (GDPR, Law 190/2018, Law 506/2004)**: the controller identified (registration no.,
  CUI) and the DPO question answered; legal bases corrected — birth year is a legal obligation
  and a legitimate interest (protecting minors), not "contract"; moderation is a DSA obligation;
  **Expo was a missing recipient** (update checks send the IP, OS and a random installation id);
  concrete retention periods instead of `[N]`; the one-month deadline for requests; an "On your
  device" section for Law 506/2004; and, honestly, that crash reports and analytics — keyed by
  the pseudonymous id — expire (90 days, 12 months) rather than being deleted with the account.
- **Consumer law (OUG 34/2014, OUG 141/2021, Law 193/2000, Civil Code)**: trader details,
  auto-renewal and cancellation, the 14-day withdrawal through the stores, the legal guarantee
  for digital services, 30 days' notice and free termination before a paid feature is removed,
  no limit on liability where the law forbids one, Romanian law without taking away the
  consumer's home-country protection, the consumer's own courts, and ANPC's SAL. The EU ODR
  link is gone: the platform was abolished on 20 July 2025 (Reg. (EU) 2024/3228).
- **DSA**: display names make the app a hosting service. The terms describe the moderation,
  automatic name filter included; anyone can notify illegal content; a decision comes with a
  statement of reasons (procedure and email templates in `docs/STORE.md`); a contact point in
  Romanian and English. As a micro-enterprise, the platform obligations of art. 19–28 do not
  apply.
- **Settings that keep the policy true**, now in `docs/DEPLOYMENT.md`: Supabase's audit logs
  not written to the database (those rows keep the email after deletion), PostHog discarding
  IPs with 12-month retention, Sentry in the EU with at most 90 days.
- `release:check` counts the placeholders in the Romanian pages too.

### Verification

- `npm run verify`: typecheck clean, lint clean, **96 suites / 1453 tests** (was 93 / 1440) —
  the password change (5), its sheet (3), the keyboard offset, legal URLs per language in the
  app and the store listing, the new error message in both languages.
- **E2E: 10 of 10 flows passed** (31 m 43 s). New flow `10-change-password`: a wrong current
  password is refused, the right one changes it, and the new one signs in after signing out.
- **Supabase's "secure password change", probed on the local stack with it on**: a guest whose
  session was two days old could not create an account (`reauthentication_needed`); a registered
  user's direct change was refused too, and the app's re-sign-in then change passed.
- Legal pages: every relative link resolves; the Romanian pages use ș and ț, never ş and ţ.
- `npm run store:build`: regenerated; the Romanian listings link to `/ro/`.
- `npm run release:check`: **31 blockers** — the 27 of Phase 23, plus the placeholders in the
  four Romanian pages.

### Decisions

1. **Re-sign-in rather than Supabase's `reauthenticate()`**, which emails a code: proving the
   current password needs no SMTP and no round trip, and gives a fresh session.
2. **Other devices are signed out** after a change: a password is usually changed because
   someone else may know it. Their access tokens lapse within the hour; refresh is refused.
3. **The legal texts exist in both languages**, and the version opened follows the interface
   language — Romanian consumer law expects the information in Romanian.
4. **No product decision taken on the lawyer's behalf**: the minimum age, crash reporting
   without consent, the refund route and the phone number are D1–D4 in the review, marked in
   the texts and counted by `release:check`.
5. **Supabase's "secure password change" stays off**, locally and in production
   (`docs/DEPLOYMENT.md`, and a comment in `config.toml`): on, it refuses a guest more than a day
   old who links an email and password — the way every guest becomes an account (D1) — and a
   guest has no email to reauthenticate with. The app's re-sign-in is the check that matters.

## Known limitations

Rewritten at the end of each phase, so this describes the product as it stands today.

**Romanian is the interface only.** Lesson text, questions, module titles and achievement
names are English in both languages (2,308 localized content fields, English only today). The
content schema is already localized JSONB with English fallback, so translating content is a
data change — but it doubles the review work, and the English review comes first. The
Romanian UI text was written by me and wants a native speaker's read.

**Integrations not built yet** (SPEC §59.11 — no fakes; the contract and the UI slot exist):

- **RevenueCat runs on the Test Store, not a real one.** `RevenueCatBillingService` is wired
  in and purchases work end to end — including the webhook and the server sync — but the
  storefront behind them is simulated. What it cannot prove: that the real store products are
  configured right, Apple's subscription-group ranking (which is what makes the No Ads →
  Premium upgrade a prorated change rather than two charges), and Google's replacement mode.
  Those need a real sandbox, which needs the store accounts.
- **Expo Go no longer runs the app.** The RevenueCat SDK is native and is now in the bundle,
  so a development build is required from here on (SPEC §0.1.10).
- **`PRODUCTION_NOOP_ALLOWLIST` is empty.** Every service in the registry is now a real
  implementation; the guard stays, so a future phase cannot quietly ship a placeholder.
- **Analytics captures nothing without a PostHog key**, and nothing without consent even
  with one. Both are correct; neither has been exercised against a real project yet.
- **No Sentry project yet**, so crashes are reported nowhere. The source-map upload is wired
  (Phase 22); it needs the DSN and the three build variables in the EAS production
  environment, and a production build fails without them.
- Session length is still not instrumented; it needs an app-state listener and a decision
  about what counts as a session. The `notification_*` events landed with Phase 17.
- **Ads serve Google's TEST inventory**, and will until `EXPO_PUBLIC_APP_ENV=production`
  with real unit ids. That is deliberate and enforced in `adUnitId`: tapping a live ad in
  development is what gets an AdMob account suspended.
- **AdMob server-side verification for rewarded ads is not implemented** (V1.1 per
  SPEC §42). Nothing proves the ad was watched, so the daily caps are what bound the
  damage — which is why a rewarded ad never grants Premium content or anything permanent.
- `web/app-ads.txt` carries a placeholder publisher id. It must be replaced and the file
  hosted on the domain named in both store listings before ads can fill properly.
- **Sign in with Apple and Google (D6).** Both need credentials that do not exist yet: an
  Apple Developer account with the Sign in with Apple capability, and Google OAuth client ids.
  Email, password and guest are complete and fully exercised.
- Email verification and password reset use **Mailpit**, the local inbox, because no domain or
  transactional SMTP exists yet. That is a real integration locally; production is blocked
  until SMTP is configured.

**Consequences of the above, visible in the app:**

- Out of lives now offers all three ways forward (SPEC §22): the countdown, a rewarded ad,
  and the paywall.
- The funnel triggers from SPEC §34 are implemented and unit-tested, but nothing calls
  `shouldPrompt` yet — the paywall is reached deliberately, not suggested. Wiring the
  triggers to the screens that fire them is part of Phase 15, where the ad trigger arrives.
- **Notifications have never been delivered on real hardware.** The scheduling policy and
  the reconciler are unit-tested, but an evening reminder actually arriving is something
  only a device and a clock can prove — and `expo-notifications` is a native module added
  after the last development build, so a **new build is required** before any of it runs.
- Reminder times are five presets, not a picker. A learner who wants 07:15 cannot have it;
  a native date-time picker is a whole extra dependency for a question whose useful
  answers are morning, after work and before bed.
- The daily reminder does not mention the Daily Challenge (SPEC §48 lists it as optional
  and part of the same two-a-day budget). Adding a third message would mean one of the two
  existing ones giving up its place.

**Content and features still to come:**

- **Production would serve modules 1–2 only today.** `content:publish --production` ships
  reviewed content alone: 8 of 76 lessons, an exam pool of 38 and a challenge pool of 39.
  All 17 modules are written and verified by machine (Phase 19); the rest is the human review.
- "10 Exams Completed" needs ten sittings, which the free weekly limit makes a Premium-only
  achievement in practice.
- `daily_challenges` supports scheduling a specific set or bonus per date. Nothing is
  scheduled; the deterministic pick covers it.
- Onboarding does not let an intermediate learner choose a starting module (SPEC §11). Their
  answer is stored and unused; every module up to the free boundary is reachable anyway.
- **A locked module does not lead to the paywall.** It shows its lock and says what Premium
  unlocks, but offers no button; the way in is Profile → Subscription → See plans (and the
  out-of-lives card, and the full exam). SPEC §34's module-boundary prompt is not wired.
- **Changing the email address is not built** (SPEC §29). The password is changed in the app;
  an email address cannot be changed yet — it needs Supabase's secure email change, which
  confirms on both addresses and so needs production SMTP. Linking Apple or Google waits on
  D6. Export, deletion and the legal links are done (Phase 18).
- Avatars are an initial on a colour derived from `avatar_key`, not preset artwork. No photo
  uploads in V1 by design (SPEC §29); the preset set is a content decision, not a code one.
- **No sounds (SPEC §29).** Haptics are wired and now have a working setting; audio has no
  assets, and a toggle for silence would be a dead switch. Three or four short, licensed
  sounds (correct, incorrect, level up) would make it a small change — see human actions.
- `lottie-react-native` and `expo-image` are still not installed. Nothing has needed them:
  Reanimated covers the achievement unlock, and there are no remote images to load.
- **The performance targets in SPEC §45 are unmeasured on hardware.** Cold start under
  2.5 s and 60 fps navigation need a release build on a mid-range Android phone; what is
  enforced today is the lesson payload budget and the one screen that rendered thirty
  syntax-highlighted snippets at once.
- **395 questions are unreviewed.** They are verified by machine — schema, references,
  real execution on two interpreters — but not read by a person, which is what SPEC §35
  requires before production. Pedagogical judgement (is this explanation clear? is this
  distractor fair?) is exactly what the pipeline cannot check.
- **One reviewed lesson changed.** "Reading an error message" (module 01) lost its bullet
  list for three paragraphs with the same wording; it is still marked reviewed and should be
  re-read.
- **A thin strip above the tab bar** on the tab screens: `Screen` also pads for the gesture
  bar, which the tab bar already does. The top of the same bug is fixed (Phase 23); the bottom
  needs the tab bar's height, which Expo Router does not export publicly.
- **The restyle is unseen on hardware.** Every claim above is from tests, a typecheck and a
  successful bundle. The 3D press, the rounded font, the drawn icons and the warm
  background have not been looked at on a phone in either theme — that is the whole of the
  device checklist below.
- **Only Home was rebuilt.** Learn, Leaderboard, Profile, the lesson player, practice, the
  exam and the paywall inherit the new tokens — chunky cards, 3D buttons, the new palette,
  filled icons — but their layouts were not redesigned for the style. SPEC §13 specified
  Home and only Home; the others will look restyled rather than designed until they get the
  same treatment.
- **Nunito's Romanian diacritics are unverified.** The font covers Latin Extended-A, so
  ș and ț exist, but whether they render as comma-below rather than cedilla (SPEC §38)
  needs a look on device once a Romanian string exists.
- **Large text and screen reader have been reasoned about, not used.** Every animation
  respects reduce-motion, every control carries a role and a label, and the one clipping
  layout found is fixed — but a real VoiceOver and TalkBack pass is on the device
  checklist and has not happened.

**Housekeeping:**

- `npm audit` reports **14 moderate** advisories, all inside Expo's own build tooling
  (`@expo/cli` and its `query-string` / `decode-uri-component` / `uuid` / `xcode` chain).
  They are build-time code, not shipped app code, and cannot be resolved without an Expo
  release — `npm audit fix --force` would downgrade Expo itself. Recheck each SDK upgrade.
- **No production build exists yet**, and the first one needs new development and preview
  builds too: `expo-updates` and the Sentry plugin are native. The installed builds keep
  working — nothing they run depends on either.
- **The app has not been run on a physical device yet.** It runs on the Android emulator;
  every device checklist from Phase 1 onward is outstanding, deferred by agreement. Fonts, contrast, dynamic type and
  reduce-motion in particular can only be verified on hardware.

---

## Human actions required before the next phases

**Phase 23 — to submit, after the Phase 22 list below** (details in `docs/STORE.md`):

1. **Name clearance** (SPEC §0.3) before anything is public; after a rename, `brand.ts`, then
   `npm run store:build` and `npm run store:screenshots`.
2. **An app icon of our own** — replace the six template files in `assets/` at the same sizes
   (launcher, Android adaptive layers, splash, favicon); then `store:screenshots --compose-only`
   remakes the store icon and feature graphic.
3. **Finish the content review** — the listing describes all 17 modules.
4. In `store/store.yaml`: `websiteUrl` and `copyright`; then `npm run store:build`.
5. **Read the Romanian listing once** (`store/listing/ro.yaml`) as a native speaker.
6. **App Store Connect**: `eas metadata:push` with the App Review contact in your environment;
   by hand: App Privacy, pricing, DSA trader details, the four in-app products with a paywall
   screenshot each from TestFlight; submit with the first version.
7. **Play Console**: paste the listing and upload the images; the App content declarations as
   listed; the products after the first bundle; then production.
8. Optional: retake the screenshots on an iPhone for the App Store.

**Phase 22 — to make the first production build, in this order** (details in
`docs/DEPLOYMENT.md`; `npm run release:check` ticks them off):

1. **Accounts** — Apple Developer Program and Google Play Console (Organization, after the
   PFA → D-U-N-S chain below), each with its paid-apps agreement, tax and banking.
2. **Production Supabase** — a new Pro project in Frankfurt; `db push`; auth settings by hand
   (site URL and redirect `codesprint://`, custom SMTP); `functions deploy` and the RevenueCat
   secrets; `content:publish --production`. DEPLOYMENT.md §1.
3. **Services** — AdMob (app + 6 ad units), RevenueCat (real stores), PostHog EU project,
   Sentry project and an org auth token, hosting for `web/` at your domain.
4. **EAS production environment** — the variables in DEPLOYMENT.md §2. Then
   `npm run release:check` until it reports no blockers.
5. **Build and submit** — `eas build --profile production`; TestFlight via `eas submit`; the
   first Android bundle uploaded by hand to the internal track. Then put the App Store numeric
   id in `eas.json` (`ascAppId`) and in `app_config.ios_app_store_id`.
6. **New development and preview builds** at the same time — the native project changed.

**Phase 18 — to make the privacy work public:**

- **Host `web/`** on a free static host that allows commercial use (Cloudflare Pages or GitHub
  Pages), at the domain the store listings will use. See `docs/LEGAL.md`, "Hosting the pages".
- Then set **`EXPO_PUBLIC_LEGAL_BASE_URL`** in the EAS environments (preview, production). A
  production build refuses to start without it; the in-app links appear once it is set.
- **Decide D1–D4 in `docs/LEGAL-REVIEW.md`** — above all the **minimum age**: 13 today; the
  review recommends 14 now (Romanian civil capacity), and 16 or verified parental consent if
  the "online majority" bill (L190/2025) becomes law. It is `min_user_age` in `app_config`
  plus the listing text.
- **A lawyer's confirmation** of the reviewed texts, in both languages; the markers
  `[LAWYER TO CONFIRM]` / `[DE CONFIRMAT DE AVOCAT]` show where.
- **Fill the placeholders** in `web/*.html` and `web/ro/*.html`: the PFA's name, registration
  number, CUI and address, the support and privacy email addresses, the reply time, the
  effective date, the email provider — and the AdMob publisher id in `web/app-ads.txt`.
- **Sign the data processing agreements** (Supabase, RevenueCat, Expo, Google, PostHog,
  Sentry, the email provider), fill in Expo's transfer safeguard, and set the providers as
  `docs/DEPLOYMENT.md` lists: Supabase audit logs off the database, PostHog IPs discarded and
  12 months, Sentry in the EU with at most 90 days.
- **The ANPC SAL pictogram** on the site's home page, if the lawyer confirms it applies; and
  the DSA statement of reasons (`docs/STORE.md`) each time a name is changed or hidden.
- **Deploy the Edge Functions** (`delete-account`, `sync-entitlements`, `revenuecat-webhook`)
  to staging and production, with `REVENUECAT_SECRET_API_KEY` set — without it, deletion
  cannot remove the RevenueCat customer. Needs a Supabase access token.
- Optional: `REVENUECAT_SECRET_API_KEY` in the shell before `npx supabase start`, so the E2E
  suite checks restore end to end, not only its failure.

**Content review — the longest item before a store build:**

- **Review the 395 draft questions** (modules 03–17) and flip `review_status` to `reviewed`
  in the YAML, lesson by lesson. They are live on staging, so the fastest way is to take each
  lesson in the preview app and edit the file alongside. A reviewed lesson needs its own
  `review_status` flipped too, or its questions will not ship. Run
  `npm run content:check` after each batch.
- **Re-read "Reading an error message"** (module 01, lesson 04), whose layout changed.
- **Read the Romanian interface once as a user** (switch with EN/RO on Home). Anything that
  sounds translated rather than written goes in `src/i18n/locales/ro/*.json`; the parity test
  catches a missing key, not a clumsy one.

**Staging — do these now:**

- **Rotate the staging secret key and database password.** Both were pasted into a chat
  transcript while staging was being set up. Project Settings → API Keys, and Project
  Settings → Database → Reset database password; then update `.env.staging`.
- **Optional: a Supabase access token** in `.env.staging` as `SUPABASE_ACCESS_TOKEN`, to
  deploy the two Edge Functions to staging.
- **Before email sign-up is shown to anyone on staging:** add the preview app's scheme to
  Authentication → URL Configuration → Redirect URLs, or the verification link lands on
  `localhost`. Guest mode does not need it.

**Critical path — start now:**

- **Register the PFA, then request a D-U-N-S number** (free, via Dun & Bradstreet). The D-U-N-S
  cannot be requested before the entity legally exists, so these are strictly sequential:
  PFA registration → D-U-N-S (days to weeks) → Organization enrolment on both stores.
  This chain is the longest lead time in the project and gates Phases 14 and 22.
  Reconsidered on 2026-09-20 against enrolling as a plain individual and kept, for three
  reasons that are independent of each other: revenue arrives from Apple Distribution
  International and Google Ireland as intra-community B2B services, so reverse charge
  applies and an art. 317 VAT number plus the D390 return are needed **regardless of the
  VAT threshold** — AdMob in particular cannot be reported as occasional income; a Personal
  Play account would add the 12-tester / 14-day closed test in series at the end of the
  project, when nothing else can run in parallel; and the Play account type is not cleanly
  convertible after creation, unlike Apple's Individual → Organization path. Started now,
  the whole chain costs no critical-path time, because Phase 19 is longer than it.
  The DSA trader details are public either way, so privacy is not a factor in this choice
  (see open question 2). Not tax advice — confirm the ANAF side with an accountant.
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

### With the Test Store (no Apple or Google account needed)

First: `npx expo run:android` (or an EAS development build). **Expo Go will not work from here
on** — the RevenueCat SDK is native and is in the bundle now.

1. Sign in as **premium@codesprint.test** (`sprint2026`). Every Premium gate is open: all
   modules in Learn, the full exam, hard practice, unlimited lives. That is `user_entitlements`
   doing its job.
2. Sign in as **noads@codesprint.test**. Content is locked exactly as for Free — No Ads buys no
   lessons. This is the single most misunderstood thing about the tier, so check it.
3. Sign in as **free@codesprint.test** and open the paywall from Profile. Three plans, each
   with a price. The close control is visible from the first frame.
4. Read the No Ads card: it must say it does not unlock Premium lessons or unlimited lives.
5. Buy **No Ads**. Watch the console for `[billing] RevenueCat Test Store` — a reminder the
   purchase is simulated.
6. Learn is still locked past module 6. Premium content did **not** unlock, which is the point
   of the tier.
7. Open the paywall again: No Ads reads **your current plan**, and Premium offers **"Upgrade to
   Premium"** with the note that it replaces rather than adds.
8. Upgrade. Premium content unlocks **after the server sync**, not the instant the store
   returns — that is `user_entitlements` being the authority, not the SDK.
9. In Supabase Studio, `billing_events` has a row per delivery with `processed_at` set, and
   `user_entitlements` shows `store` and `product_id`.
10. Kill the app mid-purchase and reopen it. The entitlement still arrives, via the webhook.
11. **Restore purchases** from the paywall. Everything comes back.
12. Sign out and back in as a different account. The subscription does not follow it.

### Once the store accounts exist

The Test Store proves the plumbing. These need a real sandbox:

13. Set the real SDK keys, create the products, and remove
    `EXPO_PUBLIC_REVENUECAT_TEST_KEY` from `.env`.
14. Buy **No Ads** with a sandbox account, then upgrade to Premium. Check the store receipt —
    a **prorated upgrade, not two charges**. This is what Apple's subscription-group ranking
    buys you, and the Test Store cannot exercise it.
15. **Delete and reinstall** the app, sign in, tap **Restore purchases**.
16. Let a subscription lapse (or cancel it in the sandbox) and confirm access closes.

---

## Phase 15 device test checklist

Needs a development build (`npx expo run:android`). Sign in as **free@codesprint.test**
(`sprint2026`) unless a step says otherwise.

### Consent, first thing

1. On a fresh install the **UMP consent form** appears before any ad. In a development build
   it is forced on regardless of where you are, so you see what a European learner sees.
2. Answer it. Note that the form appears **before** anything else ad-related — and on iOS, the
   tracking prompt comes **after** it, never at the same time.
3. **Profile → privacy options** reopens the form, so consent can be withdrawn as easily as it
   was given.

### Where banners may and may not appear

4. **Learn** — a test banner at the foot of the module list, labelled "Test Ad" by Google.
5. **Leaderboard** — a test banner at the top.
6. **Home, Profile, a lesson, practice, the exam, the paywall** — **no banner anywhere**. This
   is the check that matters most; a banner on a lesson is a SPEC §30 violation.
7. While an ad is still loading, the slot takes **no vertical space** — nothing jumps.

### Interstitials

8. Finish your first lesson and dismiss the completion screen: **no ad**. Same after the
   second and third — the grace period is three lessons.
9. Finish a fourth. Dismissing the completion screen shows a test interstitial.
10. Finish a fifth straight away: **no ad**, because the minimum gap is five minutes.
11. An ad never appears mid-lesson, between a question and its explanation, or on the paywall.

### Rewarded ads

12. Get a question wrong until lives reach **0**. The out-of-lives card appears with the
    countdown, **Watch an ad for 1 life**, and **Get unlimited lives**.
13. Watch the ad through to the end: one life comes back, and a toast says so.
14. Start another and **close it early**: nothing is granted. That is the contract of a
    rewarded ad.
15. Do it three times in total. The fourth time the button is **not shown at all** — the
    allowance is read before the offer, not after.

### Entitled learners see none of it

16. Sign in as **noads@codesprint.test**. No banner on Learn or the Leaderboard, no
    interstitial after a lesson.
17. Same as **premium@codesprint.test**, plus the rewarded life button is absent — their lives
    are unlimited, so there is nothing to restore.
18. In Supabase Studio set `ads_enabled` to `false` and reopen the app: ads stop for everybody,
    including the rewarded button.

### Accessibility

19. With the screen reader on, swipe through the Learn list. The banner is **skipped** — it is
    not part of the reading order.
20. The out-of-lives card and its buttons are announced properly.

---

## Phase 17 prerequisites — not a device checklist

Phase 16 has little to see on a device, and what there is cannot be verified without a PostHog
project. The honest checklist is short:

1. **Profile → Privacy.** The analytics toggle is **off** by default. That is opt-in working
   (SPEC §41), not a bug.
2. Turn it on, then off. Neither produces an error, and the setting survives a restart.
3. Sign in as a learner under 16 (set `birth_year` in Studio). The toggle is **disabled** with
   the reason shown, and the server refuses to record consent for them anyway.
4. **Ad privacy options** reopens Google's UMP form.
5. Everything else in the app behaves exactly as before — which is the point: with no PostHog
   key, analytics does nothing at all.

### Once a PostHog project exists

6. Create a project in the **EU** region, put the key in `EXPO_PUBLIC_POSTHOG_KEY`.
7. Open the app with analytics **off** and finish a lesson. PostHog shows **nothing**.
8. Turn analytics on and finish another. `app_opened`, `lesson_started`, `question_answered`
   and `lesson_completed` appear.
9. Open one of those events and read its properties. There must be **no email, no display
   name, no answer text and no lesson id** — only enums and counts.
10. Check the distinct id: a Supabase UUID, never an email address.

---

## Phase 17 device checklist (SPEC §57)

**This needs a NEW development build.** `expo-notifications` is a native module and was added
after the last one, together with a config plugin for the notification icon. The build already
on the emulator cannot run any of this.

```
eas build --profile development --platform android
```

1. Install the new build (done — `b58c049e`, installed 2026-09-20). Complete onboarding as a
   new account and pick a reminder time. The OS permission dialogue appears **after** the time
   is chosen, not on launch.
2. Do it again on a second account and **skip** the step instead. No dialogue appears at all.
3. **Profile -> Reminders.** The switch is on and the time you chose is selected.
4. Set the time to two minutes from now (in Supabase Studio, `profiles.reminder_time` — the
   presets are whole hours), reopen the app so it reschedules, then background it. The
   notification arrives, silently, with a plain icon rather than a white square.
5. Tap it. The app opens on Home.
6. Leave the app in the **foreground** over another test time. Nothing appears on screen — a
   reminder about the session you are already in is suppressed deliberately.
7. **The streak reminder.** With a streak of at least 1 and today's goal unmet, two reminders
   are scheduled (`adb shell dumpsys alarm | grep codesprint`).
8. Finish a lesson so today's goal is met, then reopen the app. Only **one** remains — this is
   the check SPEC §57 asks for.
9. **Switch reminders off** in Profile. Nothing remains scheduled and nothing arrives.
10. Switch them back on in the same session: the time you had is restored.
11. Turn notifications off for CodeSprint in the phone's own settings, then return to the app.
    The switch is disabled and the card offers **Open phone settings**.
12. Reinstall or clear the app's data and confirm nothing is left scheduled afterwards.

---

## Phase 20 device checklist (SPEC §57)

A development build containing `expo-notifications` was made and installed on the emulator on
2026-09-20 (`b58c049e`); Phase 20 added no native module, so that same build covers both
phases. Home, Profile, the Reminders card and the Appearance card were confirmed to render on
it, and the theme was confirmed to survive a force-stop.

**Screen reader** (TalkBack on Android, VoiceOver on iOS)

1. Swipe through Home. The streak, XP and lives are each announced with what they mean, not
   as bare numbers.
2. Answer a question wrong. The verdict is spoken as a word, not conveyed by the red alone.
3. Swipe through a code block. It is reachable and announced, not skipped.
4. On Learn, the course title is announced as a heading.
5. In the leaderboard, each row reads as rank, name and XP in one phrase, and the report
   button is announced as a button.

**Large text**

6. Set the system font to the largest accessibility size. Open Learn: the module numbers still
   read as "01", "02" — not clipped to one digit.
7. Home, the lesson player and the paywall all stay usable: nothing is cut off, no text sits
   on top of other text, and every button is still reachable by scrolling.

**Reduce motion**

8. Turn on Reduce Motion. Finish a lesson: the achievement toast appears without sliding, the
   progress bars jump rather than animate, and nothing is lost.

**Theme and settings**

9. Profile → Appearance. Switch to Dark, then Light, then System. The whole app follows
   immediately.
10. Force-quit the app and reopen it. **The theme you chose is still there** — this is the
    part that never worked before.
11. Turn Vibration off, answer a question wrong: no buzz. Turn it on: a buzz.
12. Check the version line at the bottom of Profile shows a version and a build.

**Subscription**

13. With the Test Store customer that has Premium, Profile shows **Premium** and offers **no**
    upgrade button — only restore and manage.
14. Tap **Manage subscription** on Android. It opens Google Play's subscriptions page, not
    Apple's.
15. Tap **Restore purchases** from Profile as a free learner: "No previous purchases found",
    in a neutral tone rather than an error.

**Performance**

16. Finish a 30-question exam and open the review. It opens immediately rather than pausing on
    a white screen while the code snippets are highlighted.
17. Cold start from a killed app to a usable Home: under 2.5 seconds on a mid-range phone
    (SPEC §45). Note the number rather than guessing — a release build, not the dev client.

---

## Restyle device checklist (SPEC §57)

**Needs a new build** — Nunito is a native asset and the splash colours changed, so the
JavaScript bundle alone will not show this.

**The press is the whole style**

1. Open the dev gallery (`/gallery`). Press and HOLD each button in turn. The face must travel
   down onto its rim and the rim must disappear — not fade, not scale, not blur. Release: it
   pops straight back.
2. Hold a button and drag your finger off it. It returns to the raised state without firing.
3. Press the round toggles at the top of Home. Same travel, same distance.
4. Nothing around a pressed button moves. If the layout shifts by a few pixels, the rim is not
   being reserved as padding.

**Colour and font**

5. The background is warm cream, not white, and the white cards visibly sit on top of it.
6. Headings and numbers are rounded and heavy. If anything looks like the old Inter, the font
   failed to load — check for a reflow right after the splash.
7. The XP total on Home is set in the heaviest weight in the app and reads as a score.
8. Switch to dark mode with the moon button. The raised things are still raised: a lighter face
   over a darker rim. Nothing should look flat or inverted.
9. In dark mode, press and hold a red (danger) and a green (success) button. **The label stays
   readable while held.** This is the defect the contrast test caught; confirm it with eyes.

**Home**

10. The greeting reads "Hello <your name>! Ready to play?". Continue as a guest instead: it
    reads "Ready to play?" with no stray punctuation.
11. There is **no** language toggle. Only theme and settings.
12. The level sits in a solid coloured puck. The hearts are drawn hearts, not emoji — compare
    against the emoji in your keyboard; they must not match.
13. Spend a life. The heart drains to grey **in place**; the row does not get shorter.
14. Reach the daily goal. The goal card turns gold and grows a trophy.
15. The Daily Challenge card is warm, its button is orange, and the reward looks like a coin
    with a raised edge.
16. Claim the challenge. The coin becomes a tick and the button goes quiet.

**Accessibility**

17. Turn on the largest accessibility font size. Home header: the title and greeting take the
    width and the three toggles wrap rather than squashing. Nothing is clipped.
18. TalkBack/VoiceOver over the lives row: it announces once, as "4 lives left of 5" — not five
    separate "heart" nodes.
19. TalkBack over the CONTINUE button: it says "Continue", spoken as a word.
20. Turn on Reduce Motion. Buttons still press down — that is deliberate. Progress bars jump to
    their value instead of filling.
21. In a question, an unanswered option still shows an **empty** ring or box. If those got
    filled in the icon sweep, every option looks chosen.

**The rest of the app**

22. Walk through Learn, a lesson, the leaderboard, Profile and the paywall. These were not
    redesigned, only re-tokened: look for text that has gone too big for its box, a card whose
    new corner radius clips content, or an icon that changed meaning when it was filled.
23. Open a code block. It is still monospace and still dark in both themes — the rounded font
    must **not** have reached the code.

---

## Phase 19 device checklist (SPEC §57 — "spot-check lessons across all modules")

Use the **preview** build against staging:
https://expo.dev/artifacts/eas/PyyEnROSHPB_6syCvbIHsr5Ay_yrCizOuiQV__lL0Sw.apk

**Onboarding (the fixed defect)**

1. Install fresh and continue as a guest. At step 5, the reminder options read Morning,
   Midday, After work, Evening, Before bed, each with its time — **not** "00.label".

**Learn**

2. Scroll the whole list. There are 17 modules; 01–06 open, 07–17 carry a Premium lock.
3. The tab labels sit clear of the gesture bar at the bottom.

**Spot-check, one lesson per module band** — read it as a learner, and answer every question:

4. Module 03, "Turning one type into another": the `int(3.9)` example and the code-ordering
   question.
5. Module 05, "Quotes and special characters": the hard "C:\new" question shows two lines.
6. Module 07, "Leaving early and skipping ahead": the break and continue questions differ only
   by one word.
7. Module 11, "Counting things, and data inside data": the nested inventory question.
8. Module 13, "else and finally": the `finally` that runs through a `return`.
9. Module 17, "How sorting works": the stable-sort question.

Modules 07–17 need Premium to open. Use the Test Store purchase from Phase 14 on a dev build,
or read the YAML alongside — the preview build has no RevenueCat key (see Hosted staging).

**For each question, note anything that is wrong, unclear or unfair.** That list is the start
of the content review.

**Exams and challenge**

10. Open Exams and start the sample exam. It draws ten questions from the whole course now,
    not just the first two modules.
11. Start the Daily Challenge. Its questions can come from any free module.

## Romanian interface device checklist

Use the **preview** build against staging (link in the report for this change).

1. With the phone in English, finish onboarding. Home is in English; the toggle at the top
   right reads **EN**.
2. Tap **EN**. Every string on Home changes at once to Romanian and the toggle reads **RO**.
   Lesson and module titles stay English — that is expected.
3. Check the forms: the streak reads **"0 zile"** (not "0 de zile"); Learn shows
   **"4 lecții"**; after 20 or more of anything, **"de"** appears ("20 de întrebări").
4. Check the letters: ă, â, î, ș, ț all render in the rounded font, with commas under ș and ț
   (not cedillas).
5. Profile → **Limbă**: three options — _Ca telefonul_, _English_, _Română_ — and a note that
   lessons are English for now. Choose _English_: the note disappears.
6. Choose _Română_, swipe the app away, reopen it. It opens in Romanian with no flash of
   English after the splash screen.
7. Choose _Ca telefonul_ and set the phone's own language to Română in system settings; the
   app follows it.

## Phase 21 device checklist (SPEC §57 — "Maestro suite green")

**The suite, on your machine** (setup once: `docs/TESTING.md`, "E2E"):

1. Start the Android emulator (or plug in the phone), start Docker, then `npx supabase start`.
2. `npm run e2e`. About 12 minutes. It ends with **"✔ E2E suite passed"** and eight
   `[Passed]` lines. It resets the LOCAL database — nothing on staging is touched.

**The fixes, on the preview build** (the APK from the Romanian-interface build is older than
these fixes; a new preview build is needed to see them on the phone):

3. **Age gate:** as a new guest, enter a birth year that makes you 10. The screen that explains
   why appears — not the sign-in screen.
4. **Guest → account:** finish a lesson as a guest, Profile → create an account. After
   **Create account** the "Confirm your email" screen appears, with **Keep learning** (not "Use a
   different email"). On staging the link needs the redirect URL from "Human actions".
5. **Paywall:** the "No Ads, forever" plan says it does not unlock Premium lessons or
   unlimited lives, and its button reads **Buy once**.
6. **Lesson completion:** no "arrive in the next release" line; the button reads **Continue**
   and does not move while the XP and achievements appear under it.

## Phase 18 device checklist (SPEC §57 — "Export data; delete account end-to-end")

On the **new** preview build (the Phase 18 one — older ones have no "Your data" card):

1. **Out of lives:** as a free learner past three lessons, lose every life in a lesson. Open the
   next lesson and answer: the answer is refused and the out-of-lives card appears **at the
   Check button**, with your selection still in place. Watch the rewarded ad (test ad): Check
   now works.
2. **Export:** Profile → Your data → **Export my data**. The share sheet opens with a file named
   `codesprint-data-<today>.json`. Save it to Files or send it to yourself, and open it: your
   answers, XP events, progress and profile are there — and no answers to the questions.
3. **Delete:** Profile → Your data → **Delete account**. The sheet says it is final and that a
   subscription is not cancelled. Confirm: you land on the sign-in screen and a toast says the
   account was deleted. Signing in with the old email now fails.
   On staging, this needs the `delete-account` Edge Function deployed (Human actions).
4. **Links:** once `EXPO_PUBLIC_LEGAL_BASE_URL` is set, Profile → About shows Privacy policy,
   Terms of use, Support and Open-source licences, and the paywall shows Terms and Privacy —
   each opens the right page. Without it, no links appear at all (never a broken one).
5. **The web pages:** open `web/index.html` in a browser (or the hosted site): every page links
   to the others, reads in light and dark mode, and the deletion page explains both ways.

## Phase 22 device checklist (SPEC §57 — "Install from TestFlight / Play testing track")

Blocked until the first production build exists (Human actions, Phase 22). Then, on a real
iPhone and a real Android phone:

1. **Install** from TestFlight (iOS) and from the Play **internal testing** link (Android).
   The app is named "CodeSprint" (no "Dev" / "Preview") and installs alongside the other two.
2. **First start**: onboarding appears; no red screen, and no configuration error (that one
   means a variable is missing from the EAS production environment).
3. **Production backend**: finish a lesson as a guest; in the production project's Table
   Editor your anonymous user and its `xp_events` rows are there — not on staging.
4. **Ads**: as a free learner, the banner is a real ad, not one labelled "Test Ad". Do **not**
   tap it — tapping your own live ads gets the AdMob account suspended.
5. **Store sandbox**: buy No Ads and Premium with a sandbox tester (iOS) / licence tester
   (Android); restore on a second install; Premium lessons open, ads disappear.
6. **Crash reporting**: in Sentry, the build's release exists with its source maps
   (Releases → the version → Artifacts).
7. **An update**: publish a harmless text change with `npm run release:update`; close and
   reopen the app twice — the change appears on the second launch.
8. **Force update**: in `app_config`, set `min_supported_app_version` to `9.0.0` and reopen:
   the "Time to update" screen, with an **Update** button to the store. Set it back to `1.0.0`.

## Phase 23 device checklist (SPEC §57 — "Listings, screenshots, forms complete")

On the emulator or any phone with the development build, then in a browser:

1. **Inline code** in any lesson with symbols (module 4, "Three more ways to do arithmetic"):
   `//`, `%` and `**` sit on a small chip level with the words around them — warm beige in the
   light theme, lifted purple in the dark — and read clearly in both. The same in a question's
   explanation after Check: no backticks anywhere.
2. **Ordering and debugging questions** (module 1): each code line and its number are readable
   on the dark rows, in both themes.
3. **Answers stay fast**: after many lessons, Check answers as quickly as on the first.
4. **The screenshots**: open `store/screenshots/` — five per language and theme, captions not
   cut, no Android status bar, the feature graphic and icon. Read the Romanian captions.
5. **The listing**: read `store/google-play/en-US/full_description.txt` and the Romanian one as
   a customer would. Everything it says is in the app you just used.

## Password change and legal pages — device checklist

On the emulator or any phone with the development build, signed in with email (a guest has no
password):

1. **Profile → Change password.** The sheet opens; tap each field — the sheet rises above the
   keyboard and the button stays visible. The same in the leaderboard's display-name sheet.
2. **A wrong current password**: "That isn't your current password." The sheet stays open.
3. **The right one**: "Password changed. Your other devices have been signed out." Sign out,
   then sign in with the new password; the old one is refused.
4. **A second device** signed in to the same account lands on the sign-in screen the next time
   it refreshes its session — within the hour, when its access token lapses.
5. **Legal links in Romanian**: switch to RO, Profile → Legal (shown when
   `EXPO_PUBLIC_LEGAL_BASE_URL` is set) — the privacy policy and terms open in Romanian.
6. **The pages themselves**: open `web/ro/index.html` in a browser; ș and ț render with a comma
   below, and every link and the language switch work.
