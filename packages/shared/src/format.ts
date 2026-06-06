export function formatEngineeringTokens(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const units = [
    { suffix: 'K', value: 1_000 },
    { suffix: 'M', value: 1_000_000 },
    { suffix: 'B', value: 1_000_000_000 },
    { suffix: 'T', value: 1_000_000_000_000 },
  ];
  let unitIndex = units.length - 1;
  while (unitIndex >= 0 && safe < units[unitIndex].value) {
    unitIndex -= 1;
  }
  if (unitIndex < 0) return String(safe);

  const rounded = Number((safe / units[unitIndex].value).toFixed(1));
  if (rounded >= 1_000 && unitIndex < units.length - 1) {
    unitIndex += 1;
  }

  const unit = units[unitIndex];
  return `${(safe / unit.value).toFixed(1)}${unit.suffix}`;
}

export function formatUsd(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `$${safe.toFixed(2)}`;
}
