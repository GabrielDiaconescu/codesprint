import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { services, type NotificationPermission } from '@/services';

import { useNotificationStore } from '../store';

/**
 * Notification permission, kept in step with the OS.
 *
 * Its own module, and deliberately free of `expo-router`: the Settings card needs to request
 * permission and should not pull the navigator in behind it.
 */

/**
 * Asks the OS for permission, records the answer and reports it (SPEC §43).
 *
 * One place, used by onboarding and by Settings, so `notification_permission_result` cannot
 * be captured at one call site and forgotten at the other.
 */
export const useRequestNotificationPermission = () => {
  const setPermission = useNotificationStore((state) => state.setPermission);

  return useCallback(
    async (source: 'onboarding' | 'settings'): Promise<boolean> => {
      const permission = await services.notifications.requestPermissions();

      setPermission(permission);
      services.analytics.capture('notification_permission_result', {
        granted: permission.granted,
        source,
      });

      return permission.granted;
    },
    [setPermission],
  );
};

/**
 * Reads the permission the OS currently grants — on mount, and on every return to the
 * foreground, because it can be withdrawn in system settings while the app is backgrounded.
 * A learner who turns notifications off there should not keep seeing them switched on here.
 */
export const useNotificationPermissionWatch = (
  setPermission: (permission: NotificationPermission) => void,
): void => {
  useEffect(() => {
    const read = () => {
      void services.notifications
        .hasPermissions()
        .then(setPermission)
        // Bookkeeping: a failed read must never surface to the learner (SPEC §46).
        .catch(() => {});
    };

    read();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });

    return () => subscription.remove();
  }, [setPermission]);
};
