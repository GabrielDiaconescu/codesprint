import { canSubmitDisplayName, localDisplayNameProblem } from '../displayName';

/**
 * The client-side half of display-name validation (SPEC §26).
 *
 * These cases mirror `supabase/tests/11_leaderboard.test.sql` deliberately: the two
 * implementations answer the same question in two places, and the day they disagree a learner
 * sees "looks fine" and then a refusal. The server still owns the blocklists — those are
 * config, and are not duplicated here at all.
 */

describe('localDisplayNameProblem', () => {
  it.each(['Ada', 'Ada Lovelace', 'Ada_Lovelace-99', 'Grace99'])('accepts %s', (name) => {
    expect(localDisplayNameProblem(name)).toBeNull();
  });

  it('accepts Romanian diacritics', () => {
    expect(localDisplayNameProblem('Ana Mărioară')).toBeNull();
  });

  it('accepts another alphabet entirely', () => {
    expect(localDisplayNameProblem('Δημήτρης')).toBeNull();
  });

  it('refuses an empty name', () => {
    expect(localDisplayNameProblem('   ')).toBe('required');
  });

  it('refuses a two-character name', () => {
    expect(localDisplayNameProblem('Al')).toBe('too_short');
  });

  it('refuses a twenty-one character name', () => {
    expect(localDisplayNameProblem('twentyonecharacters12')).toBe('too_long');
  });

  it('counts characters, not UTF-16 units', () => {
    // Four emoji are four characters to a reader; `.length` would call them eight and let a
    // name through that the database then refuses on length. (They fail on the character set
    // regardless — the point is that the two checks agree on the count.)
    expect(localDisplayNameProblem('🙂🙂🙂🙂')).toBe('invalid_characters');
  });

  it('refuses markup', () => {
    expect(localDisplayNameProblem('Ada<b>')).toBe('invalid_characters');
  });

  it('refuses an invisible codepoint used to clone another name', () => {
    expect(localDisplayNameProblem(`Ada${String.fromCharCode(0x200b)}X`)).toBe(
      'invalid_characters',
    );
  });

  it('refuses a leading or trailing separator', () => {
    expect(localDisplayNameProblem('.ada')).toBe('invalid_characters');
    expect(localDisplayNameProblem('ada.')).toBe('invalid_characters');
  });

  it('ignores surrounding whitespace, because the server trims it too', () => {
    expect(localDisplayNameProblem('  Ada  ')).toBeNull();
  });

  it('says nothing about reserved words — those live in config on the server', () => {
    expect(localDisplayNameProblem('admin')).toBeNull();
  });
});

describe('canSubmitDisplayName', () => {
  it('allows a valid new name', () => {
    expect(canSubmitDisplayName('Ada Lovelace', null)).toBe(true);
  });

  it('refuses an invalid one', () => {
    expect(canSubmitDisplayName('Al', null)).toBe(false);
  });

  it('refuses a name identical to the current one', () => {
    // Nothing to save, so the button stays inert rather than firing a pointless round trip.
    expect(canSubmitDisplayName('  Ada Lovelace  ', 'Ada Lovelace')).toBe(false);
  });

  it('allows a change of casing, which is a real change', () => {
    expect(canSubmitDisplayName('ADA LOVELACE', 'Ada Lovelace')).toBe(true);
  });
});
