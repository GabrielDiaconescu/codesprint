import { create } from 'zustand';

/**
 * Interstitial pacing state (SPEC §30).
 *
 * Client state, so Zustand rather than TanStack Query (SPEC §0.1.3). Deliberately **not**
 * persisted: the daily count resets when the app restarts, and the session quiet period needs
 * to restart with it.
 *
 * That makes the caps a floor rather than a ceiling — somebody force-quitting between every
 * lesson could see more than four interstitials in a day. The honest trade is that the
 * alternative is worse: a persisted counter that survives a reinstall belongs on the server,
 * and putting a request in front of every completion screen to pace an advert would cost a
 * round trip on the happiest moment in the product. The things that genuinely must not be
 * gamed — XP, lives, entitlements — are all server-side already (SPEC §42).
 */

interface AdState {
  /** Epoch millis of the last interstitial actually shown, or null. */
  lastInterstitialAt: number | null;
  /** Epoch millis when this session became interactive. */
  sessionStartedAt: number;
  /** Local date the counter belongs to, so it resets at the learner's midnight. */
  countedOn: string;
  shownCount: number;

  markSessionStart: () => void;
  recordInterstitial: () => void;
  interstitialsToday: () => number;
}

const today = (): string => new Date().toLocaleDateString('en-CA');

export const useAdStore = create<AdState>((set, get) => ({
  lastInterstitialAt: null,
  sessionStartedAt: Date.now(),
  countedOn: today(),
  shownCount: 0,

  markSessionStart: () => set({ sessionStartedAt: Date.now() }),

  recordInterstitial: () => {
    const now = Date.now();
    const date = today();

    set((state) => ({
      lastInterstitialAt: now,
      countedOn: date,
      // A session spanning midnight starts the day's allowance again, which is the
      // learner's midnight because `toLocaleDateString` uses the device's zone.
      shownCount: state.countedOn === date ? state.shownCount + 1 : 1,
    }));
  },

  interstitialsToday: () => {
    const state = get();
    return state.countedOn === today() ? state.shownCount : 0;
  },
}));
