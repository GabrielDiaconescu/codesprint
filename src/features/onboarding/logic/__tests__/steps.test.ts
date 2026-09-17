import {
  ONBOARDING_STEPS,
  STEP_COUNT,
  isComplete,
  nextStep,
  stepNumber,
  stepProgress,
} from '../steps';

describe('the onboarding sequence', () => {
  it('fits within the six screens the spec allows', () => {
    // SPEC §11: "concise (≤ 6 screens)".
    expect(STEP_COUNT).toBeLessThanOrEqual(6);
  });

  it('starts with the age gate', () => {
    // Its outcome can end the flow, so asking anything before it wastes the user's time.
    expect(ONBOARDING_STEPS[0]).toBe('age');
  });

  it('ends with consent', () => {
    expect(ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]).toBe('consent');
  });

  it('has no duplicate steps', () => {
    expect(new Set(ONBOARDING_STEPS).size).toBe(ONBOARDING_STEPS.length);
  });
});

describe('progress', () => {
  it('numbers steps from one', () => {
    expect(stepNumber('age')).toBe(1);
  });

  it('reaches exactly 1 on the last step', () => {
    // A progress bar that stops at 0.9 on the final screen reads as "there is more".
    expect(stepProgress('consent')).toBe(1);
  });

  it('never reports zero progress', () => {
    expect(stepProgress('age')).toBeGreaterThan(0);
  });

  it('increases monotonically', () => {
    const values = ONBOARDING_STEPS.map(stepProgress);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});

describe('nextStep', () => {
  it('walks the whole sequence', () => {
    const walked = ['age'];
    let current = nextStep('age');
    while (current) {
      walked.push(current);
      current = nextStep(current);
    }
    expect(walked).toEqual([...ONBOARDING_STEPS]);
  });

  it('returns null after the last step', () => {
    expect(nextStep('consent')).toBeNull();
  });
});

describe('isComplete', () => {
  const full = {
    birthYear: 2000,
    experienceLevel: 'beginner',
    motivation: 'career',
    dailyGoalMinutes: 10,
    reminderTime: '19:00',
    analyticsConsent: true,
  } as const;

  it('accepts a fully answered draft', () => {
    expect(isComplete(full)).toBe(true);
  });

  it('accepts a null reminder time, which is a real answer', () => {
    // "No reminders, thanks" is a choice, not an unanswered step (SPEC §11: skippable).
    expect(isComplete({ ...full, reminderTime: null })).toBe(true);
  });

  it('accepts a missing reminder time', () => {
    const { reminderTime: _ignored, ...withoutReminder } = full;
    expect(isComplete(withoutReminder)).toBe(true);
  });

  it('accepts analytics consent that was declined', () => {
    // false is an answer; only undefined means unanswered.
    expect(isComplete({ ...full, analyticsConsent: false })).toBe(true);
  });

  it.each(['birthYear', 'experienceLevel', 'motivation', 'dailyGoalMinutes', 'analyticsConsent'])(
    'rejects a draft missing %s',
    (key) => {
      const partial: Record<string, unknown> = { ...full };
      delete partial[key];
      expect(isComplete(partial)).toBe(false);
    },
  );

  it('rejects an empty draft', () => {
    expect(isComplete({})).toBe(false);
  });
});
