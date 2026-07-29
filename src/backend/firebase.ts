import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { AppState, SessionUser, Tx } from '../types';
import type { Backend } from './index';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Boolean(config.apiKey && config.projectId && config.appId);

export function firebaseBackend(): Backend {
  let app: FirebaseApp | null = null;
  let auth: Auth | null = null;
  let db: Firestore | null = null;

  const init = () => {
    if (!app) {
      app = initializeApp(config as Record<string, string>);
      auth = getAuth(app);
      db = getFirestore(app);
      // "Resta connesso" è il comportamento predefinito: la sessione sopravvive alla chiusura.
      void setPersistence(auth, browserLocalPersistence);
    }
    return { auth: auth!, db: db! };
  };

  const stateDoc = (uid: string) => doc(init().db, 'users', uid);
  const txCol = (uid: string) => collection(init().db, 'users', uid, 'transactions');

  return {
    mode: 'firebase',

    onAuth(cb) {
      return onAuthStateChanged(init().auth, (u) => {
        cb(u ? ({ uid: u.uid, email: u.email ?? '' } satisfies SessionUser) : null);
      });
    },

    async signUp(email, password) {
      await createUserWithEmailAndPassword(init().auth, email.trim(), password);
    },

    async signIn(email, password) {
      await signInWithEmailAndPassword(init().auth, email.trim(), password);
    },

    async signOut() {
      await fbSignOut(init().auth);
    },

    subscribeState(uid, cb) {
      return onSnapshot(
        stateDoc(uid),
        (snap) => cb(snap.exists() ? (snap.data() as AppState) : null),
        () => cb(null),
      );
    },

    async saveState(uid, state) {
      await setDoc(stateDoc(uid), state, { merge: false });
    },

    subscribeTx(uid, cb) {
      return onSnapshot(
        txCol(uid),
        (snap) => cb(snap.docs.map((d) => d.data() as Tx)),
        () => cb([]),
      );
    },

    async putTx(uid, tx) {
      await setDoc(doc(txCol(uid), tx.id), tx);
    },

    async deleteTx(uid, id) {
      await deleteDoc(doc(txCol(uid), id));
    },

    async wipe(uid) {
      const snap = await getDocs(txCol(uid));
      const batch = writeBatch(init().db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(stateDoc(uid));
      await batch.commit();
    },
  };
}
