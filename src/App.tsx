import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/AppStore';
import { AuthScreen, Logo } from './screens/AuthScreen';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Money } from './screens/Money';
import { Analytics } from './screens/Analytics';
import { ForecastScreen } from './screens/Forecast';
import { Goal } from './screens/Goal';
import { Profile } from './screens/Profile';
import { Nav, type Route } from './components/Nav';
import { AddSheet } from './components/AddSheet';
import { SalaryAllocator } from './components/SalaryAllocator';
import type { Tx } from './types';

export default function App() {
  const { ready, user, state } = useStore();

  if (!ready) return <Splash />;
  if (!user) return <AuthScreen />;
  if (!state || !state.onboarded) return <Onboarding />;
  return <Shell />;
}

function Shell() {
  const [route, setRoute] = useState<Route>('home');
  const [add, setAdd] = useState(false);
  const [salary, setSalary] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <div ref={scroller} className="app-scroll flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={route}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {route === 'home' && <Home onRoute={setRoute} onSalary={() => setSalary(true)} />}
            {route === 'money' && (
              <Money
                onSalary={() => setSalary(true)}
                onEdit={(tx) => {
                  if (tx.kind === 'salary') setSalary(true);
                  else {
                    setEditing(tx);
                    setAdd(true);
                  }
                }}
              />
            )}
            {route === 'analytics' && <Analytics />}
            {route === 'forecast' && <ForecastScreen />}
            {route === 'goal' && <Goal onBack={() => setRoute('home')} />}
            {route === 'profile' && <Profile />}
          </motion.div>
        </AnimatePresence>
      </div>

      <Nav
        route={route}
        onRoute={setRoute}
        onAdd={() => {
          setEditing(null);
          setAdd(true);
        }}
      />

      <AddSheet
        open={add}
        edit={editing}
        onClose={() => {
          setAdd(false);
          setEditing(null);
        }}
        onSalary={() => setSalary(true)}
      />

      <SalaryAllocator open={salary} onClose={() => setSalary(false)} />

      <Toasts />
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),14px)]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={() => dismissToast(t.id)}
            className={`glass pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-[14px] font-medium ${
              t.tone === 'warn' ? 'text-danger' : 'text-ink'
            }`}
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Splash() {
  return (
    <div className="grid h-full place-items-center bg-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <Logo size={54} />
        <span className="num text-[15px] font-semibold tracking-[0.2em] text-mute">GOALDRIVE</span>
      </motion.div>
    </div>
  );
}
