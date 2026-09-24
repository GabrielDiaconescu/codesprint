import { render, screen } from '@testing-library/react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { StyleSheet, Text } from 'react-native';

import { ThemeProvider } from '@/theme';

import { Screen } from '../Screen';

/**
 * The page frame (SPEC §8). It clears the status bar only when no navigation header already
 * has — padding for it twice left an empty band under every header.
 */
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 30, bottom: 20, left: 0, right: 0 }),
}));

/** The frame is the outermost view: its top padding is what is under the status bar. */
const paddingTop = () => {
  const root = screen.toJSON();
  if (!root || Array.isArray(root)) throw new Error('expected one root view');
  return (StyleSheet.flatten(root.props.style) as { paddingTop: number }).paddingTop;
};

describe('Screen', () => {
  it('clears the status bar itself when there is no header', async () => {
    await render(
      <ThemeProvider>
        <Screen>
          <Text>content</Text>
        </Screen>
      </ThemeProvider>,
    );

    expect(paddingTop()).toBe(30);
  });

  it('leaves the status bar to a navigation header that is already there', async () => {
    await render(
      <ThemeProvider>
        <HeaderHeightContext.Provider value={80}>
          <Screen>
            <Text>content</Text>
          </Screen>
        </HeaderHeightContext.Provider>
      </ThemeProvider>,
    );

    expect(paddingTop()).toBe(0);
  });
});
