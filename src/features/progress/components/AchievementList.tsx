import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components/ui';
import type { AchievementEntry } from '@/services';
import { useTheme } from '@/theme';

/**
 * The achievement catalogue (SPEC §25, §29).
 *
 * Locked achievements are shown, dimmed, with their description intact. Hiding them would
 * leave nothing to aim at, and a grid of question marks tells the learner less than the real
 * name does.
 *
 * Locked and unlocked are distinguished by a filled versus outlined icon AND by the word in
 * the accessibility label, never by opacity alone (SPEC §47).
 */
export const AchievementList = ({ achievements }: { achievements: AchievementEntry[] }) => {
  const { t } = useTranslation('progress');
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {achievements.map((achievement) => {
        const unlocked = achievement.unlocked_at !== null;

        return (
          <Card
            key={achievement.id}
            testID={`achievement-row-${achievement.slug}`}
            appearance="outlined"
            padding="md"
            accessibilityLabel={`${achievement.name}. ${achievement.description} ${
              unlocked ? t('achievements.stateUnlocked') : t('achievements.stateLocked')
            }`}
            style={[
              unlocked ? { borderColor: theme.colors.success } : undefined,
              !unlocked && styles.locked,
            ]}
          >
            <View style={[styles.row, { gap: theme.spacing.md }]}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: unlocked ? theme.colors.successSurface : theme.colors.surface,
                    borderColor: unlocked ? theme.colors.success : theme.colors.border,
                  },
                ]}
              >
                <Icon
                  name={(unlocked ? achievement.icon_key : 'lock-closed-outline') as IconName}
                  size="md"
                  color={unlocked ? theme.colors.success : theme.colors.textSecondary}
                />
              </View>

              <View style={[styles.text, { gap: theme.spacing.xs }]}>
                <Text variant="bodyStrong">{achievement.name}</Text>
                <Text variant="caption" tone="secondary">
                  {achievement.description}
                </Text>
              </View>

              {achievement.xp_reward > 0 && (
                <Text variant="caption" tone={unlocked ? 'success' : 'secondary'}>
                  +{achievement.xp_reward}
                </Text>
              )}
            </View>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  text: { flex: 1 },
  locked: { opacity: 0.6 },
});
