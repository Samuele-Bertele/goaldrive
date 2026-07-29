import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { backend } from '../backend';
import type { AppState, Category, SessionUser, Tx } from '../types';
import { forecast as computeForecast, categoryBalances, totals as computeTotals } from '../lib/finance';
import { monthKey, todayISO, uid as newId } from '../lib/format';
import { runReminders } from '../lib/notifications';

export const CATEGORY_COLORS = [
  '#00C853',
  '#00E676',
  '#B9F6CA',
  '#00BFA5',
  '#40C4FF',
  '#7C4DFF',
  '#FFB300',
  '#FF7043',
  '#EC407A',
  '#8D9BA8',
];

export function defaultState(name: string, goalName: string): AppState {
  return {
    version: 1,
    onboarded: false,
    name,
    goal: { name: goalName, targetAmount: 0, deadline: todayISO() },
    startingBalance: 0,
    salary: { amount: 0, day: 27 },
    categories: [],
    goalSource: 'total',
    notifications: false,
  };
}

export function starterCategories(goalName: string): Category[] {
  return [
    { id: newId(), name: goalName || 'Obiettivo', color: CATEGORY_COLORS[0]!, percent: 50, goal: true },
    { id: newId(), name: 'Spese', color: CATEGORY_COLORS[9]!, percent: 30, goal: false },
    { id: newId(), name: 'Emergenza', color: CATEGORY_COLORS[4]!, percent: 10, goal: false },
    { id: newId(), name: 'Extra', color: CATEGORY_COLORS[6]!, percent: 10, goal: false },
  ];
}

type Toast = { id: string; text: string; tone: 'ok' | 'warn' };

interface Store {
  ready: boolean;
  user: SessionUser | null;
  state: AppState | null;
  txs: Tx[];
  toasts: Toast[];
  mode: 'firebase' | 'local';

  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  patch(partial: Partial<AppState>): void;
  init(state: AppState): void;
  putTx(tx: Tx): void;
  removeTx(id: string): void;
  wipe(): Promise<void>;
  toast(text: string, tone?: Toast['tone']): void;
  dismissToast(id: string): void;
}

const Ctx = createContext<Store | null>(null);

/** Firestore rifiuta i campi `undefined`: qui vengono rimossi in profondità. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remindersDone = useRef(false);

  useEffect(() => backend.onAuth((u) => {
    setUser(u);
    if (!u) {
      setState(null);
      setTxs([]);
    }
    setReady(true);
  }), []);

  useEffect(() => {
    if (!user) return;
    const offState = backend.subscribeState(user.uid, (s) => setState(s));
    const offTx = backend.subscribeTx(user.uid, (t) => setTxs(t));
    return () => {
      offState();
      offTx();
    };
  }, [user]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = newId();
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);

  const persist = useCallback(
    (next: AppState) => {
      if (!user) return;
      setState(next);
      void backend.saveState(user.uid, clean({ ...next, updatedAt: Date.now() })).catch(() =>
        toast('Modifiche non salvate: nessuna connessione.', 'warn'),
      );
    },
    [user, toast],
  );

  const patch = useCallback(
    (partial: Partial<AppState>) => {
      setState((prev) => {
        if (!prev || !user) return prev;
        const next = { ...prev, ...partial, updatedAt: Date.now() };
        void backend.saveState(user.uid, clean(next)).catch(() =>
          toast('Modifiche non salvate: nessuna connessione.', 'warn'),
        );
        return next;
      });
    },
    [user, toast],
  );

  const init = useCallback((s: AppState) => persist(s), [persist]);

  const putTx = useCallback(
    (tx: Tx) => {
      if (!user) return;
      setTxs((prev) => {
        const i = prev.findIndex((t) => t.id === tx.id);
        if (i < 0) return [...prev, tx];
        const copy = [...prev];
        copy[i] = tx;
        return copy;
      });
      void backend.putTx(user.uid, clean(tx)).catch(() => toast('Movimento non sincronizzato.', 'warn'));
    },
    [user, toast],
  );

  const removeTx = useCallback(
    (id: string) => {
      if (!user) return;
      setTxs((prev) => prev.filter((t) => t.id !== id));
      void backend.deleteTx(user.uid, id).catch(() => toast('Eliminazione non sincronizzata.', 'warn'));
    },
    [user, toast],
  );

  const wipe = useCallback(async () => {
    if (!user) return;
    await backend.wipe(user.uid);
    setState(null);
    setTxs([]);
  }, [user]);

  // Promemoria locali, una sola valutazione per avvio.
  useEffect(() => {
    if (!state?.onboarded || remindersDone.current) return;
    remindersDone.current = true;
    const f = computeForecast(state, txs);
    void runReminders(state, txs, f.progress);
  }, [state, txs]);

  const value = useMemo<Store>(
    () => ({
      ready,
      user,
      state,
      txs,
      toasts,
      mode: backend.mode,
      signIn: (e, p) => backend.signIn(e, p),
      signUp: (e, p) => backend.signUp(e, p),
      signOut: () => backend.signOut(),
      patch,
      init,
      putTx,
      removeTx,
      wipe,
      toast,
      dismissToast: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    }),
    [ready, user, state, txs, toasts, patch, init, putTx, removeTx, wipe, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore fuori da AppProvider');
  return ctx;
}

/** Stato garantito non nullo: usato dalle schermate interne all'app. */
export function useApp() {
  const store = useStore();
  const state = store.state!;
  const txs = store.txs;

  const totals = useMemo(() => computeTotals(state, txs), [state, txs]);
  const forecast = useMemo(() => computeForecast(state, txs), [state, txs]);
  const balances = useMemo(() => categoryBalances(state, txs), [state, txs]);
  const sorted = useMemo(
    () => [...txs].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)),
    [txs],
  );
  const salaryLoggedThisMonth = useMemo(
    () => txs.some((t) => t.kind === 'salary' && monthKey(t.date) === monthKey(todayISO())),
    [txs],
  );

  return { ...store, state, txs, sorted, totals, forecast, balances, salaryLoggedThisMonth };
}
