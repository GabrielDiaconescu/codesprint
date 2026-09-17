import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Button, ProgressBar, Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { LessonBlockView } from '@/features/lesson/components/LessonBlocks';
import { useLesson } from '@/features/lesson/hooks/useLesson';
import { LessonUnavailableError, type LessonErrorReason } from '@/services';
import { useTheme } from '@/theme';

/**
 * The lesson player (SPEC §15).
 *
 * A full-screen route outside the tabs, so there is no tab bar and no banner ad while
 * reading (SPEC §10, §30).
 *
 * Phase 7 is the reader: blocks render, progress tracks reading, and the end is a completion
 * screen. Answering, XP and streaks are Phases 8 and 9, and the screen says so rather than
 * showing a zero that looks like a bug.
 */
export default function LessonScreen() {
  const { t } = useTranslation('lesson');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : undefined;

  const { data: lesson, isPending, isError, error, refetch } = useLesson(lessonId);

  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);

  /**
   * Progress is how much of the lesson has been read.
   *
   * A short lesson that fits on one screen would otherwise sit at 0% forever, so a layout
   * with nothing to scroll counts as fully read.
   */
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollable = contentSize.height - layoutMeasurement.height;

    setProgress(scrollable <= 0 ? 1 : Math.min(1, Math.max(0, contentOffset.y / scrollable)));
  };

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={3} />
          <SkeletonLines lines={4} />
          <SkeletonLines lines={3} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    const reason: LessonErrorReason =
      error instanceof LessonUnavailableError ? error.reason : 'unknown';

    const presentation = {
      'requires-premium': {
        icon: 'lock-closed' as const,
        title: t('error.premiumTitle'),
        body: t('error.premiumBody'),
        action: t('error.back'),
        onAction: () => router.back(),
      },
      'not-found': {
        icon: 'help-circle-outline' as const,
        title: t('error.notFoundTitle'),
        body: t('error.notFoundBody'),
        action: t('error.back'),
        onAction: () => router.back(),
      },
      unknown: {
        icon: 'cloud-offline-outline' as const,
        title: t('error.unknownTitle'),
        body: t('error.unknownBody'),
        action: common('actions.retry'),
        onAction: () => void refetch(),
      },
    }[reason];

    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.centre}>
          <StateView
            testID={`lesson-error-${reason}`}
            icon={presentation.icon}
            tone={reason === 'unknown' ? 'danger' : 'neutral'}
            title={presentation.title}
            body={presentation.body}
            actionLabel={presentation.action}
            onAction={presentation.onAction}
          />
        </View>
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen>
        <Stack.Screen options={{ title: lesson.title }} />
        <View style={styles.centre}>
          <StateView
            testID="lesson-complete"
            icon="checkmark-circle"
            title={t('complete.title')}
            body={t('complete.body', { title: lesson.title })}
            actionLabel={t('complete.backToModule')}
            onAction={() => router.back()}
          />
          <Text variant="caption" tone="secondary" style={styles.pendingNote}>
            {t('complete.xpPending')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson.module.title }} />

      <View style={{ paddingTop: theme.spacing.sm, gap: theme.spacing.xs }}>
        <ProgressBar value={progress} label={t('progress', { percent: Math.round(progress * 100) })} />
      </View>

      <ScrollView
        testID="lesson-scroll"
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="title" accessibilityRole="header">
            {lesson.title}
          </Text>
          {lesson.summary.length > 0 && (
            <Text variant="body" tone="secondary">
              {lesson.summary}
            </Text>
          )}
        </View>

        {lesson.blocks.map((block, index) => (
          <LessonBlockView key={index} block={block} />
        ))}

        <Button
          testID="lesson-finish"
          label={t('finish')}
          onPress={() => setFinished(true)}
          fullWidth
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 16 },
  pendingNote: { textAlign: 'center', paddingHorizontal: 24 },
});
