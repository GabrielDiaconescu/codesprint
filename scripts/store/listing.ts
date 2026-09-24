import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';
import { z } from 'zod';

import { BRAND } from '../../src/constants/brand';
import { DEFAULT_APP_CONFIG } from '../../src/services/config/defaults';
import { loadContent } from '../content/load';

/**
 * The store listings, as data (SPEC §41, §62; Phase 23).
 *
 * `store/store.yaml` and `store/listing/<locale>.yaml` are the source. This module loads and
 * validates them, fills in the tokens, and renders what each store takes: `store.config.json`
 * for App Store Connect (pushed by `eas metadata:push`) and plain text files for Google Play.
 * Pure apart from `loadStoreSource`, so the tests can hold the listing to the rules.
 */

export const STORE_ROOT = join(process.cwd(), 'store');

/** The screenshots, in the order both stores show them. The capture flow takes these. */
export const SCREENSHOT_IDS = ['home', 'lesson', 'feedback', 'learn', 'progress'] as const;
export type ScreenshotId = (typeof SCREENSHOT_IDS)[number];

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Store limits, in characters. Apple's keywords count once joined with commas. */
export const LIMITS = {
  title: 30,
  subtitle: 30,
  promoText: 170,
  keywords: 100,
  description: 4000,
  shortDescription: 80,
  reviewNotes: 4000,
  screenshotTitle: 40,
  screenshotSubtitle: 48,
} as const;

/** Shown wherever the website belongs until `websiteUrl` is set; release:check blocks on it. */
export const WEBSITE_PLACEHOLDER = 'https://[your-domain]';

const rating = z.enum(['NONE', 'INFREQUENT_OR_MILD', 'FREQUENT_OR_INTENSE']);

const settingsSchema = z.object({
  websiteUrl: z.url().nullable(),
  copyright: z
    .string()
    .regex(/^\d{4} \S.*$/, 'a year, then the rights holder')
    .nullable(),
  apple: z.object({
    categories: z.array(z.string()).min(1).max(2),
    release: z.object({ automaticRelease: z.boolean(), phasedRelease: z.boolean() }),
    advisory: z.record(z.string(), z.union([rating, z.boolean(), z.string(), z.null()])),
    reviewNotes: z.string().min(1),
  }),
});
export type StoreSettings = z.infer<typeof settingsSchema>;

const caption = z.object({ title: z.string().min(1), subtitle: z.string().min(1) });

const listingSchema = z.object({
  appleLocale: z.string().min(2),
  googleLocale: z.string().min(2),
  i18n: z.string().min(2),
  subtitle: z.string().min(1),
  promoText: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  shortDescription: z.string().min(1),
  description: z.string().min(1),
  billingTerms: z.object({ apple: z.string().min(1), google: z.string().min(1) }),
  screenshots: z.object(
    Object.fromEntries(SCREENSHOT_IDS.map((id) => [id, caption])) as Record<
      ScreenshotId,
      typeof caption
    >,
  ),
  featureGraphic: z.object({ title: z.string().min(1) }),
});
export type Listing = z.infer<typeof listingSchema>;

export interface StoreSource {
  settings: StoreSettings;
  listings: Listing[];
  /** Values the tokens take that do not depend on the locale. */
  facts: { moduleCount: number; freeModuleCount: number };
  /** `common.json` tagline and promo line per i18n language. */
  i18n: Record<string, { tagline: string; promoLine: string }>;
}

const readYaml = (path: string): unknown => parse(readFileSync(path, 'utf8'));

export const loadStoreSource = (root: string = STORE_ROOT): StoreSource => {
  const settings = settingsSchema.parse(readYaml(join(root, 'store.yaml')));
  const listingDir = join(root, 'listing');
  const listings = readdirSync(listingDir)
    .filter((name) => name.endsWith('.yaml'))
    .sort()
    .map((name) => listingSchema.parse(readYaml(join(listingDir, name))));

  const { courses } = loadContent();
  const moduleCount = courses.reduce((sum, course) => sum + course.modules.length, 0);

  const i18n = Object.fromEntries(
    listings.map(({ i18n: language }) => {
      const common = JSON.parse(
        readFileSync(
          join(process.cwd(), 'src', 'i18n', 'locales', language, 'common.json'),
          'utf8',
        ),
      ) as { tagline: string; promoLine: string };
      return [language, { tagline: common.tagline, promoLine: common.promoLine }];
    }),
  );

  return {
    settings,
    listings,
    facts: { moduleCount, freeModuleCount: DEFAULT_APP_CONFIG.free_module_count },
    i18n,
  };
};

/* ------------------------------------------------------------------ rendering */

export const websiteUrls = (websiteUrl: string | null) => {
  const base = (websiteUrl ?? WEBSITE_PLACEHOLDER).replace(/\/+$/, '');
  return {
    support: `${base}/`,
    privacy: `${base}/privacy.html`,
    terms: `${base}/terms.html`,
    deletion: `${base}/delete-account.html`,
  };
};

/** Replaces every `{{token}}`; an unknown token is an error, not an empty string. */
export const fillTokens = (template: string, tokens: Record<string, string>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = tokens[name];
    if (value === undefined) throw new Error(`unknown store token {{${name}}}`);
    return value;
  });

/** Everything one locale's text says, with the tokens filled in, for one store. */
export const renderListing = (source: StoreSource, listing: Listing, store: 'apple' | 'google') => {
  const urls = websiteUrls(source.settings.websiteUrl);
  const phrases = source.i18n[listing.i18n];
  if (!phrases) throw new Error(`no i18n phrases for ${listing.i18n}`);

  const base: Record<string, string> = {
    name: BRAND.name,
    storeTitle: BRAND.storeTitle,
    tagline: phrases.tagline,
    promoLine: phrases.promoLine,
    moduleCount: String(source.facts.moduleCount),
    freeModuleCount: String(source.facts.freeModuleCount),
    termsUrl: urls.terms,
    privacyUrl: urls.privacy,
    supportUrl: urls.support,
  };
  const tokens = { ...base, billingTerms: fillTokens(listing.billingTerms[store], base) };
  const fill = (text: string) => fillTokens(text, tokens).trim();

  return {
    title: BRAND.storeTitle,
    subtitle: fill(listing.subtitle),
    promoText: fill(listing.promoText),
    keywords: listing.keywords.map(fill),
    shortDescription: fill(listing.shortDescription),
    description: fill(listing.description),
    screenshots: Object.fromEntries(
      SCREENSHOT_IDS.map((id) => [
        id,
        {
          title: fill(listing.screenshots[id].title),
          subtitle: fill(listing.screenshots[id].subtitle),
        },
      ]),
    ) as Record<ScreenshotId, { title: string; subtitle: string }>,
    featureGraphic: { title: fill(listing.featureGraphic.title) },
  };
};

/** Where the composed screenshots are written, per store, locale and theme. */
export const screenshotPath = (
  store: 'app-store' | 'google-play',
  locale: string,
  theme: Theme,
  id: ScreenshotId,
): string =>
  `store/screenshots/${store}/${locale}/${theme}/${String(SCREENSHOT_IDS.indexOf(id) + 1).padStart(2, '0')}-${id}.png`;

/** `store.config.json` — the App Store Connect listing, in EAS Metadata's format. */
export const renderAppleConfig = (source: StoreSource) => {
  const { settings } = source;
  const urls = websiteUrls(settings.websiteUrl);

  return {
    configVersion: 0,
    apple: {
      ...(settings.copyright ? { copyright: settings.copyright } : {}),
      categories: settings.apple.categories,
      advisory: settings.apple.advisory,
      release: settings.apple.release,
      review: {
        demoRequired: false,
        notes: fillTokens(settings.apple.reviewNotes, { name: BRAND.name }).trim(),
      },
      info: Object.fromEntries(
        source.listings.map((listing) => {
          const text = renderListing(source, listing, 'apple');
          return [
            listing.appleLocale,
            {
              title: text.title,
              subtitle: text.subtitle,
              promoText: text.promoText,
              description: text.description,
              keywords: text.keywords,
              marketingUrl: urls.support,
              supportUrl: urls.support,
              privacyPolicyUrl: urls.privacy,
              privacyChoicesUrl: urls.deletion,
              screenshots: {
                // 1290 × 2796: the 6.7"/6.9" iPhone size, which App Store Connect scales down
                // for every smaller iPhone. The app is iPhone-only (supportsTablet: false).
                APP_IPHONE_67: SCREENSHOT_IDS.map((id) =>
                  screenshotPath('app-store', listing.appleLocale, 'light', id),
                ),
              },
            },
          ];
        }),
      ),
    },
  };
};

/** Google Play's text, in fastlane supply's layout: store/google-play/<locale>/*.txt. */
export const renderPlayFiles = (source: StoreSource): Record<string, string> =>
  Object.fromEntries(
    source.listings.flatMap((listing) => {
      const text = renderListing(source, listing, 'google');
      const dir = `store/google-play/${listing.googleLocale}`;
      return [
        [`${dir}/title.txt`, `${text.title}\n`],
        [`${dir}/short_description.txt`, `${text.shortDescription}\n`],
        [`${dir}/full_description.txt`, `${text.description}\n`],
      ];
    }),
  );

/** Every generated text file, path → content. */
export const renderStoreFiles = (source: StoreSource): Record<string, string> => ({
  'store.config.json': `${JSON.stringify(renderAppleConfig(source), null, 2)}\n`,
  ...renderPlayFiles(source),
});
