import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { isBelowMinimum, storeUrl } from '../logic/appVersion';
import { useAppConfig } from './useAppConfig';

/**
 * Whether this build is too old to keep using, and where to get a newer one (SPEC §50, §51).
 *
 * The NATIVE version, from the store build — not the JavaScript's: an over-the-air update can
 * change the JavaScript, but the version a learner has to replace is the one they installed.
 * Read from `app_config`, which is fetched on every start, so raising the minimum takes effect
 * on the next launch of every old build without shipping anything.
 */
export const useForceUpdate = (): { required: boolean; url: string | null } => {
  const { data: config } = useAppConfig();

  const required = isBelowMinimum(
    Application.nativeApplicationVersion,
    config.min_supported_app_version,
  );

  return {
    required,
    url: storeUrl({
      platform: Platform.OS,
      applicationId: Application.applicationId,
      iosAppStoreId: config.ios_app_store_id,
    }),
  };
};
