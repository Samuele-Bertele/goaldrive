import { motion } from 'framer-motion';
import { ChartPie, Home, Plus, TrendingUp, User, Wallet } from 'lucide-react';

export type Route = 'home' | 'money' | 'analytics' | 'forecast' | 'profile' | 'goal';

const TABS: { key: Route; label: string; Icon: typeof Home }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'money', label: 'Movimenti', Icon: Wallet },
  { key: 'analytics', label: 'Analisi', Icon: ChartPie },
  { key: 'forecast', label: 'Previsioni', Icon: TrendingUp },
  { key: 'profile', label: 'Profilo', Icon: User },
];

export function Nav({
  route,
  onRoute,
  onAdd,
}: {
  route: Route;
  onRoute: (r: Route) => void;
  onAdd: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="safe-bottom relative w-full max-w-lg px-4 pb-2">
        <motion.button
          initial={{ scale: 0, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.2 }}
          whileTap={{ scale: 0.92 }}
          onClick={onAdd}
          aria-label="Aggiungi movimento"
          className="glow pointer-events-auto absolute -top-16 right-5 grid size-14 place-items-center rounded-full bg-primary text-black"
        >
          <Plus size={26} strokeWidth={2.6} />
        </motion.button>

        <nav className="glass pointer-events-auto flex items-center rounded-[26px] px-1.5 py-1.5">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => onRoute(key)}
              aria-current={route === key ? 'page' : undefined}
              className="press relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2"
            >
              {route === key && (
                <motion.span
                  layoutId="tab"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-2xl bg-white/8"
                />
              )}
              <Icon
                size={19}
                strokeWidth={route === key ? 2.4 : 1.9}
                className={`relative ${route === key ? 'text-secondary' : 'text-mute'}`}
              />
              <span
                className={`relative text-[10px] font-medium tracking-tight ${
                  route === key ? 'text-ink' : 'text-mute'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
