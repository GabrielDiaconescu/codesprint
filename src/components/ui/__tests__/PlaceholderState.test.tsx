import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { PlaceholderState } from '../PlaceholderState';

/**
 * NOTE: @testing-library/react-native v14 made `render` ASYNC. Every component test must
 * await it, or `screen` throws "`render` function has not been called".
 */
describe('PlaceholderState', () => {
  it('renders its title as a header for screen readers (SPEC §47)', async () => {
    await render(
      <ThemeProvider>
        <PlaceholderState title="Weekly ranking" body="Ships in Phase 12." />
      </ThemeProvider>,
    );

    expect(screen.getByRole('header', { name: 'Weekly ranking' })).toBeOnTheScreen();
    expect(screen.getByText('Ships in Phase 12.')).toBeOnTheScreen();
  });

  it('renders body copy as plain text', async () => {
    await render(
      <ThemeProvider>
        <PlaceholderState title="Python Fundamentals" body="Modules appear in Phase 6." />
      </ThemeProvider>,
    );

    expect(screen.getByText('Modules appear in Phase 6.')).toBeOnTheScreen();
  });
});
