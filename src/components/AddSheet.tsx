import { useEffect, useState } from 'react';
import { Banknote, Gift, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { Button, Chip, Field, Input, MoneyInput, Segmented, Sheet } from './ui';
import { todayISO, uid } from '../lib/format';
import type { IncomeKind, Tx } from '../types';

const INCOME_KINDS: { value: IncomeKind; label: string; Icon: typeof Gift }[] = [
  { value: 'salary', label: 'Stipendio', Icon: Banknote },
  { value: 'bonus', label: 'Bonus', Icon: Sparkles },
  { value: 'gift', label: 'Regalo', Icon: Gift },
  { value: 'sale', label: 'Vendita', Icon: ShoppingBag },
  { value: 'other', label: 'Altro', Icon: Tag },
];

export function AddSheet({
  open,
  onClose,
  onSalary,
  edit,
}: {
  open: boolean;
  onClose: () => void;
  onSalary: () => void;
  edit?: Tx | null;
}) {
  const { state, putTx, removeTx, toast } = useApp();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [kind, setKind] = useState<IncomeKind>('bonus');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setType(edit.type);
      setAmount(edit.amount);
      setDescription(edit.description);
      setCategoryId(edit.categoryId ?? null);
      setKind(edit.kind ?? 'other');
      setDate(edit.date);
      setNotes(edit.notes ?? '');
    } else {
      setType('expense');
      setAmount('');
      setDescription('');
      setCategoryId(state.categories.find((c) => !c.goal)?.id ?? state.categories[0]?.id ?? null);
      setKind('bonus');
      setDate(todayISO());
      setNotes('');
    }
  }, [open, edit, state.categories]);

  const valid = amount !== '' && Number(amount) > 0 && description.trim().length > 0;

  const save = () => {
    if (!valid) return;
    const tx: Tx = {
      id: edit?.id ?? uid(),
      type,
      amount: Number(amount),
      description: description.trim(),
      categoryId,
      date,
      notes: notes.trim() || undefined,
      kind: type === 'income' ? kind : undefined,
      allocations: edit?.allocations,
      createdAt: edit?.createdAt ?? Date.now(),
    };
    putTx(tx);
    toast(type === 'expense' ? 'Spesa registrata.' : 'Entrata registrata.');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Modifica movimento' : 'Nuovo movimento'}>
      <div className="space-y-5">
        {!edit && (
          <Segmented
            value={type}
            onChange={(v) => setType(v)}
            options={[
              { value: 'expense', label: 'Spesa' },
              { value: 'income', label: 'Entrata' },
            ]}
          />
        )}

        <Field label="Importo">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>

        <Field label="Descrizione">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'expense' ? 'Spesa al supermercato' : 'Vendita bici'}
          />
        </Field>

        {type === 'income' && (
          <Field label="Tipo di entrata">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {INCOME_KINDS.map(({ value, label }) => (
                <Chip
                  key={value}
                  active={kind === value}
                  onClick={() => {
                    if (value === 'salary') {
                      onClose();
                      onSalary();
                      return;
                    }
                    setKind(value);
                  }}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Field>
        )}

        <Field
          label="Categoria"
          hint={
            type === 'income'
              ? 'L’entrata viene accreditata alla categoria scelta.'
              : 'La spesa viene scalata dal saldo della categoria.'
          }
        >
          <div className="-mx-1 flex flex-wrap gap-2 px-1">
            {state.categories.map((c) => (
              <Chip key={c.id} color={c.color} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                {c.name}
              </Chip>
            ))}
            <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
              Nessuna
            </Chip>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Note">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Facoltative" />
          </Field>
        </div>

        <div className="flex gap-3 pt-1">
          {edit && (
            <Button
              variant="danger"
              onClick={() => {
                removeTx(edit.id);
                toast('Movimento eliminato.');
                onClose();
              }}
            >
              Elimina
            </Button>
          )}
          <Button full disabled={!valid} onClick={save}>
            {edit ? 'Salva modifiche' : 'Registra'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
