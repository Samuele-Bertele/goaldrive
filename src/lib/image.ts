export type Variant = 'home' | 'goal' | 'analytics' | 'profile' | 'forecast' | 'money' | 'auth';

/**
 * La stessa foto non viene mai mostrata due volte allo stesso modo:
 * ogni schermata ne inquadra una porzione diversa, così l'obiettivo
 * resta riconoscibile senza diventare ripetitivo.
 */
export const VARIANTS: Record<Variant, { position: string; scale: number; blur: number }> = {
  home: { position: '50% 42%', scale: 1.06, blur: 0 },
  goal: { position: '50% 50%', scale: 1, blur: 0 },
  analytics: { position: '22% 68%', scale: 2.1, blur: 1 },
  forecast: { position: '78% 62%', scale: 2.4, blur: 2 },
  money: { position: '50% 18%', scale: 1.8, blur: 1 },
  profile: { position: '84% 26%', scale: 2.6, blur: 3 },
  auth: { position: '50% 50%', scale: 1.25, blur: 14 },
};

/** Ridimensiona e comprime la foto per stare comodamente in un documento Firestore. */
export async function compressImage(file: File, maxSize = 1100, quality = 0.82): Promise<string> {
  const bitmap = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');
  ctx.drawImage(bitmap, 0, 0, w, h);

  let out = canvas.toDataURL('image/jpeg', quality);
  // Firestore ha un limite di 1 MB per documento: se serve, riduco ancora.
  let q = quality;
  while (out.length > 620_000 && q > 0.4) {
    q -= 0.12;
    out = canvas.toDataURL('image/jpeg', q);
  }
  return out;
}

/** Colore dominante saturo, usato per i bagliori attorno alla foto. */
export async function dominantColor(dataUrl: string): Promise<string> {
  try {
    const img = await loadImageFromUrl(dataUrl);
    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#00C853';
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let best = { score: -1, r: 0, g: 200, b: 83 };
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (max + min) / 510;
      const score = sat * 1.4 + (1 - Math.abs(lum - 0.55)) * 0.6;
      if (score > best.score && lum > 0.14 && lum < 0.92) best = { score, r, g, b };
    }
    return `#${[best.r, best.g, best.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '#00C853';
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => loadImageFromUrl(String(reader.result)).then(resolve, reject);
    reader.onerror = () => reject(new Error('Impossibile leggere il file'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Immagine non valida'));
    img.src = url;
  });
}
