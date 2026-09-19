/**
 * What to remind somebody about, and when (SPEC §48).
 *
 * The rule that shapes everything here: **at most two notifications a day.** A learning app
 * that nags is one that gets its notifications turned off, and a learner who has turned them
 * off is one who stops coming back — so the budget is not a nicety, it is the feature.
 *
 * Pure, so every restriction is a unit test rather than a week of waiting for evenings to
 * arrive.
 */

import type { ReminderKind } from '@/services';

export const MAX_PER_DAY = 2;

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface ReminderPlan {
  kind: ReminderKind;
  at: ReminderTime;
}

export interface ReminderContext {
  /**
   * From `profiles.reminder_time`, "HH:MM".
   *
   * **Null is how "reminders off" is stored.** There is no second flag: the switch in
   * Settings clears the time, exactly as skipping the onboarding step does. One value means
   * the setting cannot disagree with itself, and it follows the learner to a new device —
   * which a flag kept on the phone would not.
   */
  reminderTime: string | null;
  /** Whether the OS currently allows notifications. Nothing is scheduled without it. */
  permissionGranted: boolean;
  /** True once today's XP target is met — the streak reminder is then pointless. */
  goalMetToday: boolean;
  /** Their current streak. Nothing to protect at zero. */
  currentStreak: number;
}

/**
 * The hour the evening streak reminder fires.
 *
 * Late enough to be a last call, early enough not to arrive after somebody has gone to bed.
 * Not configurable: a remote flag for this would be a setting nobody would ever tune, and
 * SPEC §48 describes one evening reminder rather than a schedule.
 */
export const STREAK_REMINDER_HOUR = 20;

/** Never later than this. A reminder after bedtime is a notification nobody wanted. */
export const LATEST_REMINDER_HOUR = 22;

/** Two notifications closer together than this are one interruption, not two reminders. */
export const MIN_HOURS_APART = 2;

/**
 * The times a learner may choose.
 *
 * Presets rather than a wheel picker: a native date-time picker is a whole extra dependency
 * for a question whose useful answers are "morning", "after work" and "before bed", and five
 * taps beat scrolling two wheels. Onboarding and Settings share this list so the time chosen
 * on one screen is always selectable on the other.
 */
export const REMINDER_TIMES = ['08:00', '12:00', '18:00', '20:00', '21:30'] as const;

/** Used when the switch in Settings is turned back on and there is no earlier choice. */
export const DEFAULT_REMINDER_TIME = '18:00';

/** "HH:MM" → `{hour, minute}`, or null if it is not a time. */
export const parseReminderTime = (value: string | null): ReminderTime | null => {
  if (!value) return null;

  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
};

/**
 * When the evening streak reminder should fire, given the time they chose.
 *
 * Normally the fixed evening hour. But somebody whose daily reminder is already at 19:00 would
 * get a second buzz an hour later — one interruption, not two reminders — so it is pushed back
 * instead of dropped. Evening is a common choice for a learning app, and dropping the last
 * call for everybody who picks one would quietly remove the feature for half the users.
 *
 * Null when pushing it back would put it past bedtime, which is the one case where saying
 * nothing really is better.
 */
export const streakReminderHour = (daily: ReminderTime): number | null => {
  if (daily.hour + MIN_HOURS_APART <= STREAK_REMINDER_HOUR) return STREAK_REMINDER_HOUR;

  const pushed = daily.hour + MIN_HOURS_APART;
  return pushed <= LATEST_REMINDER_HOUR ? pushed : null;
};

/**
 * Everything that should currently be scheduled.
 *
 * Returning the whole desired set rather than a diff is deliberate: scheduling is "cancel
 * everything, then schedule this", which is idempotent and cannot drift. Reconciling
 * individual notifications would mean tracking identifiers across app restarts for no gain.
 */
export const plannedReminders = (context: ReminderContext): ReminderPlan[] => {
  if (!context.permissionGranted) return [];

  // No time means reminders are off, whether they were never chosen or switched off later.
  const at = parseReminderTime(context.reminderTime);
  if (!at) return [];

  const plans: ReminderPlan[] = [{ kind: 'daily', at }];

  // The streak reminder is the one that earns its place, and only sometimes:
  //   * nothing to protect at streak zero — that is a nag, not a reminder;
  //   * nothing to do once the goal is met — they have already been today.
  if (context.currentStreak > 0 && !context.goalMetToday) {
    const streakHour = streakReminderHour(at);
    if (streakHour !== null) plans.push({ kind: 'streak', at: { hour: streakHour, minute: 0 } });
  }

  return plans.slice(0, MAX_PER_DAY);
};

/**
 * The next time a daily reminder at `at` should fire, as an absolute moment.
 *
 * Scheduled with the device's own clock, so a learner who travels gets their reminder at the
 * same local time in the new place — which is what "remind me at 19:00" means to a person.
 */
export const nextOccurrence = (at: ReminderTime, now: Date): Date => {
  const next = new Date(now);
  next.setHours(at.hour, at.minute, 0, 0);

  // Already gone today, so the next one is tomorrow.
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
};

/**
 * Whether the plan differs from what is already scheduled.
 *
 * Rescheduling on every app open would be harmless but wasteful, and on Android it briefly
 * drops and re-creates the alarms. Comparing first keeps a reminder that is already correct
 * exactly where it is.
 */
export const plansEqual = (a: ReminderPlan[], b: ReminderPlan[]): boolean => {
  if (a.length !== b.length) return false;

  const left = a.map(planKey).sort();
  const right = b.map(planKey).sort();

  return left.every((value, index) => value === right[index]);
};

const planKey = (plan: ReminderPlan) => `${plan.kind}@${plan.at.hour}:${plan.at.minute}`;

/**
 * Everything a scheduled set depends on, as one string.
 *
 * The language is part of it because notification text is baked in by the OS at schedule
 * time and cannot be translated afterwards — a reminder scheduled in English stays English
 * until it is scheduled again. Comparing plans alone would miss that entirely.
 */
export const planSignature = (plans: ReminderPlan[], language: string): string =>
  [language, ...plans.map(planKey).sort()].join('|');
