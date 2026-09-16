import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

import { palettes, type ColorScheme, type Palette } from './colors';
import { fontFamily } from './fonts';
import { a11y, elevation, motion, pressed, radius, spacing, typography } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  motion: typeof motion;
  elevation: typeof elevation;
  a11y: typeof a11y;
  fontFamily: typeof fontFamily;
  pressed: typeof pressed;
}

/**
 * Theme lives in Context deliberately: it changes rarely, so it does not violate the
 * "no Context for frequently changing state" rule (SPEC §6).
 */
const ThemeContext = createContext<Theme | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.themePreference);

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: palettes[scheme],
      spacing,
      radius,
      typography,
      motion,
      elevation,
      a11y,
      fontFamily,
      pressed,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return theme;
};
