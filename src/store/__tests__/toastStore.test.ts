import { DEFAULT_TOAST_DURATION, MAX_TOASTS, resetToastIds, useToastStore } from '../toastStore';

const store = () => useToastStore.getState();

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    resetToastIds();
  });

  it('adds a toast with sensible defaults', () => {
    store().show({ message: 'Saved' });

    expect(store().toasts).toHaveLength(1);
    expect(store().toasts[0]).toMatchObject({
      message: 'Saved',
      tone: 'info',
      duration: DEFAULT_TOAST_DURATION,
    });
  });

  it('gives every toast a unique id', () => {
    const first = store().show({ message: 'One' });
    const second = store().show({ message: 'Two' });

    expect(first).not.toBe(second);
  });

  it('caps the queue so a retry loop cannot bury the UI', () => {
    for (let i = 0; i < MAX_TOASTS + 4; i += 1) {
      store().show({ message: `Toast ${i}` });
    }

    expect(store().toasts).toHaveLength(MAX_TOASTS);
    // The most recent survive; the oldest are dropped.
    expect(store().toasts.at(-1)?.message).toBe(`Toast ${MAX_TOASTS + 3}`);
  });

  it('dismisses a single toast by id and leaves the rest', () => {
    const id = store().show({ message: 'One' });
    store().show({ message: 'Two' });

    store().dismiss(id);

    expect(store().toasts).toHaveLength(1);
    expect(store().toasts[0]?.message).toBe('Two');
  });

  it('ignores a dismiss for an unknown id', () => {
    store().show({ message: 'One' });
    store().dismiss('does-not-exist');

    expect(store().toasts).toHaveLength(1);
  });

  it('clears everything', () => {
    store().show({ message: 'One' });
    store().show({ message: 'Two' });
    store().clear();

    expect(store().toasts).toEqual([]);
  });
});
