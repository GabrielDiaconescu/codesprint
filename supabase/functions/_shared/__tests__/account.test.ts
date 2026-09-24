import { deleteAccount } from '../account';
import { RevenueCatError, deleteCustomer } from '../revenuecat';

/**
 * Deleting an account (SPEC §41).
 *
 * Two properties carry the weight: RevenueCat is asked BEFORE anything is deleted here, so a
 * failure there leaves the learner able to try again; and an environment without the
 * RevenueCat key says so instead of claiming a deletion that never happened.
 */

describe('deleteCustomer', () => {
  const fakeFetch = (status: number) =>
    jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status });

  it('asks RevenueCat to delete the customer, by the learner id', async () => {
    const fetchImpl = fakeFetch(200);

    await expect(
      deleteCustomer('sk_test', 'user-1', fetchImpl as unknown as typeof fetch),
    ).resolves.toBe('deleted');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v1/subscribers/user-1',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ Authorization: 'Bearer sk_test' }),
      }),
    );
  });

  it('counts a customer RevenueCat never saw as done', async () => {
    await expect(
      deleteCustomer('sk', 'nobody', fakeFetch(404) as unknown as typeof fetch),
    ).resolves.toBe('not-found');
  });

  it('fails loudly on anything else, so the deletion stops before it starts', async () => {
    await expect(
      deleteCustomer('sk', 'user-1', fakeFetch(500) as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RevenueCatError);
  });

  it('says it did nothing when there is no key, and does not call out', async () => {
    const fetchImpl = fakeFetch(200);

    await expect(
      deleteCustomer(undefined, 'user-1', fetchImpl as unknown as typeof fetch),
    ).resolves.toBe('not-configured');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('deleteAccount', () => {
  it('deletes the billing customer first, then the account', async () => {
    const calls: string[] = [];

    const result = await deleteAccount({
      deleteBillingCustomer: async () => {
        calls.push('billing');
        return 'deleted' as const;
      },
      deleteAuthUser: async () => {
        calls.push('account');
      },
    });

    expect(calls).toEqual(['billing', 'account']);
    expect(result).toEqual({ billingCustomer: 'deleted' });
  });

  it('leaves the account alone when the billing customer could not be deleted', async () => {
    const deleteAuthUser = jest.fn();

    await expect(
      deleteAccount({
        deleteBillingCustomer: () => Promise.reject(new RevenueCatError(503, 'down')),
        deleteAuthUser,
      }),
    ).rejects.toBeInstanceOf(RevenueCatError);
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
});
