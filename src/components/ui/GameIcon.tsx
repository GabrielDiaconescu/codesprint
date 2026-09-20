import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { useTheme, type Palette } from '@/theme';

export type GameIconName = 'flame' | 'heart' | 'coin' | 'bolt' | 'star' | 'trophy';

export interface GameIconProps {
  name: GameIconName;
  size?: number;
  /** Drained hearts and unclaimed rewards — the shape stays, the colour drops out. */
  muted?: boolean;
  /** Provide only when the icon is the sole carrier of meaning (SPEC §47). */
  label?: string;
  testID?: string;
}

/**
 * The gamification icon set (SPEC §8, §13).
 *
 * These are drawn rather than taken from the icon font, and deliberately not emoji. Emoji
 * render as a different picture on every OS version, are announced literally by screen
 * readers, and cannot be recoloured for dark mode — three reasons a flame that is part of the
 * product's identity should not be one.
 *
 * Each icon is built the same way, which is what makes them look moulded rather than drawn: a
 * saturated **face**, a much darker **rim** stroked around the outside, and a soft white
 * **highlight** where the light would hit. The rim is the part that carries WCAG 1.4.11 — it
 * is what separates the shape from whatever it sits on — so the face is free to be as bright
 * as the style wants.
 */
export const GameIcon = ({ name, size = 28, muted = false, label, testID }: GameIconProps) => {
  const theme = useTheme();
  const tokens = muted ? MUTED : GAME_ICON_COLOURS[name];
  const face = theme.colors[tokens.face];
  const rim = theme.colors[tokens.rim];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      testID={testID}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
    >
      <G stroke={rim} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        {name === 'coin' ? (
          <>
            <Circle cx={12} cy={12} r={9} fill={face} />
            <Circle cx={12} cy={12} r={5.6} fill={rim} opacity={0.22} strokeWidth={0} />
          </>
        ) : (
          <Path d={PATHS[name]} fill={face} />
        )}
        {/* The glint. Always upper-left, because a scene lit from two directions looks flat. */}
        <Ellipse
          cx={HIGHLIGHT[name].cx}
          cy={HIGHLIGHT[name].cy}
          rx={HIGHLIGHT[name].rx}
          ry={HIGHLIGHT[name].ry}
          fill="#FFFFFF"
          opacity={muted ? 0 : 0.4}
          strokeWidth={0}
        />
      </G>
    </Svg>
  );
};

const PATHS: Record<Exclude<GameIconName, 'coin'>, string> = {
  flame:
    'M12.4 2.2c.6 2.6-.1 4.6-1.6 6.1-.8.8-1.7.4-1.8-.7C7.1 9.2 5.6 11.3 5.6 13.7c0 3.9 2.9 6.6 6.4 6.6s6.4-2.7 6.4-6.6c0-2.6-1.3-4.7-3.2-6.4-.5 1.2-1.3 1.8-1.9 1.6.8-2.6.1-5-.9-6.7z',
  heart:
    'M12 20.6C10.2 19.4 3.7 15.1 3.7 10.6 3.7 7.8 5.9 5.6 8.6 5.6c1.6 0 2.8.8 3.4 1.7.6-.9 1.8-1.7 3.4-1.7 2.7 0 4.9 2.2 4.9 5 0 4.5-6.5 8.8-8.3 10z',
  bolt: 'M13.6 1.9 4.4 13.1c-.4.5-.1 1.2.6 1.2h4.2l-1 7.5c-.1.8.9 1.2 1.4.6l9.1-11.2c.4-.5.1-1.2-.6-1.2h-4.2l1-7.5c.1-.8-.9-1.2-1.3-.6z',
  star: 'M12 1.9c.4 0 .7.2.9.6l2.6 5.3 5.8.8c.8.1 1.1 1.1.5 1.7l-4.2 4.1 1 5.8c.1.8-.7 1.4-1.4 1l-5.2-2.7-5.2 2.7c-.7.4-1.5-.2-1.4-1l1-5.8-4.2-4.1c-.6-.6-.3-1.6.5-1.7l5.8-.8 2.6-5.3c.2-.4.5-.6.9-.6z',
  trophy:
    'M7 3.4h10v4.3c0 3-2.2 5.4-5 5.4s-5-2.4-5-5.4zM7 4.6H4.3c0 3 1.1 4.6 3 5M17 4.6h2.7c0 3-1.1 4.6-3 5M12 13.1v3.9M8.4 20.6h7.2c0-2-1.1-3.6-3.6-3.6s-3.6 1.6-3.6 3.6z',
};

const HIGHLIGHT: Record<GameIconName, { cx: number; cy: number; rx: number; ry: number }> = {
  flame: { cx: 9.6, cy: 15.4, rx: 1.5, ry: 2.2 },
  heart: { cx: 8.3, cy: 9.4, rx: 1.5, ry: 1.9 },
  coin: { cx: 8.8, cy: 8.4, rx: 2, ry: 1.4 },
  bolt: { cx: 10.6, cy: 7.2, rx: 1, ry: 2.2 },
  star: { cx: 9.4, cy: 8.2, rx: 1.3, ry: 1.1 },
  trophy: { cx: 9.6, cy: 6.6, rx: 1.1, ry: 2 },
};

/**
 * Which palette tokens each icon is built from.
 *
 * Exported as token NAMES rather than colours so `theme/__tests__/contrast.test.ts` can
 * assert the rule these icons rely on: in every theme, at least one of the two — the bright
 * face or the dark rim — reaches 3:1 against the surfaces the icon is drawn on (WCAG
 * 1.4.11). Which one does the work flips with the theme, and that is the point: a dark rim
 * is invisible on a dark card, and a bright face is what identifies the shape there.
 */
export const GAME_ICON_COLOURS: Record<GameIconName, { face: keyof Palette; rim: keyof Palette }> =
  {
    flame: { face: 'streak', rim: 'challengeDeep' },
    heart: { face: 'life', rim: 'dangerDeep' },
    coin: { face: 'xpGlow', rim: 'xp' },
    bolt: { face: 'xpGlow', rim: 'challenge' },
    star: { face: 'xpGlow', rim: 'xp' },
    trophy: { face: 'xpGlow', rim: 'xp' },
  };

/** A spent life or an unearned reward: the shape survives, the colour does not. */
const MUTED = { face: 'border', rim: 'borderStrong' } as const;
