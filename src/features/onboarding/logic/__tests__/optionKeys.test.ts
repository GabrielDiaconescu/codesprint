import i18n from 'i18next';

import { REMINDER_TIMES } from '@/features/notifications/logic/schedule';
import { DAILY_GOAL_MINUTES, EXPERIENCE_LEVELS, MOTIVATIONS } from '@/services/types';

import { optionKey, type OptionFamily } from '../optionKeys';

/**
 * Every onboarding option resolves to real text (SPEC §11, §38).
 *
 * The resource tests already prove each key EXISTS in the JSON. That was not enough: the
 * reminder keys existed, and the screen still showed "00.label", because the key the screen
 * built was split by i18next on its `:` before it ever reached the JSON. So this goes through
 * the real i18n instance with the key the screen actually builds — the only check that would
 * have caught it.
 */

const families: [OptionFamily, readonly (string | number)[]][] = [
  ['experience', EXPERIENCE_LEVELS],
  ['motivation', MOTIVATIONS],
  ['goal', DAILY_GOAL_MINUTES],
  ['reminder', REMINDER_TIMES],
];

describe.each(families)('%s options', (family, values) => {
  it.each(values.map(String))('%s has a real label and description', (value) => {
    for (const field of ['label', 'description']) {
      const key = `${optionKey(family, value)}.${field}`;

      expect({ key, exists: i18n.exists(key, { ns: 'onboarding' }) }).toEqual({
        key,
        exists: true,
      });
      // What a failed lookup looks like on screen: a dotted key ending in the field name.
      expect(i18n.t(key, { ns: 'onboarding' })).not.toMatch(/\.(label|description)$/);
    }
  });
});

describe('optionKey', () => {
  it('strips the characters i18next splits keys on', () => {
    expect(optionKey('reminder', '08:00')).toBe('reminder.options.0800');
    expect(optionKey('goal', 2.5)).toBe('goal.options.25');
  });

  it('leaves ordinary values alone', () => {
    expect(optionKey('experience', 'complete_beginner')).toBe(
      'experience.options.complete_beginner',
    );
    expect(optionKey('goal', 10)).toBe('goal.options.10');
  });

  it('documents the failure it prevents', () => {
    // The key the reminder step used to build. i18next reads `reminder.options.08` as a
    // namespace, finds none, and returns the remainder — which is what reached the screen.
    expect(i18n.t('reminder.options.08:00.label', { ns: 'onboarding' })).toBe('00.label');
  });
});
