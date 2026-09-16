# CodeSprint — PROGRESS

> Read this first in a new session. It survives context resets.

**Current phase:** Phase 1 complete — awaiting approval for Phase 2 (Design system).
**Last updated:** 2026-09-16

---

## Phase status

| Phase | Scope                                | Status                                |
| ----- | ------------------------------------ | ------------------------------------- |
| 0     | Human prerequisites & open decisions | **In progress** (parallel, see below) |
| 1     | Project setup & architecture         | **Complete** — pending device check   |
| 2     | Design system                        | Not started                           |
| 3     | Database foundation                  | Blocked on Docker (see human actions) |
| 4–23  | See `PLAN.md` / SPEC §57             | Not started                           |

---

## Decisions taken

| #   | Decision                 | Value                                 | Notes                                                           |
| --- | ------------------------ | ------------------------------------- | --------------------------------------------------------------- |
| D1  | Guest mode               | ON (default)                          | Approved with the plan                                          |
| D2  | No Ads product           | Monthly subscription €2.99            | Approved with the plan                                          |
| D3  | Annual Premium           | YES                                   | Approved with the plan                                          |
| D4  | Free trial               | None at launch                        | Paywall still renders trial terms dynamically                   |
| D5  | Free boundary            | Modules 1–6 (`free_module_count = 6`) | Config-driven, computed not stored                              |
| D6  | Social login             | **OPEN**                              | Default Apple + Google. Blocks Phase 4 scope                    |
| D7  | Analytics                | PostHog Cloud EU                      |                                                                 |
| D8  | Monitoring               | Sentry                                |                                                                 |
| D9  | Python semantics         | 3.12 + latest stable 3.x              | Needs Python 3.12 installed (Phase 6)                           |
| D10 | Minimum age              | 13                                    |                                                                 |
| D11 | Personalized ads         | Consent + 16+ only                    |                                                                 |
| D12 | Google Play account type | **OPEN**                              | Organization vs Personal — changes release timeline by 2+ weeks |

Plan approved 2026-09-16. Defaults apply for everything not marked OPEN.

---

## Open questions

1. **D12 — Google Play account type.** Organization is exempt from the 12-tester / 14-day
   closed test; Personal is not. Needed before Phase 15 planning; does not block Phases 1–13.
2. **D6 — social login in V1?** Apple + Google (default) or email-only. Determines Phase 4 scope.
3. **Sentry DSN** — not provided, so `MonitoringService` ships as a no-op. Supply
   `EXPO_PUBLIC_SENTRY_DSN` to enable it earlier than Phase 16.
4. **Product name** — "CodeSprint" is a working name; clearance is still outstanding (SPEC §0.3).

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

### Verification results

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

## Known limitations after Phase 1

- No backend: `ConfigService` serves bundled defaults only (Phase 3 wires `app_config`).
- All services are no-ops; nothing touches the network yet.
- Tab screens show honest "ships in Phase N" placeholders — no mocked data presented as real.
- No authentication, no content, no gameplay.
- Component library is minimal (`Screen`, `PlaceholderState`) — the real design system is Phase 2.
- `npm audit` reports **14 moderate** advisories, all inside Expo's own build tooling
  (`@expo/cli` and its `query-string` / `decode-uri-component` / `uuid` / `xcode` chain).
  They are build-time code, not shipped app code, and cannot be resolved without an Expo
  release — `npm audit fix --force` would downgrade Expo itself. Recheck each SDK upgrade.
- The app has not yet been run on a physical device — that is the Phase 1 device check below.

---

## Human actions required before the next phases

**Before Phase 2:** none.

**Before Phase 3 (hard blockers):**

- Install **Docker Desktop** (or Rancher Desktop / Podman) — the Supabase CLI needs it.
- Create a **Supabase account** and a staging project in an **EU region**.

**Before Phase 6:** install **Python 3.12** alongside 3.14 (D9 dual-version verification).

**Start now — longest lead times (SPEC §0.3):**

- Name clearance (EUIPO/TMview, USPTO, App Store, Google Play).
- Legal entity decision.
- Apple Developer Program + Google Play Console; decide **D12**.
- If D12 = Personal: recruit 15–20 testers; the closed test must start by end of Phase 15.

**Before EAS builds:** run `npx eas-cli login` then `npx eas init` to create the EAS project and
populate `EAS_PROJECT_ID`.

---

## Phase 1 device test checklist

Run on a physical **Android** phone (iOS is deferred to Phase 14 — no Mac and no Apple
Developer account yet).

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
