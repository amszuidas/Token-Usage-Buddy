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

  it('clamps negative display values to zero', () => {
    expect(formatEngineeringTokens(-10)).toBe('0');
  });
});

describe('formatUsd', () => {
  it('formats costs with two decimals', () => {
    expect(formatUsd(12.4)).toBe('$12.40');
    expect(formatUsd(0)).toBe('$0.00');
  });
});
