# GoalDrive

Un'app di risparmio in cui il protagonista non è il denaro, ma la cosa che vuoi comprare.

PWA installabile da browser (Android, iOS, desktop), pensata per smartphone, con dati sincronizzati
via Firebase oppure tenuti in locale.

---

## Avvio rapido

```bash
npm install
npm run dev
```

Si apre su `http://localhost:5173`. **Senza configurare niente** l'app parte in *modalità locale*:
account e dati restano su questo dispositivo (localStorage). Funziona tutto, non serve internet.

```bash
npm run build      # build di produzione in dist/
npm run preview    # serve dist/ per provare la PWA installabile
npm run typecheck  # solo controllo dei tipi
```

Il service worker è attivo solo nella build, non in `dev`: per provare installazione e offline usa
`npm run build && npm run preview`.

---

## Collegare Firebase (sincronizzazione fra dispositivi)

1. Crea un progetto su [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method → Email/Password**: attivalo. Lascia disattivata la verifica email.
3. **Firestore Database**: crea il database in modalità produzione.
4. **Impostazioni progetto → Le tue app → Web**: registra un'app e copia i valori di configurazione.
5. Copia `.env.example` in `.env` e incolla i valori.

```bash
cp .env.example .env
```

Al riavvio l'app rileva la configurazione da sola e passa a Firebase. Nessun'altra modifica al codice.

### Regole Firestore

Ogni utente vede solo i propri documenti. Incolla queste regole in **Firestore → Regole**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /transactions/{txId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

### Struttura dei dati

```
users/{uid}                     → profilo, obiettivo, categorie, stipendio, impostazioni
users/{uid}/transactions/{id}   → un documento per movimento
```

Le transazioni stanno in una sottocollezione, non nel documento principale: così non si sbatte mai
contro il limite di 1 MB per documento, per quante spese registri.

---

## Pubblicare

**Netlify / Vercel** — build `npm run build`, cartella `dist`. Ricordati di impostare le variabili
`VITE_FIREBASE_*` nel pannello del servizio, altrimenti la build finisce in modalità locale.

**GitHub Pages** — serve la sottocartella nel percorso:

```bash
BASE=/goaldrive/ npm run build
```

`base` viene propagato a `manifest.webmanifest`, al service worker e agli asset.

**Domini autorizzati** — in Firebase, `Authentication → Settings → Domini autorizzati`, aggiungi il
dominio di produzione o il login verrà rifiutato.

---

## Come è fatta

```
src/
  backend/          autenticazione e persistenza dietro un'unica interfaccia
    index.ts        sceglie l'implementazione, traduce gli errori in italiano
    firebase.ts     Firebase Auth + Firestore in tempo reale
    local.ts        localStorage, stessa interfaccia, password con hash SHA-256
  lib/
    finance.ts      saldi, serie storiche, statistiche, scenari, proiezioni
    format.ts       valuta, date, durate in italiano
    image.ts        compressione foto, colore dominante, ritagli per schermata
    idb.ts          IndexedDB per il modello 3D
    install.ts      prompt di installazione PWA
    notifications.ts promemoria locali
  store/AppStore.tsx  stato globale, azioni, valori derivati
  components/       UI riutilizzabile, sheet stipendio, navigazione
  screens/          Auth, Onboarding, Home, Movimenti, Analisi, Previsioni, Obiettivo, Profilo
```

Il backend è astratto dietro un'interfaccia unica: le schermate non sanno se stanno parlando con
Firestore o con localStorage.

---

## Le decisioni non ovvie

**La foto si svela.** Non è uno sfondo: parte sfocata e desaturata e diventa nitida man mano che il
saldo cresce. A 0% il sogno è un'idea confusa, a 100% lo vedi com'è. Ogni schermata inquadra un
ritaglio diverso della stessa immagine (`lib/image.ts → VARIANTS`), così l'obiettivo è sempre
riconoscibile senza diventare ripetitivo. Il colore dominante della foto viene estratto e usato per i
bagliori: ogni utente ha un'app leggermente diversa.

**Le previsioni sono oneste.** La media è pesata sulla recenza (gli ultimi mesi contano di più) e
calcolata solo sui mesi chiusi. Gli scenari ottimistico e prudente si aprono di una deviazione
standard: se il tuo risparmio è regolare le tre curve stanno vicine, se è ballerino si allargano.
Finché non c'è un mese completo l'app lo dice invece di inventare una data.

**Tre fasce di verdetto**, non due: *in ritardo* sotto la data, *in linea* con meno di 2,5 mesi di
margine, *in anticipo* oltre. La fascia centrale evita di dire «sei in anticipo» per due settimane di
scarto, che è rumore statistico.

**Lo stipendio è un caso a parte.** Quando l'accredito differisce dal riferimento compare una
schermata dedicata: distribuire come sempre, mandare tutto sull'obiettivo, togliere da una categoria
precisa, o decidere a mano. Il residuo da assegnare è sempre visibile e il salvataggio è bloccato
finché non torna a zero.

**Avanzamento configurabile.** Puoi contare tutto il patrimonio oppure solo le categorie marcate
«obiettivo» (Profilo → Obiettivo → *Cosa conta come avanzamento*). Serve se tieni sullo stesso conto
i soldi dell'auto e quelli delle vacanze.

---

## Limiti noti, dichiarati

- **Le notifiche non sono push.** Non c'è un server: i promemoria vengono valutati all'apertura
  dell'app, al massimo uno per avvio e uno al giorno per tipo. Per notifiche vere anche ad app chiusa
  servono Firebase Cloud Messaging e un backend.
- **Il modello 3D resta sul dispositivo.** Un `.glb` è troppo pesante per un documento Firestore, per
  cui finisce in IndexedDB: cambiando telefono va ricaricato. Se lo metti online puoi indicarne l'URL
  (`goal.modelUrl`) e allora segue l'account.
- **La foto viaggia come data-url compressa** dentro il documento utente (max ~600 KB, ridotta in
  automatico). Semplice e senza costi di Storage, ma se ti serve alta risoluzione conviene passare a
  Firebase Storage.
- **In modalità locale la password è solo un hash SHA-256** in localStorage. Va bene per uso
  personale su un dispositivo tuo, non è sicurezza vera: per quella si usa Firebase.
- Su iOS le notifiche web funzionano solo se l'app è installata sulla schermata Home (iOS 16.4+).
