import {
  decidePersonalization,
  maxContentRating,
  shouldRequestAtt,
  tagForUnderAgeOfConsent,
  type PersonalizationInputs,
} from '../personalization';

/**
 * Personalized or not (SPEC §30, §41, D11).
 *
 * The asymmetry these tests encode: a non-personalized ad earns less, while a personalized ad
 * served without a basis is a regulatory problem and a store-policy problem. So anything
 * unknown counts as "no", and every test below checks that it does.
 */

const inputs = (patch: Partial<PersonalizationInputs> = {}): PersonalizationInputs => ({
  isProtectedMinor: false,
  adsConsentObtained: true,
  att: 'granted',
  platform: 'android',
  ...patch,
});

describe('decidePersonalization', () => {
  it('personalizes for a consenting adult', () => {
    expect(decidePersonalization(inputs())).toEqual({ personalized: true, blockedBy: null });
  });

  /**
   * Checked before consent, and deliberately: a 14-year-old tapping "accept" does not make
   * personalised advertising to them lawful (SPEC §41, D11).
   */
  it('never personalizes for a learner under the protection age, consent or not', () => {
    expect(decidePersonalization(inputs({ isProtectedMinor: true }))).toEqual({
      personalized: false,
      blockedBy: 'minor',
    });

    expect(
      decidePersonalization(inputs({ isProtectedMinor: true, adsConsentObtained: true })),
    ).toEqual({ personalized: false, blockedBy: 'minor' });
  });

  it('does not personalize without UMP consent', () => {
    expect(decidePersonalization(inputs({ adsConsentObtained: false }))).toEqual({
      personalized: false,
      blockedBy: 'no-consent',
    });
  });

  describe('App Tracking Transparency', () => {
    it.each(['denied', 'restricted', 'not-determined'] as const)(
      'does not personalize on iOS when ATT is %s',
      (att) => {
        expect(decidePersonalization(inputs({ platform: 'ios', att }))).toEqual({
          personalized: false,
          blockedBy: 'att-denied',
        });
      },
    );

    it('personalizes on iOS once ATT is granted', () => {
      expect(decidePersonalization(inputs({ platform: 'ios', att: 'granted' }))).toEqual({
        personalized: true,
        blockedBy: null,
      });
    });

    it('ignores ATT where the prompt does not exist', () => {
      // Older iOS, and Android, where personalisation does not depend on it at all.
      expect(decidePersonalization(inputs({ platform: 'ios', att: 'unavailable' }))).toEqual({
        personalized: true,
        blockedBy: null,
      });
      expect(decidePersonalization(inputs({ platform: 'android', att: 'denied' }))).toEqual({
        personalized: true,
        blockedBy: null,
      });
    });
  });
});

describe('shouldRequestAtt', () => {
  it('asks on iOS once UMP has been answered', () => {
    // SPEC §41: after UMP, never before — two permission sheets at once is how both get
    // dismissed.
    expect(shouldRequestAtt(inputs({ platform: 'ios', att: 'not-determined' }))).toBe(true);
  });

  it('does not ask before UMP has been answered', () => {
    expect(
      shouldRequestAtt(
        inputs({ platform: 'ios', att: 'not-determined', adsConsentObtained: false }),
      ),
    ).toBe(false);
  });

  it('never asks a minor — that is a question not to put to them at all', () => {
    expect(
      shouldRequestAtt(inputs({ platform: 'ios', att: 'not-determined', isProtectedMinor: true })),
    ).toBe(false);
  });

  it('does not ask twice', () => {
    expect(shouldRequestAtt(inputs({ platform: 'ios', att: 'granted' }))).toBe(false);
    expect(shouldRequestAtt(inputs({ platform: 'ios', att: 'denied' }))).toBe(false);
  });

  it('never asks on Android, where the prompt does not exist', () => {
    expect(shouldRequestAtt(inputs({ platform: 'android', att: 'not-determined' }))).toBe(false);
  });
});

describe('content rating and tagging', () => {
  it('requests only general-audience ads for a protected minor', () => {
    expect(maxContentRating(true)).toBe('G');
    expect(maxContentRating(false)).toBe('PG');
  });

  it('tags a protected minor as under the age of consent', () => {
    expect(tagForUnderAgeOfConsent(true)).toBe(true);
    expect(tagForUnderAgeOfConsent(false)).toBe(false);
  });
});
