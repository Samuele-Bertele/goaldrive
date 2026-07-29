import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Box, Camera, Check, Loader2 } from 'lucide-react';
import { useStore, defaultState, starterCategories } from '../store/AppStore';
import { Button, Field, Input, MoneyInput } from '../components/ui';
import { GoalImage } from '../components/GoalImage';
import { compressImage, dominantColor } from '../lib/image';
import { assets } from '../lib/idb';
import { addMonths, money, toISO, todayISO } from '../lib/format';
import type { AppState } from '../types';

const STEPS = 7;

export function Onboarding() {
  const { user, init, toast } = useStore();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [goalName, setGoalName] = useState('');
  const [target, setTarget] = useState<number | ''>('');
  const [deadline, setDeadline] = useState(toISO(addMonths(new Date(), 24)));
  const [start, setStart] = useState<number | ''>('');
  const [salary, setSalary] = useState<number | ''>('');
  const [salaryDay, setSalaryDay] = useState(27);
  const [image, setImage] = useState<string | undefined>();
  const [accent, setAccent] = useState('#00C853');
  const [hasModel, setHasModel] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);

  const go = (delta: number) => {
    setDir(delta);
    setStep((s) => Math.min(STEPS - 1, Math.max(0, s + delta)));
  };

  const valid = [
    name.trim().length > 1,
    goalName.trim().length > 1,
    target !== '' && Number(target) > 0,
    deadline > todayISO(),
    start !== '',
    true,
    true,
  ][step];

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await compressImage(file);
      setImage(data);
      setAccent(await dominantColor(data));
    } catch {
      toast('Immagine non valida. Prova con un’altra foto.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const onModel = async (file?: File) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      await assets.set(`model:${user.uid}`, file);
      setHasModel(true);
      toast('Modello 3D salvato su questo dispositivo.');
    } catch {
      toast('Non riesco a salvare il modello.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    const base = defaultState(name.trim(), goalName.trim());
    const next: AppState = {
      ...base,
      onboarded: true,
      goal: {
        name: goalName.trim(),
        targetAmount: Number(target),
        deadline,
        image,
        accent,
        model: hasModel || undefined,
      },
      startingBalance: start === '' ? 0 : Number(start),
      salary: { amount: salary === '' ? 0 : Number(salary), day: salaryDay },
      categories: starterCategories(goalName.trim()),
    };
    init(next);
  };

  const progress = (step + 1) / STEPS;

  return (
    <div className="relative min-h-full bg-bg">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] opacity-70"
        style={{ background: `radial-gradient(70% 100% at 50% 0%, ${accent}22 0%, transparent 70%)` }}
      />

      <div className="safe-top relative mx-auto flex min-h-full w-full max-w-md flex-col px-6 pb-8">
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => go(-1)}
            disabled={step === 0}
            className="press rounded-full bg-white/6 p-2 text-mute disabled:opacity-0"
            aria-label="Indietro"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-1 gap-1.5">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            ))}
          </div>
          <span className="num text-[12px] text-mute">{Math.round(progress * 100)}%</span>
        </div>

        <div className="relative flex-1 pt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {step === 0 && (
                <StepBody title="Come ti chiami?" sub="Serve solo per salutarti come si deve.">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome" autoFocus />
                </StepBody>
              )}

              {step === 1 && (
                <StepBody
                  title={`Cosa vuoi ottenere, ${name.split(' ')[0] || 'tu'}?`}
                  sub="Scrivilo com’è nella tua testa. Sarà il titolo di ogni schermata."
                >
                  <Input
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="BMW 420d Coupé"
                    autoFocus
                  />
                </StepBody>
              )}

              {step === 2 && (
                <StepBody title="Quanto costa?" sub="Anche una stima va benissimo: potrai correggerla quando vuoi.">
                  <MoneyInput value={target} onChange={setTarget} placeholder="35.000" autoFocus />
                </StepBody>
              )}

              {step === 3 && (
                <StepBody title="Entro quando?" sub="La data che ti mette la giusta pressione, non quella impossibile.">
                  <Input type="date" value={deadline} min={todayISO()} onChange={(e) => setDeadline(e.target.value)} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[12, 18, 24, 36].map((m) => (
                      <button
                        key={m}
                        onClick={() => setDeadline(toISO(addMonths(new Date(), m)))}
                        className="press rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-mute"
                      >
                        fra {m} mesi
                      </button>
                    ))}
                  </div>
                </StepBody>
              )}

              {step === 4 && (
                <StepBody title="Da dove parti?" sub="Quanto hai già da parte per questo obiettivo, oggi.">
                  <MoneyInput value={start} onChange={setStart} placeholder="0" autoFocus />
                  {target !== '' && start !== '' && Number(target) > 0 && (
                    <p className="mt-3 text-[14px] text-secondary">
                      Sei già al {Math.round((Number(start) / Number(target)) * 100)}% di {money(Number(target))}.
                    </p>
                  )}
                </StepBody>
              )}

              {step === 5 && (
                <StepBody title="Il tuo stipendio" sub="GoalDrive lo dividerà da solo fra le tue categorie, ogni mese.">
                  <div className="space-y-4">
                    <Field label="Importo netto mensile">
                      <MoneyInput value={salary} onChange={setSalary} placeholder="1.600" />
                    </Field>
                    <Field label="Giorno di accredito">
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={salaryDay}
                        onChange={(e) => setSalaryDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
                      />
                    </Field>
                    <p className="text-[13px] text-mute">Puoi saltare questo passaggio e impostarlo più avanti.</p>
                  </div>
                </StepBody>
              )}

              {step === 6 && (
                <StepBody title="Dagli un volto" sub="La foto si svela man mano che ti avvicini. All’inizio è sfocata: dipende da te.">
                  <div className="space-y-4">
                    <GoalImage
                      src={image}
                      variant="goal"
                      progress={target !== '' && start !== '' ? Number(start) / Number(target) : 0}
                      accent={accent}
                      overlay="soft"
                      fallback={goalName}
                      className="h-52 w-full rounded-3xl"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="ghost" onClick={() => photoRef.current?.click()} disabled={busy}>
                        {busy ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
                        {image ? 'Cambia foto' : 'Carica foto'}
                      </Button>
                      <Button variant="ghost" onClick={() => modelRef.current?.click()} disabled={busy}>
                        {hasModel ? <Check size={17} className="text-secondary" /> : <Box size={17} />}
                        {hasModel ? 'Modello caricato' : 'Modello 3D'}
                      </Button>
                    </div>

                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => void onPhoto(e.target.files?.[0])}
                    />
                    <input
                      ref={modelRef}
                      type="file"
                      accept=".glb,.gltf,model/gltf-binary"
                      hidden
                      onChange={(e) => void onModel(e.target.files?.[0])}
                    />

                    <p className="text-[13px] leading-relaxed text-mute">
                      Il modello 3D si ruota con il dito e resta su questo dispositivo. La foto ti segue ovunque.
                    </p>
                  </div>
                </StepBody>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pt-6">
          <Button full size="lg" disabled={!valid || busy} onClick={() => (step === STEPS - 1 ? finish() : go(1))}>
            {step === STEPS - 1 ? 'Entra in GoalDrive' : 'Continua'}
          </Button>
          {step >= 5 && step < STEPS - 1 && (
            <button onClick={() => go(1)} className="press mt-3 w-full text-[14px] text-mute">
              Salta per ora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBody({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em]">{title}</h1>
      <p className="mb-7 mt-2.5 text-[15px] leading-relaxed text-mute">{sub}</p>
      {children}
    </div>
  );
}
