import {
  URGENT_MS,
  WARNING_MS,
  formatRemaining,
  hasExpired,
  remainingMs,
  tickIntervalMs,
  timerTone,
} from '../timer';

/**
 * The exam clock (SPEC §27).
 *
 * The deadline belongs to the server, so none of this decides fairness — but it decides what
 * a learner reads while under time pressure, which is worth getting exactly right. Every
 * function takes `now`, so these sit on the boundaries rather than racing them.
 */

const AT = Date.parse('2026-09-18T12:00:00Z');

describe('remainingMs', () => {
  it('counts down to the deadline', () => {
    expect(remainingMs('2026-09-18T12:30:00Z', AT)).toBe(30 * 60_000);
  });

  it('is null for an exam with no time limit', () => {
    expect(remainingMs(null, AT)).toBeNull();
  });

  it('never goes negative', () => {
    // A learner returning an hour later should see 0:00, not a negative countdown.
    expect(remainingMs('2026-09-18T11:00:00Z', AT)).toBe(0);
  });

  it('treats an unparseable timestamp as untimed rather than rendering NaN over an exam', () => {
    expect(remainingMs('not a date', AT)).toBeNull();
  });
});

describe('hasExpired', () => {
  it('is false with time left', () => {
    expect(hasExpired('2026-09-18T12:00:01Z', AT)).toBe(false);
  });

  it('is true exactly on the deadline', () => {
    expect(hasExpired('2026-09-18T12:00:00Z', AT)).toBe(true);
  });

  it('is false for an untimed exam, which can never run out', () => {
    expect(hasExpired(null, AT)).toBe(false);
  });
});

describe('formatRemaining', () => {
  it.each([
    [0, '0:00'],
    [1_000, '0:01'],
    [59_000, '0:59'],
    [60_000, '1:00'],
    [45 * 60_000, '45:00'],
    [59 * 60_000 + 59_000, '59:59'],
  ])('renders %sms as %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });

  it('adds hours only once there are any', () => {
    expect(formatRemaining(60 * 60_000)).toBe('1:00:00');
    expect(formatRemaining(90 * 60_000 + 5_000)).toBe('1:30:05');
  });

  it('floors rather than rounding up, so it never shows more time than there is', () => {
    expect(formatRemaining(1_999)).toBe('0:01');
  });

  it('clamps a negative to zero', () => {
    expect(formatRemaining(-5_000)).toBe('0:00');
  });
});

describe('timerTone', () => {
  it('is normal with plenty of time', () => {
    expect(timerTone(20 * 60_000)).toBe('normal');
  });

  it('warns from five minutes', () => {
    expect(timerTone(WARNING_MS)).toBe('warning');
    expect(timerTone(WARNING_MS + 1)).toBe('normal');
  });

  it('is urgent from one minute', () => {
    expect(timerTone(URGENT_MS)).toBe('urgent');
    expect(timerTone(URGENT_MS + 1)).toBe('warning');
  });

  it('is normal for an untimed exam — there is nothing to hurry for', () => {
    expect(timerTone(null)).toBe('normal');
  });
});

describe('tickIntervalMs', () => {
  it('ticks slowly while only the minute matters', () => {
    // 45 minutes at one tick a second is 2,700 re-renders of a static screen (SPEC §45).
    expect(tickIntervalMs(30 * 60_000)).toBe(30_000);
  });

  it('ticks every second once the seconds start to matter', () => {
    expect(tickIntervalMs(WARNING_MS)).toBe(1000);
    expect(tickIntervalMs(30_000)).toBe(1000);
  });

  it('ticks slowly for an untimed exam', () => {
    expect(tickIntervalMs(null)).toBe(30_000);
  });
});
