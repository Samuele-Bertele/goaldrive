import type { AppState, Tx } from '../types';
import { monthKey, todayISO } from './format';

const SEEN_KEY = 'goaldrive:reminders';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

async function show(title: string, body: string, tag: string) {
  if (permission() !== 'granted') return;
  const reg = await navigator.serviceWorker?.getRegistration();
  const options: NotificationOptions = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

function alreadySent(tag: string): boolean {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string>;
    return seen[tag] === todayISO();
  } catch {
    return false;
  }
}

function markSent(tag: string) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string>;
    seen[tag] = todayISO();
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* spazio non disponibile: i promemoria semplicemente non vengono memorizzati */
  }
}

/**
 * Non esiste un server: i promemoria vengono valutati all'apertura dell'app
 * e mostrati al massimo una volta al giorno per tipo.
 */
export async function runReminders(state: AppState, txs: Tx[], progress: number) {
  if (!state.notifications || permission() !== 'granted') return;

  const now = new Date();
  const month = monthKey(todayISO());
  const salaryLogged = txs.some((t) => t.kind === 'salary' && monthKey(t.date) === month);

  const queue: [string, string, string][] = [];

  if (!salaryLogged && now.getDate() >= state.salary.day && state.salary.amount > 0) {
    queue.push([
      'Stipendio accreditato?',
      `Registralo e GoalDrive lo distribuisce sulle tue categorie in un tocco.`,
      'salary-' + month,
    ]);
  }

  const lastExpense = txs.filter((t) => t.type === 'expense').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const daysSince = lastExpense ? (Date.now() - new Date(lastExpense.date).getTime()) / 86_400_000 : 99;
  if (daysSince >= 5) {
    queue.push(['Qualche spesa da segnare?', 'Bastano dieci secondi per tenere le previsioni affidabili.', 'expenses']);
  }

  if (progress >= 0.9 && progress < 1) {
    queue.push([`Ci sei quasi: ${Math.round(progress * 100)}%`, `${state.goal.name} è a un passo.`, 'almost']);
  }
  if (progress >= 1) {
    queue.push(['Obiettivo raggiunto 🎉', `${state.goal.name} è tuo. Complimenti.`, 'done']);
  }

  for (const [title, body, tag] of queue) {
    if (alreadySent(tag)) continue;
    await show(title, body, tag);
    markSent(tag);
    break; // una notifica per apertura: mai invadente
  }
}
