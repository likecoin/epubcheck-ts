/**
 * SMIL3 clock value parsing
 * @see https://www.w3.org/TR/SMIL3/smil-timing.html#q22
 */

const FULL_CLOCK_RE = /^(\d+):([0-5]\d):([0-5]\d)(\.\d+)?$/;
const PARTIAL_CLOCK_RE = /^([0-5]\d):([0-5]\d)(\.\d+)?$/;
const TIMECOUNT_RE = /^(\d+(\.\d+)?)(h|min|s|ms)?$/;

/**
 * Parse a SMIL3 clock value string into seconds.
 * Returns NaN if the value is not a valid clock value.
 */
export function parseSmilClock(value: string): number {
  const trimmed = value.trim();

  const full = FULL_CLOCK_RE.exec(trimmed);
  if (full) {
    const hours = Number.parseInt(full[1] ?? '0', 10);
    const minutes = Number.parseInt(full[2] ?? '0', 10);
    const seconds = Number.parseInt(full[3] ?? '0', 10);
    const frac = full[4] ? Number.parseFloat(full[4]) : 0;
    return hours * 3600 + minutes * 60 + seconds + frac;
  }

  const partial = PARTIAL_CLOCK_RE.exec(trimmed);
  if (partial) {
    const minutes = Number.parseInt(partial[1] ?? '0', 10);
    const seconds = Number.parseInt(partial[2] ?? '0', 10);
    const frac = partial[3] ? Number.parseFloat(partial[3]) : 0;
    return minutes * 60 + seconds + frac;
  }

  const timecount = TIMECOUNT_RE.exec(trimmed);
  if (timecount) {
    const num = Number.parseFloat(timecount[1] ?? '0');
    const unit = timecount[3] ?? 's';
    switch (unit) {
      case 'h':
        return num * 3600;
      case 'min':
        return num * 60;
      case 's':
        return num;
      case 'ms':
        return num / 1000;
      default:
        return NaN;
    }
  }

  return NaN;
}

/**
 * Validate whether a string is a valid SMIL3 clock value.
 */
export function isValidSmilClock(value: string): boolean {
  return !Number.isNaN(parseSmilClock(value));
}
