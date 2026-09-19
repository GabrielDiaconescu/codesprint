import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdBanner } from '@/services/ads/AdBanner';
import { isBannerPlacementAllowed } from '@/services/ads/config';
import type { AdPlacement } from '@/services';
import { useTheme } from '@/theme';

import { useCanShowAds } from '../hooks/useAds';

export interface BannerSlotProps {
  placement: AdPlacement;
}

/**
 * A banner, on one of the two screens allowed to have one (SPEC §30).
 *
 * Rendered rather than shown imperatively, so it unmounts with the screen and cannot outlive
 * it. `isBannerPlacementAllowed` is a second lock on top of the `AdPlacement` type: banners
 * are forbidden on lessons, practice, exams, the explanation panel and the paywall, and a
 * typo should fail loudly in development rather than quietly putting an advert in front of
 * somebody mid-question.
 *
 * It occupies **no space at all** until an ad has actually loaded. A reserved empty strip on
 * every Learn screen for a learner who has paid — or for one whose ad failed to fill — is a
 * worse experience than the ad itself.
 */
export const BannerSlot = ({ placement }: BannerSlotProps) => {
  const theme = useTheme();
  const canShow = useCanShowAds();
  const [loaded, setLoaded] = useState(false);

  if (__DEV__ && !isBannerPlacementAllowed(placement)) {
    throw new Error(
      `Banner placement "${placement}" is not allowed. Banners belong only on the Learn list ` +
        'and the Leaderboard (SPEC §30).',
    );
  }

  if (!canShow) return null;

  return (
    <View
      testID={`banner-${placement}`}
      style={[styles.root, loaded && { paddingVertical: theme.spacing.sm }]}
      // The ad is not part of the reading order, and a screen reader announcing it between
      // two modules would be worse than useless (SPEC §47).
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* A failure to fill is normal: the slot stays at zero height and says nothing. */}
      <AdBanner onLoaded={() => setLoaded(true)} onFailed={() => setLoaded(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
});
