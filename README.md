# CodeSprint

**Learn to Code. 5 Minutes a Day.**

A mobile-first micro-learning app for Python, built with React Native + Expo and Supabase.

> "CodeSprint" is a **working name**. Name clearance is a launch blocker — see `docs/SPEC.md` §0.3.

---

## Status

**Phase 1 of 23 complete** (project setup & architecture). See `docs/PROGRESS.md` for the
current phase, decisions taken and pending human actions.

## Documentation

| File               | Contents                                                          |
| ------------------ | ----------------------------------------------------------------- |
| `docs/SPEC.md`     | Master build specification — the single source of truth for scope |
| `docs/PROGRESS.md` | Current phase, decisions, open questions, human actions           |
| `PLAN.md`          | Architecture plan, database draft, risks, phase-1 detail          |
| `CLAUDE.md`        | Working rules, phase gate, key commands                           |

Further documents (`ARCHITECTURE.md`, `DATABASE.md`, `CONTENT.md`, `MONETIZATION.md`,
`LEGAL.md`, `DEPLOYMENT.md`, `TESTING.md`, `CONTRIBUTING.md`) are written in the phases that
make them meaningful, rather than as empty stubs.

## Requirements

| Tool             | Version                                  | Needed for                      |
| ---------------- | ---------------------------------------- | ------------------------------- |
| Node.js          | 20.19+ (22 LTS recommended; 24 verified) | everything                      |
| npm              | 10+                                      | everything                      |
| Docker Desktop   | latest                                   | Phase 3+ (local Supabase)       |
| Python           | 3.12 **and** latest stable 3.x           | Phase 6+ (content verification) |
| Android device   | any modern phone                         | device checks                   |
| Mac or EAS Build | —                                        | iOS builds (cloud is fine)      |

Expo Go is **not** supported: AdMob and RevenueCat need native code, so a development build
(`expo-dev-client`) is required.

## Getting started

```bash
npm install
cp .env.example .env          # EXPO_PUBLIC_APP_ENV=development is enough for now
npm run verify                # typecheck + lint + tests
```

### Running on a device

```bash
npx eas-cli login
npx eas init                                              # once, creates the EAS project
npx eas build --profile development --platform android    # produces an installable APK
npm run dev                                               # start Metro for the dev client
```

## Commands

| Command                 | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Start Metro for the development build                 |
| `npm run typecheck`     | `tsc --noEmit`                                        |
| `npm run lint`          | ESLint (`--max-warnings=0`)                           |
| `npm test`              | Jest unit + component tests                           |
| `npm run verify`        | typecheck + lint + test                               |
| `npm run db:reset`      | Apply migrations + seed a local Supabase (Phase 3+)   |
| `npm run db:test`       | pgTAP suite (Phase 3+)                                |
| `npm run db:types`      | Regenerate database types after a migration           |
| `npm run content:check` | Validate content and run every snippet on real Python |
| `npm run content:seed`  | Regenerate `supabase/seed.sql` from the content files |

Local services while Supabase is running: Studio on <http://127.0.0.1:54323>, the API on
<http://127.0.0.1:54321>, and **Mailpit** — the local inbox that catches every verification and
password-reset email — on <http://127.0.0.1:54324>.

> Changing `supabase/config.toml` needs `npx supabase stop && npx supabase start`.
> `npm run db:reset` does **not** reload it: the Auth container reads it only at startup, and
> the symptom of forgetting is confusing (anonymous sign-in rejected as disabled while the file
> plainly enables it).

## Build variants

Three variants install side by side on one device:

| Variant     | Name                 | Bundle id                    |
| ----------- | -------------------- | ---------------------------- |
| development | CodeSprint (Dev)     | `com.codesprint.app.dev`     |
| preview     | CodeSprint (Preview) | `com.codesprint.app.preview` |
| production  | CodeSprint           | `com.codesprint.app`         |

## Architecture in one paragraph

Routes in `src/app` stay thin and compose feature screens from `src/features`. Domain logic is
pure and unit-tested. **Third-party SDKs may only be imported inside `src/services/`** — ESLint
enforces this and `src/__tests__/architecture.test.ts` proves it. Server state belongs to
TanStack Query, client state to Zustand. Gameplay is server-authoritative: XP is written only
through an append-only ledger inside Postgres security-definer functions, and answer keys never
leave the database.

## Authentication

Email and password with verification, password reset over a deep link, and guest mode.

A guest is a real Supabase anonymous user created only when someone taps "continue as guest",
never on launch — each one is a billable MAU for 30 days. Adding an email later keeps the
**same user id**, so all guest progress carries over; abandoned guests are purged nightly.

Deep links return to `codesprint-dev://auth-callback` (per build variant) carrying a `flow`
parameter the app adds itself, because the provider does not distinguish a signup confirmation
from a password recovery and the two must not land on the same screen.

Sign in with Apple and Google are not built yet — they need credentials that do not exist.
See `docs/PROGRESS.md` for exactly what is required.

## Onboarding and the age gate

Six screens: birth year, experience, motivation, daily goal, reminder time, privacy. Answers
are held locally and written in a single call at the end, so abandoning the flow leaves no
half-filled profile.

The age gate is the exception — it acts immediately. Below `min_user_age` (13) the account is
**deleted**, not merely blocked, because leaving it would mean storing a child's email address.
Below `minor_protection_age` (16) the database forces analytics off, the leaderboard hidden and
ads non-personalised, whatever the client sends. See `docs/DATABASE.md`.

## Content

Lessons live in `content/` as YAML and are treated as code: reviewed in pull requests,
validated in CI, and **executed** in CI. Every runnable snippet is run on Python 3.12 and 3.14
and compared with what the lesson claims, so a lesson that says a program prints 24 when it
prints 25 fails the build.

`supabase/seed.sql` is generated from those files, never hand-written. See `docs/CONTENT.md`.

## Security notes

- `EXPO_PUBLIC_*` variables are embedded in the app bundle and are **public by design**.
  Never name a secret `EXPO_PUBLIC_*`.
- Server secrets live in Supabase Edge Function secrets, EAS secrets or CI secrets — never here.
- `.env` is gitignored; only `.env.example` is tracked.
