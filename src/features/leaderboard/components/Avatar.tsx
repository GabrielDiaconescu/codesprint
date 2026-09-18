import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export interface AvatarProps {
  displayName: string;
  /** `profiles.avatar_key` — picks the colour, so a learner keeps the same one everywhere. */
  avatarKey: string;
  size?: number;
}

/**
 * A learner's avatar (SPEC §29).
 *
 * V1 has no photo uploads — that would mean user-generated content to moderate and storage to
 * pay for, for a picture nobody but a leaderboard ever sees. What it has instead is an initial
 * on a colour chosen from `avatar_key`, so the same person looks the same on every screen and
 * in every session, and a rename does not silently recolour them.
 *
 * The circle is `accessibilityElementsHidden`: the row already announces the name, and a
 * screen reader reading "A" before it adds nothing (SPEC §47).
 */
export const Avatar = ({ displayName, avatarKey, size = 40 }: AvatarProps) => {
  const theme = useTheme();

  const palette = [
    theme.colors.primary,
    theme.colors.success,
    theme.colors.streak,
    theme.colors.xp,
    theme.colors.life,
  ];

  // A stable index from the key. Small and deterministic — the same key always gives the
  // same colour, on every device and after every restart.
  let hash = 0;
  for (let i = 0; i < avatarKey.length; i += 1) {
    hash = (hash * 31 + avatarKey.charCodeAt(i)) % 100_000;
  }
  const background = palette[hash % palette.length] ?? theme.colors.primary;

  // The first character of the name, as a grapheme rather than a UTF-16 unit, so an
  // astral-plane first letter does not render as half a character.
  const initial = ([...displayName.trim()][0] ?? '?').toUpperCase();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}
    >
      <Text variant="bodyStrong" style={{ color: theme.colors.textInverse }}>
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
});
