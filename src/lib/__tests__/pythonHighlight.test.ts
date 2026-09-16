import { tokenizePython, type PythonToken } from '../pythonHighlight';

const joined = (tokens: PythonToken[]): string => tokens.map((t) => t.value).join('');

/**
 * Type of the token covering `needle`. Adjacent same-type tokens are merged by design, so a
 * plain identifier shares a token with the whitespace after it — look up by offset, not value.
 */
const typeOf = (source: string, needle: string): string | undefined => {
  const index = source.indexOf(needle);
  if (index === -1) return undefined;

  let offset = 0;
  for (const token of tokenizePython(source)) {
    if (index >= offset && index < offset + token.value.length) return token.type;
    offset += token.value.length;
  }
  return undefined;
};

describe('tokenizePython', () => {
  describe('lossless invariant', () => {
    // If this ever breaks, code renders with characters missing or duplicated.
    const samples = [
      'print("hello")',
      'x = 1\ny = 2\n',
      '# just a comment',
      'def f(a, b=2, *args, **kwargs):\n    return a + b\n',
      's = """triple\nline"""',
      "s = 'unterminated",
      'n = 0xFF + 0b1010 + 1_000 + 1.5e-3 + 2j',
      'f"value is {x!r}"',
      '@decorator\nclass A:\n    pass',
      'ș = "diacritice ăâîșț"',
      '\t\t   \n\n',
      'a.b.c().d[0]',
    ];

    it.each(samples)('reproduces the input exactly: %j', (source) => {
      expect(joined(tokenizePython(source))).toBe(source);
    });

    it('reproduces a long mixed document exactly', () => {
      const source = samples.join('\n');
      expect(joined(tokenizePython(source))).toBe(source);
    });
  });

  describe('classification', () => {
    it('marks keywords', () => {
      expect(typeOf('if x:', 'if')).toBe('keyword');
      expect(typeOf('return None', 'return')).toBe('keyword');
      expect(typeOf('x = True', 'True')).toBe('keyword');
    });

    it('marks builtins', () => {
      expect(typeOf('print(1)', 'print')).toBe('builtin');
      expect(typeOf('len(items)', 'len')).toBe('builtin');
    });

    it('treats an ordinary name as plain', () => {
      expect(typeOf('total = 1', 'total')).toBe('plain');
    });

    it('does not classify a keyword that is only part of a longer name', () => {
      // "format" contains "for"; "assertion" contains "assert".
      expect(typeOf('information = 1', 'information')).toBe('plain');
      expect(typeOf('assertion = 1', 'assertion')).toBe('plain');
    });

    it('marks comments to end of line only', () => {
      const tokens = tokenizePython('x = 1  # set x\ny = 2');
      const comment = tokens.find((t) => t.type === 'comment');
      expect(comment?.value).toBe('# set x');
      expect(joined(tokens)).toContain('y = 2');
    });

    it('marks decorators', () => {
      expect(typeOf('@staticmethod\ndef f(): pass', '@staticmethod')).toBe('decorator');
    });

    it('marks numbers in every literal form', () => {
      expect(typeOf('a = 42', '42')).toBe('number');
      expect(typeOf('a = 1.5', '1.5')).toBe('number');
      expect(typeOf('a = 0xFF', '0xFF')).toBe('number');
      expect(typeOf('a = 1_000', '1_000')).toBe('number');
      expect(typeOf('a = 1e10', '1e10')).toBe('number');
      expect(typeOf('a = 1.5e-3', '1.5e-3')).toBe('number');
    });

    it('does not treat attribute access as a number', () => {
      // `obj.x` must not swallow the dot into a numeric token.
      const tokens = tokenizePython('obj.x');
      expect(tokens.some((t) => t.type === 'number')).toBe(false);
    });
  });

  describe('strings', () => {
    it('handles both quote styles', () => {
      expect(typeOf('a = "hi"', '"hi"')).toBe('string');
      expect(typeOf("a = 'hi'", "'hi'")).toBe('string');
    });

    it('handles an escaped quote inside a string', () => {
      const source = 'a = "she said \\"hi\\""';
      const tokens = tokenizePython(source);
      expect(tokens.find((t) => t.type === 'string')?.value).toBe('"she said \\"hi\\""');
      expect(joined(tokens)).toBe(source);
    });

    it('handles triple-quoted strings spanning lines', () => {
      const source = 'doc = """line one\nline two"""';
      expect(tokenizePython(source).find((t) => t.type === 'string')?.value).toBe(
        '"""line one\nline two"""',
      );
    });

    it('includes the prefix in an f-string token', () => {
      expect(typeOf('a = f"x={x}"', 'f"x={x}"')).toBe('string');
    });

    it('includes the prefix in raw and byte strings', () => {
      expect(typeOf("p = r'C:\\path'", "r'C:\\path'")).toBe('string');
      expect(typeOf('b = rb"data"', 'rb"data"')).toBe('string');
    });

    it('does not treat a non-prefix identifier before a quote as part of the string', () => {
      // `foo"bar"` is not valid Python, but the tokenizer must not merge them.
      const tokens = tokenizePython('foo"bar"');
      expect(tokens[0]).toEqual({ type: 'plain', value: 'foo' });
    });

    it('terminates an unterminated single-quoted string at the newline', () => {
      const tokens = tokenizePython("a = 'oops\nb = 2");
      expect(tokens.find((t) => t.type === 'string')?.value).toBe("'oops");
      expect(joined(tokens)).toBe("a = 'oops\nb = 2");
    });
  });

  describe('robustness', () => {
    it('returns an empty list for empty input', () => {
      expect(tokenizePython('')).toEqual([]);
    });

    it('never throws on hostile input', () => {
      const hostile = [
        '"'.repeat(200),
        "'''",
        '\\',
        '#'.repeat(500),
        '0x',
        '1e',
        '@',
        '\u0000\uffff',
        'f',
      ];
      for (const source of hostile) {
        expect(() => tokenizePython(source)).not.toThrow();
        expect(joined(tokenizePython(source))).toBe(source);
      }
    });

    it('terminates on a long unterminated triple-quoted string', () => {
      const source = `x = """${'a'.repeat(5000)}`;
      expect(joined(tokenizePython(source))).toBe(source);
    });

    it('merges adjacent tokens of the same type', () => {
      // Whitespace and punctuation both classify as plain, so they collapse into one token.
      const tokens = tokenizePython('a   b');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.type).toBe('plain');
    });
  });
});
