import type { EPUBLocation } from '../types.js';

/**
 * Build a message location, omitting line/column when they are unknown.
 *
 * `exactOptionalPropertyTypes` makes `{ path, line: undefined }` invalid, so every
 * call site would otherwise repeat the same conditional-assignment dance.
 */
export function locationAt(path: string, line?: number): EPUBLocation {
  const location: EPUBLocation = { path };
  if (line !== undefined) location.line = line;
  return location;
}

/**
 * Map character offsets in a source string to 1-based line numbers.
 *
 * Returns a lookup closure rather than computing lines on demand: the regex-based
 * parsers resolve many offsets against the same document, and scanning from the
 * start each time would be quadratic in the document size.
 */
export function createLineIndex(source: string): (offset: number) => number {
  const lineStarts: number[] = [0];
  for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1)) {
    lineStarts.push(i + 1);
  }

  return (offset: number): number => {
    // Binary search for the last line start at or before the offset.
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      // mid is always within bounds; the fallback only satisfies noUncheckedIndexedAccess.
      const midStart = lineStarts[mid] ?? 0;
      if (midStart <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}
