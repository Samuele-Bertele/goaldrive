/**
 * Catalogo piani e matrice funzionalità.
 * Unica fonte di verità: né le schermate né i servizi devono contenere `if (plan === 'PREMIUM')`.
 */

export type Plan = 'FREE' | 'PREMIUM' | 'PRO' | 'UNLIMITED' | 'ADMIN';

export type FeatureKey =
  | 'dream_mode'
  | 'multiple_goals'
  | 'advanced_analytics'
  | 'gamification'
  | 'premium_profile'
  | 'ai_coach'
  | 'ai_3d_generator'
  | 'ai_image_generator'
  | 'widgets'
  | 'bank_sync';

export interface FeatureMeta {
  key: FeatureKey;
  name: string;
  blurb: string;
  /** piano minimo che sblocca la funzione */
  minPlan: Exclude<Plan, 'UNLIMITED' | 'ADMIN'>;
  /** true se il costo è a carico nostro (API a consumo): va verificata anche lato server */
  metered: boolean;
  /** funzione non ancora realizzata: si mostra come "in arrivo", non come lucchetto */
  soon?: boolean;
}

export const FEATURES: Record<FeatureKey, FeatureMeta> = {
  dream_mode: {
    key: 'dream_mode',
    name: 'Dream Mode',
    blurb: 'Il tuo obiettivo a schermo intero, che si mette a fuoco mentre risparmi.',
    minPlan: 'PREMIUM',
    metered: false,
  },
  multiple_goals: {
    key: 'multiple_goals',
    name: 'Obiettivi illimitati',
    blurb: 'Auto, casa, viaggio, investimenti: ognuno con foto, scadenza e analisi.',
    minPlan: 'PREMIUM',
    metered: false,
  },
  advanced_analytics: {
    key: 'advanced_analytics',
    name: 'Analisi avanzata',
    blurb: 'Scenari a confronto, patrimonio storico, simulazione "e se risparmiassi di più".',
    minPlan: 'PREMIUM',
    metered: false,
  },
  gamification: {
    key: 'gamification',
    name: 'Traguardi e streak',
    blurb: 'Badge, livelli e mesi consecutivi in attivo.',
    minPlan: 'PREMIUM',
    metered: false,
  },
  premium_profile: {
    key: 'premium_profile',
    name: 'Profilo esteso',
    blurb: 'Storico obiettivi, statistiche personali, traguardi raccolti.',
    minPlan: 'PREMIUM',
    metered: false,
  },
  ai_coach: {
    key: 'ai_coach',
    name: 'AI Coach',
    blurb: 'Legge entrate, spese e ritmo e ti dice cosa cambiare questo mese.',
    minPlan: 'PREMIUM',
    metered: true,
  },
  ai_3d_generator: {
    key: 'ai_3d_generator',
    name: 'Oggetto 3D',
    blurb: 'Dalla foto del tuo obiettivo a un modello che puoi ruotare.',
    minPlan: 'PRO',
    metered: true,
    soon: true,
  },
  ai_image_generator: {
    key: 'ai_image_generator',
    name: 'Wallpaper generati',
    blurb: 'Sfondi e poster del tuo obiettivo, per telefono e desktop.',
    minPlan: 'PRO',
    metered: true,
    soon: true,
  },
  widgets: {
    key: 'widgets',
    name: 'Widget',
    blurb: 'Il progresso sulla home del telefono, senza aprire l’app.',
    minPlan: 'PREMIUM',
    metered: false,
    soon: true,
  },
  bank_sync: {
    key: 'bank_sync',
    name: 'Collegamento banca',
    blurb: 'Movimenti importati in automatico via Open Banking.',
    minPlan: 'PRO',
    metered: true,
    soon: true,
  },
};

/** Ordine di potenza. Serve per "il piano X include tutto ciò che include Y". */
const RANK: Record<Plan, number> = { FREE: 0, PREMIUM: 1, PRO: 2, UNLIMITED: 3, ADMIN: 4 };

export function planIncludes(plan: Plan, minPlan: Plan): boolean {
  return RANK[plan] >= RANK[minPlan];
}

export interface Limits {
  /** numero massimo di obiettivi attivi */
  goals: number;
  /** richieste AI Coach al mese (Infinity = illimitate) */
  coachPerMonth: number;
}

export const LIMITS: Record<Plan, Limits> = {
  FREE: { goals: 1, coachPerMonth: 0 },
  PREMIUM: { goals: Infinity, coachPerMonth: 30 },
  PRO: { goals: Infinity, coachPerMonth: Infinity },
  UNLIMITED: { goals: Infinity, coachPerMonth: Infinity },
  ADMIN: { goals: Infinity, coachPerMonth: Infinity },
};

export interface PriceOption {
  id: string;
  plan: Exclude<Plan, 'FREE' | 'UNLIMITED' | 'ADMIN'>;
  period: 'month' | 'year';
  amount: number;
  /** risparmio percentuale rispetto al mensile, per il badge */
  saving?: number;
  /** price id di Stripe, popolato quando il pagamento sarà attivo */
  stripePriceId?: string;
}

export const PRICES: PriceOption[] = [
  { id: 'premium_monthly', plan: 'PREMIUM', period: 'month', amount: 4.99 },
  { id: 'premium_yearly', plan: 'PREMIUM', period: 'year', amount: 39.99, saving: 33 },
  { id: 'pro_monthly', plan: 'PRO', period: 'month', amount: 9.99 },
];

export const PLAN_LABEL: Record<Plan, string> = {
  FREE: 'Gratuito',
  PREMIUM: 'Premium',
  PRO: 'Pro',
  UNLIMITED: 'Unlimited',
  ADMIN: 'Admin',
};
