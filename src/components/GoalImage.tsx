import { type ReactNode } from 'react';
import { VARIANTS, type Variant } from '../lib/image';

/**
 * La firma visiva di GoalDrive.
 *
 * L'immagine dell'obiettivo parte spenta e sfocata e si svela man mano che il
 * risparmio cresce: a metà percorso il sogno è ancora un'idea, alla fine è nitido.
 * Ogni schermata ne inquadra una porzione diversa (vedi VARIANTS).
 */
export function GoalImage({
  src,
  variant,
  progress,
  accent = '#00C853',
  className = '',
  overlay = 'strong',
  reveal = true,
  fallback,
  children,
}: {
  src?: string;
  variant: Variant;
  progress: number;
  accent?: string;
  className?: string;
  overlay?: 'strong' | 'soft' | 'none';
  reveal?: boolean;
  fallback?: string;
  children?: ReactNode;
}) {
  const v = VARIANTS[variant];
  const p = reveal ? Math.max(0, Math.min(1, progress)) : 1;

  // Curva del velo: rapida all'inizio (si vede subito un progresso), fine morbido.
  const unveil = 0.28 + 0.72 * Math.pow(p, 0.75);
  const filter = `saturate(${(0.3 + 0.78 * unveil).toFixed(2)}) brightness(${(0.5 + 0.55 * unveil).toFixed(
    2,
  )}) contrast(${(0.9 + 0.15 * unveil).toFixed(2)}) blur(${(v.blur + (1 - unveil) * 5).toFixed(1)}px)`;

  return (
    <div className={`grain relative overflow-hidden bg-surface ${className}`}>
      {src ? (
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          className="veil-img absolute inset-0 size-full object-cover"
          style={{ objectPosition: v.position, transform: `scale(${v.scale})`, filter }}
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            background: `radial-gradient(120% 90% at 50% 0%, ${accent}26 0%, transparent 62%), linear-gradient(180deg, #1E1E1E 0%, #0F0F0F 100%)`,
          }}
        >
          <span className="num text-[64px] font-extrabold text-white/8">
            {(fallback ?? 'G').slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {overlay !== 'none' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              overlay === 'strong'
                ? 'linear-gradient(180deg, rgba(10,10,10,.28) 0%, rgba(10,10,10,.10) 38%, rgba(10,10,10,.86) 88%, #0A0A0A 100%)'
                : 'linear-gradient(180deg, rgba(10,10,10,.10) 0%, rgba(10,10,10,.62) 100%)',
          }}
        />
      )}

      {/* Alone del colore dominante della foto: lega l'immagine all'interfaccia */}
      <div
        className="pointer-events-none absolute -inset-x-10 -bottom-16 h-40 opacity-45 blur-3xl"
        style={{ background: `radial-gradient(60% 100% at 50% 100%, ${accent}, transparent 70%)` }}
      />

      {children && <div className="relative z-10 size-full">{children}</div>}
    </div>
  );
}
