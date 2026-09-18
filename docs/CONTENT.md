# CONTENT

How lessons are written, checked and published. Scope lives in `docs/SPEC.md` (§15, §16, §17,
§35, §52); this explains what exists and why it works the way it does.

---

## The idea

Content is **code**. It lives in the repository as YAML, gets reviewed in pull requests, and is
validated and executed in CI like anything else. Nothing reaches learners without passing both.

The alternative — editing questions directly in a database — has no review, no history and no
way to prove a lesson is correct. This way a wrong answer is a failing build.

---

## Layout

```
content/python-fundamentals/
  course.yaml                              the course, and its exams
  modules/01-getting-started/
    module.yaml                            title, order, and the lesson order
    lessons/01-what-is-python.yaml         blocks and questions
```

Module directories are named `NN-slug`, and the loader **checks that `NN` matches
`order_index` and `slug` matches the directory**. Without that the filesystem order and the
teaching order drift apart silently.

A lesson file that exists but is not listed in `module.yaml` is an error, not a draft. It is
almost always a forgotten entry rather than a deliberate omission.

---

## Commands

| Command                    | What it does                                              |
| -------------------------- | --------------------------------------------------------- |
| `npm run content:validate` | Schemas, ids, references, question counts, difficulty mix |
| `npm run content:verify`   | Runs every snippet on **both** Python versions            |
| `npm run content:check`    | Both of the above — what CI runs                          |
| `npm run content:seed`     | Regenerates `supabase/seed.sql` from the files            |
| `npm run content:publish`  | Upserts into a Supabase project (needs the secret key)    |

`npm test` also runs the validation rules, so a content mistake fails the ordinary test suite.

---

## Writing a lesson

A lesson is an ordered list of blocks (SPEC §15):

- `text` — a short explanation
- `code` — an example, with `output` and `runnable: true` when it can be executed
- `callout` — `note`, `tip` or `mistake`
- `question` — one of the eight V1 types

Rules the validator enforces:

- **4–8 questions per lesson.** Fewer is thin, more stops being a five-minute session.
- **A lesson may not open with a question.** Teach first.
- **Every question needs an explanation of at least 25 characters.** The explanation is the
  teaching moment after an answer (SPEC §18), and one clause is not an explanation.
- **Every module needs easy and medium questions**, and may not be more than 75% one
  difficulty.
- **No placeholder text.** `TODO`, `lorem ipsum`, `Question 1`, `Option A` and friends are
  rejected outright (SPEC §52).

### Ids are permanent

Every course, module, lesson and question carries a UUID written by hand into the file:

```bash
node -e "console.log(require('node:crypto').randomUUID())"
```

**Never regenerate one.** User attempts, exam records and progress all reference questions by
id. Changing an id does not rename a question — it creates a different one and orphans
everything that pointed at the old one.

### Answers are never in the payload

This is the rule the whole content model rests on.

```yaml
payload: # served to the client
  options:
    - id: joined
      text: { en: '34' }
answer: # NEVER served — goes to question_answer_keys
  option_id: joined
```

Three independent layers enforce it: the schemas keep them in separate fields, `build.ts`
routes them to separate tables, and `questions` carries a CHECK constraint that rejects an
answer-shaped key in `payload`. A unit test asserts it over the real content on every run.

---

## Verification — the part that catches wrong content

Validation proves a file is well **formed**. It cannot tell whether a lesson is **true**.

`verify_python.py` executes every runnable snippet and compares the real output with what the
content claims:

| What it checks             | Why                                                          |
| -------------------------- | ------------------------------------------------------------ |
| `code` blocks              | A lesson that says a program prints 24 when it prints 25     |
| `predict_output` questions | The stated answer is what Python actually produces           |
| `code_ordering` questions  | The stated order really is the one that works                |
| `debugging` questions      | The broken version is **actually broken**, and the fix works |

That last one matters more than it looks. A "find the bug" question whose code runs perfectly
teaches the learner to distrust their own correct reading.

Every snippet runs on **Python 3.12 and 3.14** (D9). Output that differs between versions is a
trap, because the learner's Python may not be ours.

Snippets run in a temporary directory with stdin closed and a 10 second timeout, so one that
waits for input fails fast instead of hanging the suite.

### Local setup

The verifier finds interpreters by `python3.12` on POSIX, `py -3.12` on Windows, or the
`PYTHON_3_12` / `PYTHON_3_14` environment variables. It **refuses to run** when one is
missing rather than quietly checking only the other.

---

## Review and publishing

Every lesson and question has a `review_status` of `draft` or `reviewed`.

- **Staging** publishes everything, so drafts can be read in a real app.
- **Production** publishes only `reviewed` items. `publish.ts` filters them out and says how
  many it skipped.

```bash
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run content:publish -- --dry-run
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run content:publish -- --production
```

The secret key lives in your shell or in CI secrets. Never in `.env`, never in the app
(SPEC §59.27).

Publishing:

1. refuses to run if validation fails — serving bad content is worse than serving none;
2. upserts by stable id;
3. **never deletes.** Content no longer in the files is set `is_active = false`, so historical
   attempts keep their foreign keys;
4. bumps `content_version` in `app_config`, which invalidates every client's cache without any
   push mechanism (SPEC §35).

---

## The development seed

`supabase/seed.sql` is **generated, never edited**. `supabase db reset` applies it
automatically, and CI fails if it has drifted from the content files.

It contains the real content plus three test accounts (SPEC §52). Password for all of them:
`sprint2026`.

| Account                   | What it exercises                             |
| ------------------------- | --------------------------------------------- |
| `free@codesprint.test`    | Ads, lives, the free module boundary          |
| `noads@codesprint.test`   | `no_ads` entitlement                          |
| `premium@codesprint.test` | `no_ads` + `premium`: every module, full exam |

All three are named and carry a birth year. The birth year is not decoration: an unknown one
is treated as a minor, and minors are hidden from the leaderboard (SPEC §41), so without it
the "hide me" toggle could never be switched off.

It also creates **60 ranked fixture accounts** (`Sprinter 01`…`Sprinter 60`) on the current
ISO week's leaderboard. A ranking with one row proves nothing — the top-50 slice and the ±5
neighbours only behave differently once there are more competitors than the slice holds. They
have no `auth.identities` row, so they cannot sign in; they are rows that exist to be ranked.
Their XP is written straight to `leaderboard_weekly` rather than through the ledger, which is
the one place this seed departs from real gameplay.

`iso_week_start()` is evaluated at reset time, so they always land in the current week. A
database left unreset across a Monday shows an empty board until the next reset.

Their entitlement rows are tagged `store = 'dev-seed'` so a fixture is never mistaken for a
real purchase. **They must never exist in production** (SPEC §31) — `seed.sql` is only ever
applied to a local database, and `publish.ts` writes content and nothing else.

> If a seeded account cannot sign in with a "Database error querying schema" 500, the token
> columns on `auth.users` are NULL. GoTrue scans them into Go strings rather than pointers, so
> they must be empty strings. The generator sets all eight.

---

## Current volume

|                | Now (development seed) | Launch target (Phase 19) |
| -------------- | ---------------------- | ------------------------ |
| Modules        | 2                      | 17                       |
| Lessons        | 8                      | 60–100                   |
| Questions      | 40                     | 300–500                  |
| Exam pool      | 38                     | ≥ 60                     |
| Challenge pool | 39                     | ≥ 60                     |

All eight V1 question types are represented, so every renderer is exercised.

---

## Adding a question type

1. Add the schema to `src/lib/content/schema.ts` and list it in `QUESTION_TYPES`.
2. Add the value to the `question_type` enum with a new migration.
3. Add the renderer (Phase 8) and the server-side grader.
4. Write at least one question of that type — `validate.ts` fails until you do.
