import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('BLE client noble import', () => {
  it('uses the noble default export as the runtime adapter', async () => {
    const source = await readFile(new URL('../src/ble-client.ts', import.meta.url), 'utf8');

    expect(source).toContain("import noble");
    expect(source).not.toContain("import * as noble");
  });

  it('allows duplicate advertisements while waiting for the correct local name', async () => {
    const source = await readFile(new URL('../src/ble-client.ts', import.meta.url), 'utf8');

    expect(source).toContain('allowDuplicates: true');
    expect(source).not.toContain('allowDuplicates: false');
  });
});
