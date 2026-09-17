# DATABASE

Schema, Row Level Security and RPC reference for CodeSprint. Source of truth for scope is
`docs/SPEC.md` (§17, §39, §40); this document explains what was actually built and why.

---

## Principles

**Gameplay is server-authoritative.** The client reads its own rows and writes none of them.
Every mutation happens inside a `SECURITY DEFINER` function. This is not a preference — it is
what makes XP, lives, streaks and entitlements untamperable from a rooted device.

**Two independent layers of protection:**

1. **GRANTS.** Supabase's default privileges hand `anon`/`authenticated` full DML on new public
   tables. `20260917120400_rls_policies.sql` revokes that wholesale and grants back only the
   specific reads the client needs. A policy mistake alone therefore cannot produce a write.
2. **RLS.** Enabled on every table, restricting reads to the caller's own rows.

The practical consequence, proven in `supabase/tests/02_rls_access_matrix.test.sql`: an
unauthorised read fails with a **permission error (42501)**, not an empty result set. The
request is refused before RLS is even consulted.

**Never edit an applied migration** (SPEC §59.28). Add a new one and regenerate types with
`npm run db:types`.

---

## Commands

| Command              | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `npx supabase start` | Start the local stack (Docker required)                          |
| `npm run db:reset`   | Recreate the database, apply every migration, run the seed       |
| `npm run db:test`    | pgTAP suite                                                      |
| `npm run db:types`   | Regenerate `src/types/database.types.ts` — after every migration |
| `npx supabase stop`  | Stop the local stack                                             |

Local Studio: http://127.0.0.1:54323 · API: http://127.0.0.1:54321

---

## Migrations

| File                                    | Contents                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `20260917120000_extensions_and_helpers` | Enums, `set_updated_at`, `require_auth_uid`, date helpers                                               |
| `20260917120100_content_tables`         | courses, modules, lessons, lesson_contents, questions, question_answer_keys, exams                      |
| `20260917120200_user_tables`            | profiles, user_stats, xp_events, attempts, progress, achievements, leaderboard, exams, billing, reports |
| `20260917120300_app_config`             | Config table plus the seeded default values                                                             |
| `20260917120400_rls_policies`           | Grant revocation, RLS on every table, all policies                                                      |
| `20260917120500_core_functions`         | Entitlements, module gating, the XP ledger, profile RPCs                                                |

---

## Tables

### Content

Authored as YAML in `content/`, published by `scripts/content/publish.ts` (Phase 6). IDs are
**stable UUIDs from the content files** and are never regenerated, so user attempts keep
pointing at the right question across republishes. Rows are never deleted — publishing sets
`is_active = false` so historical attempts keep their foreign keys.

| Table                  | Notes                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `courses`              | Localized JSONB title/description                                                                                                                                  |
| `modules`              | `is_premium_override` is NULL by default — premium status is **computed** from `app_config.free_module_count`, so moving the free boundary (D5) needs no migration |
| `lessons`              | Metadata only                                                                                                                                                      |
| `lesson_contents`      | Blocks JSONB, separate table so listing lessons stays small (SPEC §45: 50 KB payload cap)                                                                          |
| `questions`            | `payload` holds rendering data and is constrained against containing an answer field                                                                               |
| `question_answer_keys` | **RLS enabled, FORCE ROW LEVEL SECURITY, zero policies, no grants.** Readable only inside SECURITY DEFINER functions                                               |
| `exams`                | The free sample and full premium exam are two **rows**, not a code branch                                                                                          |

### Per-user

`profiles`, `user_stats`, `xp_events`, `user_question_attempts`, `user_lesson_progress`,
`user_daily_activity`, `user_daily_challenge_claims`, `user_achievements`, `exam_attempts`,
`leaderboard_weekly`, `user_entitlements`, `rewarded_ad_grants`.

All follow the same pattern: **own-row SELECT policy, no INSERT/UPDATE/DELETE policy at all.**

### Server-only

`billing_events` (webhook idempotency log, keyed by the RevenueCat event id),
`daily_challenges` (schedule — exposing it early would leak tomorrow's challenge),
`app_config` (public keys readable, private keys never).

---

## Access matrix

Proven for all five roles in `supabase/tests/02_rls_access_matrix.test.sql`.

| Data                                                                       | anon   | guest                  | free       | premium    | other user |
| -------------------------------------------------------------------------- | ------ | ---------------------- | ---------- | ---------- | ---------- |
| `courses` / `modules` / `lessons` / `exams` (active)                       | denied | read                   | read       | read       | read       |
| `achievements` (catalogue)                                                 | denied | read                   | read       | read       | read       |
| `lesson_contents`, `questions`, `daily_challenges`                         | denied | RPC only               | RPC only   | RPC only   | denied     |
| `question_answer_keys`                                                     | never  | never                  | never      | never      | never      |
| `profiles`                                                                 | denied | own                    | own        | own        | denied     |
| `user_stats`, `xp_events`, attempts, progress, achievements, exam attempts | denied | own read, **no write** | same       | same       | denied     |
| `user_entitlements`                                                        | denied | own read               | own read   | own read   | denied     |
| `billing_events`                                                           | never  | never                  | never      | never      | never      |
| `app_config` (public keys)                                                 | read   | read                   | read       | read       | read       |
| `reports`                                                                  | denied | insert own             | insert own | insert own | denied     |

`app_config` is readable by `anon` on purpose: the force-update check and first-launch flags
must work before the guest session exists. Only `is_public` rows are ever visible.

---

## Functions

Every `SECURITY DEFINER` function pins `search_path = ''` and schema-qualifies every name —
asserted by a pgTAP test, because without it a caller can put a malicious schema earlier on
the search path and hijack an unqualified reference while the function runs as owner.

`EXECUTE` is **default-deny**: nothing is callable by a client unless explicitly granted.

### Client-callable

| Function                | Granted to          | Purpose                                                                                                                                                             |
| ----------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_app_config()`      | anon, authenticated | All public config keys in one round trip                                                                                                                            |
| `update_profile(jsonb)` | authenticated       | The **only** client write path into profiles. Whitelists columns and validates the IANA timezone; `is_anonymous` and moderation flags are deliberately not writable |
| `sync_session(text)`    | authenticated       | App-open heartbeat; accepts a timezone change                                                                                                                       |

### Internal (no client grant)

| Function                             | Purpose                                                               |
| ------------------------------------ | --------------------------------------------------------------------- |
| `award_xp(...)`                      | **The only write path for XP.** See below                             |
| `has_entitlement(uuid, entitlement)` | The authority for paid access (SPEC §31)                              |
| `is_ad_free(uuid)`                   | `no_ads OR premium`                                                   |
| `module_requires_premium(uuid)`      | Computed from `free_module_count`                                     |
| `can_access_module(uuid, uuid)`      | Free boundary + entitlement                                           |
| `config_int(text, integer)`          | Numeric config read with a fallback                                   |
| `local_date_for(text, timestamptz)`  | Server-side local date; unknown timezone degrades to UTC              |
| `iso_week_start(timestamptz)`        | Leaderboard partition key                                             |
| `require_auth_uid()`                 | Raises 28000 on an unauthenticated request                            |
| `handle_new_user()`                  | Trigger: creates profile + stats for every auth user, guests included |

### The XP ledger

`award_xp(user_id, source_type, source_id, amount, counts_for_leaderboard)` is the single
write path for XP in the entire product.

Idempotency is **structural, not procedural**: `ON CONFLICT DO NOTHING` against
`UNIQUE (user_id, source_type, source_id)` means a replayed request awards nothing and
returns `0`. No caller has to remember to check first — a dropped response, a double tap or a
retry after timeout all collapse to the same reward key.

The ledger row, `user_stats.xp_total` and `leaderboard_weekly` are written in the same
transaction, so the denormalised totals cannot drift from the ledger.

Rewarded-ad XP passes `counts_for_leaderboard = false`, so it credits the user without
inflating the ranking (SPEC §19).

---

## Testing

`npm run db:test` runs the pgTAP suite:

| File                            | Proves                                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_schema_invariants.test.sql` | RLS on every table; answer keys have zero policies and force RLS; no client write grants anywhere but `reports`; every SECURITY DEFINER function pins `search_path`; the XP unique constraint still exists |
| `02_rls_access_matrix.test.sql` | The full matrix above for anon / guest / free / premium / other user, including the negative cases                                                                                                         |
| `03_xp_ledger.test.sql`         | Award, replay, inflated replay, accumulation across sources, and rewarded-ad XP excluded from the leaderboard                                                                                              |

CI runs these against a fresh database on every push, and fails if
`src/types/database.types.ts` is out of date.

---

## Not built yet

Phase 3 delivers the foundation. These arrive with the features that need them:

- `get_lesson`, practice and exam RPCs — Phase 7/8/13
- `submit_answer` with grading, lives and achievements — Phase 8/10
- `get_leaderboard`, `get_progress_summary` — Phase 9/12
- `export_my_data`, `delete-account` Edge Function — Phase 18
- Sign in with Apple / Google — needs store credentials (SPEC §12, D6)
- `supabase/seed.sql` — produced by the content pipeline in Phase 6
