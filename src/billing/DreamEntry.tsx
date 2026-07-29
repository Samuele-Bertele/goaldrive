import { Expand, Lock } from 'lucide-react';
import { useFeature } from './EntitlementProvider';
import { useUpgrade } from './Paywall';

/**
 * Entrata a Dream Mode dalla home. Se l'utente non ha il piano, il pulsante
 * resta visibile con un lucchetto: vedere la porta chiusa vale più che non
 * vedere la porta.
 */
export function DreamModeButton({ onOpen }: { onOpen: () => void }) {
  const { allowed } = useFeature('dream_mode');
  const upgrade = useUpgrade('dream_mode');

  return (
    <>
      <div className="px-5 pb-6">
        <button
          onClick={allowed ? onOpen : upgrade.open}
          className="press card flex w-full items-center gap-3 p-4"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/12 text-secondary">
            {allowed ? <Expand size={17} /> : <Lock size={15} />}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[14.5px] font-semibold">Dream Mode</div>
            <div className="truncate text-[12.5px] text-mute">
              {allowed ? 'Il tuo obiettivo a schermo intero' : 'Incluso nel piano Premium'}
            </div>
          </div>
        </button>
      </div>
      {upgrade.node}
    </>
  );
}
