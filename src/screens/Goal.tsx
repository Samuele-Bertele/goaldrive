import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Box, Camera, Check, Image as ImageIcon, Loader2, Pencil } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { GoalImage } from '../components/GoalImage';
import { ModelViewer } from '../components/ModelViewer';
import { Amount, Button, Card, Field, Input, MoneyInput, Ring, Segmented, Sheet } from '../components/ui';
import { compressImage, dominantColor } from '../lib/image';
import { assets } from '../lib/idb';
import { dateLabel, durationLabel, money, todayISO } from '../lib/format';

const MILESTONES = [0.25, 0.5, 0.75, 1];

export function Goal({ onBack }: { onBack: () => void }) {
  const { state, user, patch, forecast, toast } = useApp();
  const [view, setView] = useState<'photo' | 'model'>(state.goal.image ? 'photo' : 'model');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(state.goal.name);
  const [target, setTarget] = useState<number | ''>(state.goal.targetAmount);
  const [deadline, setDeadline] = useState(state.goal.deadline);

  const photoRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const has3D = Boolean(state.goal.model || state.goal.modelUrl);

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const image = await compressImage(file);
      patch({ goal: { ...state.goal, image, accent: await dominantColor(image) } });
      setView('photo');
      toast('Foto aggiornata.');
    } catch {
      toast('Immagine non valida.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const onModel = async (file?: File) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      await assets.set(`model:${user.uid}`, file);
      patch({ goal: { ...state.goal, model: true } });
      setView('model');
      toast('Modello 3D salvato su questo dispositivo.');
    } catch {
      toast('Non riesco a salvare il modello.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    patch({
      goal: { ...state.goal, name: name.trim() || state.goal.name, targetAmount: Number(target) || state.goal.targetAmount, deadline },
    });
    setEditing(false);
    toast('Obiettivo aggiornato.');
  };

  return (
    <div className="pb-32">
      <div className="relative">
        {view === 'model' && has3D ? (
          <div className="relative h-[64vh] min-h-[420px] w-full bg-gradient-to-b from-surface to-bg">
            <ModelViewer uid={user!.uid} url={state.goal.modelUrl} className="size-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />
          </div>
        ) : (
          <GoalImage
            src={state.goal.image}
            variant="goal"
            progress={forecast.progress}
            accent={state.goal.accent}
            fallback={state.goal.name}
            overlay="strong"
            className="h-[64vh] min-h-[420px] w-full"
          />
        )}

        <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-3">
          <button onClick={onBack} className="press glass grid size-10 place-items-center rounded-full" aria-label="Indietro">
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            {has3D && state.goal.image && (
              <button
                onClick={() => setView((v) => (v === 'photo' ? 'model' : 'photo'))}
                className="press glass grid size-10 place-items-center rounded-full"
                aria-label="Cambia vista"
              >
                {view === 'photo' ? <Box size={18} /> : <ImageIcon size={18} />}
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="press glass grid size-10 place-items-center rounded-full"
              aria-label="Modifica obiettivo"
            >
              <Pencil size={17} />
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-6 pb-8">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em]"
          >
            {state.goal.name}
          </motion.h1>
          <p className="mt-2 text-[15px] text-white/60">
            Entro il {dateLabel(state.goal.deadline)} · {durationLabel(forecast.monthsRemaining)} al traguardo
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-4 pt-6">
        <Card className="flex items-center gap-5">
          <Ring value={forecast.progress}>
            <div className="text-center">
              <div className="num text-[26px] font-extrabold leading-none">{Math.round(forecast.progress * 100)}%</div>
              <div className="text-[11px] text-mute">completato</div>
            </div>
          </Ring>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-[12px] uppercase tracking-[0.12em] text-mute">Accantonato</p>
              <Amount value={forecast.current} className="text-[22px] font-bold" />
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-[0.12em] text-mute">Mancano</p>
              <Amount value={forecast.remaining} className="text-[22px] font-bold text-secondary" />
            </div>
          </div>
        </Card>

        <Card>
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-mute">Traguardi</p>
          <div className="space-y-3">
            {MILESTONES.map((m) => {
              const done = forecast.progress >= m;
              return (
                <div key={m} className="flex items-center gap-3">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      done ? 'bg-primary text-black' : 'bg-white/6 text-mute'
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : Math.round(m * 100)}
                  </span>
                  <div className="flex-1">
                    <p className={`text-[14px] ${done ? 'text-ink' : 'text-mute'}`}>
                      {Math.round(m * 100)}% · {money(state.goal.targetAmount * m)}
                    </p>
                  </div>
                  {!done && (
                    <span className="num text-[13px] text-mute">
                      −{money(state.goal.targetAmount * m - forecast.current)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => photoRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
            {state.goal.image ? 'Cambia foto' : 'Aggiungi foto'}
          </Button>
          <Button variant="ghost" onClick={() => modelRef.current?.click()} disabled={busy}>
            <Box size={17} />
            {has3D ? 'Cambia modello' : 'Modello 3D'}
          </Button>
        </div>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
        <input ref={modelRef} type="file" accept=".glb,.gltf" hidden onChange={(e) => void onModel(e.target.files?.[0])} />

        <p className="px-1 text-[12px] leading-relaxed text-mute">
          La foto è volutamente spenta all'inizio: si schiarisce e prende colore man mano che ti avvicini. A obiettivo
          raggiunto la vedi come sarà davvero.
        </p>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Modifica obiettivo">
        <div className="space-y-4">
          <Field label="Cosa vuoi ottenere">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Importo">
            <MoneyInput value={target} onChange={setTarget} />
          </Field>
          <Field label="Entro quando">
            <Input type="date" min={todayISO()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Cosa conta come avanzamento" hint="Puoi contare tutto il patrimonio oppure solo le categorie marcate come obiettivo.">
            <Segmented
              value={state.goalSource}
              onChange={(v) => patch({ goalSource: v })}
              options={[
                { value: 'total', label: 'Patrimonio totale' },
                { value: 'categories', label: 'Solo obiettivo' },
              ]}
            />
          </Field>
          <Button full size="lg" onClick={save}>
            Salva
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
