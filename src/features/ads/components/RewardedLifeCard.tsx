import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { queryKeys } from '@/lib/queryClient';
import { services, toRewardRefusal, type RewardedAllowance, type RewardedGrant } from '@/services';
import { useSessionStore } from '@/store/sessionStore';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/theme';

/**
 * Out of lives (SPEC §22, §30).
 *
 * The three ways forward, in the order SPEC §22 lists them: wait, watch an ad, or upgrade.
 * Waiting is already on screen — `LivesIndicator` shows the countdown — so this card adds the
 * other two.
 *
 * The ad offer is hidden unless the SERVER says the reward is still available, so nobody ever
 * sits through thirty seconds of advertising to be told the daily cap was reached. That check
 * is a query rather than a guess, and it is the whole reason `rewarded_allowance` exists.
 */
export const RewardedLifeCard = () => {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const userId = useSessionStore((state) => state.userId);
  const [watching, setWatching] = useState(false);

  const allowance = useQuery<RewardedAllowance>({
    queryKey: queryKeys.user.rewards(userId ?? 'none'),
    queryFn: () => services.progress.getRewardedAllowance(),
    enabled: userId !== null,
    staleTime: 30_000,
  });

  const claim = useMutation<RewardedGrant, Error, void>({
    mutationFn: () => services.progress.claimRewardedAd('life'),
    onSuccess: () => {
      // Lives appear on Home, in the lesson header and on Profile.
      if (userId) void queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  const watch = async () => {
    setWatching(true);
    try {
      // AdMob reports whether the reward was earned. Closing the ad early earns nothing,
      // and nothing is claimed.
      const earned = await services.ads.showRewarded('life');
      if (!earned) return;

      await claim.mutateAsync();
      showToast({ message: t('rewarded.granted'), tone: 'success' });
    } catch (error) {
      showToast({ message: t(`rewarded.refused.${toRewardRefusal(error)}`), tone: 'error' });
    } finally {
      setWatching(false);
    }
  };

  const life = allowance.data?.ads_enabled === true ? allowance.data.life : null;
  const canWatch = life?.available === true;

  return (
    <Card testID="out-of-lives" appearance="outlined">
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="bodyStrong">{t('outOfLives.title')}</Text>
        <Text variant="body" tone="secondary">
          {t('outOfLives.body')}
        </Text>

        {canWatch && life && (
          <>
            <Button
              testID="watch-for-life"
              label={t('rewarded.watchForLife')}
              icon="play-circle-outline"
              variant="secondary"
              loading={watching || claim.isPending}
              onPress={() => void watch()}
              fullWidth
            />
            <Text variant="caption" tone="secondary">
              {t('rewarded.remaining', { used: life.used, cap: life.cap })}
            </Text>
          </>
        )}

        <Button
          testID="out-of-lives-premium"
          label={t('outOfLives.premium')}
          icon="infinite-outline"
          onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'out_of_lives' } })}
          fullWidth
        />
      </View>
    </Card>
  );
};
