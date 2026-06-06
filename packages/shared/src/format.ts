export function formatEngineeringTokens(value: number): string {
  const safe = Math.max(0, Math.round(value));
  const units = [
    { suffix: 'T', value: 1_000_000_000_000 },
    { suffix: 'B', value: 1_000_000_000 },
    { suffix: 'M', value: 1_000_000 },
    { suffix: 'K', value: 1_000 },
  ];
  const unit = units.find((candidate) => safe >= candidate.value);
  if (!unit) return String(safe);
  return `${(safe / unit.value).toFixed(1)}${unit.suffix}`;
}

export function formatUsd(value: number): string {
  return `$${Math.max(0, value).toFixed(2)}`;
}
