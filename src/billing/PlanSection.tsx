import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Card, SectionTitle } from '../components/ui';
import { useEntitlement } from './EntitlementProvider';
import { LockedRow, PaywallSheet } from './Paywall';
import { FEATURES, PLAN_LABEL, type FeatureKey } from './plans';
import { payments } from './subscription';
import { useStore } from '../store/AppStore';

/** Sezione "Il tuo piano" nel profilo: stato attuale e cosa manca. */
export function PlanSection() {
  const { plan, entitlement, can, limits } = useEntitlement();
  const { user, toast } = useStore();
  const [sheet, setSheet] = useState<FeatureKey | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const locked = (Object.keys(FEATURES) as FeatureKey[]).filter((k) => !can(k));
  const expiry =
    entitlement.end && !entitlement.isLifetime
      ? new Date(entitlement.end).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

  const manage = async () => {
    if (!user) return;
    try {
      window.location.href = await payments.openPortal(user.uid);
    } catch {
      toast('La gestione abbonamento non è ancora disponibile.', 'warn');
    }
  };

  return (
    <div>
      <SectionTitle>Il tuo piano</SectionTitle>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold tracking-tight">{PLAN_LABEL[plan]}</span>
              {plan !== 'FREE' && <Sparkles size={14} className="text-secondary" />}
            </div>
            <div className="mt-0.5 text-[12.5px] text-mute">
              {entitlement.isLifetime
                ? 'Attivo per sempre'
                : expiry
                  ? `Rinnovo il ${expiry}`
                  : plan === 'FREE'
                    ? `${limits.goals} obiettivo attivo`
                    : 'Attivo'}
            </div>
          </div>

          {plan === 'FREE' ? (
            <Button size="sm" onClick={() => { setSheet(undefined); setOpen(true); }}>
              Scopri Premium
            </Button>
          ) : (
            payments.available && (
              <Button size="sm" variant="outline" onClick={() => void manage()}>
                Gestisci
              </Button>
            )
          )}
        </div>

        {locked.length > 0 && (
          <div className="space-y-2 border-t border-line pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
              Non ancora sbloccate
            </div>
            {locked.map((k) => (
              <LockedRow key={k} feature={k} onOpen={() => { setSheet(k); setOpen(true); }} />
            ))}
          </div>
        )}
      </Card>

      <PaywallSheet open={open} onClose={() => setOpen(false)} feature={sheet} />
    </div>
  );
}
