/**
 * WCAG 2.1 contrast, as arithmetic (SPEC §47).
 *
 * The palettes carry a comment claiming they meet AA. A comment cannot fail a build, and a
 * colour nudged one shade for looks is exactly the kind of change nobody re-measures — so the
 * claim is a test instead, and this is what it measures with.
 *
 * The formulas are from WCAG 2.1 §1.4.3 and are not approximations: relative luminance with
 * the sRGB transfer function, then `(lighter + 0.05) / (darker + 0.05)`.
 */

/** Body text against its background (WCAG 1.4.3, AA). */
export const AA_TEXT = 4.5;

/** Text at 18.66px bold or 24px and above (WCAG 1.4.3, AA). */
export const AA_LARGE_TEXT = 3;

/**
 * Icons, borders that identify a control, and other non-text visuals (WCAG 1.4.11).
 *
 * Purely decorative boundaries — a card outline, a divider — are exempt, because the thing
 * they enclose is identified by its own content.
 */
export const AA_NON_TEXT = 3;

const HEX = /^#[0-9a-f]{6}$/i;

const channel = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

/**
 * Relative luminance of an sRGB colour, 0 (black) to 1 (white).
 *
 * Throws on anything that is not `#rrggbb`. A silent NaN here would make every contrast
 * assertion pass, which is worse than no test at all.
 */
export const relativeLuminance = (hex: string): number => {
  if (!HEX.test(hex)) {
    throw new Error(`Not a 6-digit hex colour: ${hex}`);
  }

  const [r, g, b] = [1, 3, 5].map((offset) =>
    channel(Number.parseInt(hex.slice(offset, offset + 2), 16) / 255),
  ) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Contrast ratio between two colours, 1 (identical) to 21 (black on white). */
export const contrastRatio = (a: string, b: string): number => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];

  return (lighter + 0.05) / (darker + 0.05);
};

export const meetsContrast = (foreground: string, background: string, minimum: number): boolean =>
  contrastRatio(foreground, background) >= minimum;
