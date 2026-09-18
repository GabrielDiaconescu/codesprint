import { shouldPrompt, type PromptContext } from '../prompts';

/**
 * When the app may suggest upgrading (SPEC §34).
 *
 * Every rule here is a restriction, so every test is about the app keeping quiet. The one that
 * matters most is "never mid-lesson": interrupting somebody who is answering a question to ask
 * for money is the most resented thing an app like this can do.
 */

const context = (patch: Partial<PromptContext> = {}): PromptContext => ({
  shownToday: 0,
  maxPerDay: 1,
  inSession: false,
  lessonsCompleted: 5,
  isAdFree: false,
  isPremium: false,
  paywallEnabled: true,
  ...patch,
});

describe('shouldPrompt', () => {
  it('shows at a natural break', () => {
    expect(shouldPrompt('module_locked', context())).toEqual({ show: true });
  });

  it('never interrupts a session', () => {
    expect(shouldPrompt('out_of_lives', context({ inSession: true }))).toEqual({
      show: false,
      reason: 'in-session',
    });
  });

  it('never appears before the first lesson is finished', () => {
    // Somebody who has not seen what the app does cannot judge whether paying is worth it
    // (SPEC §33).
    expect(shouldPrompt('module_locked', context({ lessonsCompleted: 0 }))).toEqual({
      show: false,
      reason: 'no-lesson-yet',
    });
  });

  it('respects the daily cap', () => {
    expect(shouldPrompt('after_ad', context({ shownToday: 1, maxPerDay: 1 }))).toEqual({
      show: false,
      reason: 'daily-cap',
    });
  });

  it('allows a second prompt when the cap is raised', () => {
    expect(shouldPrompt('after_ad', context({ shownToday: 1, maxPerDay: 2 }))).toEqual({
      show: true,
    });
  });

  it('says nothing to a Premium subscriber, whatever the trigger', () => {
    for (const trigger of ['module_locked', 'out_of_lives', 'premium_feature', 'manual'] as const) {
      expect(shouldPrompt(trigger, context({ isPremium: true, isAdFree: true }))).toEqual({
        show: false,
        reason: 'entitled',
      });
    }
  });

  it('does not pitch ad removal to somebody who already removed ads', () => {
    expect(shouldPrompt('after_ad', context({ isAdFree: true }))).toEqual({
      show: false,
      reason: 'entitled',
    });
  });

  it('still explains Premium to a No Ads subscriber, because it is a different thing', () => {
    // SPEC §5 is explicit that No Ads does not unlock Premium content, so a No Ads subscriber
    // meeting a Premium feature has something genuine to be told.
    expect(shouldPrompt('premium_feature', context({ isAdFree: true }))).toEqual({ show: true });
  });

  it('honours the remote kill switch', () => {
    expect(shouldPrompt('manual', context({ paywallEnabled: false }))).toEqual({
      show: false,
      reason: 'disabled',
    });
  });

  describe('when the learner asked for it', () => {
    it('ignores the daily cap', () => {
      expect(shouldPrompt('manual', context({ shownToday: 9, maxPerDay: 1 }))).toEqual({
        show: true,
      });
    });

    it('ignores "no lesson yet"', () => {
      expect(shouldPrompt('manual', context({ lessonsCompleted: 0 }))).toEqual({ show: true });
    });

    it('still refuses when there is nothing to sell them', () => {
      expect(shouldPrompt('manual', context({ isPremium: true }))).toEqual({
        show: false,
        reason: 'entitled',
      });
    });
  });
});
