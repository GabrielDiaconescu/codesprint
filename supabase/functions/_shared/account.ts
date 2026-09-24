/**
 * Deleting an account, in the only order that cannot strand data (SPEC §41).
 *
 * RevenueCat first. If it fails, nothing has been deleted yet and the learner can simply try
 * again. The other order could leave a customer record at RevenueCat keyed by an id that no
 * longer exists anywhere we can see — and nobody left to ask for its deletion.
 *
 * The database then goes in one step: deleting the auth user cascades to every table that
 * holds the learner's data, and a trigger redacts the purchase log first
 * (migration 20260924110000_privacy.sql).
 *
 * Runtime-agnostic on purpose, like the rest of `_shared`: the Edge Function supplies the two
 * steps, the tests supply fakes.
 */
export interface AccountDeletionSteps<CustomerResult> {
  deleteBillingCustomer: () => Promise<CustomerResult>;
  deleteAuthUser: () => Promise<void>;
}

export const deleteAccount = async <CustomerResult>(
  steps: AccountDeletionSteps<CustomerResult>,
): Promise<{ billingCustomer: CustomerResult }> => {
  const billingCustomer = await steps.deleteBillingCustomer();
  await steps.deleteAuthUser();
  return { billingCustomer };
};
