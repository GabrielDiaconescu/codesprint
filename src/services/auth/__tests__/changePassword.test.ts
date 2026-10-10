import { AuthFailure } from '../errors';
import { SupabaseAuthService } from '../SupabaseAuthService';

/**
 * Changing the password while signed in (SPEC §29). What must hold: the current password is
 * checked before anything changes; a wrong one says so in its own words; the other devices are
 * signed out afterwards, and failing to reach them does not undo a change that worked.
 */
const mockAuth = {
  getSession: jest.fn(),
  signInWithPassword: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../supabase/client', () => ({ getSupabaseClient: () => ({ auth: mockAuth }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.getSession.mockResolvedValue({
    data: { session: { user: { email: 'learner@example.com' } } },
  });
  mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
  mockAuth.updateUser.mockResolvedValue({ data: {}, error: null });
  mockAuth.signOut.mockResolvedValue({ error: null });
});

const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('expected a failure');
    },
    (error: unknown) => error,
  );

describe('SupabaseAuthService.changePassword', () => {
  it('checks the current password, sets the new one, then signs out the other devices', async () => {
    await SupabaseAuthService.changePassword('old-pass1', 'new-pass2');

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'learner@example.com',
      password: 'old-pass1',
    });
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'new-pass2' });
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('refuses a wrong current password before touching anything', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', status: 400 },
    });

    const error = await failure(SupabaseAuthService.changePassword('wrong', 'new-pass2'));

    expect(error).toBeInstanceOf(AuthFailure);
    expect((error as AuthFailure).code).toBe('wrong-password');
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it('reports the server rejecting the new password', async () => {
    mockAuth.updateUser.mockResolvedValue({
      data: {},
      error: { code: 'same_password', status: 422 },
    });

    const error = await failure(SupabaseAuthService.changePassword('old-pass1', 'old-pass1'));

    expect((error as AuthFailure).code).toBe('same-password');
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it('keeps a successful change even when the other devices cannot be reached', async () => {
    mockAuth.signOut.mockRejectedValue(new TypeError('Network request failed'));

    await expect(SupabaseAuthService.changePassword('old-pass1', 'new-pass2')).resolves.toBe(
      undefined,
    );
    expect(mockAuth.updateUser).toHaveBeenCalled();
  });

  it('needs a signed-in account with an email address', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });

    const error = await failure(SupabaseAuthService.changePassword('old-pass1', 'new-pass2'));

    expect((error as AuthFailure).code).toBe('unknown');
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });
});
