import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { GoalImage } from '../components/GoalImage';
import { Card, SectionTitle } from '../components/ui';
import { addMonths, compact, dateLabel, durationLabel, money, monthLabel, toISO } from '../lib/format';
import { projectionSeries } from '../lib/finance';

const AXIS = { stroke: 'rgba(181,181,181,.45)', fontSize: 11 };

export function ForecastScreen() {
  const { state, forecast: f } = useApp();
  const [extra, setExtra] = useState(0);

  const data = useMemo(() => projectionSeries(f), [f]);

  const simulatedRate = f.avgSaving + extra;
  const simulatedMonths = simulatedRate > 0 ? f.remaining / simulatedRate : null;
  const simulatedEta = simulatedMonths !== null ? addMonths(new Date(), simulatedMonths) : null;
  const simulatedInTime = simulatedMonths !== null && simulatedMonths <= f.monthsRemaining;

  const verdict = verdictCopy(f, state.goal.name);

  return (
    <div className="pb-32">
      <GoalImage
        src={state.goal.image}
        variant="forecast"
        progress={f.progress}
        accent={state.goal.accent}
        fallback={state.goal.name}
        className="h-48 w-full"
      >
        <div className="safe-top flex h-full flex-col justify-end px-6 pb-6">
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Previsioni</h1>
          <p className="mt-1 text-[14px] text-white/60">Dove ti porta il ritmo attuale.</p>
        </div>
      </GoalImage>

      <div className="mx-auto max-w-lg space-y-6 px-4 pt-5">
        {/* Verdetto */}
        <Card>
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full"
              style={{ background: verdict.bg, color: verdict.color }}
            >
              <verdict.Icon size={19} />
            </span>
            <div>
              <p className="text-[19px] font-bold leading-snug tracking-tight">{verdict.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-mute">{verdict.body}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.04] p-3.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-mute">Ti serve</p>
              <p className="num mt-1 text-[19px] font-bold">{money(f.requiredMonthly)}/mese</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-mute">Stai facendo</p>
              <p className={`num mt-1 text-[19px] font-bold ${f.pace >= 1 ? 'text-secondary' : 'text-danger'}`}>
                {money(f.avgSaving)}/mese
              </p>
            </div>
          </div>
        </Card>

        {/* Proiezione */}
        <div>
          <SectionTitle>Proiezione fino al {dateLabel(state.goal.deadline)}</SectionTitle>
          <Card pad="p-3 pt-5">
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={data} margin={{ left: 4, right: 10 }}>
                <defs>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C853" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#00C853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis
                  dataKey="key"
                  tickFormatter={(v) => monthLabel(String(v))}
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS}
                  minTickGap={26}
                />
                <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} tickFormatter={(v) => compact(Number(v))} />
                <Tooltip
                  content={({ active, payload, label }: any) =>
                    active && payload?.length ? (
                      <div className="glass rounded-2xl px-3.5 py-2.5 text-[12px]">
                        <p className="mb-1 font-semibold">{monthLabel(String(label), true)}</p>
                        {payload
                          .filter((p: any) => p.dataKey !== 'obiettivo')
                          .map((p: any) => (
                            <p key={p.dataKey} className="flex items-center gap-2 text-mute">
                              <span className="size-2 rounded-full" style={{ background: p.stroke }} />
                              {p.name}: <span className="num font-semibold text-ink">{money(Number(p.value))}</span>
                            </p>
                          ))}
                      </div>
                    ) : null
                  }
                />
                <ReferenceLine
                  y={f.target}
                  stroke="#B9F6CA"
                  strokeDasharray="5 5"
                  label={{ value: 'obiettivo', position: 'insideTopRight', fill: '#B9F6CA', fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="realistico"
                  name="Realistico"
                  stroke="#00E676"
                  strokeWidth={2.6}
                  fill="url(#gReal)"
                  animationDuration={900}
                />
                <Line type="monotone" dataKey="ottimistico" name="Ottimistico" stroke="#B9F6CA" strokeWidth={1.6} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="prudente" name="Prudente" stroke="#8D9BA8" strokeWidth={1.6} dot={false} strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Scenari */}
        <div>
          <SectionTitle>Tre scenari</SectionTitle>
          <div className="space-y-2.5">
            {f.scenarios.map((s) => (
              <div key={s.key} className="card flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{s.label}</p>
                  <p className="text-[13px] text-mute">
                    {money(s.rate)} al mese ·{' '}
                    {s.eta ? `traguardo a ${dateLabel(toISO(s.eta))}` : 'con questo ritmo non ci arrivi'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`num text-[17px] font-bold ${s.reaches ? 'text-secondary' : 'text-danger'}`}>
                    {money(s.final)}
                  </p>
                  <p className="text-[12px] text-mute">alla scadenza</p>
                </div>
              </div>
            ))}
          </div>
          <p className="px-1 pt-3 text-[12px] leading-relaxed text-mute">
            Gli scenari partono dalla media pesata degli ultimi {f.sampleMonths || 1} mesi
            {f.volatility > 0 ? `, allargata di ${money(f.volatility)} in su e in giù per tenere conto della variabilità` : ''}.
            {f.provisional && ' Il mese in corso non è ancora chiuso: la stima si affinerà.'}
          </p>
        </div>

        {/* Simulatore */}
        <div>
          <SectionTitle>E se risparmiassi di più?</SectionTitle>
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] text-mute">Extra al mese</span>
              <span className="num text-[22px] font-bold text-secondary">+{money(extra)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(300, Math.ceil((f.requiredMonthly * 1.5) / 50) * 50)}
              step={10}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="mt-4 w-full accent-[#00C853]"
              aria-label="Risparmio extra mensile"
            />
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
              {simulatedEta ? (
                <p className="text-[15px] leading-relaxed">
                  Con {money(simulatedRate)} al mese arrivi il{' '}
                  <span className="font-semibold text-secondary">{dateLabel(toISO(simulatedEta))}</span>,{' '}
                  {simulatedInTime
                    ? `cioè ${durationLabel(f.monthsRemaining - simulatedMonths!)} in anticipo.`
                    : `cioè ${durationLabel(simulatedMonths! - f.monthsRemaining)} oltre la data che ti sei dato.`}
                </p>
              ) : (
                <p className="text-[15px] text-mute">Con un risparmio nullo o negativo non c'è una data di arrivo.</p>
              )}
            </div>
            {f.extraPerMonth > 0 && (
              <button
                onClick={() => setExtra(Math.ceil(f.extraPerMonth / 10) * 10)}
                className="press mt-3 w-full rounded-2xl border border-primary/40 bg-primary/10 py-3 text-[14px] font-medium text-secondary"
              >
                Portami esattamente in tempo: +{money(f.extraPerMonth)} al mese
              </button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function verdictCopy(f: ReturnType<typeof useApp>['forecast'], goalName: string) {
  const good = { color: '#00E676', bg: 'rgba(0,200,83,.15)', Icon: CheckCircle2 };
  const warn = { color: '#FF5D5D', bg: 'rgba(255,93,93,.14)', Icon: AlertTriangle };
  const neutral = { color: '#B9F6CA', bg: 'rgba(255,255,255,.08)', Icon: Info };

  if (f.verdict === 'reached')
    return { ...good, title: 'Obiettivo raggiunto.', body: `Hai coperto per intero ${goalName}. Il resto è tuo da decidere.` };

  if (f.provisional || f.sampleMonths === 0)
    return {
      ...neutral,
      Icon: Info,
      title: 'Serve un mese pieno di dati.',
      body: 'Appena si chiude il primo mese posso confrontare il tuo ritmo reale con quello necessario e darti una data.',
    };

  if (f.verdict === 'ahead')
    return {
      ...good,
      title: `Arriverai ${durationLabel(f.deltaMonths)} in anticipo.`,
      body: `Con ${money(f.avgSaving)} al mese chiudi prima della scadenza. Alla data prevista avresti ${money(
        f.realistic.final,
      )}, cioè ${money(-f.realistic.gap)} oltre l'obiettivo.`,
    };

  if (f.verdict === 'ontrack')
    return {
      ...good,
      Icon: TrendingUp,
      title: 'Sei esattamente in linea.',
      body: `Il ritmo attuale ti porta al traguardo entro la data. Non serve stringere: serve non mollare.`,
    };

  if (f.verdict === 'stalled')
    return {
      ...warn,
      title: 'Così non ti stai avvicinando.',
      body: `Negli ultimi mesi il saldo non è cresciuto. Per arrivare in tempo dovresti mettere da parte ${money(
        f.requiredMonthly,
      )} al mese.`,
    };

  return {
    ...warn,
    title: `Con questo andamento ti mancheranno ${money(Math.max(0, f.realistic.gap))}.`,
    body: `Stai risparmiando ${money(f.avgSaving)} al mese contro i ${money(
      f.requiredMonthly,
    )} necessari. Aggiungi ${money(f.extraPerMonth)} al mese e chiudi il divario esattamente in tempo.`,
  };
}
