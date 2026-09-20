import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { ExamCard } from '@/features/exams/components/ExamCard';
import { useExamOverview } from '@/features/exams/hooks/useExams';
import { useTheme } from '@/theme';

/**
 * The exam list (SPEC §27).
 *
 * Full-screen and outside the tabs, like a lesson: no tab bar and no banner ad anywhere near
 * an exam (SPEC §10, §30).
 *
 * Every exam is listed, including the ones this learner cannot start. A card that explains
 * why it is locked is more use than a card that is not there.
 */
export default function ExamListScreen() {
  const { t } = useTranslation('exam');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();
  const { data, isPending, isError, refetch, isRefetching } = useExamOverview();

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={4} />
          <SkeletonLines lines={4} />
        </View>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
        <StateView
          testID="exam-list-error"
          icon="cloud-offline"
          tone="danger"
          title={t('error.title')}
          body={t('error.body')}
          actionLabel={common('actions.retry')}
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  // The remote kill switch (SPEC §50). Reaching this screen at all means the entry point was
  // rendered before the flag was read, so it says so rather than showing an empty list.
  if (!data.enabled) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
        <StateView
          testID="exam-disabled"
          icon="construct"
          title={t('disabled.title')}
          body={t('disabled.body')}
          actionLabel={common('actions.close')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('title') }} />
      <FlatList
        testID="exam-list"
        data={data.exams}
        keyExtractor={(exam) => exam.id}
        contentContainerStyle={[styles.list, { gap: theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View style={[styles.header, { gap: theme.spacing.xs }]}>
            <Text variant="body" tone="secondary">
              {t('intro')}
            </Text>
            {data.best_xp > 0 && (
              <Text variant="caption" tone="secondary">
                {t('bankedXp', { xp: data.best_xp })}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ExamCard
            exam={item}
            onStart={(exam) =>
              router.push({ pathname: '/exam/[id]', params: { id: exam.id, title: exam.title } })
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 16 },
  header: { paddingBottom: 8 },
});
