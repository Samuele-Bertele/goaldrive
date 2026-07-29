import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../store/AppStore';
import { GoalImage } from '../components/GoalImage';
import { Card, Empty, SectionTitle, Segmented, Stat } from '../components/ui';
import { compact, money, monthLabel, pct } from '../lib/format';
import { expenseHeatmap, expensesByCategory, monthlySeries, wealthSeries } from '../lib/finance';

const AXIS = { stroke: 'rgba(181,181,181,.45)', fontSize: 11 };

export function Analytics() {
  const { state, txs, totals, forecast, balances } = useApp();
  const [range, setRange] = useState<'6' | '12' | 'all'>('12');

  const months = useMemo(() => monthlySeries(state, txs), [state, txs]);
  const wealth = useMemo(() => wealthSeries(state, txs), [state, txs]);
  const take = range === 'all' ? months.length : Number(range);

  const monthData = months.slice(-take).map((m) => ({
    name: monthLabel(m.key),
    Entrate: Math.round(m.income),
    Spese: Math.round(m.expense),
    Risparmio: Math.round(m.net),
  }));

  const wealthData = wealth.slice(-take).map((w) => ({ name: monthLabel(w.key), Patrimonio: Math.round(w.value) }));

  const speed = monthData.map((m, i, arr) => {
    const window = arr.slice(Math.max(0, i - 2), i + 1);
    return { name: m.name, Media: Math.round(window.reduce((a, b) => a + b.Risparmio, 0) / window.length) };
  });

  const categories = useMemo(() => expensesByCategory(state, txs), [state, txs]);
  const heat = useMemo(() => expenseHeatmap(txs), [txs]);

  const last = monthData[monthData.length - 1];
  const prev = monthData[monthData.length - 2];
  const delta = last && prev ? last.Risparmio - prev.Risparmio : 0;

  if (txs.length === 0) {
    return (
      <div className="pb-32">
        <Header />
        <div className="mx-auto max-w-lg px-4 pt-5">
          <Empty
            title="I grafici arrivano con i primi dati"
            body="Registra qualche entrata e qualche spesa: da lì costruisco andamento, medie e proiezioni."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <Header />

      <div className="mx-auto max-w-lg space-y-6 px-4 pt-5">
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '6', label: '6 mesi' },
            { value: '12', label: '12 mesi' },
            { value: 'all', label: 'Tutto' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Saldo totale" value={money(totals.total)} />
          <Stat label="% obiettivo" value={pct(forecast.progress * 100)} tone="good" />
          <Stat label="Risparmio medio" value={`${money(forecast.avgSaving)}/mese`} />
          <Stat
            label="Risparmio del mese"
            value={money(last?.Risparmio ?? 0)}
            hint={prev ? `${delta >= 0 ? '+' : '−'}${money(Math.abs(delta))} sul mese scorso` : undefined}
            tone={delta >= 0 ? 'good' : 'bad'}
          />
          <Stat label="Entrate totali" value={money(totals.income)} />
          <Stat label="Spese totali" value={money(totals.expense)} />
          <Stat label="Mesi rimanenti" value={forecast.monthsRemaining.toFixed(1).replace('.', ',')} />
          <Stat
            label="Previsione finale"
            value={money(forecast.realistic.final)}
            hint={`${forecast.realistic.gap > 0 ? 'sotto di' : 'sopra di'} ${money(Math.abs(forecast.realistic.gap))}`}
            tone={forecast.realistic.gap > 0 ? 'bad' : 'good'}
          />
        </div>

        <div>
          <SectionTitle>Patrimonio nel tempo</SectionTitle>
          <Card pad="p-3 pt-5">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={wealthData} margin={{ left: 4, right: 8 }}>
                <defs>
                  <linearGradient id="gWealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C853" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#00C853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} minTickGap={18} />
                <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} tickFormatter={(v) => compact(Number(v))} />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(255,255,255,.15)' }} />
                <Area
                  type="monotone"
                  dataKey="Patrimonio"
                  stroke="#00E676"
                  strokeWidth={2.4}
                  fill="url(#gWealth)"
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div>
          <SectionTitle>Risparmio mensile</SectionTitle>
          <Card pad="p-3 pt-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthData} margin={{ left: 4, right: 8 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} minTickGap={14} />
                <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} tickFormatter={(v) => compact(Number(v))} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
                <Bar dataKey="Risparmio" radius={[6, 6, 4, 4]} animationDuration={800}>
                  {monthData.map((m, i) => (
                    <Cell key={i} fill={m.Risparmio >= 0 ? '#00C853' : '#FF5D5D'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div>
          <SectionTitle>Entrate contro spese</SectionTitle>
          <Card pad="p-3 pt-5">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={monthData} margin={{ left: 4, right: 8 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} minTickGap={14} />
                <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} tickFormatter={(v) => compact(Number(v))} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#B5B5B5' }} />
                <Bar dataKey="Entrate" fill="#00C853" radius={[6, 6, 0, 0]} animationDuration={800} />
                <Bar dataKey="Spese" fill="#3A3A3A" radius={[6, 6, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div>
          <SectionTitle>Dove finiscono le spese</SectionTitle>
          {categories.length === 0 ? (
            <Card>
              <p className="text-[14px] text-mute">Nessuna spesa registrata: la torta si riempie appena ne aggiungi una.</p>
            </Card>
          ) : (
            <Card pad="p-4">
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="50%" height={168}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={72}
                      paddingAngle={3}
                      stroke="none"
                      animationDuration={800}
                    >
                      {categories.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex-1 space-y-2">
                  {categories.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-[13px]">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="min-w-0 flex-1 truncate text-mute">{c.name}</span>
                      <span className="num font-semibold">{money(c.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>

        <div>
          <SectionTitle>Saldo per categoria</SectionTitle>
          <Card className="space-y-3">
            {state.categories.map((c) => {
              const value = balances[c.id] ?? 0;
              const max = Math.max(1, ...state.categories.map((x) => Math.abs(balances[x.id] ?? 0)));
              return (
                <div key={c.id}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                      {c.goal && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-secondary">obiettivo</span>}
                    </span>
                    <span className="num font-semibold">{money(value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (Math.abs(value) / max) * 100)}%`, background: c.color }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <div>
          <SectionTitle>Velocità di risparmio</SectionTitle>
          <Card pad="p-3 pt-5">
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={speed} margin={{ left: 4, right: 8 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} minTickGap={14} />
                <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} tickFormatter={(v) => compact(Number(v))} />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(255,255,255,.15)' }} />
                <Line
                  type="monotone"
                  dataKey="Media"
                  stroke="#B9F6CA"
                  strokeWidth={2.4}
                  dot={false}
                  animationDuration={900}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="px-2 pb-1 pt-2 text-[12px] leading-relaxed text-mute">
              Media mobile a tre mesi: mostra la tendenza sotto ai singoli mesi buoni o storti.
            </p>
          </Card>
        </div>

        <div>
          <SectionTitle>Intensità di spesa</SectionTitle>
          <Card pad="p-4">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {Array.from({ length: heat.weeks }).map((_, w) => (
                <div key={w} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((__, d) => {
                    const cell = heat.cells.find((c) => c.week === w && c.day === d);
                    const intensity = cell && !cell.future ? cell.value / heat.max : 0;
                    return (
                      <div
                        key={d}
                        title={cell ? `${cell.date}: ${money(cell.value)}` : ''}
                        className="size-[11px] rounded-[3px]"
                        style={{
                          background:
                            cell?.future || !cell
                              ? 'rgba(255,255,255,.03)'
                              : intensity === 0
                                ? 'rgba(255,255,255,.06)'
                                : `rgba(0, 200, 83, ${0.18 + intensity * 0.82})`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="pt-3 text-[12px] text-mute">Ultime {heat.weeks} settimane. Più intenso, più hai speso quel giorno.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { state, forecast } = useApp();
  return (
    <GoalImage
      src={state.goal.image}
      variant="analytics"
      progress={forecast.progress}
      accent={state.goal.accent}
      fallback={state.goal.name}
      className="h-48 w-full"
    >
      <div className="safe-top flex h-full flex-col justify-end px-6 pb-6">
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Analisi</h1>
        <p className="mt-1 text-[14px] text-white/60">Come si comporta davvero il tuo risparmio.</p>
      </div>
    </GoalImage>
  );
}

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-2xl px-3.5 py-2.5 text-[12px]">
      {label && <p className="mb-1 font-semibold text-ink">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-mute">
          <span className="size-2 rounded-full" style={{ background: p.color ?? p.payload?.color }} />
          {p.name}: <span className="num font-semibold text-ink">{money(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}
