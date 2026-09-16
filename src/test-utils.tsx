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
