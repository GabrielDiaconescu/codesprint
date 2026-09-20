import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GameIcon } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Lives, as a row of hearts (SPEC §13, §22).
 *
 * Spent hearts stay in place and drain to grey rather than disappearing. A row that shrinks
 * tells you how many you have; a row that drains tells you how many you have **lost**, which
 * is the thing the system exists to make you feel.
 *
 * The row is one accessibility element with one spoken label — five separate "heart" nodes
 * would be five swipes to learn one number (SPEC §47).
 */
export const LivesRow = ({ lives, max }: { lives: number; max: number }) => {
  const { t } = useTranslation('home');
  const theme = useTheme();

  const hearts = Array.from({ length: Math.max(0, max) }, (_, index) => index < lives);

  return (
    <View
      testID="lives-row"
      accessible
      accessibilityLabel={t('lives.count', { count: lives, max })}
      style={[styles.root, { gap: theme.spacing.xs }]}
    >
      {hearts.map((full, index) => (
        <GameIcon key={index} name="heart" size={26} muted={!full} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
});
