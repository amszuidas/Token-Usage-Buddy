import { describe, expect, it } from 'vitest';
import { addDaysToYmd, formatDateTimeOffset, formatDateYmd } from '../src/date.js';

describe('date helpers', () => {
  it('formats an instant in the target timezone', () => {
    expect(formatDateYmd(new Date('2026-03-09T04:30:00.000Z'), 'America/New_York')).toBe('20260309');
  });

  it('derives an inclusive seven-day start from target timezone calendar parts', () => {
    const until = formatDateYmd(new Date('2026-03-09T04:30:00.000Z'), 'America/New_York');

    expect(addDaysToYmd(until, -6)).toBe('20260303');
  });

  it('formats local date-times with the target timezone offset', () => {
    expect(formatDateTimeOffset(new Date('2026-06-06T11:10:00.000Z'), 'Asia/Shanghai')).toBe(
      '2026-06-06T19:10:00+08:00',
    );
    expect(formatDateTimeOffset(new Date('2026-03-09T04:30:00.000Z'), 'America/New_York')).toBe(
      '2026-03-09T00:30:00-04:00',
    );
  });
});
