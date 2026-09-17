import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { parseInline, toParagraphs } from '@/lib/markdown';
import { useTheme } from '@/theme';

interface RichTextProps {
  body: string;
  tone?: 'primary' | 'secondary';
}

/**
 * Lesson prose (SPEC §15).
 *
 * Inline code is rendered in the monospace face rather than merely a different colour: in a
 * programming course the distinction between `print` the function and print the English word
 * is the content, and colour alone does not carry it (SPEC §47).
 */
export const RichText = ({ body, tone = 'primary' }: RichTextProps) => {
  const theme = useTheme();
  const paragraphs = toParagraphs(body);

  return (
    <View style={{ gap: theme.spacing.md }}>
      {paragraphs.map((paragraph, index) => (
        <Text key={index} variant="body" tone={tone}>
          {parseInline(paragraph).map((segment, segmentIndex) => {
            if (segment.type === 'code') {
              return (
                <Text
                  key={segmentIndex}
                  variant="mono"
                  style={[styles.inlineCode, { backgroundColor: theme.colors.codeBackground }]}
                >
                  {segment.value}
                </Text>
              );
            }

            if (segment.type === 'bold') {
              return (
                <Text key={segmentIndex} variant="bodyStrong" tone={tone}>
                  {segment.value}
                </Text>
              );
            }

            return (
              <Text key={segmentIndex} variant="body" tone={tone}>
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
