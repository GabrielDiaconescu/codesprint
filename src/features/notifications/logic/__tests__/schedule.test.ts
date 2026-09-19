import {
  MAX_PER_DAY,
  REMINDER_TIMES,
  STREAK_REMINDER_HOUR,
  nextOccurrence,
  parseReminderTime,
  planSignature,
  plannedReminders,
  plansEqual,
  type ReminderContext,
} from '../schedule';

/**
 * What to remind somebody about, and when (SPEC §48).
 *
 * Most of these tests are the app deciding to say NOTHING. That is the point: an app that nags
 * gets its notifications turned off, and a learner with notifications off is one who stops
 * coming back. The two-a-day budget is the feature, not a limitation on it.
 */

const context = (patch: Partial<ReminderContext> = {}): ReminderContext => ({
  reminderTime: '19:00',
  permissionGranted: true,
  goalMetToday: false,
  currentStreak: 5,
  ...patch,
});

describe('parseReminderTime', () => {
  it.each([
    ['19:00', { hour: 19, minute: 0 }],
    ['07:30', { hour: 7, minute: 30 }],
    ['7:05', { hour: 7, minute: 5 }],
    ['00:00', { hour: 0, minute: 0 }],
    ['23:59', { hour: 23, minute: 59 }],
    // Postgres `time` arrives as HH:MM:SS.
    ['19:00:00', { hour: 19, minute: 0 }],
  ])('parses %s', (value, expected) => {
    expect(parseReminderTime(value)).toEqual(expected);
  });

  it.each([null, '', 'evening', '25:00', '19:60', '-1:00', 'abc:def'])(
    'refuses %p rather than scheduling something wrong',
    (value) => {
      expect(parseReminderTime(value)).toBeNull();
    },
  );
});

describe('plannedReminders', () => {
  it('schedules the daily reminder and the streak one', () => {
    expect(plannedReminders(context({ reminderTime: '09:00' }))).toEqual([
      { kind: 'daily', at: { hour: 9, minute: 0 } },
      { kind: 'streak', at: { hour: STREAK_REMINDER_HOUR, minute: 0 } },
    ]);
  });

  it('keeps the chosen time exactly as chosen', () => {
    expect(plannedReminders(context({ reminderTime: '07:45' }))[0]).toEqual({
      kind: 'daily',
      at: { hour: 7, minute: 45 },
    });
  });

  it('never exceeds the daily budget', () => {
    expect(plannedReminders(context()).length).toBeLessThanOrEqual(MAX_PER_DAY);
  });

  describe('says nothing at all when', () => {
    it('permission was never granted', () => {
      // Scheduling into a permission that does not exist would silently do nothing, and the
      // settings screen would show reminders that never arrive.
      expect(plannedReminders(context({ permissionGranted: false }))).toEqual([]);
    });

    it('there is no time — they skipped the step, or switched reminders off later', () => {
      // A null time is the whole "off" switch (see ReminderContext). If this ever stopped
      // meaning "off", turning reminders off in Settings would silently keep sending them.
      expect(plannedReminders(context({ reminderTime: null }))).toEqual([]);
    });

    it('the stored time is unusable', () => {
      expect(plannedReminders(context({ reminderTime: 'later' }))).toEqual([]);
    });
  });

  describe('the streak reminder', () => {
    it('is dropped once today’s goal is met', () => {
      // They have already been today. Telling them to protect a streak they just protected is
      // the definition of a nag.
      const plans = plannedReminders(context({ goalMetToday: true }));
      expect(plans.map((plan) => plan.kind)).toEqual(['daily']);
    });

    it('is dropped at streak zero, where there is nothing to protect', () => {
      const plans = plannedReminders(context({ currentStreak: 0 }));
      expect(plans.map((plan) => plan.kind)).toEqual(['daily']);
    });

    it.each([
      ['09:00', 20],
      ['12:00', 20],
      ['18:00', 20],
    ])('fires at the fixed evening hour when the daily one is at %s', (time, hour) => {
      const plans = plannedReminders(context({ reminderTime: time }));
      expect(plans[1]).toEqual({ kind: 'streak', at: { hour, minute: 0 } });
    });

    it.each([
      ['19:00', 21],
      ['20:00', 22],
    ])('is PUSHED BACK rather than dropped when %s is too close', (time, hour) => {
      // Evening is a common choice for a learning app. Dropping the last call for everybody
      // who picks one would quietly remove the feature for half the users.
      const plans = plannedReminders(context({ reminderTime: time }));
      expect(plans[1]).toEqual({ kind: 'streak', at: { hour, minute: 0 } });
    });

    it.each(['21:00', '22:00', '23:30'])(
      'is dropped when %s would push it past bedtime',
      (time) => {
        const plans = plannedReminders(context({ reminderTime: time }));
        expect(plans.map((plan) => plan.kind)).toEqual(['daily']);
      },
    );
  });
});

describe('nextOccurrence', () => {
  it('is later today when the time has not passed', () => {
    const now = new Date('2026-09-19T08:00:00');
    expect(nextOccurrence({ hour: 19, minute: 0 }, now).toISOString()).toBe(
      new Date('2026-09-19T19:00:00').toISOString(),
    );
  });

  it('is tomorrow when it already has', () => {
    const now = new Date('2026-09-19T20:00:00');
    expect(nextOccurrence({ hour: 19, minute: 0 }, now).getDate()).toBe(20);
  });

  it('is tomorrow when it is exactly now, rather than firing instantly', () => {
    const now = new Date('2026-09-19T19:00:00');
    expect(nextOccurrence({ hour: 19, minute: 0 }, now).getDate()).toBe(20);
  });

  it('rolls over the end of a month', () => {
    const now = new Date('2026-09-30T23:00:00');
    const next = nextOccurrence({ hour: 9, minute: 0 }, now);
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(1);
  });

  it('zeroes the seconds, so a reminder does not drift later each day', () => {
    const now = new Date('2026-09-19T08:00:37.500');
    const next = nextOccurrence({ hour: 19, minute: 0 }, now);
    expect(next.getSeconds()).toBe(0);
    expect(next.getMilliseconds()).toBe(0);
  });
});

describe('plansEqual', () => {
  const daily = { kind: 'daily' as const, at: { hour: 19, minute: 0 } };
  const streak = { kind: 'streak' as const, at: { hour: 20, minute: 0 } };

  it('is true for the same plans in any order', () => {
    expect(plansEqual([daily, streak], [streak, daily])).toBe(true);
  });

  it('is false when a time changed', () => {
    expect(plansEqual([daily], [{ ...daily, at: { hour: 18, minute: 0 } }])).toBe(false);
  });

  it('is false when one was added or removed', () => {
    expect(plansEqual([daily], [daily, streak])).toBe(false);
    expect(plansEqual([], [daily])).toBe(false);
  });

  it('is true for two empty plans, so nothing is rescheduled for nothing', () => {
    expect(plansEqual([], [])).toBe(true);
  });
});

describe('planSignature', () => {
  const daily = { kind: 'daily' as const, at: { hour: 19, minute: 0 } };
  const streak = { kind: 'streak' as const, at: { hour: 21, minute: 0 } };

  it('is the same for the same plans in any order', () => {
    expect(planSignature([daily, streak], 'en')).toBe(planSignature([streak, daily], 'en'));
  });

  it('changes when a time changes', () => {
    expect(planSignature([daily], 'en')).not.toBe(
      planSignature([{ ...daily, at: { hour: 18, minute: 0 } }], 'en'),
    );
  });

  it('changes with the language, because the copy is baked in at schedule time', () => {
    // A reminder scheduled in English stays English until it is scheduled again — the OS
    // holds the text, not a key. Comparing plans alone would never notice.
    expect(planSignature([daily], 'en')).not.toBe(planSignature([daily], 'ro'));
  });
});

describe('REMINDER_TIMES', () => {
  it('are all times this module can actually parse', () => {
    // Onboarding and Settings offer these. One that failed to parse would be a choice that
    // silently turns reminders off.
    for (const time of REMINDER_TIMES) {
      expect(parseReminderTime(time)).not.toBeNull();
    }
  });
});
