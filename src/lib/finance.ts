import type { AppState, Category, Tx } from '../types';
import { addMonths, clamp, monthKey, monthsBetween, parseISO, toISO } from './format';

/* ------------------------------------------------------------------ */
/* Saldi                                                               */
/* ------------------------------------------------------------------ */

export function categoryBalances(state: AppState, txs: Tx[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of state.categories) out[c.id] = 0;

  for (const t of txs) {
    if (t.type === 'income') {
      if (t.allocations && Object.keys(t.allocations).length) {
        for (const [cid, amount] of Object.entries(t.allocations)) {
          if (cid in out) out[cid] += amount;
        }
      } else if (t.categoryId && t.categoryId in out) {
        out[t.categoryId] += t.amount;
      }
    } else if (t.categoryId && t.categoryId in out) {
      out[t.categoryId] -= t.amount;
    }
  }
  return out;
}

export interface Totals {
  income: number;
  expense: number;
  total: number;
  goalBalance: number;
  unassignedIncome: number;
}

export function totals(state: AppState, txs: Tx[]): Totals {
  let income = 0;
  let expense = 0;
  let unassignedIncome = 0;

  for (const t of txs) {
    if (t.type === 'income') {
      income += t.amount;
      const allocated = t.allocations ? sum(Object.values(t.allocations)) : t.categoryId ? t.amount : 0;
      unassignedIncome += Math.max(0, t.amount - allocated);
    } else {
      expense += t.amount;
    }
  }

  const total = state.startingBalance + income - expense;

  let goalBalance = total;
  if (state.goalSource === 'categories') {
    const balances = categoryBalances(state, txs);
    goalBalance = state.categories.filter((c) => c.goal).reduce((acc, c) => acc + (balances[c.id] ?? 0), 0);
  }

  return { income, expense, total, goalBalance, unassignedIncome };
}

/* ------------------------------------------------------------------ */
/* Serie temporali                                                     */
/* ------------------------------------------------------------------ */

export interface MonthPoint {
  key: string;
  income: number;
  expense: number;
  net: number;
  closed: boolean;
}

export function monthlySeries(state: AppState, txs: Tx[]): MonthPoint[] {
  const current = monthKey(toISO(new Date()));
  const map = new Map<string, MonthPoint>();

  for (const t of txs) {
    const k = monthKey(t.date);
    if (!map.has(k)) map.set(k, { key: k, income: 0, expense: 0, net: 0, closed: k < current });
    const p = map.get(k)!;
    if (t.type === 'income') p.income += t.amount;
    else p.expense += t.amount;
    p.net = p.income - p.expense;
  }

  if (!map.has(current)) map.set(current, { key: current, income: 0, expense: 0, net: 0, closed: false });

  // Scorro i mesi con aritmetica su anno/mese: nessuna sorpresa da fusi orari o mesi corti.
  const keys = [...map.keys()].sort();
  const [firstYear, firstMonth] = keys[0]!.split('-').map(Number) as [number, number];
  const [lastYear, lastMonth] = current.split('-').map(Number) as [number, number];

  const out: MonthPoint[] = [];
  let year = firstYear;
  let month = firstMonth;

  while (year * 12 + month <= lastYear * 12 + lastMonth) {
    const k = `${year}-${String(month).padStart(2, '0')}`;
    out.push(map.get(k) ?? { key: k, income: 0, expense: 0, net: 0, closed: k < current });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

/** Patrimonio nel tempo: saldo cumulato a fine di ogni mese. */
export function wealthSeries(state: AppState, txs: Tx[]): { key: string; value: number }[] {
  let running = state.startingBalance;
  return monthlySeries(state, txs).map((m) => {
    running += m.net;
    return { key: m.key, value: running };
  });
}

export function expensesByCategory(state: AppState, txs: Tx[], sinceISO?: string) {
  const byId = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    if (sinceISO && t.date < sinceISO) continue;
    const key = t.categoryId ?? '—';
    byId.set(key, (byId.get(key) ?? 0) + t.amount);
  }
  const lookup = new Map(state.categories.map((c) => [c.id, c] as const));
  return [...byId.entries()]
    .map(([id, value]) => {
      const c: Category | undefined = lookup.get(id);
      return { id, name: c?.name ?? 'Senza categoria', color: c?.color ?? '#5B5B5B', value };
    })
    .sort((a, b) => b.value - a.value);
}

/** Griglia giorno/settimana con l'intensità di spesa delle ultime N settimane. */
export function expenseHeatmap(txs: Tx[], weeks = 18) {
  const byDay = new Map<string, number>();
  for (const t of txs) if (t.type === 'expense') byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1)); // fine settimana corrente (domenica)
  const cells: { date: string; value: number; week: number; day: number; future: boolean }[] = [];
  const total = weeks * 7;

  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const iso = toISO(d);
    const idx = total - 1 - i;
    cells.push({
      date: iso,
      value: byDay.get(iso) ?? 0,
      week: Math.floor(idx / 7),
      day: (d.getDay() + 6) % 7,
      future: d > today,
    });
  }
  const max = Math.max(1, ...cells.map((c) => c.value));
  return { cells, max, weeks };
}

/* ------------------------------------------------------------------ */
/* Statistiche e previsioni                                            */
/* ------------------------------------------------------------------ */

export interface Scenario {
  key: 'optimistic' | 'realistic' | 'pessimistic';
  label: string;
  rate: number;
  final: number;
  gap: number;
  reaches: boolean;
  monthsNeeded: number | null;
  eta: Date | null;
}

export interface Forecast {
  current: number;
  target: number;
  remaining: number;
  progress: number;
  deadline: Date;
  monthsRemaining: number;
  requiredMonthly: number;
  avgSaving: number;
  bestMonth: number;
  worstMonth: number;
  volatility: number;
  sampleMonths: number;
  provisional: boolean;
  pace: number;
  scenarios: Scenario[];
  realistic: Scenario;
  verdict: 'reached' | 'ahead' | 'ontrack' | 'behind' | 'stalled' | 'unknown';
  deltaMonths: number;
  extraPerMonth: number;
}

export function forecast(state: AppState, txs: Tx[]): Forecast {
  const t = totals(state, txs);
  const current = t.goalBalance;
  const target = Math.max(1, state.goal.targetAmount);
  const remaining = Math.max(0, target - current);
  const now = new Date();
  const deadline = parseISO(state.goal.deadline);
  const monthsRemaining = Math.max(0, monthsBetween(now, deadline));
  const requiredMonthly = monthsRemaining > 0.1 ? remaining / monthsRemaining : remaining;

  const months = monthlySeries(state, txs);
  const closed = months.filter((m) => m.closed);
  const sample = (closed.length ? closed : months).slice(-6);
  const nets = sample.map((m) => m.net);
  const provisional = closed.length === 0;

  const avgSaving = weightedMean(nets);
  const volatility = stdev(nets);
  const sigma = volatility > 0 ? volatility : Math.abs(avgSaving) * 0.18 || 50;

  const build = (key: Scenario['key'], label: string, rate: number): Scenario => {
    const final = current + rate * monthsRemaining;
    const monthsNeeded = rate > 0 ? remaining / rate : null;
    return {
      key,
      label,
      rate,
      final,
      gap: target - final,
      reaches: final >= target || remaining === 0,
      monthsNeeded,
      eta: monthsNeeded !== null ? addMonths(now, monthsNeeded) : null,
    };
  };

  const realistic = build('realistic', 'Realistico', avgSaving);
  const scenarios: Scenario[] = [
    build('optimistic', 'Ottimistico', avgSaving + sigma),
    realistic,
    build('pessimistic', 'Prudente', avgSaving - sigma),
  ];

  const pace = requiredMonthly > 0 ? avgSaving / requiredMonthly : 2;
  const deltaMonths =
    realistic.monthsNeeded !== null ? monthsRemaining - realistic.monthsNeeded : Number.NEGATIVE_INFINITY;
  const gap = Math.max(0, realistic.gap);
  const extraPerMonth = monthsRemaining > 0.1 ? gap / monthsRemaining : gap;

  let verdict: Forecast['verdict'] = 'unknown';
  if (remaining <= 0) verdict = 'reached';
  else if (avgSaving <= 0) verdict = 'stalled';
  // Serve un margine reale prima di dire "sei in anticipo": un mese solo è rumore.
  else if (realistic.reaches && deltaMonths >= 2.5) verdict = 'ahead';
  else if (realistic.reaches) verdict = 'ontrack';
  else verdict = 'behind';

  return {
    current,
    target,
    remaining,
    progress: clamp(current / target, 0, 1),
    deadline,
    monthsRemaining,
    requiredMonthly,
    avgSaving,
    bestMonth: nets.length ? Math.max(...nets) : 0,
    worstMonth: nets.length ? Math.min(...nets) : 0,
    volatility,
    sampleMonths: nets.length,
    provisional,
    pace,
    scenarios,
    realistic,
    verdict,
    deltaMonths,
    extraPerMonth,
  };
}

/** Curva da oggi alla data obiettivo per i tre scenari. */
export function projectionSeries(f: Forecast) {
  const steps = Math.max(2, Math.min(60, Math.ceil(f.monthsRemaining) + 1));
  const [opt, real, pes] = f.scenarios;
  const now = new Date();
  const out: { key: string; ottimistico: number; realistico: number; prudente: number; obiettivo: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const m = (f.monthsRemaining * i) / steps;
    const d = addMonths(now, m);
    out.push({
      key: toISO(d).slice(0, 7),
      ottimistico: Math.round(f.current + opt!.rate * m),
      realistico: Math.round(f.current + real!.rate * m),
      prudente: Math.round(f.current + pes!.rate * m),
      obiettivo: f.target,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ripartizione dello stipendio                                        */
/* ------------------------------------------------------------------ */

export function splitByPercent(amount: number, categories: Category[]): Record<string, number> {
  const totalPct = categories.reduce((a, c) => a + c.percent, 0);
  const out: Record<string, number> = {};
  if (!categories.length) return out;

  let assigned = 0;
  categories.forEach((c, i) => {
    if (i === categories.length - 1) {
      out[c.id] = round2(amount - assigned);
      return;
    }
    const share = totalPct > 0 ? (c.percent / totalPct) * amount : amount / categories.length;
    const v = round2(share);
    out[c.id] = v;
    assigned += v;
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function mean(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

/** Media pesata sulla recenza: gli ultimi mesi contano di più. */
export function weightedMean(values: number[]): number {
  if (!values.length) return 0;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    const w = i + 1;
    num += v * w;
    den += w;
  });
  return num / den;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
