import { AnimatePresence, motion } from 'framer-motion';
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { money } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Bottoni                                                             */
/* ------------------------------------------------------------------ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
};

export function Button({ variant = 'primary', size = 'md', full, className = '', ...rest }: ButtonProps) {
  const sizes = {
    sm: 'h-9 px-3.5 text-[13px] rounded-xl',
    md: 'h-12 px-5 text-[15px] rounded-2xl',
    lg: 'h-14 px-6 text-[16px] rounded-2xl',
  }[size];

  const variants = {
    primary: 'bg-primary text-black font-semibold hover:bg-secondary glow-soft disabled:opacity-40',
    ghost: 'bg-white/5 text-ink hover:bg-white/10 disabled:opacity-40',
    outline: 'border border-white/12 text-ink hover:bg-white/5 disabled:opacity-40',
    danger: 'bg-danger/12 text-danger hover:bg-danger/20',
  }[variant];

  return (
    <button
      {...rest}
      className={`press inline-flex items-center justify-center gap-2 font-medium ${sizes} ${variants} ${
        full ? 'w-full' : ''
      } ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Superfici                                                           */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = '',
  pad = 'p-5',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  /** Sostituisce il padding predefinito: le utility di pari specificità non si sovrascrivono in modo affidabile. */
  pad?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`card ${pad} text-left ${onClick ? 'press w-full' : ''} ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-mute">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'bad';
}) {
  const color = tone === 'good' ? 'text-secondary' : tone === 'bad' ? 'text-danger' : 'text-ink';
  return (
    <div className="card p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-mute">{label}</div>
      <div className={`num mt-1.5 text-[22px] font-bold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-[12px] leading-tight text-mute">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Numeri animati                                                      */
/* ------------------------------------------------------------------ */

export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    const delta = target - origin;
    if (delta === 0) return;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(origin + delta * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

export function Amount({
  value,
  className = '',
  cents = false,
}: {
  value: number;
  className?: string;
  cents?: boolean;
}) {
  const animated = useCountUp(value);
  return <span className={`num ${className}`}>{money(animated, cents)}</span>;
}

/* ------------------------------------------------------------------ */
/* Avanzamento                                                         */
/* ------------------------------------------------------------------ */

export function Progress({ value, height = 10 }: { value: number; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative w-full overflow-hidden rounded-full bg-white/8" style={{ height }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full rounded-full bg-gradient-to-r from-primary to-secondary"
      >
        <span className="shimmer absolute inset-0 rounded-full" />
      </motion.div>
    </div>
  );
}

export function Ring({
  value,
  size = 132,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#B9F6CA" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-mute">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-mute/80">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[16px] text-ink placeholder:text-mute/50 transition focus:border-primary/60 focus:bg-white/[0.06] focus:outline-none';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input {...rest} className={`${inputClass} ${className}`} />;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  autoFocus,
}: {
  value: number | '';
  onChange: (v: number | '') => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value === '' ? '' : String(value).replace('.', ',')}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d,.]/g, '').replace(',', '.');
          onChange(raw === '' ? '' : Number(raw));
        }}
        className={`${inputClass} num pr-11 text-[20px] font-semibold`}
      />
      <span className="num pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[18px] text-mute">€</span>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative flex rounded-2xl bg-white/[0.05] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="relative flex-1 rounded-xl px-3 py-2.5 text-[14px] font-medium transition"
        >
          {value === o.value && (
            <motion.span
              layoutId="segmented"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-xl bg-white/10"
            />
          )}
          <span className={`relative ${value === o.value ? 'text-ink' : 'text-mute'}`}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
  color,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`press inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
        active ? 'border-primary/60 bg-primary/12 text-ink' : 'border-white/10 bg-white/[0.03] text-mute'
      }`}
    >
      {color && <span className="size-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
            className="glass relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-[32px] sm:rounded-[32px]"
          >
            <div className="flex items-center justify-between px-6 pb-2 pt-4">
              <div className="mx-auto h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-6 pb-2">
                <h3 className="text-[19px] font-semibold tracking-tight">{title}</h3>
                <button onClick={onClose} className="press rounded-full bg-white/8 p-2 text-mute" aria-label="Chiudi">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="app-scroll max-h-[calc(90vh-80px)] px-6 pb-8 pt-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Stati vuoti                                                         */
/* ------------------------------------------------------------------ */

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <h3 className="text-[17px] font-semibold">{title}</h3>
      <p className="max-w-xs text-[14px] leading-relaxed text-mute">{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}
