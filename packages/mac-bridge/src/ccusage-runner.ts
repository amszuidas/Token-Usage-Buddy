import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

export type CcusageAgent = 'all' | 'claude' | 'codex' | 'opencode';

export interface CollectCcusageOptions {
  since: string;
  until: string;
  timezone: string;
  exec?: (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
}

const execFile = promisify(execFileCallback);

export function buildCcusageCommand(agent: CcusageAgent, since: string, until: string, timezone: string): string[] {
  const command = agent === 'all' ? ['ccusage@latest', 'daily'] : ['ccusage@latest', agent, 'daily'];
  return [...command, '--json', '--since', since, '--until', until, '--timezone', timezone];
}

export async function collectCcusageJson(
  agent: CcusageAgent,
  options: CollectCcusageOptions,
): Promise<Record<string, unknown>> {
  const args = buildCcusageCommand(agent, options.since, options.until, options.timezone);
  const run = options.exec ?? ((file, execArgs) => execFile(file, execArgs, { maxBuffer: 20 * 1024 * 1024 }));
  const { stdout } = await run('npx', args);
  return JSON.parse(stdout) as Record<string, unknown>;
}

export async function collectCcusageVersion(
  exec?: (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>,
): Promise<string> {
  const run = exec ?? ((file, execArgs) => execFile(file, execArgs, { maxBuffer: 1024 * 1024 }));
  const { stdout } = await run('npx', ['ccusage@latest', '--version']);
  const match = stdout.match(/ccusage\s+([^\s]+)/);
  return match?.[1] ?? 'unknown';
}
