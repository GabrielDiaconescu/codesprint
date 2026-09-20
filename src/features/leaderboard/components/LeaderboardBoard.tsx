import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, SkeletonLines, StateView, Text } from '@/components/ui';
import { BannerSlot } from '@/features/ads/components/BannerSlot';
import type { LeaderboardRow } from '@/services';
import { useTheme } from '@/theme';

import { useLeaderboard } from '../hooks/useLeaderboard';
import { absenceReason, buildLeaderboardRows, type LeaderboardItem } from '../logic/rows';

import { DisplayNameSheet } from './DisplayNameSheet';
import { LeaderboardRowItem } from './LeaderboardRowItem';
import { ReportSheet } from './ReportSheet';

export interface LeaderboardBoardProps {
  /** The caller's current display name, for the "choose a name" flow. */
  currentName: string | null;
}

/**
 * The weekly ranking (SPEC §26).
 *
 * The screen's real job is not the list — it is telling a learner who is NOT on the list why,
 * and offering the fix. "Set a name", "you hid yourself", "guests are not ranked" and "you
 * have not earned anything yet" are four different situations, and three of them are one tap
 * away from being solved.
 */
export const LeaderboardBoard = ({ currentName }: LeaderboardBoardProps) => {
  const { t } = useTranslation('leaderboard');
  const theme = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useLeaderboard();
  const [naming, setNaming] = useState(false);
  const [reporting, setReporting] = useState<LeaderboardRow | null>(null);

  if (isPending) {
    return (
      <View style={[styles.padded, { gap: theme.spacing.lg }]}>
        <SkeletonLines lines={8} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <StateView
        testID="leaderboard-error"
        icon="cloud-offline"
        title={t('error.title')}
        body={t('error.body')}
        actionLabel={t('error.retry')}
        onAction={() => void refetch()}
        tone="danger"
      />
    );
  }

  const items = buildLeaderboardRows(data);
  const absence = absenceReason(data);

  const renderItem = ({ item }: { item: LeaderboardItem }) => {
    if (item.kind === 'gap') {
      return (
        <View style={[styles.gap, { paddingVertical: theme.spacing.sm }]}>
          <Text variant="caption" tone="secondary">
            {t('gap', { count: item.skipped })}
          </Text>
        </View>
      );
    }

    return (
      <LeaderboardRowItem
        row={item.row}
        isMe={item.isMe}
        // You cannot report yourself, so the control is simply not there.
        onReport={item.isMe ? undefined : setReporting}
      />
    );
  };

  return (
    <>
      <FlatList
        testID="leaderboard-list"
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={[styles.content, { gap: theme.spacing.xs }]}
        ListHeaderComponent={
          <View style={[styles.header, { gap: theme.spacing.md }]}>
            {/* The other permitted placement (SPEC §30). */}
            <BannerSlot placement="leaderboard" />
            <Text variant="caption" tone="secondary">
              {t('week', { count: data.total_ranked })}
            </Text>

            {absence && (
              <Card appearance="outlined" testID={`leaderboard-absence-${absence}`}>
                <View style={{ gap: theme.spacing.md }}>
                  <Text variant="bodyStrong">{t(`absence.${absence}.title`)}</Text>
                  <Text variant="body" tone="secondary">
                    {t(`absence.${absence}.body`)}
                  </Text>

                  {absence === 'no-name' && (
                    <Button
                      testID="leaderboard-set-name"
                      label={t('absence.no-name.action')}
                      onPress={() => setNaming(true)}
                      fullWidth
                    />
                  )}
                </View>
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={
          <StateView
            testID="leaderboard-empty"
            icon="trophy"
            title={t('empty.title')}
            body={t('empty.body')}
          />
        }
      />

      <DisplayNameSheet
        visible={naming}
        onClose={() => setNaming(false)}
        currentName={currentName}
      />

      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </>
  );
};

const styles = StyleSheet.create({
  content: { paddingVertical: 16, flexGrow: 1 },
  header: { paddingBottom: 8 },
  gap: { alignItems: 'center' },
  padded: { padding: 16 },
});
