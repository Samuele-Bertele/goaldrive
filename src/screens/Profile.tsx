import { useState } from 'react';
import {
  Bell,
  Check,
  Download,
  LogOut,
  Plus,
  Share,
  Smartphone,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useApp, CATEGORY_COLORS } from '../store/AppStore';
import { GoalImage } from '../components/GoalImage';
import { Button, Card, Field, Input, MoneyInput, SectionTitle, Sheet } from '../components/ui';
import { money, uid } from '../lib/format';
import { useInstall } from '../lib/install';
import { permission, requestPermission } from '../lib/notifications';
import type { Category } from '../types';
import { PlanSection } from '../billing/PlanSection';

export function Profile() {
  const { state, user, txs, balances, forecast, patch, signOut, wipe, toast, mode } = useApp();
  const install = useInstall();

  const [catSheet, setCatSheet] = useState(false);
  const [salarySheet, setSalarySheet] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [salaryAmount, setSalaryAmount] = useState<number | ''>(state.salary.amount);
  const [salaryDay, setSalaryDay] = useState(state.salary.day);

  const totalPercent = state.categories.reduce((a, c) => a + c.percent, 0);

  const toggleNotifications = async () => {
    if (state.notifications) {
      patch({ notifications: false });
      return;
    }
    const ok = await requestPermission();
    if (!ok) {
      toast('Il browser ha bloccato le notifiche. Attivale dalle impostazioni del sito.', 'warn');
      return;
    }
    patch({ notifications: true });
    toast('Promemoria attivi.');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ state, txs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goaldrive-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveCategory = (c: Category) => {
    const exists = state.categories.some((x) => x.id === c.id);
    patch({
      categories: exists ? state.categories.map((x) => (x.id === c.id ? c : x)) : [...state.categories, c],
    });
    setEditing(null);
  };

  const removeCategory = (id: string) => {
    patch({ categories: state.categories.filter((c) => c.id !== id) });
    setEditing(null);
    toast('Categoria rimossa. I movimenti restano, senza categoria.');
  };

  const normalize = () => {
    if (totalPercent === 0) return;
    const scaled = state.categories.map((c) => ({ ...c, percent: Math.round((c.percent / totalPercent) * 100) }));
    const diff = 100 - scaled.reduce((a, c) => a + c.percent, 0);
    if (scaled[0]) scaled[0].percent += diff;
    patch({ categories: scaled });
    toast('Percentuali riportate a 100%.');
  };

  return (
    <div className="pb-32">
      <GoalImage
        src={state.goal.image}
        variant="profile"
        progress={forecast.progress}
        accent={state.goal.accent}
        fallback={state.goal.name}
        className="h-52 w-full"
      >
        <div className="safe-top flex h-full flex-col justify-end px-6 pb-6">
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">{state.name}</h1>
          <p className="mt-1 text-[14px] text-white/60">{user?.email}</p>
        </div>
      </GoalImage>

      <div className="mx-auto max-w-lg space-y-6 px-4 pt-5">
        <PlanSection />

        <div>
          <SectionTitle
            action={
              <button onClick={() => setCatSheet(true)} className="press text-[13px] text-secondary">
                Gestisci
              </button>
            }
          >
            Categorie
          </SectionTitle>
          <Card className="space-y-3">
            {state.categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="size-3 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-[15px]">{c.name}</span>
                <span className="num text-[13px] text-mute">{c.percent}%</span>
                <span className="num w-24 text-right text-[15px] font-semibold">{money(balances[c.id] ?? 0)}</span>
              </div>
            ))}
            {totalPercent !== 100 && (
              <button onClick={normalize} className="press w-full rounded-2xl bg-white/[0.05] py-3 text-[13px] text-mute">
                Le percentuali sommano {totalPercent}%. Riportale a 100%.
              </button>
            )}
          </Card>
        </div>

        <div>
          <SectionTitle>Impostazioni</SectionTitle>
          <div className="space-y-2.5">
            <Row
              Icon={Wallet}
              title="Stipendio"
              body={
                state.salary.amount > 0
                  ? `${money(state.salary.amount)} il ${state.salary.day} di ogni mese`
                  : 'Non impostato'
              }
              onClick={() => {
                setSalaryAmount(state.salary.amount);
                setSalaryDay(state.salary.day);
                setSalarySheet(true);
              }}
            />

            <Row
              Icon={Bell}
              title="Promemoria"
              body={
                permission() === 'unsupported'
                  ? 'Non supportati da questo browser'
                  : state.notifications
                    ? 'Attivi: stipendio, spese e traguardi'
                    : 'Disattivati'
              }
              onClick={() => void toggleNotifications()}
              trailing={
                <span
                  className={`grid size-6 place-items-center rounded-full ${
                    state.notifications ? 'bg-primary text-black' : 'bg-white/8 text-mute'
                  }`}
                >
                  {state.notifications && <Check size={14} strokeWidth={3} />}
                </span>
              }
            />

            {!install.standalone && (
              <Row
                Icon={install.ios ? Share : Smartphone}
                title="Installa GoalDrive"
                body={
                  install.available
                    ? 'Aggiungila alla schermata home, si apre a tutto schermo'
                    : install.ios
                      ? 'Safari · Condividi · Aggiungi alla schermata Home'
                      : 'Usa il menu del browser · Installa app'
                }
                onClick={() => void install.install()}
              />
            )}

            <Row Icon={Download} title="Esporta i dati" body="Scarica tutto in un file JSON" onClick={exportData} />
          </div>
        </div>

        <div>
          <SectionTitle>Account</SectionTitle>
          <div className="space-y-2.5">
            <Row Icon={LogOut} title="Esci" body={mode === 'local' ? 'Dati salvati su questo dispositivo' : 'Sincronizzato con Firebase'} onClick={() => void signOut()} />
            <Row Icon={Trash2} title="Ricomincia da zero" body="Cancella obiettivo, categorie e movimenti" danger onClick={() => setConfirmReset(true)} />
          </div>
        </div>

        <p className="px-1 pb-4 text-center text-[12px] text-mute/70">GoalDrive · versione 1.0</p>
      </div>

      {/* Categorie */}
      <Sheet open={catSheet} onClose={() => setCatSheet(false)} title="Categorie">
        <div className="space-y-2.5">
          {state.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditing(c)}
              className="press card flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="size-3 rounded-full" style={{ background: c.color }} />
              <span className="flex-1 text-[15px]">{c.name}</span>
              {c.goal && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-secondary">obiettivo</span>}
              <span className="num text-[14px] text-mute">{c.percent}%</span>
            </button>
          ))}
          <Button
            variant="ghost"
            full
            onClick={() =>
              setEditing({
                id: uid(),
                name: '',
                color: CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length]!,
                percent: 0,
                goal: false,
              })
            }
          >
            <Plus size={17} /> Nuova categoria
          </Button>
          <p className="px-1 pt-2 text-[12px] leading-relaxed text-mute">
            Le percentuali decidono come si divide lo stipendio ogni mese. Le categorie marcate «obiettivo» sono quelle
            che fanno avanzare la barra, se hai scelto quel criterio.
          </p>
        </div>
      </Sheet>

      <CategorySheet
        category={editing}
        onClose={() => setEditing(null)}
        onSave={saveCategory}
        onDelete={removeCategory}
        deletable={state.categories.length > 1 && state.categories.some((c) => c.id === editing?.id)}
      />

      {/* Stipendio */}
      <Sheet open={salarySheet} onClose={() => setSalarySheet(false)} title="Stipendio">
        <div className="space-y-4">
          <Field label="Importo netto di riferimento" hint="È la base con cui confronto ogni mese l'accredito reale.">
            <MoneyInput value={salaryAmount} onChange={setSalaryAmount} />
          </Field>
          <Field label="Giorno di accredito">
            <Input
              type="number"
              min={1}
              max={28}
              value={salaryDay}
              onChange={(e) => setSalaryDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
            />
          </Field>
          <Button
            full
            size="lg"
            onClick={() => {
              patch({ salary: { amount: salaryAmount === '' ? 0 : Number(salaryAmount), day: salaryDay } });
              setSalarySheet(false);
              toast('Stipendio aggiornato.');
            }}
          >
            Salva
          </Button>
        </div>
      </Sheet>

      {/* Reset */}
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Ricominciare da zero?">
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed text-mute">
            Vengono cancellati obiettivo, categorie e tutti i movimenti. L'account resta attivo e ripartirai dal primo
            avvio. L'operazione non si annulla.
          </p>
          <Button
            variant="danger"
            full
            size="lg"
            onClick={async () => {
              await wipe();
              setConfirmReset(false);
            }}
          >
            Cancella tutto
          </Button>
          <Button variant="ghost" full onClick={() => setConfirmReset(false)}>
            Annulla
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Row({
  Icon,
  title,
  body,
  onClick,
  trailing,
  danger,
}: {
  Icon: typeof Bell;
  title: string;
  body: string;
  onClick: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button onClick={onClick} className="press card flex w-full items-center gap-3.5 p-4 text-left">
      <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${danger ? 'bg-danger/12 text-danger' : 'bg-white/6 text-secondary'}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${danger ? 'text-danger' : ''}`}>{title}</span>
        <span className="block truncate text-[13px] text-mute">{body}</span>
      </span>
      {trailing}
    </button>
  );
}

function CategorySheet({
  category,
  onClose,
  onSave,
  onDelete,
  deletable,
}: {
  category: Category | null;
  onClose: () => void;
  onSave: (c: Category) => void;
  onDelete: (id: string) => void;
  deletable: boolean;
}) {
  const [draft, setDraft] = useState<Category | null>(category);

  if (category && draft?.id !== category.id) setDraft(category);

  return (
    <Sheet open={Boolean(category)} onClose={onClose} title={draft?.name || 'Nuova categoria'}>
      {draft && (
        <div className="space-y-4">
          <Field label="Nome">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Vacanze" />
          </Field>

          <Field label="Quota dello stipendio">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={draft.percent}
                onChange={(e) => setDraft({ ...draft, percent: Number(e.target.value) })}
                className="flex-1 accent-[#00C853]"
              />
              <span className="num w-12 text-right text-[17px] font-bold">{draft.percent}%</span>
            </div>
          </Field>

          <Field label="Colore">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setDraft({ ...draft, color })}
                  aria-label={`Colore ${color}`}
                  className={`size-8 rounded-full transition ${draft.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#151515]' : ''}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </Field>

          <button
            onClick={() => setDraft({ ...draft, goal: !draft.goal })}
            className="press flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                draft.goal ? 'border-primary bg-primary text-black' : 'border-white/20'
              }`}
            >
              {draft.goal && <Check size={14} strokeWidth={3} />}
            </span>
            <span className="text-[14px] leading-snug">
              Questa categoria alimenta l'obiettivo
              <span className="block text-[12px] text-mute">Conta nell'avanzamento se scegli il criterio «solo obiettivo».</span>
            </span>
          </button>

          <div className="flex gap-3">
            {deletable && (
              <Button variant="danger" onClick={() => onDelete(draft.id)}>
                Elimina
              </Button>
            )}
            <Button full disabled={!draft.name.trim()} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>
              Salva
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
