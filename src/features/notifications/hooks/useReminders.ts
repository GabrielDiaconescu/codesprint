import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useHome } from '@/features/home/hooks/useHome';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { services, type ReminderKind } from '@/services';

import { reconcileReminders } from '../logic/reconcile';
import {
  parseReminderTime,
  plannedReminders,
  planSignature,
  type ReminderPlan,
} from '../logic/schedule';
import { useNotificationStore } from '../store';
import { useNotificationPermissionWatch } from './useNotificationPermission';

/**
 * Keeps what the OS has scheduled equal to what the learner should be getting (SPEC §48).
 *
 * Mounted once, at the root. Everything it needs is already in the cache — the profile holds
 * the chosen time, Home holds today's goal and the streak — so finishing a lesson invalidates
 * Home, this runs again, and the evening streak reminder is cancelled because the goal is now
 * met. That is the whole "cancelled after activity" behaviour: no cancel call at any call
 * site, no chance of one being forgotten.
 *
 * Reconciliation is "cancel everything, then schedule the plan", which is idempotent and
 * cannot drift. Tracking individual identifiers across restarts would buy nothing.
 */
export const useReminders = (): void => {
  const { t, i18n } = useTranslation('notifications');
  const { data: profile } = useProfile();
  const permission = useNotificationStore((state) => state.permission);
  const setPermission = useNotificationStore((state) => state.setPermission);

  const onboardingCompleted = profile?.onboardingCompleted ?? false;
  const { data: home } = useHome(onboardingCompleted);

  useNotificationPermissionWatch(setPermission);
  useReminderTaps();

  const language = i18n.language;
  const reminderTime = profile?.reminderTime ?? null;
  const remindersOff = parseReminderTime(reminderTime) === null;

  // Home is required before scheduling anything, because without it the streak would read as
  // zero and the evening reminder would be dropped for everybody on a cold start. Switching
  // reminders OFF needs nothing but the profile, so an offline learner who turns them off
  // still has them turned off.
  const ready = profile !== undefined && permission !== null && (remindersOff || !!home);
  const permissionGranted = permission?.granted === true;

  // Read out as primitives so the memo below depends on the two values that matter rather
  // than on the whole Home payload, which changes on every XP event.
  const goalMetToday = home?.daily_goal.met ?? false;
  const currentStreak = home?.current_streak ?? 0;

  const plan = useMemo<ReminderPlan[] | null>(
    () =>
      ready
        ? plannedReminders({
            reminderTime,
            permissionGranted,
            goalMetToday,
            currentStreak,
          })
        : null,
    [ready, reminderTime, permissionGranted, goalMetToday, currentStreak],
  );

  // What was last put on the device, so a re-render with identical inputs does not send the
  // OS through a cancel-and-reschedule cycle. Set BEFORE the first await, so two renders in
  // the same tick cannot both start scheduling.
  const reconciled = useRef<string | null>(null);

  useEffect(() => {
    if (!plan) return;

    const signature = planSignature(plan, language);
    if (signature === reconciled.current) return;
    reconciled.current = signature;

    const copy = (kind: ReminderKind) => ({
      title: t(`reminders.${kind}.title`),
      body: t(`reminders.${kind}.body`),
    });

    void reconcileReminders(services.notifications, plan, copy).catch((error: unknown) => {
      // Let the next render try again rather than leaving the device stuck with a stale
      // schedule for the rest of the session.
      reconciled.current = null;
      services.monitoring.captureException(error, { stage: 'reminder-reconcile' });
    });
  }, [plan, language, t]);
};

/**
 * Where each reminder leads (SPEC §48).
 *
 * Resolved when the notification is TAPPED, not when it was scheduled, so a reminder queued
 * a week ago still opens the right screen after an update that moved a route. Both currently
 * lead to Home, which is where the learner continues; the map exists so they can diverge
 * without touching anything that was already scheduled.
 */
const REMINDER_ROUTES: Record<ReminderKind, '/'> = { daily: '/', streak: '/' };

const useReminderTaps = (): void => {
  const router = useRouter();

  useEffect(() => {
    const open = (kind: ReminderKind) => {
      services.analytics.capture('notification_opened', { kind });
      // `navigate` rather than `push`: tapping a reminder should land on Home, not stack a
      // second copy of it on whatever the learner already had open.
      router.navigate(REMINDER_ROUTES[kind]);
    };

    const unsubscribe = services.notifications.onOpened(({ kind }) => open(kind));

    // The tap that started the app arrives before any listener can exist, so it is collected
    // separately — and consumed, so the next launch is not counted as another tap.
    void services.notifications
      .consumeInitialOpen()
      .then((opened) => {
        if (opened) open(opened.kind);
      })
      .catch(() => {});

    return unsubscribe;
  }, [router]);
};
