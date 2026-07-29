import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Clock, Lock, Sparkles } from 'lucide-react';
import { Button, Sheet } from '../components/ui';
import { useEntitlement, useFeature } from './EntitlementProvider';
import { FEATURES, PLAN_LABEL, PRICES, type FeatureKey } from './plans';
import { payments } from './subscription';
import { useStore } from '../store/AppStore';

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export function PlanBadge({ className = '' }: { className?: string }) {
  const { plan } = useEntitlement();
  if (plan === 'FREE') return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-secondary ${className}`}
    >
      <Sparkles size={11} />
      {PLAN_LABEL[plan]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Anteprima bloccata                                                  */
/* ------------------------------------------------------------------ */

/**
 * Non nasconde la funzione: la mostra sfocata, con un lucchetto sopra.
 * Chi non ha il piano capisce cosa si sta perdendo, che è tutto il punto.
 *
 * `children` viene reso comunque, quindi non metterci dentro chiamate a
 * pagamento o calcoli pesanti: solo il risultato visivo.
 */
export function LockedPreview({
  feature,
  children,
  minHeight = 200,
}: {
  feature: FeatureKey;
  children: ReactNode;
  minHeight?: number;
}) {
  const { allowed, result } = useFeature(feature);
  const [open, setOpen] = useState(false);
  const meta = FEATURES[feature];

  if (allowed) return <>{children}</>;

  const soon = !result.ok && result.reason === 'soon';

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight }}>
        <div aria-hidden className="pointer-events-none select-none blur-[7px] saturate-[0.5] opacity-60">
          {children}
        </div>

        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-bg/50 via-bg/70 to-bg/90 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/6 text-secondary">
              {soon ? <Clock size={18} /> : <Lock size={16} />}
            </div>
            <div>
              <div className="text-[15px] font-semibold">{meta.name}</div>
              <p className="mx-auto mt-1 max-w-[17rem] text-[13px] leading-relaxed text-mute">{meta.blurb}</p>
            </div>
            {soon ? (
              <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-mute">In arrivo</span>
            ) : (
              <Button size="sm" onClick={() => setOpen(true)}>
                Passa a {PLAN_LABEL[meta.minPlan]}
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      <PaywallSheet open={open} onClose={() => setOpen(false)} feature={feature} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Riga bloccata, per liste e voci di menu                             */
/* ------------------------------------------------------------------ */

export function LockedRow({ feature, onOpen }: { feature: FeatureKey; onOpen: () => void }) {
  const meta = FEATURES[feature];
  const soon = meta.soon;
  return (
    <button
      onClick={soon ? undefined : onOpen}
      disabled={soon}
      className="press card flex w-full items-center gap-3 p-4 text-left disabled:opacity-60"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/6 text-mute">
        {soon ? <Clock size={15} /> : <Lock size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{meta.name}</div>
        <div className="truncate text-[12px] text-mute">{meta.blurb}</div>
      </div>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-secondary">
        {soon ? 'Presto' : PLAN_LABEL[meta.minPlan]}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet di upgrade                                                    */
/* ------------------------------------------------------------------ */

export function PaywallSheet({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature?: FeatureKey;
}) {
  const { user, toast } = useStore();
  const { plan } = useEntitlement();
  const [busy, setBusy] = useState<string | null>(null);

  const target = feature ? FEATURES[feature].minPlan : 'PREMIUM';
  const options = PRICES.filter((p) => p.plan === target);
  const perks = Object.values(FEATURES).filter((f) => f.minPlan === target && !f.soon);

  const buy = async (id: string) => {
    const price = options.find((o) => o.id === id);
    if (!price || !user) return;
    setBusy(id);
    try {
      const url = await payments.startCheckout(price, user.uid, user.email);
      window.location.href = url;
    } catch {
      toast('I pagamenti non sono ancora attivi. Sto lavorando per abilitarli.', 'warn');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`GoalDrive ${PLAN_LABEL[target]}`}>
      <div className="flex flex-col gap-5">
        {feature && (
          <p className="text-[14px] leading-relaxed text-mute">
            <span className="font-semibold text-ink">{FEATURES[feature].name}</span> fa parte del piano{' '}
            {PLAN_LABEL[target]}. {FEATURES[feature].blurb}
          </p>
        )}

        <ul className="flex flex-col gap-2.5">
          {perks.map((f) => (
            <li key={f.key} className="flex items-start gap-2.5">
              <Sparkles size={14} className="mt-1 shrink-0 text-secondary" />
              <div>
                <div className="text-[14px] font-medium">{f.name}</div>
                <div className="text-[12.5px] leading-snug text-mute">{f.blurb}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2.5">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => void buy(o.id)}
              disabled={busy !== null}
              className="press card flex items-center justify-between p-4 disabled:opacity-50"
            >
              <div>
                <div className="text-[15px] font-semibold">
                  {o.period === 'year' ? 'Annuale' : 'Mensile'}
                </div>
                {o.saving && (
                  <div className="text-[12px] text-secondary">Risparmi il {o.saving}% sul mensile</div>
                )}
              </div>
              <div className="num text-[19px] font-bold">
                {o.amount.toFixed(2).replace('.', ',')} €
                <span className="ml-0.5 text-[12px] font-medium text-mute">
                  /{o.period === 'year' ? 'anno' : 'mese'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {!payments.available && (
          <p className="text-[12px] leading-relaxed text-mute">
            I pagamenti non sono ancora attivi: sto completando l’integrazione. Se vuoi provare le funzioni
            Premium prima del lancio, scrivimi e ti abilito l’account.
          </p>
        )}

        {plan !== 'FREE' && (
          <p className="text-[12px] text-mute">Il tuo piano attuale è {PLAN_LABEL[plan]}.</p>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Gancio comodo: apre lo sheet da qualunque punto                     */
/* ------------------------------------------------------------------ */

export function useUpgrade(feature?: FeatureKey) {
  const [open, setOpen] = useState(false);
  const node = <PaywallSheet open={open} onClose={() => setOpen(false)} feature={feature} />;
  return { open: () => setOpen(true), node };
}
