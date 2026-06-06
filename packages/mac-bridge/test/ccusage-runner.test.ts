import { describe, expect, it, vi } from 'vitest';
import { buildCcusageCommand, collectCcusageJson, collectCcusageVersion } from '../src/ccusage-runner.js';

describe('buildCcusageCommand', () => {
  it('builds all-agent and specific-agent commands', () => {
    expect(buildCcusageCommand('all', '20260601', '20260606', 'Asia/Shanghai')).toEqual([
      'ccusage@latest',
      'daily',
      '--json',
      '--since',
      '20260601',
      '--until',
      '20260606',
      '--timezone',
      'Asia/Shanghai',
    ]);
    expect(buildCcusageCommand('codex', '20260601', '20260606', 'Asia/Shanghai')).toEqual([
      'ccusage@latest',
      'codex',
      'daily',
      '--json',
      '--since',
      '20260601',
      '--until',
      '20260606',
      '--timezone',
      'Asia/Shanghai',
    ]);
  });
});

describe('collectCcusageJson', () => {
  it('parses JSON stdout from npx', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: '{"daily":[]}', stderr: '' });
    await expect(
      collectCcusageJson('all', {
        since: '20260601',
        until: '20260606',
        timezone: 'Asia/Shanghai',
        exec,
      }),
    ).resolves.toEqual({ daily: [] });
  });
});

describe('collectCcusageVersion', () => {
  it('parses ccusage version stdout', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: 'ccusage 20.0.6\n', stderr: '' });
    await expect(collectCcusageVersion(exec)).resolves.toBe('20.0.6');
  });
});
