const UNITS: readonly [number, string][] = [
  [1e16, '京'],
  [1e12, '万亿'],
  [1e8, '亿'],
  [1e4, '万'],
];

/** 1234 → "1234"，12345 → "1.23万"，1.5e9 → "15.0亿"，保留 3 位有效数字。 */
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  for (const [base, unit] of UNITS) {
    if (abs >= base) return sign + significant(abs / base) + unit;
  }
  return sign + Math.floor(abs).toString();
}

function significant(n: number): string {
  if (n >= 1000) return Math.floor(n).toString();
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}小时${m}分`;
  if (m > 0) return `${m}分${s % 60}秒`;
  return `${s}秒`;
}
