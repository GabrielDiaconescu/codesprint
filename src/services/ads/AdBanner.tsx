import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { adUnitId } from './config';

export interface AdBannerProps {
  onLoaded: () => void;
  onFailed: () => void;
}

/**
 * The AdMob banner view (SPEC §7, §30).
 *
 * A banner has to be RENDERED rather than shown imperatively, which means the SDK component
 * has to reach a screen somehow. This is the whole of that: the only React component in the
 * app allowed to import `react-native-google-mobile-ads`, kept in `src/services` where the
 * architecture rule says SDKs live.
 *
 * It holds no policy at all. Whether a banner appears, and where it is allowed to, is
 * `BannerSlot`'s decision.
 */
export const AdBanner = ({ onLoaded, onFailed }: AdBannerProps) => (
  <BannerAd
    unitId={adUnitId('banner')}
    // Anchored adaptive: the height the device actually wants, rather than a fixed 50pt
    // strip that looks wrong on a tablet.
    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    onAdLoaded={onLoaded}
    onAdFailedToLoad={onFailed}
  />
);
