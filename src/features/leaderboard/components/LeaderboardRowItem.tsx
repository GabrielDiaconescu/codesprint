import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import type { LeaderboardRow } from '@/services';
import { useTheme } from '@/theme';

import { Avatar } from './Avatar';

export interface LeaderboardRowItemProps {
  row: LeaderboardRow;
  isMe: boolean;
  /** Absent for the caller's own row — reporting yourself is refused by the server anyway. */
  onReport?: (row: LeaderboardRow) => void;
}

/**
 * One line of the ranking (SPEC §26).
 *
 * The caller's own row is highlighted with a border and a label, never with colour alone
 * (SPEC §47) — and the whole row is a single accessibility element reading "3rd, Ada Lovelace,
 * 1,240 XP", because four separate labels is four swipes for one line of a list.
 *
 * The top three get a medal icon beside the number rather than instead of it: a trophy that
 * replaces the rank tells a screen reader nothing.
 */
export const LeaderboardRowItem = ({ row, isMe, onReport }: LeaderboardRowItemProps) => {
  const theme = useTheme();
  const { t } = useTranslation('leaderboard');

  // The top three get a colour; everybody else gets no icon at all.
  const medals: Record<number, string> = {
    1: theme.colors.xp,
    2: theme.colors.textSecondary,
    3: theme.colors.streak,
  };
  const medal = medals[row.rank] ?? null;

  const label = isMe
    ? t('row.accessibilityMe', { rank: row.rank, name: row.display_name, xp: row.xp })
    : t('row.accessibility', { rank: row.rank, name: row.display_name, xp: row.xp });

  return (
    <View
      testID={`leaderboard-row-${row.rank}`}
      accessible
      accessibilityLabel={label}
      style={[
        styles.root,
        {
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: isMe ? theme.colors.surfaceElevated : 'transparent',
          borderWidth: isMe ? 2 : 0,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      <View style={[styles.rank, { gap: theme.spacing.xs }]}>
        <Text variant="bodyStrong" tone={isMe ? 'primary' : 'secondary'}>
          {row.rank}
        </Text>
        {medal && <Icon name="medal-outline" size="sm" color={medal} />}
      </View>

      <Avatar displayName={row.display_name} avatarKey={row.avatar_key} />

      <View style={styles.name}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {row.display_name}
        </Text>
        {isMe && (
          <Text variant="caption" tone="secondary">
            {t('row.you')}
          </Text>
        )}
      </View>

      <Text variant="bodyStrong" tone="secondary">
        {t('row.xp', { xp: row.xp })}
      </Text>

      {onReport && (
        <Pressable
          testID={`leaderboard-report-${row.rank}`}
          accessibilityRole="button"
          accessibilityLabel={t('report.action', { name: row.display_name })}
          hitSlop={12}
          onPress={() => onReport(row)}
          style={({ pressed }) => [styles.report, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="ellipsis-horizontal" size="sm" color={theme.colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
  rank: { minWidth: 34, alignItems: 'center' },
  name: { flex: 1 },
  // 44x44 is the iOS minimum target; the icon itself is far smaller (SPEC §47).
  report: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
