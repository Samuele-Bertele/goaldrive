import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from '../backend';
import { useStore } from '../store/AppStore';
import {
  FREE_ENTITLEMENT,
  canAccess,
  checkAccess,
  effectivePlan,
  limits,
  withCodeOverrides,
  type AccessResult,
  type Entitlement,
} from './access';
import type { FeatureKey, Limits, Plan } from './plans';

interface EntitlementCtx {
  entitlement: Entitlement;
  plan: Plan;
  limits: Limits;
  /** true finché non sappiamo se l'utente ha un piano: evita il lampeggio del paywall */
  loading: boolean;
  can(key: FeatureKey): boolean;
  check(key: FeatureKey): AccessResult;
  isPaying: boolean;
}

const Ctx = createContext<EntitlementCtx | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { user } = useStore();
  const [remote, setRemote] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRemote(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const off = backend.subscribeEntitlement(user.uid, (e) => {
      setRemote(e);
      setLoading(false);
    });
    return off;
  }, [user]);

  const value = useMemo<EntitlementCtx>(() => {
    const base = remote ?? FREE_ENTITLEMENT;
    const entitlement = withCodeOverrides(user?.email, base);
    const plan = effectivePlan(entitlement);
    return {
      entitlement,
      plan,
      limits: limits(entitlement),
      loading,
      can: (key) => canAccess(entitlement, key),
      check: (key) => checkAccess(entitlement, key),
      isPaying: plan === 'PREMIUM' || plan === 'PRO',
    };
  }, [remote, user?.email, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlement(): EntitlementCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEntitlement fuori da EntitlementProvider');
  return ctx;
}

/** Scorciatoia per il caso più comune: una sola funzione da controllare. */
export function useFeature(key: FeatureKey) {
  const { check, loading } = useEntitlement();
  const result = check(key);
  return { allowed: result.ok, result, loading };
}
