import { useEffect, useState } from 'react';
import { assets } from '../lib/idb';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'camera-controls'?: boolean | string;
        'auto-rotate'?: boolean | string;
        'touch-action'?: string;
        'shadow-intensity'?: string;
        exposure?: string;
        ar?: boolean | string;
      };
    }
  }
}

/**
 * Il .glb resta sul dispositivo (IndexedDB) perché troppo pesante per Firestore.
 * La libreria viene caricata in un chunk separato solo se un modello esiste davvero.
 */
export function ModelViewer({ uid, url, className = '' }: { uid: string; url?: string; className?: string }) {
  const [src, setSrc] = useState<string | undefined>(url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | undefined;
    let alive = true;

    (async () => {
      try {
        await import('@google/model-viewer');
        if (!url) {
          const blob = await assets.get(`model:${uid}`);
          if (blob && alive) {
            objectUrl = URL.createObjectURL(blob);
            setSrc(objectUrl);
          }
        }
        if (alive) setLoaded(true);
      } catch {
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uid, url]);

  if (failed) {
    return (
      <div className={`grid place-items-center text-[13px] text-mute ${className}`}>
        Il modello 3D non si carica offline. Riprova online.
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loaded && src ? (
        <model-viewer
          src={src}
          alt="Modello 3D dell'obiettivo"
          camera-controls
          auto-rotate
          touch-action="pan-y"
          shadow-intensity="1"
          exposure="1.05"
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        />
      ) : (
        <div className="grid size-full place-items-center text-[13px] text-mute">Carico il modello…</div>
      )}
    </div>
  );
}
