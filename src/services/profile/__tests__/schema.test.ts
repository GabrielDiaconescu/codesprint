import { onboardingAnswersSchema, parseProfile } from '../schema';

const row = {
  id: 'user-1',
  display_name: 'Ana',
  avatar_key: 'fox',
  birth_year: 2000,
  locale: 'en',
  timezone: 'Europe/Bucharest',
  experience_level: 'beginner',
  motivation: 'career',
  daily_goal_minutes: 10,
  reminder_time: '19:30:00',
  onboarding_completed_at: '2026-09-17T10:00:00Z',
  leaderboard_hidden: false,
  analytics_consent: true,
  ads_consent_status: 'obtained',
  is_anonymous: false,
};

describe('parseProfile', () => {
  it('maps a full row onto the domain shape', () => {
    expect(parseProfile(row)).toEqual({
      id: 'user-1',
      displayName: 'Ana',
      avatarKey: 'fox',
      birthYear: 2000,
      locale: 'en',
      timezone: 'Europe/Bucharest',
      experienceLevel: 'beginner',
      motivation: 'career',
      dailyGoalMinutes: 10,
      reminderTime: '19:30',
      onboardingCompleted: true,
      leaderboardHidden: false,
      analyticsConsent: true,
      adsConsentStatus: 'obtained',
      isAnonymous: false,
    });
  });

  it('drops the seconds Postgres adds to a time column', () => {
    // The UI matches this against 'HH:MM' preset values; '19:30:00' would never match.
    expect(parseProfile(row).reminderTime).toBe('19:30');
  });

  it('treats a null completion timestamp as not onboarded', () => {
    expect(parseProfile({ ...row, onboarding_completed_at: null }).onboardingCompleted).toBe(false);
  });

  it('keeps a null reminder time null rather than inventing one', () => {
    expect(parseProfile({ ...row, reminder_time: null }).reminderTime).toBeNull();
  });

  describe('forward compatibility', () => {
    // A row written by a newer build must not lock an older client out of its own profile.
    it('falls back to null for an unknown experience level', () => {
      expect(parseProfile({ ...row, experience_level: 'expert' }).experienceLevel).toBeNull();
    });

    it('falls back to null for an unknown motivation', () => {
      expect(parseProfile({ ...row, motivation: 'curiosity' }).motivation).toBeNull();
    });

    it('falls back to unknown for an unrecognised ads consent status', () => {
      expect(parseProfile({ ...row, ads_consent_status: 'pending' }).adsConsentStatus).toBe(
        'unknown',
      );
    });
  });

  it('preserves the server-only "restricted" ads status', () => {
    // Set by the database for minors and never cleared by the client (SPEC §41).
    expect(parseProfile({ ...row, ads_consent_status: 'restricted' }).adsConsentStatus).toBe(
      'restricted',
    );
  });

  it.each([
    ['a missing column', { ...row, is_anonymous: undefined }],
    ['a wrongly typed column', { ...row, daily_goal_minutes: 'ten' }],
    ['not an object', 'nonsense'],
    ['null', null],
  ])('throws on %s', (_label, input) => {
    expect(() => parseProfile(input)).toThrow();
  });
});

describe('onboardingAnswersSchema', () => {
  const answers = {
    birthYear: 2000,
    experienceLevel: 'beginner',
    motivation: 'career',
    dailyGoalMinutes: 10,
    reminderTime: '19:30',
    analyticsConsent: true,
  };

  it('accepts a complete set of answers', () => {
    expect(onboardingAnswersSchema.parse(answers)).toEqual(answers);
  });

  it('accepts a null reminder time', () => {
    expect(onboardingAnswersSchema.parse({ ...answers, reminderTime: null })).toMatchObject({
      reminderTime: null,
    });
  });

  it.each(['00:00', '23:59', '08:05'])('accepts the valid time %s', (time) => {
    expect(() => onboardingAnswersSchema.parse({ ...answers, reminderTime: time })).not.toThrow();
  });

  it.each(['24:00', '7:30', '19:60', '1930', 'evening'])('rejects the time %p', (time) => {
    expect(() => onboardingAnswersSchema.parse({ ...answers, reminderTime: time })).toThrow();
  });

  it.each([
    ['an unsupported daily goal', { dailyGoalMinutes: 7 }],
    ['an unknown experience level', { experienceLevel: 'expert' }],
    ['an unknown motivation', { motivation: 'curiosity' }],
    ['a non-integer birth year', { birthYear: 2000.5 }],
    ['an absurd birth year', { birthYear: 12 }],
  ])('rejects %s', (_label, patch) => {
    expect(() => onboardingAnswersSchema.parse({ ...answers, ...patch })).toThrow();
  });
});
