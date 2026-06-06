import { describe, expect, it } from 'vitest';
import { addDaysToYmd, formatDateYmd } from '../src/date.js';

describe('date helpers', () => {
  it('formats an instant in the target timezone', () => {
    expect(formatDateYmd(new Date('2026-03-09T04:30:00.000Z'), 'America/New_York')).toBe('20260309');
  });

  it('derives an inclusive seven-day start from target timezone calendar parts', () => {
    const until = formatDateYmd(new Date('2026-03-09T04:30:00.000Z'), 'America/New_York');

    expect(addDaysToYmd(until, -6)).toBe('20260303');
  });
});
