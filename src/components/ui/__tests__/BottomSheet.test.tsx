import { act, screen } from '@testing-library/react-native';
import {
  Keyboard,
  StyleSheet,
  Text,
  type KeyboardEvent,
  type KeyboardEventName,
} from 'react-native';

import { renderWithTheme } from '@/test-utils';

import { BottomSheet } from '../BottomSheet';

/**
 * The sheet rises above the on-screen keyboard (SPEC §8, §47). A Modal has its own window, so
 * nothing else moves it, and a sheet with text fields — changing the password — was once
 * covered by the keyboard up to its title.
 */
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

const listeners = new Map<KeyboardEventName, (event: KeyboardEvent) => void>();

beforeEach(() => {
  listeners.clear();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((name, listener) => {
    listeners.set(name, listener as (event: KeyboardEvent) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
  });
});

afterEach(() => jest.restoreAllMocks());

const keyboard = (name: KeyboardEventName, height: number) =>
  act(() => {
    listeners.get(name)?.({ endCoordinates: { height } } as KeyboardEvent);
  });

const offset = () =>
  (StyleSheet.flatten(screen.getByTestId('sheet-frame').props.style) as { paddingBottom: number })
    .paddingBottom;

describe('BottomSheet', () => {
  it('sits above the keyboard while it is up, and drops back when it goes', async () => {
    await renderWithTheme(
      <BottomSheet testID="sheet" visible onClose={jest.fn()} closeLabel="Close">
        <Text>content</Text>
      </BottomSheet>,
    );
    expect(offset()).toBe(0);

    // The test platform is iOS, which announces the keyboard before it moves.
    await keyboard('keyboardWillShow', 300);
    // Less the bottom safe area, which the keyboard covers and the sheet already pads for.
    expect(offset()).toBe(266);

    await keyboard('keyboardWillHide', 0);
    expect(offset()).toBe(0);
  });
});
