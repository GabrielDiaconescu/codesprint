/**
 * Refusing an account below the minimum age (SPEC §11, §41), in the only order that works.
 *
 * The refusal screen must be on screen BEFORE the sign-out. Signing out flips the router's
 * guards, which unmounts the onboarding screen that started this — and with it any callback
 * that was waiting to navigate afterwards. That is exactly what happened: the account was
 * deleted, but a thirteen-year-old's younger sibling landed back on the sign-in screen, one tap
 * from "Continue as guest", instead of being told why. The E2E age-gate flow caught it.
 *
 * `/blocked` sits outside every guard, so it survives the sign-out that follows.
 *
 * The refusal and the sign-out happen even if deleting the account fails: whatever the server
 * said, the person must not be left inside the app.
 */
export interface RefusalSteps {
  deleteAccount: () => Promise<void>;
  showRefusal: () => void;
  signOut: () => Promise<void>;
}

export const refuseUnderageAccount = async ({
  deleteAccount,
  showRefusal,
  signOut,
}: RefusalSteps): Promise<void> => {
  try {
    await deleteAccount();
  } finally {
    showRefusal();
    await signOut();
  }
};
