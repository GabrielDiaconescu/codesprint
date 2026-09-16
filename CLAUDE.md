# CodeSprint — working rules for Claude Code

@docs/SPEC.md is the single source of truth for product scope. This file is the short version.
Read `docs/PROGRESS.md` first in every new session: it holds the current phase and open questions.

## Key commands

| Command                    | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `npm run dev`              | Start Metro for the development build (`expo start --dev-client`) |
| `npm run typecheck`        | `tsc --noEmit` — must be zero errors                              |
| `npm run lint`             | ESLint, `--max-warnings=0`                                        |
| `npm test`                 | Jest unit + component tests                                       |
| `npm run verify`           | typecheck + lint + test (run before declaring a phase done)       |
| `npm run db:reset`         | `supabase db reset` — apply migrations + seed (Phase 3+)          |
| `npm run db:test`          | `supabase test db` — pgTAP suite (Phase 3+)                       |
| `npm run db:types`         | Regenerate `src/types/database.types.ts` after every migration    |
| `npm run content:validate` | Content schema validation (Phase 6+)                              |

## Phase gate rule (SPEC §64) — the most important rule here

Work strictly phase by phase. After completing a phase:

1. run tests, 2. run lint + typecheck, 3. inspect the result, 4. fix issues in the current phase,
2. update `docs/PROGRESS.md`, 6. report what was implemented, 7. report test/lint/typecheck results,
3. report remaining limitations, 9. give the device test checklist, 10. list required human actions.

Then **STOP** and ask exactly: **"Are you ready to proceed to PHASE [Next Phase]?"**

Do not proceed until the user explicitly types **yes** or **approved**. Silence, further
discussion, questions or unrelated messages are not approval. Never skip a phase, never
silently continue, never implement a future phase's features while working on the current one.

## Working rules (SPEC §59)

1. Inspect the existing repository before changing anything.
2. Never destroy working functionality to simplify an implementation.
3. Prefer incremental changes; keep architecture clean; avoid giant files (split beyond ~300 lines).
4. Strict TypeScript. Avoid `any` — if unavoidable, explain why in a comment.
5. Handle errors explicitly. Write tests for non-trivial business logic.
6. Do not leave TODOs for essential functionality.
7. **Do not fake integrations.** When credentials are missing, stop and list exactly what is
   needed. Official test/sandbox modes (AdMob test IDs, store sandboxes) are real integrations.
8. Do not replace real functionality with mocked UI unless explicitly required for local dev.
9. Justify every new dependency. Install native modules with `npx expo install`.
10. Keep operating cost in mind. No external API where Supabase or local logic suffices.
11. No AI features in the app in V1 (AI-assisted content drafting during development is fine).
12. No dedicated backend server. No offline sync in V1. Do not overengineer.
13. Optimize for one developer maintaining this product.
14. Zustand for frequently changing client state; TanStack Query for server state.
15. RevenueCat for billing, always behind `BillingService`.
16. **RLS on every table.** Client writes to gameplay tables are forbidden — use security-definer RPCs.
17. **Never** put a Supabase secret key, RevenueCat secret key or any server secret in the app
    or in an `EXPO_PUBLIC_*` variable.
18. Change the database only through new migrations; never edit an applied migration;
    regenerate types afterwards.
19. **Never send answer keys to the client.**
20. Never hardcode prices, product IDs outside billing config, or user-facing strings.
21. Use Google test ad unit IDs in all non-production builds.
22. Update `docs/PROGRESS.md` at the end of every phase.
23. If a requirement conflicts with platform policy, security or law, stop and flag it.

## Architecture invariants

- Routes in `src/app` are thin; domain logic is pure and unit-tested in `features/*/logic/`.
- **Third-party SDKs may only be imported inside `src/services/`.** Enforced by ESLint
  `no-restricted-imports` and proven by `src/__tests__/architecture.test.ts` — if you need an
  SDK elsewhere, you need a service method, not an exception.
- No circular dependencies (`import/no-cycle`).
- Gameplay is server-authoritative: XP flows only through the `xp_events` ledger.
- Access control reads `user_entitlements` on the server, never a client flag.
- Content queries are keyed by `content_version` so publishing invalidates client caches.

## Conventions

- Path aliases: `@/features/...`, `@/services/...`, `@/components/...`, `@/theme`, `@/lib/...`.
- Brand strings live only in `src/constants/brand.ts` + i18n files (SPEC §9).
- User-facing text always comes from i18next — never a literal in a component.
- `@testing-library/react-native` v14: **`render` is async — always `await render(...)`.**
- Commit messages end with the project's attribution line.
