import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  MIN_PASSWORD_LENGTH,
  canSubmitCredentials,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from '../validation';

describe('normalizeEmail', () => {
  it.each([
    ['  user@example.com  ', 'user@example.com'],
    ['User@Example.COM', 'user@example.com'],
    ['\tUSER@EXAMPLE.COM\n', 'user@example.com'],
  ])('normalizes %p', (raw, expected) => {
    expect(normalizeEmail(raw)).toBe(expected);
  });
});

describe('validateEmail', () => {
  it.each([
    'user@example.com',
    'first.last@example.co.uk',
    'user+tag@example.com',
    'user@sub.domain.example.com',
    'ștefan@example.ro',
  ])('accepts %s', (email) => {
    expect(validateEmail(email)).toBeNull();
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
  ])('reports %p as %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });

  it.each([
    'not-an-email',
    'missing@domain',
    '@example.com',
    'user@',
    'user@example.c',
    'two spaces@example.com',
    'user@@example.com',
  ])('rejects %p', (email) => {
    expect(validateEmail(email)).toBe('invalid');
  });
});

describe('validatePassword', () => {
  it('accepts a password meeting both rules', () => {
    expect(validatePassword('sprint2026')).toBeNull();
  });

  it.each([
    ['', 'required'],
    ['ab1', 'too-short'],
    ['sprint1', 'too-short'],
    ['sprintsprint', 'needs-letter-and-digit'],
    ['1234567890', 'needs-letter-and-digit'],
  ])('reports %p as %s', (password, expected) => {
    expect(validatePassword(password)).toBe(expected);
  });

  it('accepts non-Latin letters', () => {
    // \p{L} rather than a-z: a Romanian or Greek password is still a password.
    expect(validatePassword('парольный1')).toBeNull();
  });

  it('never trims the password', () => {
    // Spaces are legitimate characters and trimming would silently change what the user set,
    // making the very next sign-in fail.
    expect(validatePassword('  pass1  ')).toBeNull();
  });
});

describe('canSubmitCredentials', () => {
  it('is true only when both fields pass', () => {
    expect(canSubmitCredentials('user@example.com', 'sprint2026')).toBe(true);
    expect(canSubmitCredentials('user@example.com', 'short')).toBe(false);
    expect(canSubmitCredentials('nope', 'sprint2026')).toBe(false);
  });
});

/**
 * The client rules are a copy of the server's. A copy that drifts is worse than no copy: the
 * form would accept a password the provider then rejects, with an error the user cannot act
 * on. This reads the actual config rather than trusting a comment.
 */
describe('agreement with supabase/config.toml', () => {
  const config = readFileSync(join(__dirname, '../../../../../supabase/config.toml'), 'utf8');

  it('uses the same minimum password length as the server', () => {
    const match = /^minimum_password_length = (\d+)$/m.exec(config);
    expect(match?.[1]).toBe(String(MIN_PASSWORD_LENGTH));
  });

  it('enforces the same character requirement as the server', () => {
    const match = /^password_requirements = "(.*)"$/m.exec(config);
    expect(match?.[1]).toBe('letters_digits');
  });

  it('has anonymous sign-ins enabled, or guest mode cannot work', () => {
    expect(config).toMatch(/^enable_anonymous_sign_ins = true$/m);
  });

  it('requires email confirmation', () => {
    expect(config).toMatch(/^enable_confirmations = true$/m);
  });
});
