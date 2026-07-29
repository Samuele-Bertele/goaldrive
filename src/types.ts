export type ID = string;

export type IncomeKind = 'salary' | 'bonus' | 'gift' | 'sale' | 'other';

export interface Category {
  id: ID;
  name: string;
  color: string;
  /** quota dello stipendio assegnata automaticamente (0-100) */
  percent: number;
  /** se true il saldo di questa categoria alimenta l'obiettivo */
  goal: boolean;
}

export interface Goal {
  name: string;
  targetAmount: number;
  /** ISO yyyy-mm-dd */
  deadline: string;
  /** foto compressa in data-url */
  image?: string;
  /** true se in IndexedDB esiste un modello 3D per questo utente */
  model?: boolean;
  /** url remoto opzionale a un .glb */
  modelUrl?: string;
  /** colore dominante estratto dalla foto, usato per i glow */
  accent?: string;
}

export interface Salary {
  amount: number;
  /** giorno di accredito 1-28 */
  day: number;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  name: string;
  goal: Goal;
  startingBalance: number;
  salary: Salary;
  categories: Category[];
  /** come si calcola l'avanzamento: patrimonio totale o sole categorie obiettivo */
  goalSource: 'total' | 'categories';
  notifications: boolean;
  /** ultimo mese in cui è stato registrato lo stipendio, formato yyyy-mm */
  lastSalaryMonth?: string;
  updatedAt?: number;
}

export interface Tx {
  id: ID;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId?: ID | null;
  /** ISO yyyy-mm-dd */
  date: string;
  notes?: string;
  kind?: IncomeKind;
  /** ripartizione di un'entrata su più categorie (usata per lo stipendio) */
  allocations?: Record<ID, number>;
  createdAt: number;
}

export interface SessionUser {
  uid: string;
  email: string;
}
