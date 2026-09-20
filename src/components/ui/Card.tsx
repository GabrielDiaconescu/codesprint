import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

/** Cards are tinted by role, not by hand — the Daily Challenge is warm, the rest are white. */
export type CardTone = 'surface' | 'challenge' | 'success' | 'gold';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** `elevated` gives the card a solid rim; `outlined` stays flat with a hairline edge. */
  appearance?: 'elevated' | 'outlined';
  tone?: CardTone;
  padding?: 'none' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Defaults to `button` when pressable. Use `radio` inside a single-select list. */
  accessibilityRole?: AccessibilityRole;
  /** Selection state for `radio` / `checkbox` roles, so it is announced, not just drawn. */
  selected?: boolean;
  testID?: string;
}

/**
 * Surface container (SPEC §8).
 *
 * Chunky and fully opaque — no glassmorphism, no translucency. The card sits on a warm
 * background and is pure white, which is what makes it read as a physical thing rather than a
 * region of the page.
 *
 * An elevated card uses the same hard rim as `Button` instead of a blurred shadow: a blur says
 * "floating above", an offset says "solid, with a side". A pressable card travels onto its rim
 * when held, so the whole surface behaves like the buttons inside it.
 *
 * Becomes a button only when `onPress` is supplied.
 */
export const Card = ({
  children,
  onPress,
  appearance = 'elevated',
  tone = 'surface',
  padding = 'lg',
  style,
  accessibilityLabel,
  accessibilityRole,
  selected,
  testID,
}: CardProps) => {
  const theme = useTheme();

  const { face, rim, edge } = tones(theme)[tone];
  const paddingValue = padding === 'none' ? 0 : theme.spacing[padding];
  const lift = appearance === 'elevated' ? theme.depth.raised : theme.depth.none;

  const faceStyle: StyleProp<ViewStyle> = [
    styles.face,
    {
      backgroundColor: face,
      borderRadius: theme.radius.lg,
      padding: paddingValue,
      borderColor: edge,
      borderWidth: 2,
    },
  ];

  if (!onPress) {
    // A card that has stopped being pressable — a graded answer, a disabled option — keeps
    // its label, role and state. Otherwise the moment the learner submits, every option on
    // the answer sheet goes silent for a screen reader (SPEC §47).
    return (
      <View
        style={[styles.container, { paddingBottom: lift }, style]}
        testID={testID}
        accessible={accessibilityLabel !== undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityLabel !== undefined ? accessibilityRole : undefined}
        accessibilityState={
          selected === undefined ? undefined : { selected, checked: selected, disabled: true }
        }
      >
        {lift > 0 && (
          <View
            style={[styles.rim, { top: lift, backgroundColor: rim, borderRadius: theme.radius.lg }]}
          />
        )}
        <View style={faceStyle}>{children}</View>
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected, checked: selected }}
      style={[styles.container, { paddingBottom: lift }, style]}
    >
      {({ pressed }) => (
        <>
          {lift > 0 && (
            <View
              style={[
                styles.rim,
                { top: lift, backgroundColor: rim, borderRadius: theme.radius.lg },
              ]}
            />
          )}
          <View style={[faceStyle, { transform: [{ translateY: pressed ? lift : 0 }] }]}>
            {children}
          </View>
        </>
      )}
    </Pressable>
  );
};

const tones = (theme: Theme): Record<CardTone, { face: string; rim: string; edge: string }> => ({
  surface: {
    face: theme.colors.surface,
    rim: theme.colors.surfaceDeep,
    edge: theme.colors.border,
  },
  challenge: {
    face: theme.colors.challengeSurface,
    rim: theme.colors.challengeDeep,
    edge: theme.colors.challenge,
  },
  success: {
    face: theme.colors.successSurface,
    rim: theme.colors.successDeep,
    edge: theme.colors.successFill,
  },
  gold: {
    face: theme.colors.warningSurface,
    rim: theme.colors.xp,
    edge: theme.colors.xp,
  },
});

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  rim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: { overflow: 'hidden' },
});
