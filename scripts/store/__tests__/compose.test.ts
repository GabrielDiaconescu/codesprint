import { Resvg } from '@resvg/resvg-js';

import {
  SIZES,
  captionLayout,
  composeFeatureGraphic,
  composePlayIcon,
  composeScreenshot,
  wrapText,
  type DeviceFrame,
} from '../compose';
import { SCREENSHOT_IDS, loadStoreSource, renderListing } from '../listing';

/**
 * The store images (Phase 23): exactly the pixel sizes the stores accept, and every caption
 * in every language set within its lines — a caption that overflows fails here, not in a
 * rejected upload.
 */

/** Width and height from a PNG's IHDR chunk. */
const pngSize = (png: Buffer) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

/** A stand-in capture with the emulator's proportions: a flat colour is enough to lay out. */
const device: DeviceFrame = { width: 1080, height: 2400, statusBar: 74, navigationBar: 63 };
const raw = new Resvg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${device.width}" height="${device.height}"><rect width="100%" height="100%" fill="#FBF6EC"/></svg>`,
)
  .render()
  .asPng();

describe('wrapText', () => {
  const tenPerChar = (line: string) => line.length * 10;

  it('fills each line before starting the next', () => {
    expect(wrapText('one two three four', 100, 2, tenPerChar)).toEqual(['one two', 'three four']);
  });

  it('balances two lines, and breaks after a sentence when it can', () => {
    expect(wrapText('Learn to Code. 5 Minutes a Day.', 220, 2, tenPerChar)).toEqual([
      'Learn to Code.',
      '5 Minutes a Day.',
    ]);
  });

  it('refuses a caption that needs more lines than it has, rather than cutting it', () => {
    expect(() => wrapText('one two three four five six', 90, 2, tenPerChar)).toThrow(
      'does not fit',
    );
  });
});

describe('store images', () => {
  it.each(['app-store', 'google-play'] as const)('are exactly %s size, in both themes', (store) => {
    for (const theme of ['light', 'dark'] as const) {
      const png = composeScreenshot({
        raw,
        device,
        caption: { title: 'Learn to code', subtitle: 'Short sessions' },
        theme,
        store,
      });
      expect(pngSize(png)).toEqual(SIZES[store]);
    }
  });

  it("give Google Play a 9:16 image, since it rejects the capture's own 20:9", () => {
    const { width, height } = SIZES['google-play'];
    expect(Math.max(width, height) / Math.min(width, height)).toBeLessThanOrEqual(2);
    expect(device.height / device.width).toBeGreaterThan(2);
  });

  it('make the feature graphic and the icon at the sizes Google Play asks for', () => {
    expect(pngSize(composeFeatureGraphic(raw, 'Learn to Code. 5 Minutes a Day.'))).toEqual(
      SIZES.featureGraphic,
    );
    expect(pngSize(composePlayIcon(raw))).toEqual(SIZES.icon);
  });

  it('fit every caption and tagline of every listing on its canvas', () => {
    const source = loadStoreSource();
    for (const listing of source.listings) {
      for (const [storeName, store] of [
        ['apple', 'app-store'],
        ['google', 'google-play'],
      ] as const) {
        const text = renderListing(source, listing, storeName);
        for (const id of SCREENSHOT_IDS) {
          expect(() => captionLayout(text.screenshots[id], store)).not.toThrow();
        }
        expect(() => composeFeatureGraphic(raw, text.featureGraphic.title)).not.toThrow();
      }
    }
  });
});
