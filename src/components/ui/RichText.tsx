import { StyleSheet, View } from 'react-native';

import { parseInline, toParagraphs } from '@/lib/markdown';
import { useTheme } from '@/theme';

import { Text, type TextTone } from './Text';

/** The text styles content is set in: lesson prose, feedback, hints, question prompts. */
export type RichTextVariant = 'body' | 'bodyStrong' | 'bodySmall' | 'heading';

export interface RichTextProps {
  /** Content text: the limited Markdown subset of SPEC §15 — `code` and **bold**. */
  body: string;
  variant?: RichTextVariant;
  tone?: Extract<TextTone, 'primary' | 'secondary'>;
  /** Renders as a screen-reader heading (SPEC §47) — a question's prompt. */
  heading?: boolean;
  testID?: string;
}

/** Monospace runs a size below the text around it, as in the lessons: 16 → 14. */
const CODE_SCALE = 0.875;

/**
 * Content text (SPEC §15): every string authored in `content/` — lesson prose, a question's
 * prompt, its explanation and hint. They are all written with the same Markdown, so they are
 * all set by this one component; anywhere else the backticks would print as they are.
 *
 * Inline code is set in the monospace face rather than merely a different colour: in a
 * programming course the distinction between `print` the function and print the English word
 * is the content, and colour alone does not carry it (SPEC §47). Its chip is the theme's own
 * `inlineCode` — not the code-block surface, which is dark in both themes and made every `+`
 * a black box in the light one — and it keeps the paragraph's line height: on Android a span
 * with its own line height draws its background from a different baseline, a line too high.
 */
export const RichText = ({
  body,
  variant = 'body',
  tone = 'primary',
  heading = false,
  testID,
}: RichTextProps) => {
  const theme = useTheme();
  const base = theme.typography[variant];
  const codeSize = Math.round(base.fontSize * CODE_SCALE);

  return (
    <View testID={testID} style={{ gap: theme.spacing.md }}>
      {toParagraphs(body).map((paragraph, index) => (
        <Text key={index} variant={variant} tone={tone} heading={heading}>
          {parseInline(paragraph).map((segment, segmentIndex) => {
            if (segment.type === 'code') {
              return (
                <Text
                  key={segmentIndex}
                  variant="mono"
                  style={[
                    styles.inlineCode,
                    {
                      fontSize: codeSize,
                      lineHeight: base.lineHeight,
                      backgroundColor: theme.colors.inlineCode,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                >
                  {segment.value}
                </Text>
              );
            }

            if (segment.type === 'bold') {
              return (
                <Text
                  key={segmentIndex}
                  variant={variant === 'body' ? 'bodyStrong' : variant}
                  tone={tone}
                >
                  {segment.value}
                </Text>
              );
            }

            return (
              <Text key={segmentIndex} variant={variant} tone={tone}>
                {segment.value}
              </Text>
            );
          })}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Nested Text cannot take padding on Android, so the tint alone marks the span.
  inlineCode: { borderRadius: 4 },
});
