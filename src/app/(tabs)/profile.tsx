import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, PlaceholderState, Screen, SkeletonLines } from '@/components/ui';
import { SessionCard } from '@/features/auth/components/SessionCard';
import { PrivacySettingsCard } from '@/features/analytics/components/PrivacySettingsCard';
import { LeaderboardSettingsCard } from '@/features/leaderboard/components/LeaderboardSettingsCard';
import { ReminderSettingsCard } from '@/features/notifications/components/ReminderSettingsCard';
import { LevelCard } from '@/features/progress/components/LevelCard';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useUserStats } from '@/features/progress/hooks/useProgress';
import { useTheme } from '@/theme';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');
  const { t: progress } = useTranslation('progress');
  const theme = useTheme();
  const router = useRouter();
  const { data: stats, isPending } = useUserStats();
  const { data: profile } = useProfile();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <SessionCard />

        {isPending ? (
          <SkeletonLines lines={3} />
        ) : (
          <LevelCard
            xpTotal={stats?.xp_total ?? 0}
            streak={stats?.current_streak}
            lives={
              stats
                ? {
                    lives: stats.lives,
                    max: stats.lives_max,
                    unlimited: stats.lives_unlimited,
                    nextLifeAt: stats.next_life_at,
                  }
                : undefined
            }
            compact
          />
        )}

        {profile && <ReminderSettingsCard profile={profile} />}

        {profile && <LeaderboardSettingsCard profile={profile} />}

        {profile && <PrivacySettingsCard profile={profile} />}

        <Button
          testID="profile-progress"
          variant="secondary"
          label={progress('open')}
          icon="stats-chart-outline"
          onPress={() => router.push('/progress')}
          fullWidth
        />

        <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />
      </ScrollView>

      {/* Development-only entry point to the design-system gallery (SPEC §57, Phase 2).
          __DEV__ is false in every release build, so this never reaches a user. */}
      {__DEV__ && (
        <View style={styles.devTools}>
          <Link href="/gallery" asChild>
            <Button label="Component gallery (dev)" variant="ghost" icon="color-palette-outline" />
          </Link>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  devTools: { paddingBottom: 16, alignItems: 'center' },
});
