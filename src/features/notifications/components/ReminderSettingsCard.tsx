import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Text, Toggle, Chip } from '@/components/ui';
import { queryKeys } from '@/lib/queryClient';
import { services, type UserProfile } from '@/services';
import { useSessionStore } from '@/store/sessionStore';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/theme';

import { DEFAULT_REMINDER_TIME, REMINDER_TIMES } from '../logic/schedule';
import { useRequestNotificationPermission } from '../hooks/useNotificationPermission';
import { useNotificationStore } from '../store';

export interface ReminderSettingsCardProps {
  profile: UserProfile;
}

/**
 * Reminders, on the Profile screen (SPEC §29, §48).
 *
 * The switch and the time are one value: `reminder_time`, where null means off. There is no
 * separate "notifications enabled" flag, so the two can never disagree, and the setting
 * follows the learner to a new phone — which a flag kept on the device would not.
 *
 * Switching reminders ON asks the OS for permission first and writes nothing if it is
 * refused. A switch that stays on while the OS delivers nothing is the worst outcome here:
 * the learner would believe they are being reminded and quietly lose their streak.
 */
export const ReminderSettingsCard = ({ profile }: ReminderSettingsCardProps) => {
  const { t } = useTranslation('notifications');
  const theme = useTheme();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const userId = useSessionStore((state) => state.userId);
  const permission = useNotificationStore((state) => state.permission);
  const requestPermission = useRequestNotificationPermission();

  const enabled = profile.reminderTime !== null;

  // Three states, not two. "Refused for good" is the only one that sends the learner to
  // system settings; somebody who simply skipped the onboarding step has never been asked,
  // and for them switching this on is one tap and a dialogue.
  const blocked = permission !== null && !permission.granted && !permission.canAskAgain;
  const unknown = permission === null;

  // Their last choice, so switching off and back on does not silently move the reminder to
  // a default hour they never picked.
  const lastTime = useRef(profile.reminderTime ?? DEFAULT_REMINDER_TIME);
  useEffect(() => {
    if (profile.reminderTime) lastTime.current = profile.reminderTime;
  }, [profile.reminderTime]);

  /**
   * Every change to this setting, in one mutation: switching on, switching off, and moving
   * the time. The permission step lives inside it rather than in the event handler, so the
   * screen cannot end up with a switch that is on and a permission that was refused.
   *
   * Nothing is scheduled here. The profile is the input to `useReminders`, which reconciles
   * the device as soon as this write lands — one place in the app talks to the OS.
   */
  const setReminderTime = useMutation<UserProfile | null, Error, string | null>({
    mutationFn: async (reminderTime) => {
      if (reminderTime !== null) {
        const granted = permission?.granted === true || (await requestPermission('settings'));

        // Refused: write nothing and leave the switch off, rather than promising a reminder
        // that cannot arrive. Not an error — the learner said no, and that is an answer.
        if (!granted) return null;
      }

      return services.profile.update({ reminderTime });
    },
    onSuccess: (updated) => {
      if (updated && userId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
      }
    },
    onError: () => showToast({ message: t('failed'), tone: 'error' }),
  });

  return (
    <Card testID="reminder-settings">
      <View style={{ gap: theme.spacing.lg }}>
        <Text variant="bodyStrong">{t('title')}</Text>

        <Toggle
          testID="reminders-toggle"
          label={t('toggle.label')}
          description={t('toggle.description')}
          value={enabled}
          disabled={unknown || blocked}
          onValueChange={(on) => setReminderTime.mutate(on ? lastTime.current : null)}
        />

        {blocked && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="body" tone="secondary">
              {t('permission.denied')}
            </Text>
            <Button
              testID="reminders-open-settings"
              label={t('permission.action')}
              variant="secondary"
              icon="options-outline"
              onPress={() => void Linking.openSettings()}
              fullWidth
            />
          </View>
        )}

        {enabled && (
          <>
            <Divider />
            <View style={{ gap: theme.spacing.md }}>
              <Text variant="body" tone="secondary">
                {t('time.label')}
              </Text>
              <View style={[styles.times, { gap: theme.spacing.sm }]}>
                {REMINDER_TIMES.map((time) => (
                  <Chip
                    key={time}
                    testID={`reminder-time-${time}`}
                    label={time}
                    selected={profile.reminderTime === time}
                    disabled={setReminderTime.isPending}
                    onPress={() => setReminderTime.mutate(time)}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  times: { flexDirection: 'row', flexWrap: 'wrap' },
});
