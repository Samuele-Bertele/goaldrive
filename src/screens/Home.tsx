import { motion } from 'framer-motion';
import { ArrowUpRight, Banknote, CalendarDays, ChevronRight, Flame, Target } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { GoalImage } from '../components/GoalImage';
import { Amount, Button, Card, Progress, SectionTitle } from '../components/ui';
import { durationLabel, money, monthKey, monthLabel, shortDate, toISO, todayISO } from '../lib/format';
import type { Forecast } from '../lib/finance';
import type { Route } from '../components/Nav';
import type { AppState } from '../types';

export function Home({ onRoute, onSalary }: { onRoute: (r: Route) => void; onSalary: () => void }) {
  const { state, sorted, totals, forecast, salaryLoggedThisMonth } = useApp();
  const first = state.name.split(' ')[0] || 'ciao';
  const percent = Math.round(forecast.progress * 100);
  const msg = headline(forecast, state);

  return (
    <div className="pb-32">
      {/* Eroe: la foto dell'obiettivo, svelata quanto lo sei tu */}
      <button onClick={() => onRoute('goal')} className="relative block w-full text-left">
        <GoalImage
          src={state.goal.image}
          variant="home"
          progress={forecast.progress}
          accent={state.goal.accent}
          fallback={state.goal.name}
          className="h-[62vh] min-h-[420px] w-full"
        >
          <div className="safe-top flex h-full flex-col justify-between px-6 pb-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/55">
                  {greeting()}, {first}
                </p>
                <p className="mt-1 text-[13px] text-white/45">{monthLabel(monthKey(todayISO()), true)}</p>
              </div>
              <span className="glass rounded-full px-3 py-1.5 text-[12px] font-medium text-white/80">
                {state.goal.image || state.goal.model ? 'Vedi obiettivo' : 'Aggiungi foto'}
              </span>
            </div>

            <div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[86%] text-[32px] font-extrabold leading-[1.06] tracking-[-0.035em]"
              >
                {state.goal.name}
              </motion.h1>

              <div className="mt-5 flex items-end gap-3">
                <span className="num text-[64px] font-extrabold leading-none tracking-[-0.05em]">{percent}</span>
                <span className="num mb-2 text-[24px] font-bold text-secondary">%</span>
                <span className="mb-2.5 ml-auto text-right text-[13px] leading-tight text-white/65">
                  <Amount value={forecast.current} className="block text-[15px] font-semibold text-ink" />
                  di {money(forecast.target)}
                </span>
              </div>

              <div className="mt-3">
                <Progress value={forecast.progress} height={12} />
              </div>
            </div>
          </div>
        </GoalImage>
      </button>

      <div className="mx-auto -mt-2 max-w-lg space-y-6 px-4">
        {/* Il messaggio del giorno */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="card border-primary/25 bg-primary/[0.07] p-5"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-secondary">
              <msg.Icon size={18} />
            </span>
            <div>
              <p className="text-[17px] font-semibold leading-snug tracking-tight">{msg.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-mute">{msg.body}</p>
            </div>
          </div>
        </motion.div>

        {/* Stipendio del mese */}
        {!salaryLoggedThisMonth && state.salary.amount > 0 && (
          <Card className="flex items-center gap-4 border-white/10">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/6 text-secondary">
              <Banknote size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Stipendio di {monthLabel(monthKey(todayISO()))}</p>
              <p className="text-[13px] text-mute">Registralo e lo divido sulle tue categorie.</p>
            </div>
            <Button size="sm" onClick={onSalary}>
              Registra
            </Button>
          </Card>
        )}

        {/* Numeri essenziali */}
        <div className="grid grid-cols-2 gap-3">
          <Tile label="Saldo attuale" value={<Amount value={totals.total} className="text-[22px] font-bold" />} />
          <Tile
            label="Ti mancano"
            value={<Amount value={forecast.remaining} className="text-[22px] font-bold text-secondary" />}
          />
          <Tile
            label="Data obiettivo"
            value={<span className="num text-[18px] font-bold">{shortDate(state.goal.deadline)}</span>}
            hint={`fra ${durationLabel(forecast.monthsRemaining)}`}
          />
          <Tile
            label="Previsione"
            value={
              <span className="num text-[18px] font-bold">
                {forecast.realistic.eta ? shortDate(toISO(forecast.realistic.eta)) : '—'}
              </span>
            }
            hint={
              forecast.realistic.eta
                ? forecast.deltaMonths >= 0
                  ? `${durationLabel(forecast.deltaMonths)} in anticipo`
                  : `${durationLabel(forecast.deltaMonths)} di ritardo`
                : 'serve un mese di dati'
            }
            tone={forecast.deltaMonths >= 0 ? 'good' : 'bad'}
          />
        </div>

        {/* Ritmo */}
        <Card onClick={() => onRoute('forecast')} className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-mute">Ritmo di risparmio</p>
            <p className="num mt-1 text-[24px] font-bold">
              {money(forecast.avgSaving)}
              <span className="text-[15px] font-medium text-mute"> / mese</span>
            </p>
            <p className="mt-1 text-[13px] text-mute">
              Ti servono {money(forecast.requiredMonthly)} al mese per arrivare in tempo.
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-mute" />
        </Card>

        {/* Ultimi movimenti */}
        <div>
          <SectionTitle
            action={
              <button onClick={() => onRoute('money')} className="press flex items-center gap-1 text-[13px] text-secondary">
                Tutti <ArrowUpRight size={14} />
              </button>
            }
          >
            Ultimi movimenti
          </SectionTitle>

          {sorted.length === 0 ? (
            <Card className="text-center">
              <p className="text-[15px] font-semibold">Ancora niente da mostrare</p>
              <p className="mt-1 text-[14px] text-mute">
                Registra la prima entrata o spesa: da lì partono tutte le previsioni.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {sorted.slice(0, 4).map((t) => {
                const cat = state.categories.find((c) => c.id === t.categoryId);
                return (
                  <div key={t.id} className="card flex items-center gap-3 p-3.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: cat?.color ?? (t.type === 'income' ? '#00E676' : '#5B5B5B') }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{t.description}</p>
                      <p className="text-[12px] text-mute">
                        {shortDate(t.date)} · {cat?.name ?? (t.kind === 'salary' ? 'Ripartito' : 'Senza categoria')}
                      </p>
                    </div>
                    <span className={`num text-[15px] font-semibold ${t.type === 'income' ? 'text-secondary' : 'text-ink'}`}>
                      {t.type === 'income' ? '+' : '−'} {money(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mute">{label}</p>
      <div className="mt-1.5">{value}</div>
      {hint && (
        <p className={`mt-1 text-[12px] ${tone === 'good' ? 'text-secondary' : tone === 'bad' ? 'text-danger' : 'text-mute'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Notte fonda';
  if (h < 13) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

/** Un solo messaggio, quello che conta oggi. */
function headline(f: Forecast, state: AppState): { title: string; body: string; Icon: typeof Flame } {
  const pct = Math.round(f.progress * 100);

  if (f.verdict === 'reached') {
    return {
      title: `${state.goal.name} è tuo.`,
      body: 'Hai coperto l’intero importo. Goditelo — poi, se vuoi, imposta il prossimo obiettivo.',
      Icon: Target,
    };
  }
  if (f.provisional || f.sampleMonths === 0) {
    return {
      title: `Sei al ${pct}%.`,
      body: `Ti mancano ${money(f.remaining)}. Ancora un mese di movimenti e comincio a dirti quando arriverai.`,
      Icon: Flame,
    };
  }
  if (f.verdict === 'ahead') {
    return {
      title: `Sei al ${pct}%, e sei in anticipo.`,
      body: `Con questo ritmo arrivi ${durationLabel(f.deltaMonths)} prima del previsto. Ti mancano ${money(f.remaining)}.`,
      Icon: Flame,
    };
  }
  if (f.verdict === 'ontrack') {
    return {
      title: `Sei al ${pct}%: sei in linea.`,
      body: `Mantieni ${money(f.requiredMonthly)} al mese e ${state.goal.name} arriva puntuale.`,
      Icon: CalendarDays,
    };
  }
  if (f.verdict === 'stalled') {
    return {
      title: 'Il saldo non sta crescendo.',
      body: `Negli ultimi mesi le spese hanno pareggiato le entrate. Servono ${money(f.requiredMonthly)} al mese per arrivare in tempo.`,
      Icon: Target,
    };
  }
  return {
    title: `Sei al ${pct}%. Serve una spinta.`,
    body: `Con l’andamento attuale ti mancherebbero ${money(Math.max(0, f.realistic.gap))}. Bastano ${money(
      f.extraPerMonth,
    )} in più al mese per chiudere il divario.`,
    Icon: Target,
  };
}
