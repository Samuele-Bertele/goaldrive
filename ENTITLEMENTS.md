# Piani, diritti e account speciali

## Dove vivono i diritti

Un solo documento per utente, fuori dai suoi dati:

```
entitlements/{uid}
```

Il client lo **legge** in tempo reale (`onSnapshot`) e non lo scrive mai: le
regole Firestore negano la scrittura a chiunque passi dal client. Si modifica da
console Firebase, Admin SDK o Cloud Function.

Campi:

```json
{
  "plan": "UNLIMITED",
  "isLifetime": true,
  "isAdmin": true,
  "customFeatures": ["ai_coach", "ai_3d_generator"],
  "start": 1735689600000,
  "end": null
}
```

- `plan` — `FREE` | `PREMIUM` | `PRO` | `UNLIMITED` | `ADMIN`
- `isLifetime` — ignora `end`
- `customFeatures` — singole funzioni concesse a prescindere dal piano
- `end` — epoch ms; superato, si torna a `FREE` senza cancellare nulla

## Sbloccare il tuo account (30 secondi)

1. Console Firebase → Firestore Database → **Avvia raccolta** → `entitlements`
2. ID documento: **il tuo uid** (lo trovi in Authentication → Users)
3. Campi: `plan` = `UNLIMITED` (string), `isLifetime` = `true` (boolean),
   `isAdmin` = `true` (boolean)
4. Salva. L'app si aggiorna da sola, senza ricaricare.

Stessa procedura per regalare Premium a un tester: `plan` = `PREMIUM`,
`isLifetime` = `true`.

## Provare i piani senza Firebase

In modalità locale (nessuna variabile `VITE_FIREBASE_*`), da console del browser:

```js
localStorage.setItem('gd:ent:' + '<uid>', JSON.stringify({ plan: 'PREMIUM' }));
```

Poi ricarica.

## Override da codice

`src/billing/access.ts` → `SPECIAL_ACCESS`:

```ts
export const SPECIAL_ACCESS: Record<string, Partial<Entitlement>> = {
  'tua@email.it': { plan: 'UNLIMITED', isLifetime: true, isAdmin: true },
};
```

**Non è sicurezza.** Gira nel browser: le email finiscono nel bundle pubblico e
chiunque può aggirare il controllo dai devtools. Serve solo per comodità in
sviluppo. Il confine vero è `entitlements/{uid}` più il controllo lato server
sulle funzioni a consumo.

## Come si controlla una funzione

Mai `if (plan === 'PREMIUM')` dentro una schermata. Sempre:

```tsx
const { allowed } = useFeature('dream_mode');
```

oppure, per mostrare l'anteprima sfocata con il lucchetto:

```tsx
<LockedPreview feature="advanced_analytics">
  <ScenarioChart />
</LockedPreview>
```

Aggiungere una funzione = una riga in `FEATURES` (`src/billing/plans.ts`).

## Cosa il gating client NON protegge

Dream Mode, analisi avanzata, obiettivi multipli e traguardi girano interamente
nel browser: un utente tecnico li sblocca in due minuti dai devtools. Va bene —
è la stessa situazione di quasi tutte le app freemium, e il costo per noi è zero.

Le funzioni a consumo (AI Coach, generazione 3D, immagini, Open Banking) sono
diverse: lì un abuso costa soldi veri. Quelle **devono** verificare
`entitlements/{uid}` lato server, dentro la Cloud Function, prima di chiamare
qualsiasi API a pagamento. Il controllo nel client serve solo a non mostrare il
pulsante.

## Pagamenti

`src/billing/subscription.ts` espone `PaymentService`. Oggi è
`UnavailablePaymentService`: lancia un errore esplicito invece di fingere un
acquisto. Quando ci sarà l'endpoint, basta impostare `VITE_BILLING_API` e
l'implementazione HTTP prende il posto senza toccare le schermate.

Flusso previsto:

```
client → POST /checkout → Stripe Checkout
Stripe → webhook → Admin SDK scrive entitlements/{uid}
client → onSnapshot → il piano cambia da solo
```
