import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme';

/**
 * Renders a component inside the providers it needs.
 *
 * NOTE: @testing-library/react-native v14 made `render` async, so this is async too and every
 * caller must await it. Forgetting the await produces the confusing error
 * "`render` function has not been called".
 */
export const renderWithTheme = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

/**
 * The same, plus TanStack Query, for a component that reads or writes server state.
 *
 * A fresh client per test: a shared one would carry one test's cached profile into the next
 * and produce a pass that depends on the order the tests happened to run in. Retries are off
 * so a deliberately failing mutation fails once, immediately.
 */
export const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    // No retries, so a deliberately failing call fails once and immediately; no garbage
    // collection timer, so Jest is not left with an open handle after the last assertion.
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  // Passed as `wrapper` rather than wrapped inline, because `rerender` re-renders the element
  // it is given: wrapping inline would drop the providers on the second render and fail with
  // a confusing "useTheme outside ThemeProvider".
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    ),
  });
};
