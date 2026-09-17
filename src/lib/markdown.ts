/**
 * The limited Markdown subset lesson text may use (SPEC §15).
 *
 * Deliberately not a Markdown library. Lessons use bold and inline code and nothing else, and
 * a full parser would bring a large dependency, a much larger attack surface, and a hundred
 * syntaxes an author could reach for that no renderer here supports.
 *
 * Two rules, both standard Markdown:
 *
 *   * a blank line starts a new paragraph;
 *   * a single newline is just how the source was wrapped, and joins with a space.
 *
 * The second matters because the YAML is hard-wrapped for readability. Rendering those
 * newlines literally would break sentences at whatever column the author happened to stop at.
 */

export type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string };

/** Splits a block of text into paragraphs, unwrapping soft line breaks inside each one. */
export const toParagraphs = (text: string): string[] => {
  if (typeof text !== 'string') return [];

  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split('\n').map((line) => line.trim()).join(' ').trim())
    .filter((paragraph) => paragraph.length > 0);
};

/**
 * Inline code is matched before bold.
 *
 * Order matters: `` `**not bold**` `` must stay literal inside code, which is the whole point
 * of inline code in a programming course. Matching bold first would eat the asterisks.
 */
const INLINE_PATTERN = /`([^`]+)`|\*\*([^*]+)\*\*/g;

export const parseInline = (text: string): InlineSegment[] => {
  if (typeof text !== 'string' || text.length === 0) return [];

  const segments: InlineSegment[] = [];
  let lastIndex = 0;

  // The regex is stateful across calls through lastIndex, so it is rebuilt per invocation.
  const pattern = new RegExp(INLINE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ type: 'code', value: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'bold', value: match[2] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
};
