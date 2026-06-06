import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readCachedSnapshot, writeCachedSnapshot } from '../src/cache.js';

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'token-buddy-cache-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('snapshot cache', () => {
  it('round-trips the last successful snapshot', async () => {
    const path = join(dir, 'cache.json');
    const snapshot = { schemaVersion: 1, today: { totalTokens: 493_800_000 } };
    await writeCachedSnapshot(path, snapshot);
    await expect(readCachedSnapshot(path)).resolves.toEqual(snapshot);
  });

  it('returns null when cache file is missing', async () => {
    await expect(readCachedSnapshot(join(dir, 'missing.json'))).resolves.toBeNull();
  });

  it('rejects when cache file contains invalid JSON', async () => {
    const path = join(dir, 'invalid.json');
    await writeFile(path, '{invalid', 'utf8');
    await expect(readCachedSnapshot(path)).rejects.toThrow(SyntaxError);
  });
});
