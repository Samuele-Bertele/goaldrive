import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { money, pct } from '../lib/format';
import { useCountUp } from '../components/ui';
import type { Forecast } from '../lib/finance';

/**
 * Frase motivazionale calcolata sui numeri veri, non pescata a caso.
 * Se non abbiamo abbastanza mesi chiusi lo diciamo, invece di inventare una previsione.
 */
function phrase(f: Forecast, goalName: string): string {
  if (f.remaining <= 0) return `${goalName} è tuo. Ce l’hai fatta.`;
  if (f.provisional) return 'Ancora un mese di dati e ti dirò quando lo raggiungerai.';

  switch (f.verdict) {
    case 'ahead': {
      const m = Math.round(f.deltaMonths);
      return `Continuando così lo raggiungi ${m === 1 ? 'un mese' : `${m} mesi`} prima del previsto.`;
    }
    case 'ontrack':
      return 'Sei esattamente sul ritmo che serve. Non cambiare niente.';
    case 'behind':
      return `Con ${money(f.extraPerMonth)} in più al mese arrivi in tempo.`;
    case 'stalled':
      return 'Questo mese il saldo non è cresciuto. Riparti da un movimento piccolo.';
    default:
      return `Mancano ${money(f.remaining)}.`;
  }
}

export function DreamMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, forecast } = useApp();
  const [tick, setTick] = useState(0);

  const progress = forecast.progress;
  const shown = useCountUp(open ? progress * 100 : 0, 1600);
  const accent = state.goal.accent ?? '#00C853';

  // Il messaggio ruota lentamente fra tre righe, così lo schermo resta vivo.
  const lines = useMemo(
    () => [
      phrase(forecast, state.goal.name || 'Il tuo obiettivo'),
      `Mancano ${money(forecast.remaining)} su ${money(forecast.target)}.`,
      forecast.avgSaving > 0
        ? `Stai mettendo da parte ${money(forecast.avgSaving)} al mese.`
        : 'Ogni entrata registrata sposta questa barra.',
    ],
    [forecast, state.goal.name],
  );

  useEffect(() => {
    if (!open) return;
    setTick(0);
    const id = setInterval(() => setTick((t) => (t + 1) % 3), 5200);
    return () => clearInterval(id);
  }, [open]);

  // A schermo intero non deve poter scrollare nulla dietro.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // La foto si mette a fuoco man mano che il progresso sale: è la firma dell'app.
  const blur = (1 - progress) * 16;
  const saturate = 0.25 + progress * 0.75;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[70] overflow-hidden bg-bg"
        >
          {/* Sfondo: la foto, lentissima, che respira */}
          {state.goal.image ? (
            <motion.div
              initial={{ scale: 1.18, opacity: 0 }}
              animate={{ scale: 1.06, opacity: 1 }}
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${state.goal.image})`,
                backgroundSize: 'cover',
                backgroundPosition: '50% 45%',
                filter: `blur(${blur}px) saturate(${saturate})`,
              }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(120% 90% at 50% 20%, ${accent}22, transparent 70%)` }}
            />
          )}

          {/* Velo per la leggibilità */}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/25 to-bg/95" />

          {/* Alone del colore dominante */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -bottom-1/4 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, ${accent}33, transparent 65%)` }}
          />

          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="press absolute right-4 top-[max(env(safe-area-inset-top),16px)] z-10 rounded-full bg-black/40 p-2.5 text-ink backdrop-blur"
          >
            <X size={20} />
          </button>

          {/* Contenuto */}
          <div className="relative flex h-full flex-col justify-end px-7 pb-[max(env(safe-area-inset-bottom),44px)]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-5"
            >
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.24em] text-mute">
                  Il tuo obiettivo
                </div>
                <h1 className="mt-1.5 text-[34px] font-bold leading-[1.05] tracking-tight">
                  {state.goal.name || 'Senza nome'}
                </h1>
              </div>

              <div className="flex items-end gap-3">
                <span className="num text-[62px] font-bold leading-none" style={{ color: accent }}>
                  {Math.round(shown)}
                  <span className="text-[30px]">%</span>
                </span>
                <span className="num mb-2 text-[15px] font-medium text-mute">
                  {money(forecast.current)} / {money(forecast.target)}
                </span>
              </div>

              {/* Barra */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/12">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: pct(progress) }}
                  transition={{ delay: 0.7, duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${accent}, #00E676)` }}
                />
              </div>

              {/* Frase che ruota */}
              <div className="min-h-[52px]">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tick}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-md text-[17px] font-medium leading-snug text-ink/90"
                  >
                    {lines[tick]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
