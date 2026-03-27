import { describe, expect, it } from 'vitest';
import { isValidSmilClock, parseSmilClock } from './clock.js';

describe('SMIL Clock Parser', () => {
  describe('parseSmilClock', () => {
    it('should parse full clock values', () => {
      expect(parseSmilClock('0:00:00')).toBe(0);
      expect(parseSmilClock('0:00:00.000')).toBe(0);
      expect(parseSmilClock('1:30:45')).toBe(5445);
      expect(parseSmilClock('0:10:30.500')).toBe(630.5);
      expect(parseSmilClock('0:01:30.200')).toBe(90.2);
    });

    it('should parse partial clock values', () => {
      expect(parseSmilClock('00:00')).toBe(0);
      expect(parseSmilClock('10:30')).toBe(630);
      expect(parseSmilClock('00:10.000')).toBe(10);
      expect(parseSmilClock('00:10.500')).toBe(10.5);
    });

    it('should parse timecount values', () => {
      expect(parseSmilClock('0')).toBe(0);
      expect(parseSmilClock('30')).toBe(30);
      expect(parseSmilClock('30s')).toBe(30);
      expect(parseSmilClock('100s')).toBe(100);
      expect(parseSmilClock('59.234')).toBe(59.234);
      expect(parseSmilClock('1min')).toBe(60);
      expect(parseSmilClock('2.5min')).toBe(150);
      expect(parseSmilClock('0.5h')).toBe(1800);
      expect(parseSmilClock('2.1h')).toBeCloseTo(7560);
      expect(parseSmilClock('500ms')).toBe(0.5);
    });

    it('should return NaN for invalid values', () => {
      expect(parseSmilClock('')).toBeNaN();
      expect(parseSmilClock('abc')).toBeNaN();
      expect(parseSmilClock('.5s')).toBeNaN();
      expect(parseSmilClock('10m')).toBeNaN();
    });

    it('should handle whitespace trimming', () => {
      expect(parseSmilClock(' 30s ')).toBe(30);
      expect(parseSmilClock(' 0:10:30 ')).toBe(630);
    });
  });

  describe('isValidSmilClock', () => {
    it('should return true for valid values', () => {
      expect(isValidSmilClock('0:00:00')).toBe(true);
      expect(isValidSmilClock('10:30')).toBe(true);
      expect(isValidSmilClock('30s')).toBe(true);
      expect(isValidSmilClock('500ms')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isValidSmilClock('')).toBe(false);
      expect(isValidSmilClock('abc')).toBe(false);
      expect(isValidSmilClock('.5s')).toBe(false);
    });
  });
});
