import type { NotificationService, ReminderKind } from '@/services';

import { plansEqual, type ReminderPlan } from './schedule';

/**
 * Making the device agree with the plan (SPEC §48).
 *
 * Separate from the hook that calls it so the interesting behaviour — when reminders are
 * replaced, and more importantly when they are left alone — is a unit test with a fake
 * service rather than something only a long evening with a real phone could catch.
 *
 * The strategy is "cancel everything, then schedule the plan". It is idempotent and cannot
 * drift: whatever state the device was left in by a crash, an update or a previous version,
 * one pass puts it right. Reconciling individual notifications would mean carrying their
 * identifiers across app restarts, which buys nothing for at most two of them.
 */

/** Only the parts of the service this needs, so the test can supply four functions. */
export type ReminderScheduler = Pick<
  NotificationService,
  'getScheduled' | 'cancelAll' | 'scheduleReminder'
>;

export type ReminderCopy = (kind: ReminderKind) => { title: string; body: string };

export type ReconcileOutcome = 'unchanged' | 'rescheduled';

export const reconcileReminders = async (
  scheduler: ReminderScheduler,
  plan: ReminderPlan[],
  copy: ReminderCopy,
): Promise<ReconcileOutcome> => {
  const scheduled = await scheduler.getScheduled();
  const current = scheduled.map<ReminderPlan>((reminder) => ({
    kind: reminder.kind,
    at: { hour: reminder.hour, minute: reminder.minute },
  }));

  // The usual case on every app open after the first. Rescheduling anyway would be harmless
  // but wasteful, and on Android it drops and re-creates the alarms each time.
  if (plansEqual(plan, current)) return 'unchanged';

  await scheduler.cancelAll();

  for (const reminder of plan) {
    const { title, body } = copy(reminder.kind);

    await scheduler.scheduleReminder({
      kind: reminder.kind,
      hour: reminder.at.hour,
      minute: reminder.at.minute,
      title,
      body,
    });
  }

  return 'rescheduled';
};
