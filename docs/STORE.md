# Store submission

Everything the App Store and Google Play ask for, and where each answer comes from (SPEC §41,
§62; Phase 23). Builds, signing and TestFlight are in `docs/DEPLOYMENT.md`; products and
RevenueCat in `docs/MONETIZATION.md`; privacy answers in `docs/LEGAL.md`.

Nothing here is legal advice. The age rating, content rating and privacy answers are drafts
for the review in `docs/LEGAL.md`, "For the lawyer".

---

## What is in the repository

| Path                                              | What it is                                                     |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `store/store.yaml`                                | Website, copyright, category, age rating, App Review notes     |
| `store/listing/en-US.yaml`, `ro.yaml`             | Listing text and screenshot captions, per language             |
| `store.config.json` _(generated)_                 | The App Store listing, in EAS Metadata's format                |
| `store.config.js`                                 | Adds the App Review contact from your environment, then pushes |
| `store/google-play/<locale>/*.txt` _(generated)_  | Google Play's title, short and full description                |
| `store/screenshots/` _(generated, not committed)_ | Store images, made from the real app                           |

```bash
npm run store:build          # listing text → store.config.json and store/google-play/
npm run store:screenshots    # real screenshots from the emulator → store images (~20 min)
npm run store:screenshots -- --compose-only   # re-caption existing captures, no emulator
npm run store:screenshots -- --only ro/dark   # retake one language and theme
npm run release:check        # includes what the listing still lacks
```

The product name everywhere comes from `src/constants/brand.ts`, the tagline from the i18n
files, the module count from `content/`. A rename is one line and these two commands.

### The rules the tests hold the listing to

The store limits (title and subtitle 30, promotional text 170, keywords 100, short
description 80, description 4000); no price anywhere (SPEC §0.1.5); no job, salary or speed
promises (SPEC §62); no feature that has not shipped — certificates, offline, AI, other
languages (SPEC §5); No Ads said plainly not to be Premium (SPEC §33); each store's own
subscription terms, and never the other platform's name; Terms and Privacy links in every
description (App Store guideline 3.1.2); Romanian with ș and ț, never ş and ţ (SPEC §38).

### The screenshots

Five screens — Home, a lesson, a right answer with its explanation, Learn, Progress — for each
listing language and each theme, from the development build on the emulator, with a learner
who is twelve lessons in with a seven-day streak (`scripts/store/fixtures.ts`). Every lesson
before the showcase one was played through the real answer functions; only the six earlier
streak days and the name "Maya" were set directly.

| Store       | Size        | Where                                                        |
| ----------- | ----------- | ------------------------------------------------------------ |
| App Store   | 1290 × 2796 | `store/screenshots/app-store/<locale>/{light,dark}/`         |
| Google Play | 1080 × 1920 | `store/screenshots/google-play/<locale>/{light,dark}/`       |
| Google Play | 1024 × 500  | `store/screenshots/google-play/<locale>/feature-graphic.png` |
| Google Play | 512 × 512   | `store/screenshots/google-play/icon.png`                     |

Android's status and navigation bars are cut off, so no other platform's chrome reaches the App
Store. The listings upload the **light** set; the dark set is there to swap in. The app is
iPhone-only (`supportsTablet: false`), so there are no iPad screenshots.

**Retake them on an iPhone before the first iOS submission if you can.** They are real
screens, but rendered by Android: Apple's switches and system font in the few places the app
uses them will differ slightly.

---

## Before submitting — in this order

1. **The name is cleared** (SPEC §0.3). Everything above regenerates after a rename.
2. **The app has its own icon.** `assets/icon.png`, the Android adaptive layers, the splash
   image and the favicon are still the artwork `create-expo-app` generated — Expo's mark, not
   ours (SPEC §8). Replace all six at the same sizes; `release:check` blocks until then. The
   store icon and feature graphic are made from `assets/icon.png`.
3. **A production build is in TestFlight and on the Play internal track** (`docs/DEPLOYMENT.md`).
4. **The content review is finished.** The listing describes all 17 modules; production serves
   reviewed lessons only (SPEC §35.3). Submitting before then describes a course the app does
   not contain.
5. In `store/store.yaml`: **`websiteUrl`** (where `web/` is hosted — the same address as
   `EXPO_PUBLIC_LEGAL_BASE_URL`) and **`copyright`** (`2026 <legal entity>`). Then
   `npm run store:build`.
6. `npm run store:screenshots`.
7. `npm run release:check` — no blockers.
8. **The listing still matches the offer.** It says No Ads is sold monthly _and_ once, and that
   the first `free_module_count` (6) modules are free. If the RevenueCat `default` offering
   drops a form of No Ads, or the remote config changes the free boundary, edit
   `store/listing/*.yaml` and rebuild — the stores hold you to what the page says.

---

## App Store Connect

### Pushed from the repository

```bash
export APP_REVIEW_FIRST_NAME=… APP_REVIEW_LAST_NAME=… APP_REVIEW_EMAIL=… APP_REVIEW_PHONE=+40…
npx eas-cli metadata:lint
npx eas-cli metadata:push
```

This sets, for English and Romanian: name, subtitle, promotional text, description, keywords,
support, marketing, privacy and privacy-choices URLs, and the screenshots; and once: the
category (Education), the age rating questionnaire, the App Review notes and contact, and the
release settings (manual release, phased rollout). The contact is read from your environment
because it is personal data; it is not stored in the repository.

**The age rating.** Every content question is "none"; ads **yes**; user-generated content
**yes** (display names on the leaderboard, moderated — see below); no web browser, chat,
gambling, loot boxes or parental controls. The rating is set to **13+** with the override,
matching the app's own age gate (D10), whatever the questionnaire would compute on its own.

### Entered by hand

| Section                            | Answer                                                                                                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pricing and Availability           | Free. All countries, unless the lawyer advises otherwise.                                                                                                                                             |
| App Privacy                        | The label in `docs/LEGAL.md`, "Apple — App Privacy". Advertising data is used for tracking **only** after App Tracking Transparency permission.                                                       |
| Content Rights                     | No third-party content. The lessons are ours; ads are served by AdMob under its own terms.                                                                                                            |
| Digital Services Act               | Trader. Name, address, email and phone of the PFA — **public** (open question 2 in `docs/PROGRESS.md`).                                                                                               |
| In-App Purchases and Subscriptions | The four products below, each with a review screenshot of the paywall from the TestFlight build, and submitted **with the first version** ("In-App Purchases and Subscriptions" on the version page). |
| Build                              | The TestFlight build. Export compliance is already answered inside it.                                                                                                                                |

### In-app purchases

One subscription group — display name **CodeSprint** — holding the three subscriptions, with
Premium ranked above No Ads (the upgrade path in `docs/MONETIZATION.md`). No Ads lifetime is a
non-consumable, outside the group. Apple limits: display name 30, description 45.

| Product id        | Type           | Display name (en) | Description (en)                          | Display name (ro)              | Description (ro)                            |
| ----------------- | -------------- | ----------------- | ----------------------------------------- | ------------------------------ | ------------------------------------------- |
| `no_ads_monthly`  | Subscription   | No Ads            | Learn without ads. Lessons stay the same. | Fără reclame                   | Înveți fără reclame. Lecțiile rămân la fel. |
| `no_ads_lifetime` | Non-consumable | No Ads, forever   | Remove ads for good with one purchase.    | Fără reclame, pentru totdeauna | Scapi de reclame cu o singură plată.        |
| `premium_monthly` | Subscription   | Premium           | Every module, unlimited lives, no ads.    | Premium                        | Tot cursul, vieți nelimitate, fără reclame. |
| `premium_annual`  | Subscription   | Premium (yearly)  | Every module, unlimited lives, no ads.    | Premium (anual)                | Tot cursul, vieți nelimitate, fără reclame. |

Prices are set here and in Play Console, never in the repository; the targets are in
`docs/MONETIZATION.md`.

---

## Google Play Console

### Main store listing

Paste from `store/google-play/<locale>/`: `title.txt`, `short_description.txt`,
`full_description.txt`. Add Romanian as a translation. Graphics: the 512 × 512 icon, the
feature graphic, and the five **light** phone screenshots, from `store/screenshots/google-play/`.
Category **Education**. Contact details: the support email and the website.

### App content — every declaration

| Declaration                                      | Answer                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy                                   | `<websiteUrl>/privacy.html`                                                                                                                                                                                                                                                                     |
| App access                                       | All functionality is available without special access: "Continue as guest" needs no account. Premium content is a purchase, not a login.                                                                                                                                                        |
| Ads                                              | Yes, the app contains ads.                                                                                                                                                                                                                                                                      |
| Content rating (IARC)                            | Category: Reference, News or Educational. No violence, sexual content, language, controlled substances, crude humour or gambling. Digital purchases: yes. Users interact: **yes, limited** — chosen display names are shown on a weekly leaderboard; there is no chat or messaging. `[confirm]` |
| Target audience                                  | 13–15, 16–17, 18 and over. Not designed for children; not in the Families programme.                                                                                                                                                                                                            |
| News app                                         | No.                                                                                                                                                                                                                                                                                             |
| Data safety                                      | The table in `docs/LEGAL.md`, "Google Play — Data safety".                                                                                                                                                                                                                                      |
| Advertising ID                                   | Yes — used for advertising (AdMob). Learners under 16, and anyone who declines, get non-personalised ads.                                                                                                                                                                                       |
| Account deletion                                 | In the app: Profile → Your data → Delete account. On the web: `<websiteUrl>/delete-account.html`.                                                                                                                                                                                               |
| Government, financial features, health, COVID-19 | None / No.                                                                                                                                                                                                                                                                                      |

### Products

Created under Monetise → Products **after** the first bundle is on a testing track (SPEC §57).
The same four ids and texts as the App Store table; Google's limits are looser (name 55,
description 200), so the same words fit. Subscriptions each get a base plan: monthly, or yearly
for `premium_annual`.

---

## If App Review asks for Premium

The reviewer needs no account (guest mode), and buys with the store's own sandbox. If they ask
for Premium access anyway, create an account for them in the app and grant it a **promotional
entitlement** in the RevenueCat dashboard (Customers → the user → Grant entitlement, `premium`).
The app's `sync-entitlements` call then records it on the server like any purchase. Never
insert a row into `user_entitlements` by hand in production.

## User-generated content (App Store guideline 1.2)

The only content one learner sees from another is a display name on the leaderboard. What 1.2
asks for, and where it is:

- **Filtering:** names are 3–20 characters from an allowed set, checked against a blocklist
  (`set_display_name`, `docs/DATABASE.md`).
- **Reporting:** a Report action on every other learner's row, written to `reports`.
- **Acting on reports:** in Supabase Studio, set `profiles.leaderboard_hidden` to remove a
  learner from the leaderboard, or rename them.
- **Contact:** the support page, `<websiteUrl>/`.

Reports are not surfaced anywhere automatically. Check the `reports` table at least weekly while
the app is live.

**Every action needs a statement of reasons** (EU Digital Services Act, art. 17): when you rename
someone, hide them from the leaderboard or suspend them, email the account's address — in the
learner's app language — saying what you did, why, and how to contest it. A template:

> Subject: Your CodeSprint leaderboard name
>
> We have [renamed you / hidden you from the leaderboard] because your display name
> “[NAME]” [breaks section 9 of our terms: reason, e.g. it insults another person / is illegal
> because …]. We decided this after [a report from another learner / our own review]; it was
> reviewed by a person, not decided automatically. Your progress is not affected. If you think
> this is a mistake, reply to this email and we will look at it again. You can also turn to the
> courts or to ANPC (reclamatiisal.anpc.ro).

> Subiect: Numele tău din clasamentul CodeSprint
>
> Te-am [redenumit / ascuns din clasament] deoarece numele tău afișat „[NUME]” [încalcă
> secțiunea 9 din termeni: motivul, de ex. insultă o altă persoană / este ilegal pentru că …].
> Am decis acest lucru în urma [unei raportări de la alt cursant / propriei verificări]; decizia a
> fost luată de o persoană, nu automat. Progresul tău nu este afectat. Dacă crezi că este o
> greșeală, răspunde la acest email și o reanalizăm. Te poți adresa și instanței sau ANPC
> (reclamatiisal.anpc.ro).

Keep the report, the decision and the email for as long as the account exists.
