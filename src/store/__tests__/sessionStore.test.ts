import type { AuthUser } from '@/services';

import { statusForUser, useSessionStore } from '../sessionStore';

const guest: AuthUser = { id: 'g-1', email: null, isAnonymous: true, emailConfirmed: false };
const member: AuthUser = {
  id: 'm-1',
  email: 'user@example.com',
  isAnonymous: false,
  emailConfirmed: true,
};

describe('statusForUser', () => {
  it.each([
    ['no user', null, 'signed-out'],
    ['an anonymous user', guest, 'guest'],
    ['a registered user', member, 'authenticated'],
  ])('maps %s to %s', (_label, user, expected) => {
    expect(statusForUser(user)).toBe(expected);
  });
});

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('starts out signed out after a reset', () => {
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signed-out',
      userId: null,
      email: null,
      emailConfirmed: false,
      pendingPasswordReset: false,
    });
  });

  it('records a guest session without an email', () => {
    useSessionStore.getState().setUser(guest);

    expect(useSessionStore.getState()).toMatchObject({
      status: 'guest',
      userId: 'g-1',
      email: null,
    });
  });

  it('records a registered session', () => {
    useSessionStore.getState().setUser(member);

    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      userId: 'm-1',
      email: 'user@example.com',
      emailConfirmed: true,
    });
  });

  it('marks an unconfirmed address as such', () => {
    useSessionStore.getState().setUser({ ...member, emailConfirmed: false });
    expect(useSessionStore.getState().emailConfirmed).toBe(false);
  });

  describe('pending password reset', () => {
    // This flag is what holds a recovery session on the reset screen. If a token refresh
    // cleared it, the user would be dropped into the app mid-reset with a password they do
    // not know; if a sign-out kept it, they would be stuck on the reset screen with no
    // session to reset (SPEC §12).
    it('survives a token refresh', () => {
      const store = useSessionStore.getState();
      store.setUser(member);
      store.beginPasswordReset();

      useSessionStore.getState().setUser(member);

      expect(useSessionStore.getState().pendingPasswordReset).toBe(true);
    });

    it('is cleared by signing out', () => {
      const store = useSessionStore.getState();
      store.setUser(member);
      store.beginPasswordReset();

      useSessionStore.getState().setUser(null);

      expect(useSessionStore.getState()).toMatchObject({
        status: 'signed-out',
        pendingPasswordReset: false,
      });
    });

    it('is cleared once the new password is set', () => {
      const store = useSessionStore.getState();
      store.setUser(member);
      store.beginPasswordReset();

      useSessionStore.getState().completePasswordReset();

      expect(useSessionStore.getState()).toMatchObject({
        status: 'authenticated',
        pendingPasswordReset: false,
      });
    });
  });
});
