import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  NotificationPermission,
  NotificationService,
  OpenedReminder,
  ReminderKind,
  ReminderRequest,
  ScheduledReminder,
} from '../types';

/**
 * Local notifications (SPEC §48).
 *
 * Local ONLY. No push server, no device tokens, no notification backend in V1 — every
 * reminder is scheduled on the device by the device, which is why the feature costs nothing
 * to run (SPEC §60) and why it keeps working with no network.
 *
 * This file holds no opinion about *when* to remind anybody. That is `plannedReminders`,
 * which is pure and carries the two-a-day budget; this only does what it is told and reports
 * honestly what the OS currently holds.
 */

/**
 * Android requires a channel before anything can be delivered, and its importance is fixed at
 * creation — changing it in code later does nothing, because from then on the channel belongs
 * to the user.
 *
 * `DEFAULT` rather than `HIGH`: a reminder to practise is not urgent, and a heads-up banner
 * that interrupts whatever somebody is doing is how an app earns a long-press and "turn these
 * off". Silent for the same reason — this is a nudge, not an alarm.
 */
const CHANNEL_ID = 'reminders';

const ensureChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: null,
    enableVibrate: false,
  });
};

/**
 * A reminder that arrives while the app is open is not shown.
 *
 * "Your 5-minute coding session is waiting" on top of the session they are already in reads
 * as a bug. It is still delivered to the app, so the tap handling and the reconciler behave
 * the same; only the banner is suppressed.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const toPermission = (response: {
  granted: boolean;
  canAskAgain: boolean;
}): NotificationPermission => ({
  granted: response.granted,
  canAskAgain: response.canAskAgain,
});

/** What we put in the payload. Ours, but still parsed rather than trusted. */
interface ReminderPayload {
  kind: ReminderKind;
  hour: number;
  minute: number;
}

const KINDS: readonly ReminderKind[] = ['daily', 'streak'];

/**
 * Reads our own payload back out of a notification.
 *
 * The scheduled trigger is deliberately not inspected: its shape differs between platforms
 * and SDK versions, while the payload is ours and identical everywhere.
 */
const readPayload = (data: unknown): ReminderPayload | null => {
  if (typeof data !== 'object' || data === null) return null;

  const { kind, hour, minute } = data as Record<string, unknown>;

  if (typeof kind !== 'string' || !KINDS.includes(kind as ReminderKind)) return null;
  if (typeof hour !== 'number' || typeof minute !== 'number') return null;

  return { kind: kind as ReminderKind, hour, minute };
};

export const ExpoNotificationService: NotificationService = {
  serviceName: 'ExpoNotificationService',
  isNoop: false,

  async requestPermissions() {
    // The channel first: on Android the OS shows the permission dialogue in the context of
    // the channels an app declares.
    await ensureChannel();

    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return toPermission(existing);

    // Asking again once the OS has stopped offering the prompt returns the stored answer
    // without showing anything, which is why `canAskAgain` travels back with the result:
    // Settings can then send the learner to system settings instead of a dialogue that will
    // never appear.
    return toPermission(await Notifications.requestPermissionsAsync());
  },

  async hasPermissions() {
    return toPermission(await Notifications.getPermissionsAsync());
  },

  /**
   * Schedules one repeating daily reminder.
   *
   * A `DAILY` trigger rather than a one-off at a computed timestamp: the OS then repeats it
   * on its own, which is the entire point of a local notification. The app may not be opened
   * for a week and the reminder still has to arrive every evening.
   */
  async scheduleReminder({ kind, hour, minute, title, body }: ReminderRequest) {
    await ensureChannel();

    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { kind, hour, minute } satisfies ReminderPayload,
        // On Android the channel already decides this and cannot be overridden; on iOS the
        // content does, so it is set in both places.
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  },

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async getScheduled() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    return scheduled.reduce<ScheduledReminder[]>((reminders, item) => {
      const payload = readPayload(item.content.data);

      // Anything without our payload is not ours to reconcile. Nothing else schedules
      // notifications in V1, but a stray entry must not make the reconciler cancel and
      // reschedule on every single app open.
      if (payload) reminders.push({ id: item.identifier, ...payload });

      return reminders;
    }, []);
  },

  onOpened(listener: (opened: OpenedReminder) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = readPayload(response.notification.request.content.data);
      if (payload) listener({ kind: payload.kind });
    });

    return () => subscription.remove();
  },

  consumeInitialOpen() {
    const response = Notifications.getLastNotificationResponse();
    const payload = response && readPayload(response.notification.request.content.data);
    if (!payload) return Promise.resolve(null);

    // Cleared so one tap is not replayed at the next launch, which would send a second
    // `notification_opened` for it and inflate the funnel (SPEC §43).
    Notifications.clearLastNotificationResponse();

    return Promise.resolve({ kind: payload.kind });
  },
};
