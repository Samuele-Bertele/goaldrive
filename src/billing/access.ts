import { FEATURES, LIMITS, planIncludes, type FeatureKey, type Limits, type Plan } from './plans';

/**
 * Diritti di un account. Vive in `entitlements/{uid}`: documento che il client
 * può LEGGERE ma non SCRIVERE (vedi firestore.rules). L'unico modo per cambiarlo
 * è la console Firebase, l'Admin SDK o una Cloud Function.
 */
export interface Entitlement {
  plan: Plan;
  /** valido per sempre: ignora `end` */
  isLifetime: boolean;
  isAdmin: boolean;
  /** singole funzioni concesse a prescindere dal piano */
  customFeatures: FeatureKey[];
  /** epoch ms */
  start?: number;
  /** epoch ms; assente = nessuna scadenza */
  end?: number;
  /** da dove arriva questo diritto, utile in debug e nel profilo */
  source: 'default' | 'remote' | 'code';
}

export const FREE_ENTITLEMENT: Entitlement = {
  plan: 'FREE',
  isLifetime: false,
  isAdmin: false,
  customFeatures: [],
  source: 'default',
};

/**
 * Override da codice.
 *
 * ATTENZIONE — questo NON è un meccanismo di sicurezza: gira nel browser, quindi
 * chiunque legga il bundle vede queste email e chiunque usi i devtools può
 * aggirare il controllo. Serve solo per comodità in sviluppo e per gli account
 * di test. I diritti veri stanno in `entitlements/{uid}` su Firestore, e le
 * funzioni a consumo (AI, 3D) vanno ricontrollate lato server prima di spendere.
 *
 * Le email si confrontano in minuscolo.
 */
export const SPECIAL_ACCESS: Record<string, Partial<Entitlement>> = {
  // 'tua@email.it': { plan: 'UNLIMITED', isLifetime: true, isAdmin: true },
  // 'tester@email.it': { plan: 'PREMIUM', isLifetime: true },
};

/** Applica gli override da codice sopra ai diritti remoti. */
export function withCodeOverrides(email: string | undefined, base: Entitlement): Entitlement {
  if (!email) return base;
  const patch = SPECIAL_ACCESS[email.toLowerCase()];
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    customFeatures: [...base.customFeatures, ...(patch.customFeatures ?? [])],
    source: 'code',
  };
}

export function isExpired(e: Entitlement, now = Date.now()): boolean {
  if (e.isLifetime) return false;
  if (e.end === undefined) return false;
  return now > e.end;
}

/** Il piano realmente in vigore: se l'abbonamento è scaduto si torna a FREE. */
export function effectivePlan(e: Entitlement, now = Date.now()): Plan {
  return isExpired(e, now) ? 'FREE' : e.plan;
}

export type AccessResult =
  | { ok: true }
  | { ok: false; reason: 'plan'; minPlan: Plan }
  | { ok: false; reason: 'expired'; minPlan: Plan }
  | { ok: false; reason: 'soon' };

/**
 * Servizio centralizzato di accesso. Nessuna schermata deve confrontare i piani
 * a mano: si passa sempre da qui.
 */
export function checkAccess(e: Entitlement, key: FeatureKey, now = Date.now()): AccessResult {
  const meta = FEATURES[key];
  if (meta.soon) return { ok: false, reason: 'soon' };

  // Un override puntuale batte il piano, ma non la scadenza.
  const granted = e.customFeatures.includes(key);
  if (granted && !isExpired(e, now)) return { ok: true };

  const plan = effectivePlan(e, now);
  if (planIncludes(plan, meta.minPlan)) return { ok: true };
  if (isExpired(e, now) && planIncludes(e.plan, meta.minPlan))
    return { ok: false, reason: 'expired', minPlan: meta.minPlan };
  return { ok: false, reason: 'plan', minPlan: meta.minPlan };
}

export function canAccess(e: Entitlement, key: FeatureKey, now = Date.now()): boolean {
  return checkAccess(e, key, now).ok;
}

export function limits(e: Entitlement, now = Date.now()): Limits {
  return LIMITS[effectivePlan(e, now)];
}

/** Normalizza un documento remoto, che potrebbe arrivare parziale o sporco. */
export function parseEntitlement(raw: unknown): Entitlement {
  const d = (raw ?? {}) as Record<string, unknown>;
  const plan = (['FREE', 'PREMIUM', 'PRO', 'UNLIMITED', 'ADMIN'] as const).includes(d.plan as Plan)
    ? (d.plan as Plan)
    : 'FREE';
  const custom = Array.isArray(d.customFeatures)
    ? (d.customFeatures.filter((k): k is FeatureKey => typeof k === 'string' && k in FEATURES))
    : [];
  return {
    plan,
    isLifetime: d.isLifetime === true,
    isAdmin: d.isAdmin === true,
    customFeatures: custom,
    start: typeof d.start === 'number' ? d.start : undefined,
    end: typeof d.end === 'number' ? d.end : undefined,
    source: 'remote',
  };
}
