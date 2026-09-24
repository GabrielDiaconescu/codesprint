import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAND } from '../../../src/constants/brand';
import {
  LIMITS,
  SCREENSHOT_IDS,
  WEBSITE_PLACEHOLDER,
  fillTokens,
  loadStoreSource,
  renderAppleConfig,
  renderListing,
  renderStoreFiles,
  websiteUrls,
} from '../listing';

/**
 * The store listings (Phase 23) against the rules they can break without anyone noticing
 * until a rejection email: the store limits, SPEC §62's claims, SPEC §5's shipped features,
 * SPEC §0.1.5's prices, and each store's ban on naming the other platform.
 */
const source = loadStoreSource();

const rendered = source.listings.flatMap((listing) =>
  (['apple', 'google'] as const).map((store) => ({
    label: `${listing.appleLocale} / ${store}`,
    store,
    listing,
    text: renderListing(source, listing, store),
  })),
);

/** Every sentence a customer can read, per store and locale. */
const customerText = ({ text }: (typeof rendered)[number]) =>
  [
    text.title,
    text.subtitle,
    text.promoText,
    text.shortDescription,
    text.description,
    ...Object.values(text.screenshots).flatMap((c) => [c.title, c.subtitle]),
    text.featureGraphic.title,
  ].join('\n');

describe('store listings', () => {
  it('are what `npm run store:build` last wrote', () => {
    for (const [path, content] of Object.entries(renderStoreFiles(source))) {
      const onDisk = readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
      expect({ path, content: onDisk }).toEqual({ path, content });
    }
  });

  it('cover English and Romanian', () => {
    expect(source.listings.map((l) => l.appleLocale).sort()).toEqual(['en-US', 'ro']);
  });

  it.each(rendered)('$label fits every store limit', ({ store, text }) => {
    expect(text.title.length).toBeLessThanOrEqual(LIMITS.title);
    expect(text.description.length).toBeLessThanOrEqual(LIMITS.description);
    if (store === 'apple') {
      expect(text.subtitle.length).toBeLessThanOrEqual(LIMITS.subtitle);
      expect(text.promoText.length).toBeLessThanOrEqual(LIMITS.promoText);
      expect(text.keywords.join(',').length).toBeLessThanOrEqual(LIMITS.keywords);
    } else {
      expect(text.shortDescription.length).toBeLessThanOrEqual(LIMITS.shortDescription);
    }
    for (const caption of Object.values(text.screenshots)) {
      expect(caption.title.length).toBeLessThanOrEqual(LIMITS.screenshotTitle);
      expect(caption.subtitle.length).toBeLessThanOrEqual(LIMITS.screenshotSubtitle);
    }
  });

  it.each(rendered)('$label takes its name from brand.ts (SPEC §9)', ({ text }) => {
    expect(text.title).toBe(BRAND.storeTitle);
    expect(text.description).toContain(BRAND.name);
  });

  it.each(rendered)('$label has no token left unfilled', (entry) => {
    expect(customerText(entry)).not.toMatch(/\{\{|\}\}/);
  });

  it.each(rendered)('$label names no price (SPEC §0.1.5)', (entry) => {
    expect(customerText(entry)).not.toMatch(/[€$£]|\bEUR\b|\bRON\b|\blei\b|\d+[.,]\d{2}\b/i);
  });

  it.each(rendered)('$label promises nothing SPEC §62 rules out', (entry) => {
    expect(customerText(entry)).not.toMatch(
      /guarantee|garant|\bjobs?\b|career|carier|salar|income|venit|hired|angaj|expert|in \d+ days|în \d+ zile|become a (developer|programmer)/i,
    );
  });

  it.each(rendered)('$label advertises no feature that has not shipped (SPEC §5)', (entry) => {
    expect(customerText(entry)).not.toMatch(
      /certificat|offline|artificial intelligence|inteligen[țt]ă artificial|chatbot|\bC\+\+|javascript/i,
    );
    // Case-sensitive: Romanian "ai" ("you have") is everywhere.
    expect(customerText(entry)).not.toMatch(/\bAI\b/);
  });

  it.each(rendered)("$label does not name the other store's platform", ({ store, ...entry }) => {
    const text = customerText({ store, ...entry });
    if (store === 'apple') expect(text).not.toMatch(/android|google/i);
    else expect(text).not.toMatch(/iphone|\bios\b|apple|app store/i);
  });

  it.each(rendered)('$label spends no keyword on a word already in the name', ({ store, text }) => {
    if (store !== 'apple') return;
    const words = (value: string) =>
      value
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
    const taken = new Set([...words(text.title), ...words(text.subtitle)]);
    for (const keyword of text.keywords) {
      for (const word of words(keyword))
        expect({ keyword, word, taken: taken.has(word) }).toEqual({
          keyword,
          word,
          taken: false,
        });
    }
    expect(new Set(text.keywords).size).toBe(text.keywords.length);
  });

  it('says plainly that No Ads is not Premium, in every locale (SPEC §5, §33)', () => {
    for (const { text } of rendered) {
      expect(text.description).toMatch(/does not unlock Premium|Nu deblochează lecțiile Premium/);
    }
  });

  it('writes Romanian with comma-below ș and ț, never the cedilla forms (SPEC §38)', () => {
    for (const entry of rendered) expect(customerText(entry)).not.toMatch(/[şţŞŢ]/);
  });

  it('carries the terms of use and privacy policy in every description (Apple 3.1.2)', () => {
    const urls = websiteUrls(source.settings.websiteUrl);
    for (const { text } of rendered) {
      expect(text.description).toContain(urls.terms);
      expect(text.description).toContain(urls.privacy);
    }
  });

  it('puts each store its own subscription terms', () => {
    for (const { store, text } of rendered) {
      expect(text.description).toMatch(store === 'apple' ? /App Store/ : /Google Play/);
    }
  });
});

describe('store.config.json', () => {
  const config = renderAppleConfig(source);

  it('lists the screenshots in capture order for every locale', () => {
    for (const info of Object.values(config.apple.info)) {
      expect(info.screenshots.APP_IPHONE_67).toHaveLength(SCREENSHOT_IDS.length);
      expect(info.screenshots.APP_IPHONE_67[0]).toMatch(/01-home\.png$/);
    }
  });

  it('keeps the reviewer notes within the limit and free of credentials', () => {
    expect(config.apple.review.notes.length).toBeLessThanOrEqual(LIMITS.reviewNotes);
    expect(config.apple.review.notes).not.toMatch(/password|parol/i);
    expect(config.apple.review.demoRequired).toBe(false);
  });

  it('rates the app 13+ and declares ads and user-generated content honestly', () => {
    expect(config.apple.advisory).toMatchObject({
      ageRatingOverrideV2: 'THIRTEEN_PLUS',
      advertising: true,
      userGeneratedContent: true,
      unrestrictedWebAccess: false,
    });
  });
});

describe('websiteUrls', () => {
  it('uses the placeholder until the domain exists, so release:check can block on it', () => {
    expect(websiteUrls(null).privacy).toBe(`${WEBSITE_PLACEHOLDER}/privacy.html`);
    expect(websiteUrls('https://example.com/').terms).toBe('https://example.com/terms.html');
  });
});

describe('fillTokens', () => {
  it('refuses a token it does not know rather than printing nothing', () => {
    expect(() => fillTokens('Hi {{nobody}}', {})).toThrow('{{nobody}}');
  });
});
