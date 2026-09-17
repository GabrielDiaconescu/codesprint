# CodeSprint — PROGRESS

> Read this first in a new session. It survives context resets.

**Current phase:** Phase 3 complete — awaiting approval for Phase 4 (Authentication).
**Last updated:** 2026-09-17

---

## Phase status

| Phase | Scope                                | Status                                |
| ----- | ------------------------------------ | ------------------------------------- |
| 0     | Human prerequisites & open decisions | **In progress** (parallel, see below) |
| 1     | Project setup & architecture         | **Complete** — device check deferred  |
| 2     | Design system                        | **Complete** — pending device check   |
| 3     | Database foundation                  | **Complete** — pending device check   |
| 4–23  | See `PLAN.md` / SPEC §57             | Not started                           |

---

## Development environment (confirmed 2026-09-17)

| Machine           | Role                        | Notes                                                                                                    |
| ----------------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Windows 11 PC** | Primary development         | Node 24.15.0, npm 11.12.1, git 2.53. Docker and Python 3.12 still to install                             |
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
| D9  | Python semantics         | 3.12 + latest stable 3.x              | Needs Python 3.12 installed (Phase 6)                                                         |
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

## Known limitations

- Services other than Config are still no-ops: billing (14), ads (15), analytics and
  monitoring (16), notifications (17), consent (15).
- No authentication yet, so every RPC that needs `auth.uid()` is unreachable from the app.
  Phase 4 makes the client-callable RPCs actually exercisable.
- No content: the tables exist but are empty until the Phase 6 pipeline seeds them.
- `supabase/seed.sql` does not exist yet, so `db:reset` warns about it. Harmless, and the
  file arrives with the content pipeline.
- Tab screens show honest "ships in Phase N" placeholders — no mocked data presented as real.
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

**Before Phase 4:**

- **Domain + transactional SMTP.** Supabase Auth needs a custom SMTP sender for email
  verification and password reset — the built-in sender is not permitted in production.
  _(The user asked to be reminded here.)_

**Before Phase 6:** install **Python 3.12** alongside 3.14 (D9 dual-version verification).

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
