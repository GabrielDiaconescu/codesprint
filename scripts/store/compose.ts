import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';

import { BRAND } from '../../src/constants/brand';
import { palettes, type Palette } from '../../src/theme/colors';
import {
  SCREENSHOT_IDS,
  THEMES,
  loadStoreSource,
  renderListing,
  screenshotPath,
  type Listing,
  type ScreenshotId,
  type StoreSource,
  type Theme,
} from './listing';

/**
 * Store images from real screenshots (Phase 23): each raw capture from the emulator is cropped
 * of Android's own bars — an App Store screenshot may not show another platform's chrome —
 * framed, and captioned in the app's own font and palette, at exactly the size each store
 * asks for. Also Google Play's feature graphic and 512 px icon.
 *
 * Input:  store/screenshots/raw/<locale>/<theme>/<id>.png + raw/device.json (capture.ts)
 * Output: store/screenshots/{app-store,google-play}/<locale>/<theme>/NN-<id>.png, and
 *         store/screenshots/google-play/<locale>/feature-graphic.png, google-play/icon.png
 */

export const SIZES = {
  /** 6.7"/6.9" iPhone; App Store Connect scales it down for every smaller iPhone. */
  'app-store': { width: 1290, height: 2796 },
  /** 9:16 — Google Play rejects a side more than twice the other, which a raw 20:9 capture is. */
  'google-play': { width: 1080, height: 1920 },
  featureGraphic: { width: 1024, height: 500 },
  icon: { width: 512, height: 512 },
} as const;

export type StoreName = 'app-store' | 'google-play';

/** Where the system bars are on the capturing device, measured by capture.ts. */
export interface DeviceFrame {
  width: number;
  height: number;
  statusBar: number;
  navigationBar: number;
}

export const RAW_DIR = join(process.cwd(), 'store', 'screenshots', 'raw');

const fontDir = join(process.cwd(), 'node_modules', '@expo-google-fonts', 'nunito');
const FONT_OPTIONS: ResvgRenderOptions['font'] = {
  fontFiles: ['900Black/Nunito_900Black.ttf', '700Bold/Nunito_700Bold.ttf'].map((file) =>
    join(fontDir, file),
  ),
  loadSystemFonts: false,
  defaultFontFamily: 'Nunito',
};

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const render = (svg: string): Buffer => new Resvg(svg, { font: FONT_OPTIONS }).render().asPng();

/** Rendered width of one line of text, from the real font. */
export const measureText = (text: string, size: number, weight: 700 | 900): number => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * text.length + 100}" height="${size * 2}">` +
    `<text x="0" y="${size * 1.5}" font-family="Nunito" font-weight="${weight}" font-size="${size}">` +
    `${escapeXml(text)}</text></svg>`;
  return new Resvg(svg, { font: FONT_OPTIONS }).getBBox()?.width ?? 0;
};

/**
 * Word wrap within `maxWidth`, at most `maxLines`. Throws rather than shrinking or cutting: a
 * caption that does not fit is a caption to shorten, and the listing tests keep them short
 * enough.
 *
 * Two lines are balanced rather than filled greedily — "Learn to Code. 5 Minutes a / Day."
 * leaves a word alone on the second line — and a break after a full stop wins when it fits.
 */
export const wrapText = (
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (line: string) => number,
): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines || lines.some((l) => measure(l) > maxWidth)) {
    throw new Error(`"${text}" does not fit in ${maxLines} line(s) of ${maxWidth}px`);
  }
  return lines.length === 2 ? balance(lines.join(' '), maxWidth, measure) : lines;
};

/** The best place to break one caption into two lines that both fit. */
const balance = (text: string, maxWidth: number, measure: (line: string) => number): string[] => {
  const words = text.split(' ');
  let best: { lines: string[]; score: number } | null = null;
  for (let at = 1; at < words.length; at += 1) {
    const lines = [words.slice(0, at).join(' '), words.slice(at).join(' ')];
    const widths = lines.map(measure);
    if (widths.some((width) => width > maxWidth)) continue;
    const afterSentence = /[.!?:]$/.test(lines[0]!);
    const score = Math.max(...widths) * (afterSentence ? 0.8 : 1);
    if (!best || score < best.score) best = { lines, score };
  }
  return best?.lines ?? [text];
};

const textLines = (
  lines: string[],
  {
    x,
    y,
    size,
    weight,
    fill,
    lineHeight,
  }: {
    x: number;
    y: number;
    size: number;
    weight: 700 | 900;
    fill: string;
    lineHeight: number;
  },
): string =>
  lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" text-anchor="middle" font-family="Nunito" ` +
        `font-weight="${weight}" font-size="${size}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join('');

/** The frame around the phone: a near-black bezel on light, a lifted rim on dark (SPEC §8). */
const bezelColour = (theme: Theme, palette: Palette) =>
  theme === 'light' ? palette.textPrimary : palette.surfaceElevated;

export interface ScreenshotInput {
  raw: Buffer;
  device: DeviceFrame;
  caption: { title: string; subtitle: string };
  theme: Theme;
  store: StoreName;
}

/** Caption type and wrapping for one store's canvas: a title of two lines, a subtitle of one. */
export const captionLayout = (caption: { title: string; subtitle: string }, store: StoreName) => {
  const { width } = SIZES[store];
  const unit = width / 1290; // every measure is designed at the App Store width
  const titleSize = Math.round(92 * unit);
  const subtitleSize = Math.round(52 * unit);
  const margin = Math.round(80 * unit);
  const textWidth = width - margin * 2;

  return {
    unit,
    titleSize,
    subtitleSize,
    margin,
    textWidth,
    titleLines: wrapText(caption.title, textWidth, 2, (l) => measureText(l, titleSize, 900)),
    subtitleLines: wrapText(caption.subtitle, textWidth, 1, (l) =>
      measureText(l, subtitleSize, 700),
    ),
  };
};

export const composeScreenshot = ({ raw, device, caption, theme, store }: ScreenshotInput) => {
  const { width, height } = SIZES[store];
  const palette = palettes[theme];
  const { unit, titleSize, subtitleSize, margin, textWidth, titleLines, subtitleLines } =
    captionLayout(caption, store);

  const titleTop = Math.round(190 * unit);
  const titleLineHeight = Math.round(titleSize * 1.15);
  const subtitleY = titleTop + titleLines.length * titleLineHeight + Math.round(24 * unit);

  // The app's screen without Android's status and navigation bars.
  const screenHeight = device.height - device.statusBar - device.navigationBar;
  const phoneTop = subtitleY + Math.round(90 * unit);
  const bezel = Math.round(22 * unit);
  const available = height - phoneTop - margin;
  const screenH = Math.min(
    available - bezel * 2,
    ((textWidth - bezel * 2) * screenHeight) / device.width,
  );
  const screenW = (screenH * device.width) / screenHeight;
  const screenX = (width - screenW) / 2;
  const screenY = phoneTop + bezel;
  const radius = Math.round(64 * unit);

  const image = `data:image/png;base64,${raw.toString('base64')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="screen"><rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${radius}"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${Math.round(24 * unit)}" stdDeviation="${Math.round(36 * unit)}" flood-color="#000" flood-opacity="${theme === 'light' ? 0.18 : 0.5}"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${palette.background}"/>
  <circle cx="${width * 0.92}" cy="${height * 0.12}" r="${width * 0.42}" fill="${palette.primary}" fill-opacity="${theme === 'light' ? 0.1 : 0.16}"/>
  <circle cx="${width * 0.05}" cy="${height * 0.62}" r="${width * 0.34}" fill="${palette.challenge}" fill-opacity="${theme === 'light' ? 0.08 : 0.12}"/>
  ${textLines(titleLines, { x: width / 2, y: titleTop + titleSize, size: titleSize, weight: 900, fill: palette.textPrimary, lineHeight: titleLineHeight })}
  ${textLines(subtitleLines, { x: width / 2, y: subtitleY + subtitleSize, size: subtitleSize, weight: 700, fill: palette.textSecondary, lineHeight: subtitleSize })}
  <rect x="${screenX - bezel}" y="${screenY - bezel}" width="${screenW + bezel * 2}" height="${screenH + bezel * 2}" rx="${radius + bezel}" fill="${bezelColour(theme, palette)}" filter="url(#shadow)"/>
  <g clip-path="url(#screen)">
    <svg x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" viewBox="0 ${device.statusBar} ${device.width} ${screenHeight}" preserveAspectRatio="xMidYMin slice">
      <image xlink:href="${image}" href="${image}" x="0" y="0" width="${device.width}" height="${device.height}"/>
    </svg>
  </g>
</svg>`;
  return render(svg);
};

/** Google Play's 1024 × 500 banner: the icon, the name and the tagline on the brand blue. */
export const composeFeatureGraphic = (icon: Buffer, tagline: string): Buffer => {
  const { width, height } = SIZES.featureGraphic;
  const palette = palettes.light;
  const iconSize = 260;
  const iconX = 80;
  const textX = iconX + iconSize + 60;
  const textWidth = width - textX - 60;
  const nameSize = 84;
  const taglineSize = 40;
  const taglineLines = wrapText(tagline, textWidth, 2, (l) => measureText(l, taglineSize, 700));
  const image = `data:image/png;base64,${icon.toString('base64')}`;
  const top = (height - (nameSize + 30 + taglineLines.length * taglineSize * 1.25)) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
  <defs><clipPath id="icon"><rect x="${iconX}" y="${(height - iconSize) / 2}" width="${iconSize}" height="${iconSize}" rx="58"/></clipPath></defs>
  <rect width="${width}" height="${height}" fill="${palette.primary}"/>
  <circle cx="${width * 0.95}" cy="${height * 0.05}" r="${height * 0.75}" fill="${palette.primaryDeep}" fill-opacity="0.45"/>
  <circle cx="${width * 0.2}" cy="${height * 1.05}" r="${height * 0.5}" fill="${palette.primaryDeep}" fill-opacity="0.3"/>
  <g clip-path="url(#icon)"><image xlink:href="${image}" href="${image}" x="${iconX}" y="${(height - iconSize) / 2}" width="${iconSize}" height="${iconSize}"/></g>
  <text x="${textX}" y="${top + nameSize}" font-family="Nunito" font-weight="900" font-size="${nameSize}" fill="#FFFFFF">${escapeXml(BRAND.name)}</text>
  ${taglineLines
    .map(
      (line, i) =>
        `<text x="${textX}" y="${top + nameSize + 30 + (i + 1) * taglineSize * 1.25}" font-family="Nunito" font-weight="700" font-size="${taglineSize}" fill="#FFFFFF">${escapeXml(line)}</text>`,
    )
    .join('')}
</svg>`;
  return render(svg);
};

/** Google Play's 512 × 512 icon, from the same artwork as the app icon. */
export const composePlayIcon = (icon: Buffer): Buffer => {
  const { width, height } = SIZES.icon;
  const image = `data:image/png;base64,${icon.toString('base64')}`;
  return render(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">` +
      `<image xlink:href="${image}" href="${image}" x="0" y="0" width="${width}" height="${height}"/></svg>`,
  );
};

/* ------------------------------------------------------------------ main */

export const rawPath = (locale: string, theme: Theme, id: ScreenshotId) =>
  join(RAW_DIR, locale, theme, `${id}.png`);

const write = (path: string, data: Buffer) => {
  const absolute = join(process.cwd(), path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, data);
};

/** Composes everything the raw captures allow; returns the files written. */
export const composeAll = (source: StoreSource = loadStoreSource()): string[] => {
  const devicePath = join(RAW_DIR, 'device.json');
  if (!existsSync(devicePath)) {
    throw new Error('No raw captures. Run `npm run store:screenshots` first (docs/STORE.md).');
  }
  const device = JSON.parse(readFileSync(devicePath, 'utf8')) as DeviceFrame;
  const icon = readFileSync(join(process.cwd(), 'assets', 'icon.png'));
  const written: string[] = [];

  const compose = (listing: Listing) => {
    for (const store of ['app-store', 'google-play'] as const) {
      const locale = store === 'app-store' ? listing.appleLocale : listing.googleLocale;
      const text = renderListing(source, listing, store === 'app-store' ? 'apple' : 'google');
      for (const theme of THEMES) {
        for (const id of SCREENSHOT_IDS) {
          const raw = rawPath(listing.appleLocale, theme, id);
          if (!existsSync(raw)) continue;
          const path = screenshotPath(store, locale, theme, id);
          write(
            path,
            composeScreenshot({
              raw: readFileSync(raw),
              device,
              caption: text.screenshots[id],
              theme,
              store,
            }),
          );
          written.push(path);
        }
      }
    }
    const graphic = `store/screenshots/google-play/${listing.googleLocale}/feature-graphic.png`;
    write(
      graphic,
      composeFeatureGraphic(icon, renderListing(source, listing, 'google').featureGraphic.title),
    );
    written.push(graphic);
  };

  source.listings.forEach(compose);
  write('store/screenshots/google-play/icon.png', composePlayIcon(icon));
  written.push('store/screenshots/google-play/icon.png');
  return written;
};

if (/store[\\/]compose/.test(process.argv[1] ?? '')) {
  const written = composeAll();
  console.log(`Composed ${written.length} images under store/screenshots/.`);
}
