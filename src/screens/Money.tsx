import { useMemo, useState } from 'react';
import { Banknote, Search } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { GoalImage } from '../components/GoalImage';
import { Button, Card, Chip, Empty, Segmented, inputClass } from '../components/ui';
import { money, monthKey, monthLabel, shortDate, todayISO } from '../lib/format';
import type { Tx } from '../types';

export function Money({ onEdit, onSalary }: { onEdit: (tx: Tx) => void; onSalary: () => void }) {
  const { state, sorted, forecast, salaryLoggedThisMonth } = useApp();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      sorted.filter((t) => {
        if (filter !== 'all' && t.type !== filter) return false;
        if (category && t.categoryId !== category) return false;
        if (query && !`${t.description} ${t.notes ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [sorted, filter, category, query],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const t of filtered) {
      const k = monthKey(t.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  const thisMonth = monthKey(todayISO());
  const monthTxs = sorted.filter((t) => monthKey(t.date) === thisMonth);
  const income = monthTxs.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = monthTxs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  return (
    <div className="pb-32">
      <GoalImage
        src={state.goal.image}
        variant="money"
        progress={forecast.progress}
        accent={state.goal.accent}
        fallback={state.goal.name}
        overlay="strong"
        className="h-56 w-full"
      >
        <div className="safe-top flex h-full flex-col justify-end px-6 pb-6">
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Movimenti</h1>
          <p className="mt-1 text-[14px] text-white/60">
            {monthLabel(thisMonth, true)} · {money(income - expense)} risparmiati finora
          </p>
        </div>
      </GoalImage>

      <div className="mx-auto max-w-lg space-y-5 px-4 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mute">Entrate del mese</p>
            <p className="num mt-1.5 text-[21px] font-bold text-secondary">{money(income)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mute">Spese del mese</p>
            <p className="num mt-1.5 text-[21px] font-bold">{money(expense)}</p>
          </div>
        </div>

        {!salaryLoggedThisMonth && state.salary.amount > 0 && (
          <Card className="flex items-center gap-3">
            <Banknote size={20} className="shrink-0 text-secondary" />
            <p className="flex-1 text-[14px]">Lo stipendio di questo mese non è ancora registrato.</p>
            <Button size="sm" variant="ghost" onClick={onSalary}>
              Aggiungi
            </Button>
          </Card>
        )}

        <div className="space-y-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tutti' },
              { value: 'income', label: 'Entrate' },
              { value: 'expense', label: 'Spese' },
            ]}
          />

          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca una descrizione"
              className={`${inputClass} pl-11 text-[15px]`}
            />
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip active={category === null} onClick={() => setCategory(null)}>
              Tutte
            </Chip>
            {state.categories.map((c) => (
              <Chip key={c.id} color={c.color} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        {groups.length === 0 ? (
          <Empty
            title="Nessun movimento qui"
            body="Cambia i filtri oppure registra il primo movimento con il pulsante verde."
          />
        ) : (
          groups.map(([key, list]) => (
            <div key={key}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-mute">{monthLabel(key, true)}</h2>
                <span className="num text-[13px] text-mute">
                  {money(list.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0))}
                </span>
              </div>
              <div className="space-y-2">
                {list.map((t) => {
                  const cat = state.categories.find((c) => c.id === t.categoryId);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onEdit(t)}
                      className="card press flex w-full items-center gap-3 p-3.5 text-left"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: cat?.color ?? (t.type === 'income' ? '#00E676' : '#5B5B5B') }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{t.description}</p>
                        <p className="truncate text-[12px] text-mute">
                          {shortDate(t.date)} · {cat?.name ?? (t.kind === 'salary' ? 'Ripartito sulle categorie' : 'Senza categoria')}
                          {t.notes ? ` · ${t.notes}` : ''}
                        </p>
                      </div>
                      <span className={`num text-[15px] font-semibold ${t.type === 'income' ? 'text-secondary' : ''}`}>
                        {t.type === 'income' ? '+' : '−'} {money(t.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
