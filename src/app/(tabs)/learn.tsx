import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { ModuleCard } from '@/features/learn/components/ModuleCard';
import { useCourseOverview } from '@/features/learn/hooks/useCourseOverview';
import { useTheme } from '@/theme';

/**
 * The course contents (SPEC §14).
 *
 * Phase 6 shows the published modules and their lock state. Opening a lesson is Phase 7, so
 * a tap currently does nothing rather than leading somewhere unfinished — the screen states
 * plainly what it can and cannot do.
 */
export default function LearnScreen() {
  const { t } = useTranslation('learn');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();

  const { data: course, isPending, isError, refetch, isRefetching } = useCourseOverview();

  if (isPending) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={2} />
          <SkeletonLines lines={3} />
          <SkeletonLines lines={3} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={styles.centre}>
          <StateView
            icon="cloud-offline-outline"
            tone="danger"
            title={t('error.title')}
            body={t('error.body')}
            actionLabel={common('actions.retry')}
            onAction={() => void refetch()}
          />
        </View>
      </Screen>
    );
  }

  const modules = course?.modules ?? [];

  if (modules.length === 0) {
    return (
      <Screen>
        <View style={styles.centre}>
          <StateView icon="book-outline" title={t('empty.title')} body={t('empty.body')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={modules}
        keyExtractor={(module) => module.id}
        contentContainerStyle={[styles.list, { gap: theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View style={[styles.header, { gap: theme.spacing.xs }]}>
            <Text variant="title" accessibilityRole="header">
              {course?.title}
            </Text>
            {course?.description ? (
              <Text variant="body" tone="secondary">
                {course.description}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ModuleCard
            module={item}
            onPress={() =>
              router.push({
                pathname: '/module/[id]',
                // The title and lock state travel with the route so the next screen has a
                // header immediately, rather than an empty bar until its query resolves.
                params: { id: item.id, title: item.title, locked: item.isLocked ? '1' : '0' },
              })
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 16 },
  header: { paddingBottom: 8 },
});
