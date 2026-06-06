import { describe, expect, it } from 'vitest';
import { formatEngineeringTokens, formatUsd } from '../src/format.js';

describe('formatEngineeringTokens', () => {
  it('formats token counts with K/M/B/T suffixes', () => {
    expect(formatEngineeringTokens(999)).toBe('999');
    expect(formatEngineeringTokens(12_340)).toBe('12.3K');
    expect(formatEngineeringTokens(493_800_000)).toBe('493.8M');
    expect(formatEngineeringTokens(1_744_022_001)).toBe('1.7B');
    expect(formatEngineeringTokens(2_500_000_000_000)).toBe('2.5T');
  });

  it('promotes rounded threshold values to the next unit', () => {
    expect(formatEngineeringTokens(999_950)).toBe('1.0M');
    expect(formatEngineeringTokens(999_950_000)).toBe('1.0B');
    expect(formatEngineeringTokens(999_950_000_000)).toBe('1.0T');
  });

  it('clamps negative display values to zero', () => {
    expect(formatEngineeringTokens(-10)).toBe('0');
  });

  it('clamps non-finite display values to zero', () => {
    expect(formatEngineeringTokens(Number.NaN)).toBe('0');
    expect(formatEngineeringTokens(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatUsd', () => {
  it('formats costs with two decimals', () => {
    expect(formatUsd(12.4)).toBe('$12.40');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('clamps non-finite display values to zero', () => {
    expect(formatUsd(Number.NaN)).toBe('$0.00');
    expect(formatUsd(Number.POSITIVE_INFINITY)).toBe('$0.00');
  });
});
