import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { Button, Field, MoneyInput, Sheet } from './ui';
import { money, monthKey, monthLabel, todayISO, uid } from '../lib/format';
import { round2, splitByPercent, sum } from '../lib/finance';
import type { Tx } from '../types';

type Step = 'amount' | 'delta' | 'review';

export function SalaryAllocator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, txs, putTx, patch, toast } = useApp();
  const cats = state.categories;

  const month = monthKey(todayISO());
  const existing = useMemo(
    () => txs.find((t) => t.kind === 'salary' && monthKey(t.date) === month) ?? null,
    [txs, month],
  );

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  const [makeBaseline, setMakeBaseline] = useState(false);

  const baseline = state.salary.amount;
  const value = amount === '' ? 0 : Number(amount);
  const delta = round2(value - baseline);

  useEffect(() => {
    if (!open) return;
    setStep('amount');
    setAmount(existing ? existing.amount : baseline || '');
    setDate(existing?.date ?? todayISO());
    setAlloc(existing?.allocations ?? {});
    setMakeBaseline(false);
  }, [open, existing, baseline]);

  const assigned = round2(sum(Object.values(alloc)));
  const remainder = round2(value - assigned);

  const apply = (mode: 'proportional' | 'goal' | 'single' | 'manual', targetId?: string) => {
    if (mode === 'proportional') {
      setAlloc(splitByPercent(value, cats));
    } else if (mode === 'goal') {
      const base = splitByPercent(baseline, cats);
      const goalCats = cats.filter((c) => c.goal);
      const pool = goalCats.length ? goalCats : cats;
      const extra = splitByPercent(delta, pool);
      const next = { ...base };
      for (const [id, v] of Object.entries(extra)) next[id] = round2((next[id] ?? 0) + v);
      setAlloc(next);
    } else if (mode === 'single' && targetId) {
      const base = splitByPercent(baseline, cats);
      base[targetId] = round2((base[targetId] ?? 0) + delta);
      setAlloc(base);
    } else {
      setAlloc(splitByPercent(baseline, cats));
    }
    setStep('review');
  };

  const spreadRemainder = () => {
    const extra = splitByPercent(remainder, cats);
    setAlloc((prev) => {
      const next = { ...prev };
      for (const [id, v] of Object.entries(extra)) next[id] = round2((next[id] ?? 0) + v);
      return next;
    });
  };

  const save = () => {
    const tx: Tx = {
      id: existing?.id ?? uid(),
      type: 'income',
      kind: 'salary',
      amount: value,
      description: `Stipendio ${monthLabel(month, true)}`,
      date,
      categoryId: null,
      allocations: alloc,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    putTx(tx);
    patch({
      lastSalaryMonth: month,
      ...(makeBaseline ? { salary: { ...state.salary, amount: value } } : {}),
    });
    toast(`Stipendio di ${monthLabel(month, true)} registrato.`);
    onClose();
  };

  const title =
    step === 'amount' ? `Stipendio di ${monthLabel(month, true)}` : step === 'delta' ? 'Questo mese è diverso' : 'Ripartizione';

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {step === 'amount' && (
        <div className="space-y-5">
          <p className="text-[14px] leading-relaxed text-mute">
            {existing
              ? 'Hai già registrato lo stipendio di questo mese. Puoi correggere importo e ripartizione.'
              : `Di riferimento hai impostato ${money(baseline)}. Se questo mese è diverso, scrivi l’importo reale: penso io a ridistribuirlo.`}
          </p>

          <Field label="Importo accreditato">
            <MoneyInput value={amount} onChange={setAmount} autoFocus />
          </Field>

          <Field label="Data di accredito">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[16px] text-ink focus:border-primary/60 focus:outline-none"
            />
          </Field>

          <Button
            full
            size="lg"
            disabled={value <= 0}
            onClick={() => (Math.abs(delta) >= 1 && baseline > 0 ? setStep('delta') : apply('proportional'))}
          >
            Continua
          </Button>
        </div>
      )}

      {step === 'delta' && (
        <div className="space-y-4">
          <div
            className={`card flex items-center gap-3 p-4 ${
              delta > 0 ? 'border-primary/30 bg-primary/8' : 'border-danger/25 bg-danger/8'
            }`}
          >
            {delta > 0 ? (
              <TrendingUp className="text-secondary" size={22} />
            ) : (
              <TrendingDown className="text-danger" size={22} />
            )}
            <div>
              <div className="text-[15px] font-semibold">
                {delta > 0
                  ? `Questo mese hai ricevuto ${money(delta)} in più.`
                  : `Questo mese hai ricevuto ${money(-delta)} in meno.`}
              </div>
              <div className="text-[13px] text-mute">
                {delta > 0 ? 'Come vuoi distribuirli?' : 'Da dove vuoi toglierli?'}
              </div>
            </div>
          </div>

          <Choice
            title="Come sempre"
            body="Applico le tue percentuali all’importo reale. Tutte le categorie si muovono insieme."
            onClick={() => apply('proportional')}
          />

          {delta > 0 ? (
            <Choice
              title="Tutto sull’obiettivo"
              body={`Le altre categorie restano ai valori soliti, ${money(delta)} vanno su ${
                cats.filter((c) => c.goal).map((c) => c.name).join(', ') || 'obiettivo'
              }.`}
              highlight
              onClick={() => apply('goal')}
            />
          ) : (
            <div className="space-y-2">
              <div className="px-1 text-[13px] font-medium text-mute">Togli tutto da una categoria</div>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => apply('single', c.id)}
                    className="press flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px]"
                  >
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Choice title="Decido io" body="Apro la ripartizione e scrivo gli importi a mano." onClick={() => apply('manual')} />

          <button onClick={() => setStep('amount')} className="press flex items-center gap-2 pt-1 text-[14px] text-mute">
            <ArrowLeft size={16} /> Torna all’importo
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-[14px] text-mute">Totale da ripartire</span>
            <span className="num text-[20px] font-bold">{money(value, true)}</span>
          </div>

          <div className="space-y-2.5">
            {cats.map((c) => (
              <div key={c.id} className="card flex items-center gap-3 p-3.5">
                <span className="size-3 shrink-0 rounded-full" style={{ background: c.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{c.name}</div>
                  <div className="text-[12px] text-mute">
                    {value > 0 ? `${Math.round(((alloc[c.id] ?? 0) / value) * 100)}% dello stipendio` : `${c.percent}% previsto`}
                  </div>
                </div>
                <div className="w-32">
                  <MoneyInput
                    value={alloc[c.id] ?? 0}
                    onChange={(v) => setAlloc((prev) => ({ ...prev, [c.id]: v === '' ? 0 : Number(v) }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            className={`flex items-center justify-between rounded-2xl px-4 py-3 text-[14px] ${
              Math.abs(remainder) < 0.5 ? 'bg-primary/10 text-secondary' : 'bg-white/[0.05] text-mute'
            }`}
          >
            <span>{Math.abs(remainder) < 0.5 ? 'Tutto assegnato' : 'Ancora da assegnare'}</span>
            <span className="num font-semibold">{money(remainder, true)}</span>
          </div>

          {Math.abs(remainder) >= 0.5 && (
            <Button variant="ghost" full onClick={spreadRemainder}>
              Distribuisci il resto con le mie percentuali
            </Button>
          )}

          <button
            onClick={() => setMakeBaseline((v) => !v)}
            className="press flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                makeBaseline ? 'border-primary bg-primary text-black' : 'border-white/20'
              }`}
            >
              {makeBaseline && <Check size={14} strokeWidth={3} />}
            </span>
            <span className="text-[14px] leading-snug">
              Usa {money(value)} come nuovo stipendio di riferimento
              <span className="block text-[12px] text-mute">Cambia la base dei prossimi confronti mensili.</span>
            </span>
          </button>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep('amount')}>
              Indietro
            </Button>
            <Button full disabled={Math.abs(remainder) >= 0.5 || value <= 0} onClick={save}>
              Registra stipendio
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Choice({
  title,
  body,
  onClick,
  highlight,
}: {
  title: string;
  body: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`press w-full rounded-2xl border p-4 text-left ${
        highlight ? 'border-primary/45 bg-primary/10' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-2 text-[15px] font-semibold">
        {highlight && <Sparkles size={16} className="text-secondary" />}
        {title}
      </div>
      <div className="mt-1 text-[13px] leading-relaxed text-mute">{body}</div>
    </button>
  );
}
