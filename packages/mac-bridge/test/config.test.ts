import { describe, expect, it } from 'vitest';
import { loadConfigFromEnv } from '../src/config.js';

describe('loadConfigFromEnv', () => {
  it('uses approved defaults', () => {
    expect(loadConfigFromEnv({})).toMatchObject({
      refreshIntervalMs: 600_000,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cachePath: expect.stringContaining('token-usage-buddy-cache.json'),
    });
  });

  it('accepts timezone and refresh overrides', () => {
    expect(
      loadConfigFromEnv({
        TOKEN_BUDDY_TIMEZONE: 'Asia/Shanghai',
        TOKEN_BUDDY_REFRESH_MINUTES: '15',
      }),
    ).toMatchObject({
      refreshIntervalMs: 900_000,
      timezone: 'Asia/Shanghai',
    });
  });

  it.each(['15abc', '0', '-1', '1.5', '', '   ', 'Infinity', 'NaN'])(
    'falls back to 10 minutes for invalid refresh override %j',
    (refreshMinutes) => {
      expect(loadConfigFromEnv({ TOKEN_BUDDY_REFRESH_MINUTES: refreshMinutes })).toMatchObject({
        refreshIntervalMs: 600_000,
      });
    },
  );
});
