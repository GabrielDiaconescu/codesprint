import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { Card, Icon, Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { useModuleLessons } from '@/features/lesson/hooks/useLesson';
import { useTheme } from '@/theme';

/**
 * The lessons inside a module (SPEC §14).
 *
 * A locked module still lists its lessons. Showing what Premium contains is the honest way to
 * present the boundary; hiding it makes the course look shorter than it is and gives the user
 * nothing to weigh. Tapping through is what the server refuses.
 */
export default function ModuleScreen() {
  const { t } = useTranslation('lesson');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string; title?: string; locked?: string }>();
  const moduleId = typeof params.id === 'string' ? params.id : undefined;
  const title = typeof params.title === 'string' ? params.title : '';
  const isLocked = params.locked === '1';

  const { data: config } = useAppConfig();
  const { data: lessons, isPending, isError, refetch } = useModuleLessons(moduleId);

  return (
    <Screen>
      <Stack.Screen options={{ title }} />

      {isPending ? (
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={2} />
          <SkeletonLines lines={2} />
          <SkeletonLines lines={2} />
        </View>
      ) : isError ? (
        <View style={styles.centre}>
          <StateView
            icon="cloud-offline"
            tone="danger"
            title={t('error.unknownTitle')}
            body={t('error.unknownBody')}
            actionLabel={common('actions.retry')}
            onAction={() => void refetch()}
          />
        </View>
      ) : (lessons ?? []).length === 0 ? (
        <View style={styles.centre}>
          <StateView icon="book" title={t('module.empty')} />
        </View>
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(lesson) => lesson.id}
          contentContainerStyle={[styles.list, { gap: theme.spacing.sm }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isLocked ? (
              <Card appearance="outlined" style={{ marginBottom: theme.spacing.md }}>
                <View style={[styles.lockedHeader, { gap: theme.spacing.sm }]}>
                  <Icon name="lock-closed" size="md" color={theme.colors.textSecondary} />
                  <View style={[styles.flex, { gap: theme.spacing.xs }]}>
                    <Text variant="bodyStrong">{t('module.lockedTitle')}</Text>
                    <Text variant="caption" tone="secondary">
                      {t('module.lockedBody', { freeCount: config.free_module_count })}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null
          }
          renderItem={({ item }) => (
            <Card
              testID={`lesson-${item.slug}`}
              appearance="outlined"
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: item.id } })}
              accessibilityLabel={`${item.orderIndex}. ${item.title}. ${t('estimated', { count: item.estimatedMinutes })}`}
            >
              <View style={[styles.row, { gap: theme.spacing.md }]}>
                <View style={[styles.number, { backgroundColor: theme.colors.surfaceElevated }]}>
                  <Text variant="label" tone="secondary">
                    {String(item.orderIndex).padStart(2, '0')}
                  </Text>
                </View>

                <View style={[styles.flex, { gap: theme.spacing.xs }]}>
                  <Text variant="bodyStrong">{item.title}</Text>
                  {item.summary.length > 0 && (
                    <Text variant="caption" tone="secondary">
                      {item.summary}
                    </Text>
                  )}
                </View>

                <View style={[styles.duration, { gap: theme.spacing.xs }]}>
                  <Icon name="time" size="sm" color={theme.colors.textSecondary} />
                  <Text variant="caption" tone="secondary">
                    {t('estimated', { count: item.estimatedMinutes })}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  lockedHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  number: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
