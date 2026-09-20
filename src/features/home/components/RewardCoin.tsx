import { StyleSheet, View } from 'react-native';

import { GameIcon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * An XP reward, drawn as something you could pick up (SPEC §13).
 *
 * A gold face inside a darker gold rim, sitting on its own shadow — the same three-part
 * construction as the icons, at pill scale. The rim is what carries contrast against whatever
 * the coin lies on, so the face is free to be bright.
 *
 * The number is `onGold`, which stays dark in both themes because the coin stays bright in
 * both. Re-using the theme's normal text colour here would make the label invisible in dark
 * mode — a gold coin does not invert.
 */
export const RewardCoin = ({ label, testID }: { label: string; testID?: string }) => {
  const theme = useTheme();

  return (
    <View testID={testID} style={{ paddingBottom: theme.depth.raised }}>
      <View
        style={[
          styles.rim,
          {
            top: theme.depth.raised,
            backgroundColor: theme.colors.xp,
            borderRadius: theme.radius.pill,
          },
        ]}
      />
      <View
        style={[
          styles.face,
          {
            backgroundColor: theme.colors.xpGlow,
            borderColor: theme.colors.xp,
            borderRadius: theme.radius.pill,
            paddingLeft: theme.spacing.sm,
            paddingRight: theme.spacing.md,
            gap: theme.spacing.xs,
          },
        ]}
      >
        <GameIcon name="star" size={20} />
        <Text variant="label" style={{ color: theme.colors.onGold }}>
          {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    borderWidth: 2,
  },
});
