/**
 * Minimal Python tokenizer for syntax highlighting (SPEC §8).
 *
 * Written locally and deliberately small: the alternative is a web-oriented highlighting
 * library, which would pull in a large grammar engine for the one language we fully control.
 *
 * Guarantees, enforced by unit tests:
 *  - it never throws, whatever the input
 *  - concatenating every token value reproduces the input EXACTLY (nothing lost or added)
 *  - it always terminates, including on unterminated strings
 *
 * It is a highlighter, not a parser. It does not validate Python; it only classifies spans.
 */

export type PythonTokenType =
  'keyword' | 'builtin' | 'string' | 'comment' | 'number' | 'operator' | 'decorator' | 'plain';

export interface PythonToken {
  type: PythonTokenType;
  value: string;
}

const KEYWORDS = new Set([
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'False',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'None',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'True',
  'try',
  'while',
  'with',
  'yield',
]);

/** Builtins a beginner actually meets in the first course. */
const BUILTINS = new Set([
  'abs',
  'all',
  'any',
  'bool',
  'dict',
  'enumerate',
  'filter',
  'float',
  'format',
  'input',
  'int',
  'isinstance',
  'len',
  'list',
  'map',
  'max',
  'min',
  'open',
  'print',
  'range',
  'reversed',
  'round',
  'set',
  'sorted',
  'str',
  'sum',
  'tuple',
  'type',
  'zip',
]);

/** Valid string prefixes (r, f, b, u and their two-letter combinations), lower-cased. */
const STRING_PREFIXES = new Set(['r', 'u', 'f', 'b', 'br', 'rb', 'fr', 'rf']);

const DOUBLE_QUOTE = '"';
const SINGLE_QUOTE = "'";

const isQuote = (c: string): boolean => c === DOUBLE_QUOTE || c === SINGLE_QUOTE;

const isDigit = (c: string): boolean => c >= '0' && c <= '9';

const isIdentifierStart = (c: string): boolean =>
  (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';

const isIdentifierPart = (c: string): boolean => isIdentifierStart(c) || isDigit(c);

const isExponentAhead = (src: string, i: number): boolean => {
  const next = src[i + 1];
  if (next === undefined) return false;
  if (isDigit(next)) return true;
  return (next === '+' || next === '-') && isDigit(src[i + 2] ?? '');
};

/**
 * Consumes a string literal whose opening quote is at `quoteStart`, returning the index just
 * past the literal. `quoteStart` may be later than the token start when a prefix is present.
 */
const scanString = (src: string, quoteStart: number): number => {
  const quote = src[quoteStart];
  if (quote === undefined) return src.length;

  const isTriple = src[quoteStart + 1] === quote && src[quoteStart + 2] === quote;
  const delimiter = isTriple ? quote.repeat(3) : quote;

  let i = quoteStart + delimiter.length;

  while (i < src.length) {
    const c = src[i];

    // A backslash escapes the next character, including the quote itself.
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (src.startsWith(delimiter, i)) {
      return i + delimiter.length;
    }
    // An unterminated single-quoted string ends at the newline, as Python would report.
    if (!isTriple && c === '\n') {
      return i;
    }
    i += 1;
  }

  // Unterminated at end of input: consume the remainder rather than looping forever.
  return src.length;
};

/** Consumes a numeric literal, returning the index just past it. */
const scanNumber = (src: string, start: number): number => {
  let i = start;

  // Radix-prefixed integers: 0x1f, 0o17, 0b1011.
  if (src[i] === '0' && i + 1 < src.length && 'xXoObB'.includes(src[i + 1] ?? '')) {
    i += 2;
    while (i < src.length && isIdentifierPart(src[i] ?? '')) i += 1;
    return i;
  }

  let seenDot = false;
  let seenExponent = false;

  while (i < src.length) {
    const c = src[i] ?? '';

    if (isDigit(c) || c === '_') {
      i += 1;
    } else if (c === '.' && !seenDot && !seenExponent) {
      seenDot = true;
      i += 1;
    } else if ((c === 'e' || c === 'E') && !seenExponent && isExponentAhead(src, i)) {
      seenExponent = true;
      i += src[i + 1] === '+' || src[i + 1] === '-' ? 2 : 1;
    } else if (c === 'j' || c === 'J') {
      // Imaginary literal suffix.
      i += 1;
      break;
    } else {
      break;
    }
  }
  return i;
};

/**
 * Splits Python source into classified tokens.
 * Adjacent tokens of the same type are merged, keeping the output compact to render.
 */
export const tokenizePython = (source: string): PythonToken[] => {
  if (typeof source !== 'string' || source.length === 0) return [];

  const tokens: PythonToken[] = [];

  const push = (type: PythonTokenType, value: string): void => {
    if (value.length === 0) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === type) {
      last.value += value;
      return;
    }
    tokens.push({ type, value });
  };

  let i = 0;

  while (i < source.length) {
    const c = source[i] ?? '';

    // Comment: runs to the end of the line.
    if (c === '#') {
      const newline = source.indexOf('\n', i);
      const stop = newline === -1 ? source.length : newline;
      push('comment', source.slice(i, stop));
      i = stop;
      continue;
    }

    // Plain string literal.
    if (isQuote(c)) {
      const end = scanString(source, i);
      push('string', source.slice(i, end));
      i = end;
      continue;
    }

    // Decorator: @name, optionally dotted.
    if (c === '@' && isIdentifierStart(source[i + 1] ?? '')) {
      let j = i + 1;
      while (j < source.length && (isIdentifierPart(source[j] ?? '') || source[j] === '.')) {
        j += 1;
      }
      push('decorator', source.slice(i, j));
      i = j;
      continue;
    }

    // Identifier, keyword or builtin — or a prefixed string literal such as f"..." or rb'...'.
    if (isIdentifierStart(c)) {
      let j = i;
      while (j < source.length && isIdentifierPart(source[j] ?? '')) j += 1;
      const word = source.slice(i, j);
      const nextChar = source[j] ?? '';

      if (isQuote(nextChar) && STRING_PREFIXES.has(word.toLowerCase())) {
        const end = scanString(source, j);
        push('string', source.slice(i, end));
        i = end;
        continue;
      }

      if (KEYWORDS.has(word)) push('keyword', word);
      else if (BUILTINS.has(word)) push('builtin', word);
      else push('plain', word);
      i = j;
      continue;
    }

    // Number. A leading dot only starts a number when a digit follows (`.5`), never `obj.x`.
    if (isDigit(c) || (c === '.' && isDigit(source[i + 1] ?? ''))) {
      const end = scanNumber(source, i);
      push('number', source.slice(i, end));
      i = end;
      continue;
    }

    if ('+-*/%=<>!&|^~'.includes(c)) {
      push('operator', c);
      i += 1;
      continue;
    }

    push('plain', c);
    i += 1;
  }

  return tokens;
};
