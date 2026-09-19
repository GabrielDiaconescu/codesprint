import type { ReminderRequest, ScheduledReminder } from '@/services';

import { reconcileReminders, type ReminderScheduler } from '../reconcile';
import { plannedReminders, type ReminderPlan } from '../schedule';

/**
 * Making the device agree with the plan (SPEC §48).
 *
 * The behaviour worth protecting is the one nobody would notice going wrong: reminders that
 * are already correct must be left exactly where they are, and reminders that should no
 * longer exist must actually be removed from the device rather than merely from the plan.
 */

const fakeScheduler = (scheduled: ScheduledReminder[] = []) => {
  const requests: ReminderRequest[] = [];
  let cancelled = 0;

  const scheduler: ReminderScheduler = {
    getScheduled: () => Promise.resolve(scheduled),
    cancelAll: () => {
      cancelled += 1;
      return Promise.resolve();
    },
    scheduleReminder: (request) => {
      requests.push(request);
      return Promise.resolve(`id-${requests.length}`);
    },
  };

  return {
    scheduler,
    requests,
    get cancelled() {
      return cancelled;
    },
  };
};

const copy = (kind: 'daily' | 'streak') => ({ title: `${kind} title`, body: `${kind} body` });

const daily: ReminderPlan = { kind: 'daily', at: { hour: 9, minute: 0 } };
const streak: ReminderPlan = { kind: 'streak', at: { hour: 20, minute: 0 } };

const onDevice = (...plans: ReminderPlan[]): ScheduledReminder[] =>
  plans.map((plan, index) => ({
    id: `scheduled-${index}`,
    kind: plan.kind,
    hour: plan.at.hour,
    minute: plan.at.minute,
  }));

describe('reconcileReminders', () => {
  it('schedules the plan on a device that has nothing', async () => {
    const fake = fakeScheduler();

    await expect(reconcileReminders(fake.scheduler, [daily, streak], copy)).resolves.toBe(
      'rescheduled',
    );

    expect(fake.requests).toEqual([
      { kind: 'daily', hour: 9, minute: 0, title: 'daily title', body: 'daily body' },
      { kind: 'streak', hour: 20, minute: 0, title: 'streak title', body: 'streak body' },
    ]);
  });

  it('leaves a correct device completely alone', async () => {
    // The common case: every app open, every render. Cancelling and rescheduling here would
    // work, but on Android it drops and re-creates the alarms each time.
    const fake = fakeScheduler(onDevice(daily, streak));

    await expect(reconcileReminders(fake.scheduler, [daily, streak], copy)).resolves.toBe(
      'unchanged',
    );

    expect(fake.cancelled).toBe(0);
    expect(fake.requests).toEqual([]);
  });

  it('ignores the order the device happens to report', async () => {
    const fake = fakeScheduler(onDevice(streak, daily));

    await expect(reconcileReminders(fake.scheduler, [daily, streak], copy)).resolves.toBe(
      'unchanged',
    );
  });

  it('cancels the streak reminder once today’s goal is met', async () => {
    // This is the SPEC §57 device check — "streak reminder cancelled after activity" — as a
    // test. Finishing a lesson makes the goal met, which drops the plan to one reminder.
    const fake = fakeScheduler(onDevice(daily, streak));

    const plan = plannedReminders({
      reminderTime: '09:00',
      permissionGranted: true,
      goalMetToday: true,
      currentStreak: 5,
    });

    await expect(reconcileReminders(fake.scheduler, plan, copy)).resolves.toBe('rescheduled');

    expect(fake.cancelled).toBe(1);
    expect(fake.requests.map((request) => request.kind)).toEqual(['daily']);
  });

  it('removes everything when reminders are switched off', async () => {
    const fake = fakeScheduler(onDevice(daily, streak));

    await expect(reconcileReminders(fake.scheduler, [], copy)).resolves.toBe('rescheduled');

    expect(fake.cancelled).toBe(1);
    expect(fake.requests).toEqual([]);
  });

  it('does not cancel when there is nothing scheduled and nothing planned', async () => {
    // Somebody who declined reminders would otherwise get a pointless OS call on every open.
    const fake = fakeScheduler();

    await expect(reconcileReminders(fake.scheduler, [], copy)).resolves.toBe('unchanged');

    expect(fake.cancelled).toBe(0);
  });

  it('reschedules when the learner moves the time', async () => {
    const fake = fakeScheduler(onDevice(daily));
    const moved: ReminderPlan = { kind: 'daily', at: { hour: 18, minute: 0 } };

    await expect(reconcileReminders(fake.scheduler, [moved], copy)).resolves.toBe('rescheduled');

    expect(fake.cancelled).toBe(1);
    expect(fake.requests[0]?.hour).toBe(18);
  });

  it('carries the copy it is given, so the text is never invented here', async () => {
    const fake = fakeScheduler();

    await reconcileReminders(fake.scheduler, [daily], () => ({
      title: 'Ora de cod',
      body: 'Sesiunea ta de 5 minute te așteaptă.',
    }));

    expect(fake.requests[0]).toMatchObject({
      title: 'Ora de cod',
      body: 'Sesiunea ta de 5 minute te așteaptă.',
    });
  });
});
