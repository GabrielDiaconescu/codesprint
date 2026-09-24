import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithTheme } from '@/test-utils';
import { palettes } from '@/theme';
import { AA_TEXT, contrastRatio } from '@/theme/contrast';

import { RichText } from '../RichText';

/**
 * Content text (SPEC §15, §47): lesson prose, prompts, explanations and hints, all written in
 * the same Markdown. Two bugs it has had: prompts and explanations printed their backticks
 * as they were, and inline code in the light theme was dark ink on the dark code surface.
 */
describe('RichText', () => {
  it("sets inline code on its own chip, readable, on the paragraph's line", async () => {
    await renderWithTheme(<RichText body="Use `//` to divide and drop the remainder." />);

    const style = StyleSheet.flatten(screen.getByText('//').props.style) as {
      color: string;
      backgroundColor: string;
      lineHeight: number;
    };

    // Never the code-block surface: dark in both themes, a black box in the light one.
    expect(Object.values(palettes).map((p) => p.codeBackground)).not.toContain(
      style.backgroundColor,
    );
    expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(AA_TEXT);
    // Its own line height would draw the chip a line too high on Android.
    expect(style.lineHeight).toBe(24);
  });

  it('keeps the words around it as ordinary prose', async () => {
    await renderWithTheme(<RichText body="Use `//` to divide." />);

    expect(screen.getByText('//')).toBeOnTheScreen();
    expect(screen.getByText(/to divide\./)).toBeOnTheScreen();
  });

  it('never prints the Markdown itself', async () => {
    await renderWithTheme(<RichText body={'`str(3)` is the **string** "3".'} />);

    expect(screen.queryByText(/`/)).toBeNull();
    expect(screen.queryByText(/\*\*/)).toBeNull();
    expect(screen.getByText('str(3)')).toBeOnTheScreen();
    expect(screen.getByText('string')).toBeOnTheScreen();
  });

  it('announces a prompt as a heading, and sets its code at the heading size', async () => {
    await renderWithTheme(
      <RichText body="What does `len(xs)` return?" variant="heading" heading />,
    );

    expect(screen.getByRole('header')).toBeOnTheScreen();
    const code = StyleSheet.flatten(screen.getByText('len(xs)').props.style) as {
      fontSize: number;
    };
    expect(code.fontSize).toBeGreaterThan(14);
  });
});
