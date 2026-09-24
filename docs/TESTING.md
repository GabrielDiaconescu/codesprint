# Testing

How CodeSprint is tested, layer by layer, and how to run each layer (SPEC §53, §54).
Device checklists for each phase are in `docs/PROGRESS.md`.

## The layers

| Layer          | What it proves                                                 | Command                          | In CI |
| -------------- | -------------------------------------------------------------- | -------------------------------- | ----- |
| Unit           | Pure domain logic: XP, levels, streaks, lives, pacing, parsers | `npm test`                       | yes   |
| Component      | Screens and renderers render and respond (RNTL)                | `npm test`                       | yes   |
| Content        | Every lesson is valid, and every snippet prints what it claims | `npm run content:check`          | yes   |
| Database       | RLS access matrix, grading, idempotency, caps (pgTAP)          | `npm run db:test`                | yes   |
| Seed freshness | `supabase/seed.sql` is what the content generates              | `npm test` (pipeline test)       | yes   |
| E2E            | Real flows on a real device against the real local backend     | `npm run e2e`                    | no    |
| Device         | What only a phone can show: feel, fonts, notifications, stores | checklists in `docs/PROGRESS.md` | no    |

`npm run verify` runs typecheck, lint and the Jest suite — run it before every commit. CI
(`.github/workflows/ci.yml`) adds the database, content and secret-scan jobs; **check that CI is
green after pushing**, because it covers things `verify` does not.

### RNTL v14

`render`, `rerender` and `fireEvent` are async — always `await` them (see `CLAUDE.md`). When a
test starts a mutation, wait for it to **settle**, not merely to be called:
`renderWithProviders` returns its `queryClient`, and `waitFor(() =>
expect(queryClient.isMutating()).toBe(0))` does it. A mutation that resolves after the last
assertion updates the component outside `act()`, and React blames whichever test runs next.

### Engines

Jest runs on Node; the app runs on Hermes. Anything that depends on `Intl` behaves differently:
Hermes has no `Intl.PluralRules`, which is why `src/i18n/pluralRules.ts` exists and why
`pluralRules.test.ts` removes it to stand in for the phone. When a test passes and the device
disagrees, suspect the engine first.

## E2E (Maestro)

The flows in `e2e/flows/` run against the **development build** on an Android emulator or
phone, served by a Metro the runner starts itself, against the **local** Supabase.

### What is covered

| Flow                             | SPEC          | Proves                                                                       |
| -------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `01-onboarding`                  | §11, §13      | A guest completes all six steps and lands on a Home that is not empty        |
| `02-age-gate`                    | §11, §41      | A ten-year-old is stopped, with no way back into onboarding                  |
| `03-lessons-every-question-type` | §15, §16, §18 | All of module 1 — every V1 question type — graded by the real server         |
| `04-wrong-answers-and-lives`     | §22           | Wrong answers after the grace period cost lives down to 0; out-of-lives      |
| `05-daily-challenge`             | §24           | The challenge pays once; the second visit shows it as claimed                |
| `06-paywall-and-restore`         | §31, §33      | The paywall shows Free, the No Ads disclaimer and plans; restore reports     |
| `07-language-and-profile`        | §13, §29, §38 | EN → RO from Home (with Romanian plurals), and back from Profile             |
| `08-guest-to-account`            | §12, D1       | A guest confirms an email through Mailpit and keeps their progress           |
| `09-export-and-delete`           | §41           | The export reaches the share sheet as a JSON file; deletion ends the session |

**Restore, end to end,** needs the RevenueCat secret key in the local Edge Functions: export
`REVENUECAT_SECRET_API_KEY` in the shell before `npx supabase start` (never in `.env` files that
reach the app). Without it the runner says so, and `06-paywall-and-restore` checks only that
restore fails honestly instead of claiming success.

**Not covered yet:** a real store
purchase (needs the store accounts; the paywall runs on the RevenueCat Test Store), social
sign-in (needs OAuth client IDs), and iOS (needs a Mac or EAS for a simulator build).

### How the answers get into the flows

A flow that plays a lesson needs its answers. They are **generated from the content files** on
every run (`scripts/e2e/steps.ts` → `e2e/generated/`, gitignored), never typed into a flow, so
they cannot drift from what the server grades. Module 1 is the E2E course: it is reviewed, it is
free, and between its four lessons it holds all eight question types. `scripts/e2e/__tests__/`
checks each type's mapping, and that every `runFlow` points at a file that will exist.

The flows target `testID`s, not visible text, except for two things the app does not draw
itself: Google's consent form and toasts.

### State the flows start from

`npm run e2e` resets the local database, then applies `e2e/generated/fixtures.sql`
(`scripts/e2e/fixtures.ts`):

- the seeded free and premium accounts have finished onboarding;
- the free account has finished module 1's first three lessons — **through `submit_answer` and
  `complete_lesson`**, not by inserting rows — so the lives grace period is over;
- the Daily Challenge is pinned to three known questions for yesterday, today and tomorrow.

The reset **wipes the local database**. Use `--no-reset` to keep it (fixtures still apply).

### Setup, once

1. **Android emulator or phone** with USB debugging, visible in `adb devices`.
2. **The development build installed** on it (README, "Running on a device").
3. **Docker running and local Supabase started**: `npx supabase start`.
4. **Maestro** (needs Java 17+):
   - macOS / Linux: `curl -fsSL "https://get.maestro.mobile.dev" | bash`
   - Windows: download `maestro.zip` from the latest
     [release](https://github.com/mobile-dev-inc/maestro/releases), check it against
     `checksums_sha256.txt`, and unzip it to `%USERPROFILE%\.maestro` — the runner looks in
     `%USERPROFILE%\.maestro\maestro\bin`. Or set `MAESTRO_BIN`.

### Running

```sh
npm run e2e                                             # everything
npm run e2e -- e2e/flows/04-wrong-answers-and-lives.yaml # one flow
npm run e2e -- --no-reset                               # keep the local database
```

The runner starts Metro on port **8082** (`E2E_METRO_PORT`) with the local Supabase URL and
key, and refuses to reuse anything already on that port: a Metro started by hand may be serving
a bundle built against staging, and the suite would then write test accounts there. Results:
`e2e/results/report.xml` (JUnit) and screenshots per failed step in `e2e/results/artifacts/`.

That Metro also sets `EXPO_PUBLIC_AUTOMATION=1`: a development build then keeps React Native's
error toasts off the screen, where a swipe could open one over the app (errors still reach
Metro's log). The launch link passes `disableAutoLaunch=1` and `disableFab=1`, so the
development client's own menu and floating button stay out of the way too. The store
screenshots (`npm run store:screenshots`, `docs/STORE.md`) run on the same plumbing,
`scripts/e2e/harness.ts`.

### When it goes wrong

| Symptom                                                                                                       | Cause and fix                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maestro hangs before the first step; `adb devices` hangs too                                                  | The adb server is wedged (platform-tools 37 on Windows, after it has been up a while). The runner restarts adb at the start of every run and times out adb calls after 30 s; if even that hangs, stop **every** `adb.exe` in Task Manager and run again. |
| Android asks which app should open a link                                                                     | Two builds share `exp+codesprint`. The flows use the dev build's own `codesprint-dev://` scheme for this reason — keep it that way.                                                                                                                      |
| Everything is slow, `pm` commands time out                                                                    | The emulator is out of memory. Give it 4 GB (`-memory 4096`) and cold-boot it.                                                                                                                                                                           |
| The emulator never appears in `adb devices` after a restart                                                   | It is waiting on a crash-report dialog from its last run, on the desktop. Answer it, or move `%TEMP%\AndroidEmulator\emu-crash-*.db` aside.                                                                                                              |
| The app closes in the middle of a flow, on Android's home screen                                              | `hideKeyboard` pressed Back while no keyboard was up. Flows never use it: Enter submits a form, or closes the keyboard on the answer box.                                                                                                                |
| Every flow fails at launch after installing a new dev build; logcat says `ANR ... failed to complete startup` | The build is not compiled yet, and a cold start verifies bytecode too slowly. The runner compiles it (`cmd package compile -m speed`); by hand, run that once after installing.                                                                          |
| `Function not found` from a new Edge Function                                                                 | The local edge runtime loads the functions it found at start. `npx supabase stop && npx supabase start` after adding one.                                                                                                                                |
| A tap becomes a long press (text selected, a menu with Copy and Select all)                                   | The emulator is overloaded after hours of runs. Cold-boot it; `npm run store:screenshots -- --only <locale>/<theme>` retakes one variant.                                                                                                                |
| A flow fails on "Do not consent"                                                                              | Development builds force Google's EEA consent form; the launch subflow declines it. If it never appears, UMP could not reach Google — check the network.                                                                                                 |
