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
| `20260917120600_auth_support`           | Guest conversion mirror, abandoned-guest purge, the pg_cron schedule                                    |
| `20260917120700_onboarding`             | Age thresholds, the age gate, server-enforced minor protections                                         |
| `20260917120800_lesson_engine`          | `get_lesson`, plus the localisation helpers it needs                                                    |

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

| Function                    | Granted to          | Purpose                                                                                                                                                             |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_app_config()`          | anon, authenticated | All public config keys in one round trip                                                                                                                            |
| `update_profile(jsonb)`     | authenticated       | The **only** client write path into profiles. Whitelists columns and validates the IANA timezone; `is_anonymous` and moderation flags are deliberately not writable |
| `sync_session(text)`        | authenticated       | App-open heartbeat; accepts a timezone change. Also what keeps an active guest out of the purge                                                                     |
| `reject_underage_account()` | authenticated       | Deletes the CALLER. The age gate's only outcome below `min_user_age`                                                                                                |
| `get_lesson(uuid, text)`    | authenticated       | The only path to lesson bodies and questions. Entitlement-checked; never returns explanations, hints or answer keys                                                 |

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
| `handle_user_updated()`              | Trigger: mirrors `auth.users.is_anonymous` onto `profiles`            |
| `delete_stale_anonymous_users(int)`  | Scheduled purge of abandoned guests. See below                        |
| `age_from_birth_year(int)`           | Age reached during the current year (SPEC §11: birth year only)       |
| `is_minor(uuid)`                     | Below `minor_protection_age`. An unknown birth year fails closed      |
| `localized_text(jsonb, text)`        | Reads a localized field with an English fallback                      |
| `localize_deep(jsonb, text)`         | Collapses every localized object in a structure to one locale         |

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

### Guest accounts

Guest mode (SPEC §12, D1) is two triggers and one scheduled job.

**Conversion.** Supabase clears `auth.users.is_anonymous` when a guest confirms an email or
links an identity. `handle_user_updated()` mirrors that onto `profiles`. Without it a converted
guest would keep `is_anonymous = true` in our own table and stay excluded from the leaderboard
forever — a silent, permanent bug for exactly the users who just signed up.

Conversion keeps the **same user id**, which is the entire point: every `xp_events` row,
attempt and streak day earned as a guest still belongs to the user. Creating a second account
and migrating rows would break foreign keys and double-count XP.

**Purge.** An anonymous user is a billable Supabase MAU and can never sign back in, so
abandoned ones are deleted after 30 days by `delete_stale_anonymous_users`, scheduled through
pg_cron at 03:17 UTC.

Activity is measured by `profiles.last_seen_at`, refreshed by `sync_session()` on every app
open — **not** `auth.users.last_sign_in_at`, which freezes at account creation for anonymous
sessions because refreshing a token is not a sign-in. Using it would delete guests who are
still using the app daily.

The function is destructive, so it carries two independent guards: `is_anonymous`, and the
absence of any row in `auth.identities`. A retention window below one day raises rather than
being clamped, so a bad cron entry fails loudly instead of deleting every live guest.

### The age gate and minor protections

SPEC §11 collects the **birth year only** — a full date is more personal data than an age gate
needs. The cost is a ±1 year window, resolved identically on both sides as _the age you reach
during the current year_, so the boundary is "the year you turn 13" rather than a birthday.
`src/features/onboarding/logic/__tests__/age.test.ts` reads the migration to prove the client
copy of the thresholds matches the seeded values.

Two thresholds, both in `app_config`:

| Key                    | Default | Effect                                          |
| ---------------------- | ------- | ----------------------------------------------- |
| `min_user_age`         | 13      | Below this, no account exists (SPEC D10)        |
| `minor_protection_age` | 16      | Below this, the §41 privacy defaults are forced |

**The protections are enforced in `update_profile`, not in the app.** A fourteen-year-old's
client can send `analytics_consent: true` as easily as anyone else's, so below
`minor_protection_age` the function overrides three columns whatever arrives:

```
analytics_consent  -> false
leaderboard_hidden -> true
ads_consent_status -> 'restricted'     (Phase 15 reads this before a personalised ad)
```

`is_minor()` fails closed: a user who has not answered the age gate counts as a minor, because
guessing wrong is expensive precisely when the answer is missing.

**Below the minimum age the account is deleted**, not merely blocked.
`reject_underage_account()` removes the caller and cascades. Signing out and leaving the row
behind would mean storing a child's email address indefinitely.

One consequence worth knowing: an access token stays cryptographically valid until it expires,
so a stale token is still _accepted_ by PostgREST after the delete. It sees nothing, because
RLS finds no rows, and the app signs out immediately afterwards.

### The lesson engine

`lesson_contents` and `questions` have no grants and no policies at all. `get_lesson` is the
only way either reaches a client, and it checks two things before returning anything: that the
lesson and its module are active, and that `can_access_module()` allows it.

**What it does not return matters as much as what it does.** Explanations and hints are the
reward for answering (SPEC §17, §18); shipping them with the lesson would let anyone read the
reasoning before attempting anything. Answer keys never appear under any circumstance.

The client is told `has_hint` — whether one exists — so it can decide whether to offer the
button. Asking for the hint itself is a separate request.

Errors are distinguished on purpose, because they mean different screens:

| Code    | Meaning                     | What the app shows |
| ------- | --------------------------- | ------------------ |
| `42501` | Module requires Premium     | The paywall        |
| `P0002` | Lesson missing or withdrawn | "Lesson not found" |
| `28000` | Not authenticated           | The sign-in screen |

Text is localised **on the server** via `localize_deep`, which replaces every object carrying
an `en` string with the string for the requested locale. Applying it to whole blocks rather
than field by field means option text, concept labels and captions all localise by the same
rule, and a new field cannot be forgotten. It also keeps the payload inside the 50 KB cap
(SPEC §45) once a second language exists — a seeded lesson is currently under 4 KB.

---

## Auth configuration

`supabase/config.toml` is part of the schema in practice — these settings are what the client
rules in `src/features/auth/logic/validation.ts` mirror, and `validation.test.ts` reads the
file to prove the two agree.

| Setting                     | Value               | Why                                                      |
| --------------------------- | ------------------- | -------------------------------------------------------- |
| `enable_anonymous_sign_ins` | true                | Guest mode (D1)                                          |
| `enable_confirmations`      | true                | Email verification (SPEC §12)                            |
| `enable_manual_linking`     | true                | Guest to account conversion                              |
| `minimum_password_length`   | 8                   | Mirrored by `validatePassword`                           |
| `password_requirements`     | `letters_digits`    | Mirrored by `validatePassword`                           |
| `site_url`                  | `codesprint-dev://` | The app has no website; the scheme is the return address |
| `additional_redirect_urls`  | scheme wildcards    | The app appends its own `flow` parameter to `redirectTo` |

> **`npm run db:reset` does NOT apply changes to this file.** The Auth container reads it only
> at startup, so a config change needs `npx supabase stop && npx supabase start`. A reset alone
> leaves the old settings running, and the symptoms are confusing — anonymous sign-in rejected
> with `anonymous_provider_disabled` while the file plainly enables it.

Local email goes to Mailpit at http://127.0.0.1:54324. Production requires custom SMTP;
Supabase's built-in sender is not permitted there.

---

## Testing

`npm run db:test` runs the pgTAP suite:

| File                              | Proves                                                                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_schema_invariants.test.sql`   | RLS on every table; answer keys have zero policies and force RLS; no client write grants anywhere but `reports`; every SECURITY DEFINER function pins `search_path`; the XP unique constraint still exists |
| `02_rls_access_matrix.test.sql`   | The full matrix above for anon / guest / free / premium / other user, including the negative cases                                                                                                         |
| `03_xp_ledger.test.sql`           | Award, replay, inflated replay, accumulation across sources, and rewarded-ad XP excluded from the leaderboard                                                                                              |
| `04_auth_support.test.sql`        | Guest bootstrapping, conversion mirroring and id stability, and that the purge deletes abandoned guests only — never an active guest, a converted one, or a dormant registered user                        |
| `05_onboarding_age_gate.test.sql` | That a minor's client cannot buy past the §41 defaults on the first attempt or a later one, that an adult keeps full control, and that an under-age account is deleted and nobody else with it             |
| `06_lesson_engine.test.sql`       | That `get_lesson` refuses a premium module to free users and guests, opens it for a premium user, reports missing and withdrawn lessons distinctly, and never returns an explanation, hint or answer       |

CI runs these against a fresh database on every push, and fails if
`src/types/database.types.ts` is out of date.

---

## Not built yet

Phase 3 delivers the foundation. These arrive with the features that need them:

- Practice and exam RPCs — Phase 8/13
- `submit_answer` with grading, lives and achievements — Phase 8/10
- `get_leaderboard`, `get_progress_summary` — Phase 9/12
- `export_my_data`, `delete-account` Edge Function — Phase 18
- Sign in with Apple / Google — needs store credentials (SPEC §12, D6)
- `supabase/seed.sql` — produced by the content pipeline in Phase 6
