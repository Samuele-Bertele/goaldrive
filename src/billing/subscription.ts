import type { PriceOption } from './plans';

/**
 * Confine verso il pagamento. Oggi non esiste un server, quindi i metodi
 * lanciano un errore esplicito invece di fingere un acquisto: meglio un
 * messaggio onesto che un finto "abbonato" che poi svanisce.
 *
 * Quando ci sarà Stripe, l'unica cosa da cambiare è l'implementazione di
 * `HttpPaymentService`, non le schermate.
 */
export interface PaymentService {
  available: boolean;
  /** apre il Checkout e ritorna l'url a cui mandare l'utente */
  startCheckout(price: PriceOption, uid: string, email: string): Promise<string>;
  /** apre il Customer Portal per disdire o cambiare metodo */
  openPortal(uid: string): Promise<string>;
}

export class UnavailablePaymentService implements PaymentService {
  available = false;
  async startCheckout(): Promise<string> {
    throw new Error('checkout-unavailable');
  }
  async openPortal(): Promise<string> {
    throw new Error('portal-unavailable');
  }
}

/**
 * Implementazione futura: parla con un endpoint nostro (Cloud Function o
 * Route Handler) che crea la sessione Stripe con la secret key. La secret key
 * non deve mai stare nel bundle.
 *
 * Flusso previsto:
 *   client → POST /checkout {priceId, uid} → Stripe Checkout
 *   Stripe → webhook → scrive `entitlements/{uid}` con Admin SDK
 *   client → onSnapshot su `entitlements/{uid}` → il piano si aggiorna da solo
 */
export class HttpPaymentService implements PaymentService {
  available = true;
  constructor(private baseUrl: string) {}

  async startCheckout(price: PriceOption, uid: string, email: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: price.stripePriceId ?? price.id, uid, email }),
    });
    if (!res.ok) throw new Error('checkout-failed');
    const { url } = (await res.json()) as { url: string };
    return url;
  }

  async openPortal(uid: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    if (!res.ok) throw new Error('portal-failed');
    const { url } = (await res.json()) as { url: string };
    return url;
  }
}

const apiUrl = import.meta.env.VITE_BILLING_API as string | undefined;

export const payments: PaymentService = apiUrl
  ? new HttpPaymentService(apiUrl)
  : new UnavailablePaymentService();
