import type { AppState, SessionUser, Tx } from '../types';
import type { Entitlement } from '../billing/access';
import { localBackend } from './local';
import { firebaseBackend, hasFirebaseConfig } from './firebase';

export type Unsubscribe = () => void;

export interface Backend {
  mode: 'firebase' | 'local';
  onAuth(cb: (user: SessionUser | null) => void): Unsubscribe;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  subscribeState(uid: string, cb: (state: AppState | null) => void): Unsubscribe;
  saveState(uid: string, state: AppState): Promise<void>;
  subscribeTx(uid: string, cb: (txs: Tx[]) => void): Unsubscribe;
  /** Diritti dell'account: sola lettura dal client, si scrive solo lato server. */
  subscribeEntitlement(uid: string, cb: (e: Entitlement | null) => void): Unsubscribe;
  putTx(uid: string, tx: Tx): Promise<void>;
  deleteTx(uid: string, id: string): Promise<void>;
  wipe(uid: string): Promise<void>;
}

export const backend: Backend = hasFirebaseConfig ? firebaseBackend() : localBackend();

/** Traduce gli errori tecnici in frasi che l'utente può usare. */
export function authError(err: unknown): string {
  const code = String((err as { code?: string })?.code ?? err ?? '');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Email o password non corrette.';
  if (code.includes('email-already-in-use')) return 'Esiste già un account con questa email. Accedi.';
  if (code.includes('invalid-email')) return 'Controlla il formato dell’email.';
  if (code.includes('weak-password')) return 'La password deve avere almeno 6 caratteri.';
  if (code.includes('too-many-requests')) return 'Troppi tentativi. Riprova fra qualche minuto.';
  if (code.includes('network')) return 'Nessuna connessione. Riprova quando torni online.';
  return 'Qualcosa non ha funzionato. Riprova.';
}
