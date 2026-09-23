/** The onboarding questions whose answers are shown as a list of options. */
export type OptionFamily = 'experience' | 'motivation' | 'goal' | 'reminder';

/**
 * The translation key for one option of an onboarding question.
 *
 * i18next splits a key on two characters: `:` separates the namespace from the key, and `.`
 * walks into a nested object. A value used inside a key must contain neither, or the lookup
 * quietly goes somewhere else and the screen shows the leftover key instead of the text.
 *
 * That is not hypothetical. The reminder times became `HH:MM` strings in Phase 17, and
 * `reminder.options.08:00.label` was read as the namespace `reminder.options.08` and the key
 * `00.label` — so the reminder step showed "00.label" five times until the first release-like
 * build was opened on a phone. Every option key is built here, so the rule lives in one place.
 */
export const optionKey = (family: OptionFamily, value: string | number): string =>
  `${family}.options.${String(value).replace(/[:.]/g, '')}`;
