# Deployment

## Su GitHub e installazione da Android

### 1. GitHub Pages (gratuito)

Crea un nuovo repository pubblico `goaldrive` (o come preferisci).

```bash
cd goaldrive
git init
git add .
git commit -m "Initial commit: GoalDrive PWA"
git branch -M main
git remote add origin https://github.com/TuoUsername/goaldrive.git
git push -u origin main
```

**Abilita GitHub Pages:**
- Vai su **Settings → Pages**
- Branch: `main`
- Folder: `/ (root)` se metti la build nella radice, oppure `/dist` se usi una cartella

**Build e deploy automatico con GitHub Actions:**

Crea `.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          cname: tuodominio.it  # opzionale: solo se hai un dominio personalizzato
```

Ad ogni `git push` su `main`, GitHub compila e pubblica automaticamente su `https://tuousername.github.io/goaldrive`.

**Variabili Firebase:** se usi il tuo progetto Firebase, crea su GitHub:
- **Settings → Secrets and variables → Actions**
- Aggiungi ogni `VITE_FIREBASE_*` con il valore reale

Nel workflow, passa al build:

```yaml
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          # ... e così per gli altri
```

### 2. Su Android: installazione da browser

Una volta deploy su GitHub Pages (o qualsiasi hosting), apri il link su **Chrome/Edge Android**:

```
https://tuousername.github.io/goaldrive
```

Vedrai un **banner in basso** (oppure in alto, dipende da Chrome):
- **"Installa" / "Aggiungi alla schermata Home"**
- Tocca → l'app si scarica come icona sulla home
- Si apre fullscreen (non vedi la barra di Chrome)
- Funziona offline (il service worker cachea tutto)

**Requisiti Android:**
- Android 5+ (il 99% dei telefoni)
- Chrome 40+ / Edge / Samsung Internet (il 99% dei browser)
- HTTPS (obbligatorio per PWA — GitHub Pages fornisce HTTPS)

### 3. iOS (iPhone/iPad)

iOS non ha una "installazione" vera come Android. Due opzioni:

**A) Home screen (scelta consigliata):**
1. Apri in Safari: `https://tuousername.github.io/goaldrive`
2. Tocca **Condividi** (freccia in basso)
3. **Aggiungi alla schermata Home**
4. Scegli il nome, tocca **Aggiungi**

L'app avrà un'icona come una vera app, si apre fullscreen, funziona offline.

**B) App clip (iOS 14+):**
Avanzato: richiede App Clip entitlements, serve Xcode. Non lo consiglio per una PWA.

### 4. Desktop (Windows/Mac/Linux)

Stessi browser che su mobile (Chrome, Edge). Tocca i **tre puntini → Installa app** oppure **"Crea scorciatoia"**.

Si aggiunge al menu Start (Windows) / Launchpad (Mac).

---

## Hosting alternativo a GitHub Pages

Se vuoi un dominio personalizzato o più storage:

**Netlify (gratuito):**
- Connetti il repo GitHub
- Build: `npm run build`
- Publish: `dist/`
- Deploy automatico ad ogni `git push`
- HTTPS incluso
- Dominio personalizzato gratis (basta il DNS)

**Vercel (gratuito):**
- Stesso setup di Netlify
- Serverless functions se ti serve un backend (fuori scope per ora)

**Firebase Hosting (gratuito):**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## Configurazione Firebase per l'hosting

In qualsiasi caso, ricorda:

1. **Authentication → Settings → Domini autorizzati**
   - Aggiungi `tuousername.github.io` (o il tuo dominio)
   - Senza questo il login fallisce

2. **Firestore → Rules** (copiale da README.md)
   - Altrimenti Firestore blocca tutto per motivi di sicurezza

3. **Variabili d'ambiente**
   - Copia `.env.example` → `.env` in locale per testare
   - Su GitHub/Netlify/Vercel: impostale negli Secrets/Variabili

---

## Test prima del deploy

```bash
npm run build          # compila in dist/
npm run preview        # serve dist/ su localhost:4173
# Apri Chrome dev tools → Application → Manifest
# Dovrebbe mostrare il manifest.webmanifest
# Prova anche offline: dev tools → Network → Throttling → Offline
```

Su `preview` la PWA è completamente funzionale (service worker compreso).

