import { useMemo } from 'react';
import { I18nManager, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';

import { tokenizePython, type PythonTokenType } from '@/lib/pythonHighlight';
import { syntaxPalette, useTheme } from '@/theme';

import { Text } from './Text';

export interface CodeBlockProps {
  code: string;
  /** Optional stdout panel shown under the code (SPEC §15 `code` block). */
  output?: string;
  /** Screen-reader label; defaults to a generic description (SPEC §47). */
  accessibilityLabel?: string;
  showLineNumbers?: boolean;
  testID?: string;
}

const SYNTAX_COLORS: Record<PythonTokenType, string> = {
  keyword: syntaxPalette.keyword,
  builtin: syntaxPalette.builtin,
  string: syntaxPalette.string,
  comment: syntaxPalette.comment,
  number: syntaxPalette.number,
  operator: syntaxPalette.operator,
  decorator: syntaxPalette.decorator,
  plain: syntaxPalette.plain,
};

/**
 * Code display (SPEC §8).
 *
 * - monospace, never wrapped: wrapping a code sample changes its meaning
 * - horizontal scroll instead, so long lines stay readable
 * - always left-to-right, even under an RTL locale — code is not bidirectional text
 * - screen-reader friendly: the whole block is ONE accessible node reading the raw source,
 *   because letting a reader walk 40 coloured spans is unusable
 */
export const CodeBlock = ({
  code,
  output,
  accessibilityLabel,
  showLineNumbers = false,
  testID,
}: CodeBlockProps) => {
  const theme = useTheme();

  // Trailing newlines would render as an empty final line with a line number.
  const source = useMemo(() => code.replace(/\s+$/, ''), [code]);
  const lines = useMemo(() => source.split('\n'), [source]);
  const tokensPerLine = useMemo(() => lines.map((line) => tokenizePython(line)), [lines]);

  const gutterWidth = showLineNumbers ? String(lines.length).length * 10 + theme.spacing.sm : 0;

  return (
    <View testID={testID} style={styles.wrapper}>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel ?? `Python code: ${source}`}
        style={[
          styles.codeSurface,
          {
            backgroundColor: theme.colors.codeBackground,
            borderRadius: theme.radius.md,
            paddingVertical: theme.spacing.md,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          // The inner content is code: force LTR regardless of the app's writing direction.
          style={styles.ltr}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}
        >
          <View style={styles.ltr}>
            {tokensPerLine.map((tokens, lineIndex) => (
              <View key={lineIndex} style={styles.line}>
                {showLineNumbers && (
                  <RNText
                    style={[
                      theme.typography.monoSmall,
                      styles.gutter,
                      { width: gutterWidth, color: syntaxPalette.comment },
                    ]}
                  >
                    {lineIndex + 1}
                  </RNText>
                )}
                <RNText style={theme.typography.mono} numberOfLines={1}>
                  {tokens.length === 0 ? (
                    <RNText style={{ color: syntaxPalette.plain }}> </RNText>
                  ) : (
                    tokens.map((token, tokenIndex) => (
                      <RNText key={tokenIndex} style={{ color: SYNTAX_COLORS[token.type] }}>
                        {token.value}
                      </RNText>
                    ))
                  )}
                </RNText>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {output !== undefined && (
        <View
          style={[
            styles.output,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              marginTop: theme.spacing.sm,
            },
          ]}
        >
          <Text variant="label" tone="secondary" style={styles.outputLabel}>
            OUTPUT
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ltr}>
            <RNText
              style={[theme.typography.mono, { color: theme.colors.textPrimary }]}
              accessibilityLabel={`Output: ${output}`}
            >
              {output}
            </RNText>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  codeSurface: { overflow: 'hidden' },
  // `direction` is respected on both platforms under the New Architecture; the explicit
  // writingDirection on text keeps older Android behaviour consistent too.
  ltr: { direction: 'ltr', writingDirection: I18nManager.isRTL ? 'ltr' : undefined },
  line: { flexDirection: 'row', alignItems: 'flex-start' },
  gutter: { textAlign: 'right', marginRight: 8 },
  output: { borderWidth: StyleSheet.hairlineWidth * 2 },
  outputLabel: { letterSpacing: 1, marginBottom: 4 },
});
