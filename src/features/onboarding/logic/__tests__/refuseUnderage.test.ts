import { refuseUnderageAccount } from '../refuseUnderage';

/**
 * The age-gate refusal (SPEC §11, §41).
 *
 * Order is the whole point: showing the refusal after the sign-out never happens, because the
 * sign-out unmounts the screen that would have shown it. The E2E age-gate flow found that on a
 * device; this pins it down where it is cheap to check.
 */
const record = (deleteFails = false) => {
  const calls: string[] = [];
  const steps = {
    deleteAccount: () => {
      calls.push('delete');
      return deleteFails ? Promise.reject(new Error('offline')) : Promise.resolve();
    },
    showRefusal: () => {
      calls.push('show refusal');
    },
    signOut: () => {
      calls.push('sign out');
      return Promise.resolve();
    },
  };
  return { calls, steps };
};

describe('refusing an under-age account', () => {
  it('deletes the account, shows the refusal, and only then signs out', async () => {
    const { calls, steps } = record();

    await refuseUnderageAccount(steps);

    expect(calls).toEqual(['delete', 'show refusal', 'sign out']);
  });

  it('still shows the refusal and signs out when the delete fails', async () => {
    const { calls, steps } = record(true);

    await expect(refuseUnderageAccount(steps)).rejects.toThrow('offline');

    expect(calls).toEqual(['delete', 'show refusal', 'sign out']);
  });
});
