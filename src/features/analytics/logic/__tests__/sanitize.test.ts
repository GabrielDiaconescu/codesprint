import { MAX_VALUE_LENGTH, isSafeDistinctId, sanitizeProperties } from '../sanitize';

/**
 * Keeping personal data out of analytics (SPEC §43).
 *
 * This is the file that turns "no email, names or free-text answers in event properties" from
 * a sentence somebody has to remember into something the code enforces. Every test below is a
 * thing that must never reach a third party's database, because once it is there, deleting the
 * property afterwards does not un-send it.
 */

describe('sanitizeProperties', () => {
  it('keeps the enum-ish properties SPEC §43 actually asks for', () => {
    const { safe, dropped } = sanitizeProperties({
      type: 'multiple_choice',
      difficulty: 'easy',
      correct: true,
      attempt_no: 2,
      source: 'rewarded_ad',
    });

    expect(safe).toEqual({
      type: 'multiple_choice',
      difficulty: 'easy',
      correct: true,
      attempt_no: 2,
      source: 'rewarded_ad',
    });
    expect(dropped).toEqual([]);
  });

  it('handles no properties at all', () => {
    expect(sanitizeProperties(undefined)).toEqual({ safe: {}, dropped: [] });
  });

  describe('property names that are never acceptable', () => {
    it.each([
      'email',
      'user_email',
      'display_name',
      'name',
      'username',
      'password',
      'access_token',
      'answer',
      'submitted_answer',
      'prompt',
      'free_text',
      'note',
      'phone_number',
      'ip_address',
    ])('drops %s whatever it contains', (key) => {
      const { safe, dropped } = sanitizeProperties({ [key]: 'anything' });

      expect(safe).toEqual({});
      expect(dropped).toEqual([{ key, reason: 'forbidden-key' }]);
    });
  });

  describe('values that look like personal data', () => {
    it('drops an email address under an innocent key', () => {
      // The key name is fine; the value is not. Both checks are needed.
      const { safe, dropped } = sanitizeProperties({ contact: 'ada@example.com' });

      expect(safe).toEqual({});
      expect(dropped).toEqual([{ key: 'contact', reason: 'email' }]);
    });

    it('drops an email buried inside a longer string', () => {
      expect(sanitizeProperties({ detail: 'sent to ada@example.com ok' }).safe).toEqual({});
    });

    it('drops prose, because prose is where personal data hides', () => {
      const essay = 'x'.repeat(MAX_VALUE_LENGTH + 1);
      const { safe, dropped } = sanitizeProperties({ detail: essay });

      expect(safe).toEqual({});
      expect(dropped).toEqual([{ key: 'detail', reason: 'too-long' }]);
    });

    it('keeps a string right at the limit', () => {
      const value = 'x'.repeat(MAX_VALUE_LENGTH);
      expect(sanitizeProperties({ detail: value }).safe).toEqual({ detail: value });
    });

    it('drops a UUID used as a property', () => {
      // The pseudonymous distinct id already links events to one learner. A lesson or question
      // id as a property ties a row of behaviour more tightly than any KPI in SPEC §43 needs.
      const { dropped } = sanitizeProperties({
        lesson: '11111111-1111-4111-8111-111111111111',
      });

      expect(dropped).toEqual([{ key: 'lesson', reason: 'identifier' }]);
    });
  });

  describe('types', () => {
    it('keeps booleans and null', () => {
      expect(sanitizeProperties({ correct: false, streak: null }).safe).toEqual({
        correct: false,
        streak: null,
      });
    });

    it('turns NaN and Infinity into null rather than shipping them', () => {
      // They serialise to null anyway, and a funnel computed over them is silently wrong.
      expect(
        sanitizeProperties({ score: Number.NaN, rate: Number.POSITIVE_INFINITY }).safe,
      ).toEqual({ score: null, rate: null });
    });

    it('drops anything that is not a scalar', () => {
      const { dropped } = sanitizeProperties({
        payload: { nested: true },
      } as never);

      expect(dropped).toEqual([{ key: 'payload', reason: 'unsupported-type' }]);
    });
  });

  it('drops only what it must, keeping the rest of the event useful', () => {
    const { safe, dropped } = sanitizeProperties({
      type: 'predict_output',
      answer: 'print(3)',
      correct: false,
    });

    expect(safe).toEqual({ type: 'predict_output', correct: false });
    expect(dropped).toEqual([{ key: 'answer', reason: 'forbidden-key' }]);
  });
});

describe('isSafeDistinctId', () => {
  it('accepts a Supabase user id', () => {
    expect(isSafeDistinctId('11111111-1111-4111-8111-111111111111')).toBe(true);
  });

  /**
   * The one mistake in this area that cannot be undone by deleting a property later: an email
   * as the distinct id attaches a real identity to every event ever captured.
   */
  it.each(['ada@example.com', 'ada', '', 'user-1'])('refuses %p', (id) => {
    expect(isSafeDistinctId(id)).toBe(false);
  });
});
