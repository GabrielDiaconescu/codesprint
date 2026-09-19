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

| File                                       | Contents                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `20260917120000_extensions_and_helpers`    | Enums, `set_updated_at`, `require_auth_uid`, date helpers                                               |
| `20260917120100_content_tables`            | courses, modules, lessons, lesson_contents, questions, question_answer_keys, exams                      |
| `20260917120200_user_tables`               | profiles, user_stats, xp_events, attempts, progress, achievements, leaderboard, exams, billing, reports |
| `20260917120300_app_config`                | Config table plus the seeded default values                                                             |
| `20260917120400_rls_policies`              | Grant revocation, RLS on every table, all policies                                                      |
| `20260917120500_core_functions`            | Entitlements, module gating, the XP ledger, profile RPCs                                                |
| `20260917120600_auth_support`              | Guest conversion mirror, abandoned-guest purge, the pg_cron schedule                                    |
| `20260917120700_onboarding`                | Age thresholds, the age gate, server-enforced minor protections                                         |
| `20260917120800_lesson_engine`             | `get_lesson`, plus the localisation helpers it needs                                                    |
| `20260917120900_question_grading`          | `submit_answer`, the grader for all eight types, normalisation, question XP                             |
| `20260917121000_progress`                  | `complete_lesson`, `get_progress_summary`, `get_user_stats`, and the counters they read                 |
| `20260917121100_streak_lives_achievements` | Lazy streaks, lazy lives, the achievement catalogue and its engine                                      |
| `20260917121200_practice_and_challenge`    | Practice XP and sets, the Daily Challenge, and the Home summary                                         |
| `20260917121300_leaderboard`               | Display names, the weekly ranking, reports, and the per-day ranking cap                                 |
| `20260917121400_exams`                     | Exam attempts: the frozen paper, the server-side clock, grading, and score XP                           |
| `20260917121500_billing`                   | Entitlement reconciliation, the webhook idempotency log, and the client's view of it                    |
| `20260917121600_lifetime_entitlements`     | Reports the no_ads expiry, so a lifetime purchase can be told from a subscription                       |
| `20260917121700_rewarded_ads`              | Server-granted rewarded-ad rewards under a per-day cap                                                  |

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

| Function                                           | Granted to          | Purpose                                                                                                                                                             |
| -------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_app_config()`                                 | anon, authenticated | All public config keys in one round trip                                                                                                                            |
| `update_profile(jsonb)`                            | authenticated       | The **only** client write path into profiles. Whitelists columns and validates the IANA timezone; `is_anonymous` and moderation flags are deliberately not writable |
| `sync_session(text)`                               | authenticated       | App-open heartbeat; accepts a timezone change. Also what keeps an active guest out of the purge                                                                     |
| `reject_underage_account()`                        | authenticated       | Deletes the CALLER. The age gate's only outcome below `min_user_age`                                                                                                |
| `get_lesson(uuid, text)`                           | authenticated       | The only path to lesson bodies and questions. Entitlement-checked; never returns explanations, hints or answer keys                                                 |
| `submit_answer(uuid, jsonb, answer_context, text)` | authenticated       | Grades one answer, records the attempt, awards question XP in lesson context. Returns the verdict, explanation, hint and — only now — the key                       |
| `complete_lesson(uuid)`                            | authenticated       | Records a lesson as complete and pays completion XP once                                                                                                            |
| `get_progress_summary(text)`                       | authenticated       | The whole Progress screen in one round trip. Per-skill accuracy is Premium                                                                                          |
| `get_user_stats()`                                 | authenticated       | XP, streak and lives for the header on Home and Profile                                                                                                             |
| `get_achievements(text)`                           | authenticated       | The catalogue with this user's unlock dates. Locked ones are listed too                                                                                             |
| `get_home_summary(text)`                           | authenticated       | Everything the Home screen needs, in one round trip                                                                                                                 |
| `get_practice_set(text, int, text)`                | authenticated       | Review, mixed or hard practice. Never returns answers                                                                                                               |
| `get_daily_challenge(text)`                        | authenticated       | Today's challenge and its claim state                                                                                                                               |
| `claim_daily_challenge()`                          | authenticated       | Pays the bonus once per local date                                                                                                                                  |
| `set_display_name(text)`                           | authenticated       | Claims a display name. Validated and unique case-insensitively                                                                                                      |
| `get_leaderboard(int)`                             | authenticated       | The weekly ranking: top rows, the caller's position, ±5 neighbours. Never returns an email address or an auth identifier                                            |
| `report_user(uuid, text, text)`                    | authenticated       | Files a moderation report. Write-only — no client can read the queue back                                                                                           |
| `get_exam_overview(text)`                          | authenticated       | Every active exam with this learner's state, and why a locked one is locked                                                                                         |
| `start_exam(uuid, text)`                           | authenticated       | Starts or RESUMES an attempt. Freezes the question set; returns no explanation, hint or answer                                                                      |
| `save_exam_progress(uuid, jsonb)`                  | authenticated       | Merges answers into an open attempt, so a crash does not cost 45 minutes                                                                                            |
| `submit_exam(uuid, jsonb, text)`                   | authenticated       | Grades the attempt, enforces the clock, pays score XP once. Idempotent                                                                                              |
| `get_exam_results(uuid, text)`                     | authenticated       | Reopens a graded attempt's results without regrading or repaying                                                                                                    |
| `get_entitlements()`                               | authenticated       | The caller's own paid access, for the UI to reflect. Never an input to a gate                                                                                       |
| `rewarded_allowance()`                             | authenticated       | What the caller could still earn from ads today, read BEFORE an ad is offered                                                                                       |
| `claim_rewarded_ad(text)`                          | authenticated       | Grants a watched ad's reward under a server-side daily cap                                                                                                          |

### Internal (no client grant)

| Function                                    | Purpose                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `award_xp(...)`                             | **The only write path for XP.** See below                                             |
| `has_entitlement(uuid, entitlement)`        | The authority for paid access (SPEC §31)                                              |
| `is_ad_free(uuid)`                          | `no_ads OR premium`                                                                   |
| `module_requires_premium(uuid)`             | Computed from `free_module_count`                                                     |
| `can_access_module(uuid, uuid)`             | Free boundary + entitlement                                                           |
| `config_int(text, integer)`                 | Numeric config read with a fallback                                                   |
| `local_date_for(text, timestamptz)`         | Server-side local date; unknown timezone degrades to UTC                              |
| `iso_week_start(timestamptz)`               | Leaderboard partition key                                                             |
| `require_auth_uid()`                        | Raises 28000 on an unauthenticated request                                            |
| `handle_new_user()`                         | Trigger: creates profile + stats for every auth user, guests included                 |
| `handle_user_updated()`                     | Trigger: mirrors `auth.users.is_anonymous` onto `profiles`                            |
| `delete_stale_anonymous_users(int)`         | Scheduled purge of abandoned guests. See below                                        |
| `age_from_birth_year(int)`                  | Age reached during the current year (SPEC §11: birth year only)                       |
| `is_minor(uuid)`                            | Below `minor_protection_age`. An unknown birth year fails closed                      |
| `localized_text(jsonb, text)`               | Reads a localized field with an English fallback                                      |
| `localize_deep(jsonb, text)`                | Collapses every localized object in a structure to one locale                         |
| `grade_answer(uuid, jsonb)`                 | Compares a submission with its key. Malformed input grades as incorrect, never raises |
| `normalize_answer_text(text, mode)`         | Straightens curly quotes and dashes, then applies the match mode                      |
| `question_xp(uuid, integer)`                | XP for a correct answer; halved and floored on a retry                                |
| `config_numeric(text, numeric)`             | Decimal config read with a fallback (the retry multiplier)                            |
| `touch_daily_activity(uuid, int, int, int)` | Accumulates one day of activity, keyed on the user's LOCAL date                       |
| `current_streak_for(uuid)`                  | The streak as of now. A streak not extended yesterday reads as 0                      |
| `evaluate_streak(uuid)`                     | Marks today as qualifying once the daily minimum is met, and extends                  |
| `regenerate_lives(uuid)`                    | Credits lives earned since `lives_updated_at`, advancing the clock by what it spent   |
| `consume_life(uuid, answer_context)`        | Takes one life, respecting Premium, context and the beginner grace                    |
| `lives_state(uuid)`                         | Lives plus when the next one arrives                                                  |
| `achievement_rule_met(uuid, jsonb)`         | Evaluates one rule. An unknown type never unlocks                                     |
| `evaluate_achievements(uuid, text[])`       | Unlocks what the given kinds of event could have earned                               |
| `practice_xp_today(uuid)`                   | Practice XP earned on the current local day, for the cap                              |
| `award_practice_xp(uuid, uuid)`             | Pays a correct practice answer up to the daily cap                                    |
| `mistake_count(uuid)`                       | How many questions are waiting to be reviewed                                         |
| `daily_challenge_questions(uuid, date)`     | A scheduled challenge, or a deterministic pick                                        |
| `display_name_problem(text)`                | Validates a name, returning a code the client localizes. Null means acceptable        |
| `validate_display_name()`                   | Trigger: applies that rule to every write into `profiles.display_name`                |
| `leaderboard_eligible(uuid)`                | Named, registered, not hidden. The single definition of "appears on the board"        |
| `leaderboard_xp_today(uuid)`                | Leaderboard-eligible XP in the ledger for the user's local day, for the cap           |
| `config_bool(text, boolean)`                | Boolean config read with a fallback                                                   |
| `exam_unavailable_reason(uuid, uuid)`       | Why an exam cannot be started, as a code. Null means it can                           |
| `exam_question_set(uuid, uuid)`             | Picks and shuffles one attempt's questions, honouring the difficulty mix              |
| `exam_questions(uuid, text)`                | The frozen paper, rendered — no explanation, no hint text, no key                     |
| `exam_results(uuid, text, integer, jsonb)`  | Builds the results page. Internal, so a client cannot pass its own XP figure          |
| `config_bool(text, boolean)`                | (listed above)                                                                        |
| `apply_entitlements(uuid, jsonb)`           | **service_role only.** Reconciles one user against the full RevenueCat subscriber     |
| `entitlement_state(uuid)`                   | What a user currently holds, as the server sees it                                    |
| `record_billing_event(text, uuid, …)`       | **service_role only.** Logs a delivery; says whether it still needs work              |
| `rewarded_grants_today(uuid, text)`         | Grants of one reward type on the user's local day, for the cap                        |
| `mark_billing_event_processed(text)`        | **service_role only.** Marks a delivery finished                                      |

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

### Grading

Every answer in the product is graded by `submit_answer`. The client sends what the learner
chose and receives a verdict; it never sees the key beforehand and never decides anything. A
rooted phone can lie about what it displayed, but not about what this function returned
(SPEC §42).

**What comes back after an attempt.** The verdict, the explanation, the hint when one exists,
the XP awarded, and `solution` — the answer key. Releasing the key after an attempt is what
"explanation of the correct answer" (SPEC §18) requires: the renderer marks the right option,
line or pair. The attempt is recorded before the key is released, so there is no way to read
it without one.

**Text answers.** Mobile keyboards silently substitute curly quotes and typographic dashes for
the straight characters Python uses. `normalize_answer_text` straightens them unconditionally,
then applies the key's match mode: `exact`, `trimmed`, `whitespace_insensitive` (runs collapsed
to one space) or `case_insensitive`. `accepted_answers` lists alternatives the author allowed.

A choice-style `predict_output` submits the option **id**; the grader resolves the option's
authored English text from the payload. Comparing a translated label against an untranslated
program output would otherwise fail the moment a second language ships.

**Malformed input grades as incorrect** rather than raising. A missing field, a string where an
array was expected, an unknown option — all are simply wrong. Only a non-object answer raises
(`22023`), because that is a client bug worth surfacing.

**XP** (SPEC §19). Question XP is awarded through `award_xp` only in the `lesson` context, at
`xp_easy` / `xp_medium` / `xp_hard` (or the question's `xp_reward` override), halved and
floored on a retry. Attempts are counted across every context, so a question failed in a
lesson and answered later in practice is a retry. The ledger's unique reward key means a
question can never pay twice, whatever the attempt count says.

### XP, levels and progress

**The ledger is the truth; the counters are for speed.** `user_stats` and
`user_daily_activity` hold denormalised totals so Home and Progress do not aggregate the whole
history on every open (SPEC §45). They are only ever written inside the same transaction as
the thing they count.

**`complete_lesson` pays once.** `award_xp` refuses a second payment for the same lesson, and
`lessons_completed` and `completed_at` only move on the first completion. Re-reading a lesson
is something to encourage, not to pay for twice.

A lesson is **perfect** when every question was answered correctly on the first attempt
(SPEC §25). It is computed from `user_question_attempts`, never trusted from the client, and
once earned it is kept — a later re-read with a wrong answer does not revoke it.

**There is no level column anywhere.** SPEC §20 makes the level a derived display value, so
the server stores XP and every server-side rule keys on XP. The curve lives in
`app_config.level_thresholds` and is computed in `src/features/progress/logic/levels.ts`,
which extends it past the last configured entry so an active learner keeps levelling.

**Daily activity is keyed on the user's LOCAL date**, from `profiles.timezone`. A session at
23:30 in Bucharest belongs to that day, not to tomorrow. Phase 10 reads `qualified` from these
rows to decide whether a day extends a streak.

**Per-skill accuracy is Premium** (SPEC §28), and `get_progress_summary` omits it server-side
for everyone else rather than the client hiding it. Course completion counts only lessons the
user can actually reach, so a free learner is not permanently stuck below 50% because Premium
modules exist.

### Streaks, lives and achievements

All three are **lazy**. Nothing runs overnight to break a streak or return a life: a streak is
decided when it is read and lives regenerate from a timestamp. That is a cost decision
(SPEC §60) and it removes a class of bug — a cron that did not run.

**Streaks** (SPEC §21). `user_stats.current_streak` is the value _as of_ `last_qualifying_date`,
and `current_streak_for()` only honours it while that date is today or yesterday. A day
qualifies at one completed lesson **or** five answered questions, and `qualified` is set once
per day so calling after every answer is safe. `longest_streak` is a record and is never
reduced. Everything is keyed on the user's **local** date, so a session at 23:30 in Bucharest
belongs to that day.

**Lives** (SPEC §22). `regenerate_lives()` advances `lives_updated_at` by exactly the intervals
it consumed, never to `now()` — setting it to now would mean a user who opens the app every ten
minutes never regenerates, because each check would discard the partial progress. Losing the
_first_ life restarts the clock; losing a later one does not, or answering repeatedly would
keep pushing the next regeneration away.

Nothing is taken from a Premium user, in an exam (exams use attempt limits), or during the
first `lives_grace_lessons` lessons — a beginner losing their lives in the first three lessons
learns that the app punishes learning.

**Achievements** (SPEC §25). The catalogue ships in the migration because the rule _types_ are
code; adding an achievement that reuses a type is a data change. `evaluate_achievements` is
given only the rule types the event could have affected, so answering a question does not scan
the exam tables. It runs **once per call**: unlocking "First 100 XP" can push the total past
another threshold, and that one unlocks on the next event rather than recursing.

Achievement XP goes through the same ledger as everything else, so an unlock can never pay
twice. Streak rules read the **live** streak, so a broken one unlocks nothing whatever the
stored number says.

### Practice and the Daily Challenge

**Practice XP is capped per local day** (SPEC §19). The cap _truncates_ rather than refusing:
a learner one point short of forty gets that one point, not nothing. The ledger key includes
the date (`question:date`), so a question can be practised again tomorrow — unlike the lesson
reward, which is once per question forever.

**Practice can never reach past the paywall.** `get_practice_set` filters on
`can_access_module` and on the per-question premium flag, so a free learner's mixed set can
only contain questions they could already have answered in a lesson. Hard sets are Premium and
refused with `42501` rather than quietly returned empty.

**Review means mistakes.** A question appears in the review set when it has been answered
wrongly and _never since_ answered correctly. Getting it right removes it — which is what
makes the Home badge count down instead of accumulating forever.

**There is always a Daily Challenge** (SPEC §24). A scheduled row in `daily_challenges` wins
if one exists; otherwise the questions are chosen deterministically by ordering the eligible
pool on `md5(date || question id)`. The same local date always yields the same challenge, a
different date a different one, and nobody has to schedule anything.

Free learners are only ever offered non-Premium questions from unlocked modules, so the
challenge cannot become a daily preview of paid content.

**The bonus is claimed once per local date.** The primary key on
`user_daily_challenge_claims (user_id, local_date)` makes that structural rather than
procedural — a replayed request inserts nothing and pays nothing. `claim_daily_challenge`
additionally verifies that every question was actually answered _today, in challenge context_,
so the bonus cannot be collected by opening the card and closing it.

**Home is one RPC.** It is the most-opened screen in the product, and each extra request on a
cold mobile connection is another chance to show a spinner where an answer should be
(SPEC §45). `get_home_summary` returns stats, lives, the daily goal, the next lesson, course
progress, the mistake count and the challenge state together.

### The leaderboard

`leaderboard_weekly (week_start, user_id, xp)` is written inside `award_xp`, in the same
transaction as the ledger row. A new week is a new key — there is no reset job, and last
week's rows simply stop being selected (SPEC §26, §60).

Four rules decide who appears, and all four live in `leaderboard_eligible`:

- guests are excluded (they have no identity to attach a name to, and are purged after 30 days);
- a user with no display name is excluded — the alternative is showing an identifier;
- `leaderboard_hidden` excludes, whether the user set it in Settings or moderation did;
- a row with zero XP this week is not a ranking.

`get_leaderboard(limit)` returns the top `limit` (clamped to 1..100), the caller's own row and
the ±5 around them when they fall outside the slice. It returns a display name, an avatar key,
an XP figure and the pseudonymous user id — nothing else, ever. The `.strict()` Zod schema on
the client is the second lock: if a future migration widens the query, the app fails loudly
instead of quietly rendering a field nobody meant to send.

When the caller is absent, the payload says **which** of the four reasons applies, because
"choose a name", "you hid yourself", "guests are not ranked" and "no XP yet" have four
different fixes.

#### Display names

`display_name_problem(text)` is the single definition: 3–20 characters, `[[:alnum:]]` (which
is locale-aware, so "Mărioară" and "Δημήτρης" are fine) with space, underscore, dot and hyphen
allowed _between_ alphanumerics, then two config-driven lists — `display_name_blocklist`
(exact match) and `display_name_profanity` (substring). Both are compared after folding case
and stripping separators, so `M O D` and `m.o.d` are the word `mod`.

It returns a **code**, not a sentence: the database holds no user-facing English (SPEC §38).

The rule is enforced by the `profiles_validate_display_name` trigger rather than only inside
`set_display_name`, so `update_profile` and a future moderation rename are covered by the same
one copy. Uniqueness is the pre-existing `profiles_display_name_unique_idx` on
`lower(display_name)`; `set_display_name` pre-checks it for a clean `23505`, and the index
still settles a race.

#### The per-day ranking cap

`leaderboard_daily_xp_cap` (default 2000, **private**) limits how much of one local day can
count towards the RANKING. The learner always keeps every point: the ledger row and
`user_stats.xp_total` are untouched, so levels and achievements are unaffected. Only the
`leaderboard_weekly` increment is clamped.

`award_xp` clamps against the day's _uncapped_ running total, which makes the credited total
come to exactly `least(earned_today, cap)`: awards below the line count in full, the one that
crosses it counts partially, and every award after it counts nothing. XP written with
`counts_for_leaderboard = false` — rewarded-ad bonuses (SPEC §19, §30) — never reaches the
board at all, cap or no cap.

#### Reports

`reports` is insert-only for clients: an insert policy, no read policy, no `SELECT` grant.
Reading it as a client fails with `42501`, which is asserted in pgTAP. `report_user` exists so
the reporter cannot choose their own `reporter_id`, and refuses a target who is not on the
board — with the same `P0002` a genuinely unknown id produces, so it cannot be used to probe
which user ids exist. A second open report from the same reporter is accepted and files
nothing. Moderation happens in Supabase Studio (SPEC §49).

### Exam mode

An exam is the only place a learner answers a batch of questions with no feedback until the
end, against a clock the server owns. Five rules follow from that, and each one lives in the
database rather than the app:

- **the paper is frozen.** `start_exam` writes `question_ids` once. Force-quitting and
  reopening resumes that attempt — same questions, same clock — rather than dealing a new hand.
- **nothing marks the answer while the exam runs.** `exam_questions` returns the same shape a
  lesson does: prompt, payload, `has_hint` as a boolean, and no explanation, hint text or key.
- **the clock is `expires_at`**, set from the exam's own `time_limit_minutes` at start, and
  re-checked at submission. `exam_submit_grace_seconds` (60) is how late a payload is still
  taken at face value.
- **no life is ever spent** (SPEC §22). `lives_consume_in` does not list `exam`, and
  `submit_exam` never calls `consume_life`. An exam limits attempts instead.
- **XP is paid on the score, once** (SPEC §19).

#### Choosing the questions

`exam_question_set` draws from `is_exam_eligible and is_active`, filtered by
`can_access_module` and the per-question premium flag — an exam must not become a way to read
content the learner has not unlocked. `exam_difficulty_mix` (30/45/25) is a target filled per
bucket and topped up at random where a bucket falls short, because thirty easy questions is
not the same exam as thirty hard ones (SPEC §37). The result is shuffled across buckets so the
paper does not run easy-to-hard.

#### Saving, and the clock

`save_exam_progress` merges answers into `exam_attempts.answers` as the learner moves through
the paper. SPEC §27 still submits everything at once — this only means a 45-minute exam
survives the app being killed (SPEC §36).

It is also what makes the deadline enforceable without being cruel. Inside the grace period a
submitted payload counts. Past it, the payload is **ignored** and the saved answers are
marked — what the learner had when time ran out. Rejecting the submission outright would throw
away work they genuinely did.

An attempt found expired and unsubmitted by a later `start_exam` is graded on the way past.
Time running out is a result, not a pause.

#### Attempt limits

| Learner | Rule                                                                        |
| ------- | --------------------------------------------------------------------------- |
| Free    | `free_exam_attempts_per_week` (1) submitted attempts per exam, per ISO week |
| Premium | `exam_retry_cooldown_hours` (0 — none) between submitted attempts           |
| Anyone  | The full exam needs the `premium` entitlement (`requires_entitlement`)      |

`exam_unavailable_reason` is the single definition, and both `get_exam_overview` and
`start_exam` call it — so a card is greyed out for exactly the reason the RPC would refuse,
and the learner never taps something that was going to say no.

#### XP

`round(score_pct / 100 × exam_xp_max)`, paid as the **improvement over the learner's best exam
result so far** (SPEC §19). Because every exam award is itself an improvement, the running
total of `exam` ledger rows IS that best — there is no high-score column to keep in step.

The consequence, stated plainly: resitting an exam and doing worse pays nothing, and doing
better pays only the difference. An exam cannot be farmed.

Achievements (`exams_completed`, `exam_passed`) and the streak are evaluated in the same call,
and the questions are recorded in `user_question_attempts` with `context = 'exam'`, so exam
mistakes reach the review set and per-skill accuracy like any other answer.

### Billing and entitlements

One rule governs this whole area, and everything else follows from it:

> `user_entitlements` is the **only** authority for paid access. It is written exclusively by
> Edge Functions holding the service role, never by the app, and every gate in the product
> reads it through `has_entitlement` (SPEC §31).

RevenueCat's `CustomerInfo` may make the UI react the instant a purchase completes — a purchase
should feel finished when it is — but it decides nothing. A client that lies about its
`CustomerInfo` gets a nicer-looking paywall and not one extra lesson. `13_billing.test.sql`
proves a client cannot insert, update or delete an entitlement, cannot call
`apply_entitlements`, and cannot read another learner's rows.

#### Reconciliation, not deltas

`apply_entitlements(user, payload)` takes the **full** set RevenueCat reports and makes the
database match it. Anything absent is deactivated — not deleted, so the row keeps which store
it came from and when it last changed.

That is what makes webhook ordering irrelevant. The webhook never applies the event it
received; it re-fetches the whole subscriber and passes that here. A RENEWAL arriving after the
CANCELLATION it precedes cannot resurrect a lapsed subscription, because neither event is what
is being applied.

An entitlement id this build has never heard of is skipped rather than fatal: a dashboard can
be configured with tiers an installed app predates, and an old client must not fail its whole
sync over one.

#### The webhook log

`billing_events.event_id` is the primary key, so a replayed delivery inserts nothing —
idempotency is structural rather than remembered. But "already seen" is not "already done", so
`record_billing_event` returns both facts:

| Returns                                           | Meaning                                   |
| ------------------------------------------------- | ----------------------------------------- |
| `{"recorded": true, "already_processed": false}`  | New. Do the work                          |
| `{"recorded": false, "already_processed": false}` | A retry of something that failed. Redo it |
| `{"recorded": false, "already_processed": true}`  | Genuinely done. Acknowledge and stop      |

Without that distinction, a delivery whose sync failed halfway would be waved through as a
duplicate on RevenueCat's retry and the entitlement would never land.

`billing_events` has RLS with **no read policy at all** — it holds raw webhook payloads, and no
client can read it.

#### Edge Functions

| Function             | `verify_jwt` | Who calls it                                                  |
| -------------------- | ------------ | ------------------------------------------------------------- |
| `revenuecat-webhook` | **false**    | RevenueCat, authenticated by a shared secret it checks itself |
| `sync-entitlements`  | true         | The app, for the user in its own token                        |

The webhook cannot use `verify_jwt`: RevenueCat holds no Supabase session. It authenticates
with `REVENUECAT_WEBHOOK_AUTH`, compared in constant time, and **fails closed** when that
secret is unset — an unauthenticated endpoint that writes entitlements is a way for anyone who
finds the URL to grant themselves Premium.

`sync-entitlements` takes no user id parameter at all. It reads the caller from their verified
token, so the worst a malicious client can do with it is ask for its own entitlements to be
recalculated correctly.

Their logic — authorisation, subscriber mapping, which events matter — lives in
`supabase/functions/_shared/`, which is deliberately free of Deno globals so it is type-checked
and unit-tested by the ordinary `npm test` run rather than by a toolchain nobody has installed.

### Rewarded ads

A learner who has run out of lives can wait, watch an ad, or upgrade (SPEC §22). The second of
those is the only one that needs the database.

**The client grants nothing.** It watches an ad, AdMob reports that the reward was earned, and
it asks `claim_rewarded_ad` — which checks the daily cap, applies the reward and writes a row
to `rewarded_ad_grants`. Every one of those steps is server-side.

| Reward     | Cap                                  | Notes                                    |
| ---------- | ------------------------------------ | ---------------------------------------- |
| `life`     | `rewarded_life_restores_per_day` (3) | Refused when lives are full or unlimited |
| `bonus_xp` | `rewarded_xp_max_per_day` (30)       | `counts_for_leaderboard = false`         |

Two details worth spelling out:

- **Rewarded XP never reaches the leaderboard.** `award_xp` is called with
  `counts_for_leaderboard => false`, so minutes of advertising cannot outrank minutes of
  learning (SPEC §19, §26). `14_rewarded_ads.test.sql` asserts the `leaderboard_weekly` row
  simply does not appear.
- **A refusal writes nothing.** Claiming with full lives, or past the cap, raises
  `22023 rewarded unavailable: <reason>` and burns no grant — so the cap cannot be walked past
  by retrying, and a learner does not lose one of their three daily goes to a mistake the UI
  should have prevented.

`rewarded_allowance()` exists so the UI can ask _before_ offering. Making somebody sit through
thirty seconds of advertising and then telling them the cap was reached is the worst possible
order of events, and it is entirely avoidable.

#### What the server cannot check, in V1

Nothing here proves the ad was actually watched. AdMob's server-side verification is V1.1
(SPEC §42), so somebody calling the RPC in a loop gets three lives and thirty XP a day — the
same as somebody who sat through three adverts. That is a nuisance rather than an exploit, and
it is exactly why a rewarded ad must never grant Premium content or anything permanent
(SPEC §30).

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

| File                                    | Proves                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `01_schema_invariants.test.sql`         | RLS on every table; answer keys have zero policies and force RLS; no client write grants anywhere but `reports`; every SECURITY DEFINER function pins `search_path`; the XP unique constraint still exists                                                                                                                                                                                                                                                   |
| `02_rls_access_matrix.test.sql`         | The full matrix above for anon / guest / free / premium / other user, including the negative cases                                                                                                                                                                                                                                                                                                                                                           |
| `03_xp_ledger.test.sql`                 | Award, replay, inflated replay, accumulation across sources, and rewarded-ad XP excluded from the leaderboard                                                                                                                                                                                                                                                                                                                                                |
| `04_auth_support.test.sql`              | Guest bootstrapping, conversion mirroring and id stability, and that the purge deletes abandoned guests only — never an active guest, a converted one, or a dormant registered user                                                                                                                                                                                                                                                                          |
| `05_onboarding_age_gate.test.sql`       | That a minor's client cannot buy past the §41 defaults on the first attempt or a later one, that an adult keeps full control, and that an under-age account is deleted and nobody else with it                                                                                                                                                                                                                                                               |
| `06_lesson_engine.test.sql`             | That `get_lesson` refuses a premium module to free users and guests, opens it for a premium user, reports missing and withdrawn lessons distinctly, and never returns an explanation, hint or answer                                                                                                                                                                                                                                                         |
| `07_question_grading.test.sql`          | Every grader right, wrong and malformed against the real seeded questions; quote and dash normalisation per match mode; accepted alternatives; XP first time, on retry, never twice, and not in practice; attempts recorded; the paywall and the grants                                                                                                                                                                                                      |
| `08_progress.test.sql`                  | That a lesson pays once however often it is completed, that `lessons_completed` and the completion timestamp move only the first time, that a perfect lesson is computed from attempts and never revoked, that daily activity follows the user's timezone, and that per-skill accuracy is absent for a free user                                                                                                                                             |
| `09_streak_lives_achievements.test.sql` | Streak qualification, continuation, reset and lazy breakage; date-line and DST boundaries; the beginner grace, per-context consumption, Premium immunity and lazy regeneration; and that an achievement unlocks once, pays through the ledger, and never fires on a stale streak                                                                                                                                                                             |
| `10_practice_and_challenge.test.sql`    | Home for a new and a returning learner; review sets that clear as questions are answered correctly; practice never reaching past the paywall; the daily XP cap truncating rather than refusing; a deterministic challenge that is the same for a date and different across dates; and a bonus claimable once, by someone who actually finished it                                                                                                            |
| `11_leaderboard.test.sql`               | Display-name validation on every path into the column, including a direct owner write; that a guest, a hidden user, an unnamed user and last week's score are all absent from the ranking; that no email address appears anywhere in the payload; the ±5 neighbour slice; the daily ranking cap clamping the board while the learner keeps every point; and a report queue nobody can read back                                                              |
| `12_exams.test.sql`                     | That the paper is frozen and resumed rather than redealt; that it carries no explanation, hint or key while the exam runs and does carry both afterwards; the difficulty mix; that a payload past the grace period is ignored in favour of what was saved in time; the free weekly limit, the premium cooldown and the Premium gate; that score XP is the improvement over the learner's best and a worse resit pays nothing; and that no life is ever spent |
| `13_billing.test.sql`                   | That reconciliation revokes what the payload omits and keeps the history; that a lapsed expiry grants nothing however it is flagged; that an unknown entitlement id is skipped rather than fatal; that a client can neither insert, update, delete nor call its way to an entitlement; that a retry of a FAILED delivery is not mistaken for a duplicate; and that the webhook log is readable by nobody                                                     |
| `14_rewarded_ads.test.sql`              | That the daily cap stops exactly at the cap and a refusal burns no grant; that a full or unlimited set of lives is refused rather than wasted; that rewarded XP never reaches the leaderboard; that the allowance resets at the LEARNER's midnight; and that a client can neither write a grant, award itself the lives, nor forge the ledger row                                                                                                            |

CI runs these against a fresh database on every push, and fails if
`src/types/database.types.ts` is out of date.

---

## Not built yet

These arrive with the features that need them:

- `export_my_data`, and the `delete-account` Edge Function — Phase 18
- Sign in with Apple / Google — needs store credentials (SPEC §12, D6)
