import { parseInline, toParagraphs } from '../markdown';

/**
 * Lesson prose is hard-wrapped in the YAML for readability, so the unwrapping rule is what
 * stands between a readable paragraph and sentences broken at column 95.
 */
describe('toParagraphs', () => {
  it('joins soft-wrapped lines into one paragraph', () => {
    const text = 'Python is a programming language: a way of writing\ninstructions precisely.';
    expect(toParagraphs(text)).toEqual([
      'Python is a programming language: a way of writing instructions precisely.',
    ]);
  });

  it('splits on a blank line', () => {
    expect(toParagraphs('First one.\n\nSecond one.')).toEqual(['First one.', 'Second one.']);
  });

  it('treats a whitespace-only line as blank', () => {
    expect(toParagraphs('First.\n   \nSecond.')).toEqual(['First.', 'Second.']);
  });

  it('handles several blank lines as a single break', () => {
    expect(toParagraphs('First.\n\n\n\nSecond.')).toEqual(['First.', 'Second.']);
  });

  it('drops trailing whitespace left by a YAML block scalar', () => {
    expect(toParagraphs('Only one.\n')).toEqual(['Only one.']);
  });

  it('normalises Windows line endings', () => {
    expect(toParagraphs('First.\r\n\r\nSecond.')).toEqual(['First.', 'Second.']);
  });

  it.each([
    ['an empty string', ''],
    ['only whitespace', '   \n  \n '],
  ])('returns nothing for %s', (_label, text) => {
    expect(toParagraphs(text)).toEqual([]);
  });

  it('survives a non-string', () => {
    expect(toParagraphs(undefined as unknown as string)).toEqual([]);
  });
});

describe('parseInline', () => {
  it('returns plain text as one segment', () => {
    expect(parseInline('Hello there')).toEqual([{ type: 'text', value: 'Hello there' }]);
  });

  it('recognises inline code', () => {
    expect(parseInline('Use `print` to show it')).toEqual([
      { type: 'text', value: 'Use ' },
      { type: 'code', value: 'print' },
      { type: 'text', value: ' to show it' },
    ]);
  });

  it('recognises bold', () => {
    expect(parseInline('the **interpreter** runs it')).toEqual([
      { type: 'text', value: 'the ' },
      { type: 'bold', value: 'interpreter' },
      { type: 'text', value: ' runs it' },
    ]);
  });

  it('handles several spans in one paragraph', () => {
    expect(parseInline('`int()` and `str()` differ')).toEqual([
      { type: 'code', value: 'int()' },
      { type: 'text', value: ' and ' },
      { type: 'code', value: 'str()' },
      { type: 'text', value: ' differ' },
    ]);
  });

  it('keeps asterisks literal inside inline code', () => {
    // The whole point of inline code in a programming course: `**` is an operator, not markup.
    expect(parseInline('`2 ** 3` is eight')).toEqual([
      { type: 'code', value: '2 ** 3' },
      { type: 'text', value: ' is eight' },
    ]);
  });

  it('leaves an unclosed backtick alone rather than swallowing the rest', () => {
    expect(parseInline('a ` b')).toEqual([{ type: 'text', value: 'a ` b' }]);
  });

  it('leaves an unclosed bold marker alone', () => {
    expect(parseInline('a ** b')).toEqual([{ type: 'text', value: 'a ** b' }]);
  });

  it('starts and ends with markup cleanly', () => {
    expect(parseInline('`a`')).toEqual([{ type: 'code', value: 'a' }]);
  });

  it('is not stateful between calls', () => {
    // A module-level regex with the /g flag keeps lastIndex; a second identical call would
    // otherwise silently return different segments.
    const first = parseInline('use `print`');
    const second = parseInline('use `print`');
    expect(second).toEqual(first);
  });

  it.each([
    ['an empty string', ''],
    ['undefined', undefined],
    ['a number', 42],
  ])('returns nothing for %s', (_label, value) => {
    expect(parseInline(value as unknown as string)).toEqual([]);
  });
});
