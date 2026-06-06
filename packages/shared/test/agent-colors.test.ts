import { describe, expect, it } from 'vitest';
import { AGENT_THEME_COLORS } from '../src/agent-colors.js';

describe('AGENT_THEME_COLORS', () => {
  it('uses the approved agent theme colors', () => {
    expect(AGENT_THEME_COLORS.claude.hex).toBe('#D97757');
    expect(AGENT_THEME_COLORS.claude.rgb).toEqual([217, 119, 87]);
    expect(AGENT_THEME_COLORS.codex.hex).toBe('#10A37F');
    expect(AGENT_THEME_COLORS.codex.rgb).toEqual([16, 163, 127]);
    expect(AGENT_THEME_COLORS.opencode.hex).toBe('#03B000');
    expect(AGENT_THEME_COLORS.opencode.rgb).toEqual([3, 176, 0]);
    expect(AGENT_THEME_COLORS.others.hex).toBe('#8E8EA0');
    expect(AGENT_THEME_COLORS.others.rgb).toEqual([142, 142, 160]);
  });
});
