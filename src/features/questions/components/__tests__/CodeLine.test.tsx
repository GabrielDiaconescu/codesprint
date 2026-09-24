import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithTheme } from '@/test-utils';
import { palettes } from '@/theme';
import { AA_TEXT, contrastRatio } from '@/theme/contrast';

import { CodeLine } from '../CodeLine';

/**
 * A line of code in ordering and debugging questions (SPEC §16, §47). Its row is the code
 * surface, dark in both themes; with the body text colours, the light theme drew the code and
 * its line number dark on dark.
 */
const colourOf = (text: string) =>
  (StyleSheet.flatten(screen.getByText(text).props.style) as { color: string }).color;

describe('CodeLine', () => {
  it('draws the code and its line number in inks that read on the code surface', async () => {
    await renderWithTheme(
      <CodeLine text="area = width * height" gutter="3" accessibilityLabel="Line 3" />,
    );

    for (const palette of Object.values(palettes)) {
      expect(
        contrastRatio(colourOf('area = width * height'), palette.codeBackground),
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colourOf('3'), palette.codeBackground)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
