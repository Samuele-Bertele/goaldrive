import type { AppState, SessionUser, Tx } from '../types';
import type { Backend, Unsubscribe } from './index';
import { parseEntitlement } from '../billing/access';

const K = {
  users: 'goaldrive:users',
  session: 'goaldrive:session',
  state: (uid: string) => `goaldrive:state:${uid}`,
  txs: (uid: string) => `goaldrive:txs:${uid}`,
};

type StoredUser = { uid: string; email: string; hash: string };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function hash(password: string): Promise<string> {
  const data = new TextEncoder().encode('goaldrive::' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function localBackend(): Backend {
  const authListeners = new Set<(u: SessionUser | null) => void>();
  const stateListeners = new Map<string, Set<(s: AppState | null) => void>>();
  const txListeners = new Map<string, Set<(t: Tx[]) => void>>();

  const emitAuth = () => {
    const s = read<SessionUser | null>(K.session, null);
    authListeners.forEach((cb) => cb(s));
  };
  const emitState = (uid: string) => {
    const s = read<AppState | null>(K.state(uid), null);
    stateListeners.get(uid)?.forEach((cb) => cb(s));
  };
  const emitTx = (uid: string) => {
    const t = read<Tx[]>(K.txs(uid), []);
    txListeners.get(uid)?.forEach((cb) => cb(t));
  };

  return {
    mode: 'local',

    onAuth(cb) {
      authListeners.add(cb);
      queueMicrotask(() => cb(read<SessionUser | null>(K.session, null)));
      return () => authListeners.delete(cb) as unknown as void;
    },

    async signUp(email, password) {
      const users = read<StoredUser[]>(K.users, []);
      const normalized = email.trim().toLowerCase();
      if (users.some((u) => u.email === normalized)) throw { code: 'auth/email-already-in-use' };
      if (password.length < 6) throw { code: 'auth/weak-password' };
      const user: StoredUser = { uid: 'u_' + crypto.randomUUID().slice(0, 12), email: normalized, hash: await hash(password) };
      write(K.users, [...users, user]);
      write(K.session, { uid: user.uid, email: user.email });
      emitAuth();
    },

    async signIn(email, password) {
      const users = read<StoredUser[]>(K.users, []);
      const normalized = email.trim().toLowerCase();
      const user = users.find((u) => u.email === normalized);
      if (!user || user.hash !== (await hash(password))) throw { code: 'auth/invalid-credential' };
      write(K.session, { uid: user.uid, email: user.email });
      emitAuth();
    },

    async signOut() {
      localStorage.removeItem(K.session);
      emitAuth();
    },

    subscribeState(uid, cb): Unsubscribe {
      if (!stateListeners.has(uid)) stateListeners.set(uid, new Set());
      stateListeners.get(uid)!.add(cb);
      queueMicrotask(() => cb(read<AppState | null>(K.state(uid), null)));
      return () => stateListeners.get(uid)?.delete(cb) as unknown as void;
    },

    async saveState(uid, state) {
      write(K.state(uid), state);
      emitState(uid);
    },

    subscribeTx(uid, cb): Unsubscribe {
      if (!txListeners.has(uid)) txListeners.set(uid, new Set());
      txListeners.get(uid)!.add(cb);
      queueMicrotask(() => cb(read<Tx[]>(K.txs(uid), [])));
      return () => txListeners.get(uid)?.delete(cb) as unknown as void;
    },

    subscribeEntitlement(uid, cb): Unsubscribe {
      // In modalità locale i diritti si simulano da localStorage:
      //   localStorage.setItem('gd:ent:' + uid, JSON.stringify({ plan: 'PREMIUM' }))
      queueMicrotask(() => {
        const raw = localStorage.getItem('gd:ent:' + uid);
        if (!raw) return cb(null);
        try {
          cb(parseEntitlement(JSON.parse(raw)));
        } catch {
          cb(null);
        }
      });
      return () => {};
    },

    async putTx(uid, tx) {
      const list = read<Tx[]>(K.txs(uid), []);
      const i = list.findIndex((t) => t.id === tx.id);
      if (i >= 0) list[i] = tx;
      else list.push(tx);
      write(K.txs(uid), list);
      emitTx(uid);
    },

    async deleteTx(uid, id) {
      write(
        K.txs(uid),
        read<Tx[]>(K.txs(uid), []).filter((t) => t.id !== id),
      );
      emitTx(uid);
    },

    async wipe(uid) {
      localStorage.removeItem(K.state(uid));
      localStorage.removeItem(K.txs(uid));
      emitState(uid);
      emitTx(uid);
    },
  };
}
