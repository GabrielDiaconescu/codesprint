import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  /** Milliseconds before auto-dismiss. */
  duration: number;
}

export interface ShowToastInput {
  message: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  show: (input: ShowToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/** Cap the queue so a retry loop can never stack dozens of toasts over the UI. */
export const MAX_TOASTS = 3;
export const DEFAULT_TOAST_DURATION = 3500;

let counter = 0;
const nextId = (): string => {
  counter += 1;
  return `toast-${counter}`;
};

/**
 * Toast/snackbar state (SPEC §8).
 *
 * Client UI state, so it belongs in Zustand rather than TanStack Query (SPEC §0.1.3).
 * Toasts are for transient confirmations; anything the user must act on is a sheet or an
 * inline error state instead (SPEC §46).
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: ({ message, tone = 'info', duration = DEFAULT_TOAST_DURATION }) => {
    const id = nextId();
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone, duration }].slice(-MAX_TOASTS),
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Test-only: resets the id counter so ids are deterministic across tests. */
export const resetToastIds = (): void => {
  counter = 0;
};
