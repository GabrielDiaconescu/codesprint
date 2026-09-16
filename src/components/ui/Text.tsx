import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

export type TextVariant = keyof Theme['typography'];
export type TextTone = 'primary' | 'secondary' | 'inverse' | 'accent' | 'success' | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Renders as a screen-reader heading (SPEC §47). */
  heading?: boolean;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

/**
 * The only text primitive in the app (SPEC §8, §47).
 *
 * Centralising it means the type scale, font family and colour tones cannot drift, and
 * dynamic font scaling stays on everywhere — `allowFontScaling` is never disabled, because
 * switching it off is the most common way an app quietly fails WCAG.
 */
export const Text = ({
  variant = 'body',
  tone = 'primary',
  heading = false,
  align,
  style,
  ...rest
}: TextProps) => {
  const theme = useTheme();

  const toneColor: Record<TextTone, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    inverse: theme.colors.textInverse,
    accent: theme.colors.primary,
    success: theme.colors.success,
    danger: theme.colors.danger,
  };

  return (
    <RNText
      accessibilityRole={heading ? 'header' : undefined}
      style={[theme.typography[variant], { color: toneColor[tone], textAlign: align }, style]}
      {...rest}
    />
  );
};
