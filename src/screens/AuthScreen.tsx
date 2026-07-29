import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { authError } from '../backend';
import { useStore } from '../store/AppStore';
import { Button, Field, Input, Segmented } from '../components/ui';

export function AuthScreen() {
  const { signIn, signUp, mode } = useStore();
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (tab === 'in') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-bg">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/18 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 size-[380px] rounded-full bg-secondary/10 blur-[110px]" />

      <div className="safe-top relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-6 py-14">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-7 flex items-center gap-3">
            <Logo />
            <span className="num text-[22px] font-extrabold tracking-tight">GoalDrive</span>
          </div>
          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Non gestisci soldi.
            <br />
            <span className="text-secondary">Ti avvicini a qualcosa.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-mute">
            Metti la tua meta al centro e guarda la distanza accorciarsi ogni mese.
          </p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="card space-y-4 p-6"
        >
          <Segmented
            value={tab}
            onChange={(v) => {
              setTab(v);
              setError('');
            }}
            options={[
              { value: 'in', label: 'Accedi' },
              { value: 'up', label: 'Crea account' },
            ]}
          />

          <Field label="Email">
            <Input
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.it"
            />
          </Field>

          <Field label="Password" hint={tab === 'up' ? 'Almeno 6 caratteri.' : undefined}>
            <Input
              type="password"
              name="password"
              autoComplete={tab === 'in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-[13px] text-danger">{error}</p>}

          <Button type="submit" full size="lg" disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" />}
            {tab === 'in' ? 'Accedi' : 'Inizia'}
          </Button>

          <p className="text-center text-[12px] leading-relaxed text-mute">
            Resti connesso finché non esci. Il browser può salvare le credenziali.
            {mode === 'local' && (
              <span className="mt-1 block text-mute/70">
                Firebase non è configurato: account e dati restano su questo dispositivo.
              </span>
            )}
          </p>
        </motion.form>
      </div>
    </div>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="7" />
      <path d="M32 10a22 22 0 0 1 19 33" fill="none" stroke="url(#lg)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="32" cy="32" r="6.5" fill="#00E676" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00C853" />
          <stop offset="100%" stopColor="#B9F6CA" />
        </linearGradient>
      </defs>
    </svg>
  );
}
