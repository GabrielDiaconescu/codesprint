# Contributing

Conventions for changing CodeSprint. The why behind the structure is in
`docs/ARCHITECTURE.md`; the scope is in `docs/SPEC.md`.

## Before you push

```bash
npm run verify          # typecheck + lint (zero warnings) + Jest
npm run format:check    # Prettier
npm run db:test         # pgTAP, if you touched supabase/
npm run content:check   # if you touched content/
```

CI runs all of these plus a secret scan on every push to `main` and every pull request. A red
CI is fixed before anything else is merged.

## Code

- **Strict TypeScript.** No `any`; if one is truly unavoidable, a comment says why.
- **Routes stay thin.** Logic that can be a pure function goes in `features/<feature>/logic/`
  with a unit test. Files past ~300 lines get split.
- **SDKs only in `src/services/`.** Need an SDK elsewhere? Add a method to the service
  interface. ESLint and `architecture.test.ts` will both stop you otherwise.
- **Server state in TanStack Query, client state in Zustand.** Query keys come from
  `src/lib/queryClient.ts`.
- **Errors are handled where they happen**, shown to the learner as a localised message, and
  reported to Sentry without personal data. No blank screens, no raw error text.
- **No literal user-facing text.** Every string is an i18next key in
  `src/i18n/locales/en/*.json` **and** `ro/*.json` — a parity test fails when one is missing.
  The product name comes only from `src/constants/brand.ts`.
- **No colour, size or duration literals in screens.** They are design tokens in `src/theme/`,
  authored for light and dark.
- Path aliases: `@/features/...`, `@/services/...`, `@/components/...`, `@/theme`, `@/lib/...`.

## Tests

- Business logic gets unit tests; components get React Native Testing Library tests.
- RNTL v14: **`render`, `rerender` and `fireEvent` are async — always `await` them.** A
  missing `await` either fails confusingly or, worse, asserts against the state before the
  event and passes.
- Database behaviour — policies, grading, idempotency, caps — is proven in pgTAP
  (`supabase/tests/`), not assumed from the client.
- User flows that cross many screens belong in the Maestro suite (`docs/TESTING.md`).

## Database

- **Only through new migrations** in `supabase/migrations/`. Never edit one that has been
  applied anywhere — write another.
- **RLS on every table.** Clients never write gameplay tables; they call security-definer
  functions with `set search_path = ''` and schema-qualified names.
- **Additive changes only** to functions the app calls: old builds stay installed. A breaking
  change is a new function (`…_v2`).
- **Never send answer keys to the client.**
- After a migration: `npm run db:reset`, `npm run db:test`, `npm run db:types`, and a line in
  `docs/DATABASE.md`.

## Content

Lessons are YAML under `content/`. IDs are stable UUIDs that are never regenerated. New items
start as `review_status: draft`; only a human flips them to `reviewed`. After a change:
`npm run content:check`, then `npm run content:seed` to regenerate `supabase/seed.sql`
(a test fails if it is stale). Details in `docs/CONTENT.md`.

## Dependencies

Every new dependency is justified in `docs/PROGRESS.md` (what it does that nothing already
installed does). Native modules are installed with `npx expo install` so the version matches
the SDK. A new native module changes the build's fingerprint: it needs new development and
store builds, and over-the-air updates will not reach older builds (`docs/DEPLOYMENT.md`).

## Secrets

- `EXPO_PUBLIC_*` variables are compiled into the app and public by design. **Never** put a
  secret in one.
- The Supabase secret key, the RevenueCat secret key and the webhook secret live only in
  Supabase Edge Function secrets or your shell for a one-off script. Never in the repository,
  never in `.env`, never in the EAS environment.
- `.env` and `.env.staging` are gitignored. Check `git status` before every commit.

## Commits

Small, focused commits with a message that says what changed and why. Commits made with
Claude Code end with its attribution line.
