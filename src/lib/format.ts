const eur = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const eurCents = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number, cents = false): string {
  if (!Number.isFinite(value)) return '—';
  return cents ? eurCents.format(value) : eur.format(Math.round(value));
}

export function signed(value: number, cents = false): string {
  const s = money(Math.abs(value), cents);
  if (Math.round(value) === 0) return s;
  return (value > 0 ? '+' : '−') + ' ' + s;
}

export function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '') + ' M';
  if (abs >= 1000) return (value / 1000).toFixed(abs >= 10_000 ? 0 : 1).replace('.0', '') + 'k';
  return String(Math.round(value));
}

export function pct(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace('.', ',')}%`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string, long = false): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString('it-IT', { month: long ? 'long' : 'short' });
  return long ? `${label} ${y}` : `${label.replace('.', '')} ${String(y).slice(2)}`;
}

export function dateLabel(iso: string): string {
  return parseISO(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function shortDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

/** Distanza in mesi (frazionaria) fra due date. */
export function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return months + (to.getDate() - from.getDate()) / 30.44;
}

/**
 * Somma mesi senza il "traboccamento" di Date#setMonth: il 31 gennaio + 1 mese
 * diventa 28 febbraio, non 3 marzo. L'orario è fissato a mezzogiorno per non
 * inciampare nei cambi di ora legale.
 */
export function addMonths(date: Date, months: number): Date {
  const whole = Math.trunc(months);
  const d = new Date(date.getFullYear(), date.getMonth() + whole, 1, 12, 0, 0, 0);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  const fraction = months - whole;
  if (fraction) d.setDate(d.getDate() + Math.round(fraction * 30.44));
  return d;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** "2 mesi e 3 settimane", "in anticipo di 4 mesi", ecc. */
export function durationLabel(months: number): string {
  const m = Math.abs(months);
  if (m < 0.5) return 'meno di 2 settimane';
  if (m < 1) return 'circa 3 settimane';
  if (m < 12) {
    const r = Math.round(m);
    return r === 1 ? '1 mese' : `${r} mesi`;
  }
  const years = Math.floor(m / 12);
  const rest = Math.round(m - years * 12);
  const yLabel = years === 1 ? '1 anno' : `${years} anni`;
  if (rest === 0) return yLabel;
  return `${yLabel} e ${rest === 1 ? '1 mese' : `${rest} mesi`}`;
}
