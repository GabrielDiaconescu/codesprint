# Deployment

How CodeSprint gets from this repository to TestFlight, Google Play testing tracks and, later,
the stores (SPEC §51, §57 Phase 22). Store listings, screenshots and review forms are Phase 23
and are not covered here.

Two commands frame everything below:

```bash
npm run release:check     # what still blocks a production build — names only, never values
npm run release:update    # publish a JavaScript-only fix to production builds (see "Updates")
```

---

## The three environments

| Environment | Database                          | App build profile | EAS environment | Scheme               |
| ----------- | --------------------------------- | ----------------- | --------------- | -------------------- |
| local       | `npx supabase start` (Docker)     | `development`     | —               | `codesprint-dev`     |
| staging     | `uzmqmmvpunkxogvtbypl` (free)     | `preview`         | `preview`       | `codesprint-preview` |
| production  | its own project (paid, Frankfurt) | `production`      | `production`    | `codesprint`         |

The three builds install side by side (`com.codesprint.app.dev`, `.preview`, and
`com.codesprint.app`). A production build only ever talks to the production project;
`release:check` refuses a production environment that points at staging.

---

## 1. Production Supabase — once

Everything here needs a Supabase access token on your machine: `npx supabase login`.

1. **Create the project.** Pro plan (free projects pause after a week idle, SPEC §6), region
   **eu-central-1 (Frankfurt)** for EU residency (SPEC §41). Keep the database password in a
   password manager.

2. **Apply the schema.**

   ```bash
   npx supabase link --project-ref <production-ref>
   npx supabase db push
   ```

   `db push` applies only migrations the project has not seen, in order. It also schedules the
   nightly purge of abandoned guests (`pg_cron`, created by a migration).

   **Never** run `supabase db reset` against it, and **never** run `supabase/seed.sql` there:
   the seed creates test accounts whose password is in this repository, one with a Premium
   fixture.

3. **Auth settings — in the dashboard, by hand.** Do **not** use `supabase config push`:
   `supabase/config.toml` is the _development_ configuration (dev scheme, `exp://` redirects)
   and would overwrite production with it.

   | Setting (Authentication →)        | Production value                                                                                                                                                                        |
   | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | URL Configuration → Site URL      | `codesprint://`                                                                                                                                                                         |
   | URL Configuration → Redirect URLs | `codesprint://**` — only this; no `exp://`, dev or preview                                                                                                                              |
   | Sign In / Providers → Anonymous   | on (D1)                                                                                                                                                                                 |
   | Sign In / Providers → Email       | confirm email **on**; secure email change **on**; secure password change **off** — on, a guest more than a day old cannot create an account; the app checks the current password itself |
   | Audit Logs                        | “Write audit logs to the database” **off** — those rows keep the email after an account is deleted (`docs/LEGAL-REVIEW.md`)                                                             |
   | Passwords                         | minimum 8, letters and digits — as in `config.toml`                                                                                                                                     |
   | Emails → SMTP                     | your own SMTP provider; the built-in sender is not for prod                                                                                                                             |
   | Rate Limits                       | review; tighten anonymous sign-ins if abused (SPEC §12)                                                                                                                                 |
   | Attack Protection → CAPTCHA       | off at launch; on if anonymous sign-ups are abused                                                                                                                                      |

   And at the analytics and crash providers, so the privacy policy stays true: PostHog —
   “Discard client IP data” on and data retention 12 months; Sentry — the project in the **EU**
   region, event retention at most 90 days.

4. **Edge Functions and their secrets.**

   ```bash
   npx supabase functions deploy --project-ref <production-ref>
   npx supabase secrets set --project-ref <production-ref> \
     REVENUECAT_SECRET_API_KEY=sk_... \
     REVENUECAT_WEBHOOK_AUTH=<long random string>
   ```

   This deploys all three (`delete-account`, `sync-entitlements`, `revenuecat-webhook`) with the
   JWT settings from `config.toml`. `SUPABASE_URL` and the service keys are injected by
   Supabase itself. Point the RevenueCat webhook at the production URL as described in
   `docs/MONETIZATION.md`, "RevenueCat setup".

5. **Content.** Only reviewed lessons and questions reach production (SPEC §35.3):

   ```bash
   SUPABASE_URL=https://<production-ref>.supabase.co SUPABASE_SECRET_KEY=... \
     npm run content:publish -- --production
   ```

   The secret key is for this command only, typed into your shell — never in `.env`, never in
   an `EXPO_PUBLIC_*` variable.

6. **Remote config** (Table Editor → `app_config`). The defaults are launch values. Two keys
   change after the store records exist:
   - `ios_app_store_id` — the numeric **Apple ID** from App Store Connect → App Information.
     Until it is set, the force-update screen on iOS says "update from the App Store" without
     a button, because there is no listing to link to.
   - `min_supported_app_version` — see "Retiring an old build" below.

---

## 2. The EAS production environment — once

A production build receives exactly the variables in the EAS `production` environment, and
nothing from your `.env`. Set each with:

```bash
npx eas-cli env:create --environment production --name <NAME> --value <VALUE> --visibility plaintext
```

| Variable                                                            | Visibility | Where the value comes from                           |
| ------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`                                          | plaintext  | production project → Settings → API                  |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                              | plaintext  | the same page — the **publishable** key only         |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`                                    | plaintext  | RevenueCat → API keys → App Store public key         |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`                                | plaintext  | RevenueCat → API keys → Play Store public key        |
| `EXPO_PUBLIC_ADMOB_{BANNER,INTERSTITIAL,REWARDED}_ID_{IOS,ANDROID}` | plaintext  | AdMob → the six ad units                             |
| `ADMOB_APP_ID_IOS`, `ADMOB_APP_ID_ANDROID`                          | plaintext  | AdMob → App settings (`ca-app-pub-…~…`)              |
| `EXPO_PUBLIC_POSTHOG_KEY`                                           | plaintext  | PostHog **EU** project → project API key             |
| `EXPO_PUBLIC_POSTHOG_HOST`                                          | plaintext  | `https://eu.i.posthog.com`                           |
| `EXPO_PUBLIC_SENTRY_DSN`                                            | plaintext  | Sentry project → Client Keys (DSN)                   |
| `EXPO_PUBLIC_LEGAL_BASE_URL`                                        | plaintext  | where `web/` is hosted, e.g. `https://<your-domain>` |
| `SENTRY_ORG`, `SENTRY_PROJECT`                                      | plaintext  | the Sentry organisation and project slugs            |
| `SENTRY_AUTH_TOKEN`                                                 | **secret** | Sentry → Settings → Auth Tokens (org token)          |

Every `EXPO_PUBLIC_*` value is compiled into the app and readable by anyone who has it, which
is why they are plaintext: hiding them in EAS protects nothing and stops `release:check` from
validating them. `SENTRY_AUTH_TOKEN` is the one real secret; it is used while building and
never reaches the app. The Supabase secret key, the RevenueCat secret key and the webhook
secret do **not** belong here at all (SPEC §56).

Then:

```bash
npm run release:check
```

It reads the environment through the EAS CLI, validates it with the app's own startup schema,
and adds what the schema cannot know: Google test ids left in place, a URL pointing at
staging, the legal pages' placeholders, `app-ads.txt`, and content still in draft.

---

## 3. Versions and builds

**Versions.** `version` in `app.config.ts` (now `1.0.0`) is the version people see in the
store. Change it for a release people should notice; leave it alone for a rebuild. Build
numbers — iOS `buildNumber`, Android `versionCode` — belong to EAS (`appVersionSource:
remote`) and go up by one with every production build, so two uploads never collide.

**Builds** run in the cloud; no Mac is needed for iOS.

```bash
npx eas-cli build --profile production --platform android   # an .aab for Google Play
npx eas-cli build --profile production --platform ios       # an .ipa for App Store Connect
```

- **iOS signing:** on the first build EAS asks for your Apple Developer login and creates the
  distribution certificate and provisioning profile itself. Needs the paid Apple Developer
  Program membership.
- **Android signing:** on the first build EAS generates the upload keystore and keeps it.
  Download a copy once (`npx eas-cli credentials`) and keep it in the password manager —
  with Play App Signing a lost upload key can be reset, but only through Google support.
- **Sentry:** a production build uploads its source maps and native symbols to Sentry while it
  is built, and **fails** if `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` or `SENTRY_PROJECT` are missing
  — deliberately, since a store build whose crashes cannot be read is not worth shipping.
  Development and preview builds skip the upload (`SENTRY_DISABLE_AUTO_UPLOAD` in `eas.json`).

---

## 4. TestFlight and Google Play testing

### iOS → TestFlight

1. App Store Connect → Apps → **+** → New App: bundle id `com.codesprint.app`, the name you
   cleared (SPEC §0.3), any SKU.
2. Copy the app's **Apple ID** (App Information) into `eas.json` →
   `submit.production.ios.ascAppId`, and into `app_config.ios_app_store_id` (step 1.6).
3. Submit the latest build:

   ```bash
   npx eas-cli submit --profile production --platform ios --latest
   ```

4. After processing (usually minutes), the build appears under TestFlight. **Internal testers**
   (up to 100 members of your App Store Connect team) can install it at once. **External
   testers** need a short Beta App Review first.

Export compliance is already answered in the build (`usesNonExemptEncryption: false`: the app
uses only the HTTPS the OS provides).

### Android → internal testing

1. Play Console → Create app, with the same name, as an **app** that is **free** (subscriptions
   are in-app purchases; the download is free).
2. **The first upload is manual.** Google's API cannot create an app's first release, so
   download the `.aab` from the EAS build page and upload it to **Testing → Internal testing**
   by hand. Accept Play App Signing when asked.
3. For every later upload, create a Google Cloud service account with release permissions in
   Play Console, keep its JSON key **outside the repository**, and either upload it to EAS
   (`npx eas-cli credentials` → Android → Google Service Account) or point
   `submit.production.android.serviceAccountKeyPath` at it. Then:

   ```bash
   npx eas-cli submit --profile production --platform android --latest
   ```

   `eas.json` sends it to the **internal** track as a **draft**, so nothing reaches a tester
   until you press "Start rollout" in Play Console.

4. The internal track also **unlocks subscription setup**: Google lets you create subscription
   products only after a bundle has been uploaded (SPEC §57). That is the moment to create the
   three products in `docs/MONETIZATION.md`.

### Closed testing

With an **Organization** Play account (D12, the plan in `docs/PROGRESS.md`) production access
does not wait on a closed test. With a **Personal** account it does: at least **12 testers
opted in for 14 continuous days** in a closed track before Google grants production access —
recruit 15–20 so drop-outs do not reset the clock.

---

## 5. Updates over the air

For JavaScript and asset fixes only. Anything native — a new or upgraded native module, a
change to `app.config.ts`, a plugin option — ships as a new store build.

```bash
npm run release:update -- --message "Fix the streak card on small screens"
```

The script always passes `--channel production --environment production`, and the second flag
matters more than it looks. An update reaches only builds with the same **runtime version**,
and the runtime version is a fingerprint of the native project: `app.config.ts`, `eas.json`,
native dependencies, and the build variables that feed plugins (the AdMob app ids, the Sentry
slugs). Publish without the production environment and the fingerprint is computed from your
machine's variables instead — the update lands on a runtime no build has, and nobody receives
it. `eas update` prints the runtime version it published to; it must match the build's, shown
on the build page.

- **How it arrives:** checked on launch, downloaded in the background, applied on the next
  launch. Nobody waits on a network request to open the app.
- **Staged:** add `--rollout-percentage 10` to reach a tenth of users first.
- **Rolling back:** `npx eas-cli update:rollback` (or `update:roll-back-to-embedded` to return
  everyone to the JavaScript that shipped in the build).
- **Readable crashes from an update:** with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and
  `SENTRY_PROJECT` in your shell, run `npx sentry-expo-upload-sourcemaps dist` right after
  publishing.

**Old builds stay installed** (SPEC §51). Database changes stay additive — new columns, new
functions, `submit_answer_v2` rather than a changed `submit_answer` — so a phone that has not
updated in months keeps working.

### Retiring an old build

When an old build must stop (a security fix, an RPC finally removed), raise
`min_supported_app_version` in `app_config` to the first version that is safe. Builds below it
show a full-screen "Time to update" message with a button to the store listing instead of
the app; the learner's progress is on the server and is waiting for them. The
`force_update_shown` analytics event counts who hits it.

---

## 6. Release checklist

For every store build:

1. `main` is green in CI (typecheck, lint, tests, pgTAP, content, secret scan).
2. `npm run e2e` on a development build (`docs/TESTING.md`).
3. **Database before app:** `npx supabase db push` to production, then `functions deploy` if
   a function changed. The new build may depend on them; the old builds must not break on
   them (additive only).
4. `npm run content:publish -- --production` if reviewed content changed.
5. `npm run release:check` — no blockers.
6. Bump `version` in `app.config.ts` if this is a release people should see as new.
7. Build, submit, and install from TestFlight / the internal track on a real phone. Walk
   through the latest phase checklist in `docs/PROGRESS.md`, plus: a purchase and a restore
   in the store sandbox, ads only for a free account, account deletion.
8. After release: Sentry's crash-free sessions and RevenueCat's dashboard for the first days.
