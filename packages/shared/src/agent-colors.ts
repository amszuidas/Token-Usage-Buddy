import type { AgentId } from './dashboard.js';

export interface AgentThemeColor {
  hex: string;
  rgb: [number, number, number];
}

export const AGENT_THEME_COLORS: Record<AgentId, AgentThemeColor> = {
  claude: { hex: '#D97757', rgb: [217, 119, 87] },
  codex: { hex: '#10A37F', rgb: [16, 163, 127] },
  opencode: { hex: '#03B000', rgb: [3, 176, 0] },
  others: { hex: '#8E8EA0', rgb: [142, 142, 160] },
};
