// Player preferences: persisted in localStorage and applied to the document.

import { setSoundEnabled } from './sound';

export interface Prefs {
  sound: boolean;
  /** true = unchequered board, as in the manuscripts */
  plain: boolean;
  coords: boolean;
  /** legal-move dots and rings when a piece is selected */
  hints: boolean;
  /** one-time coach marks in the first games */
  coach: boolean;
  motion: 'system' | 'off';
}

const KEY = 'zurafa.prefs';
const DEFAULTS: Prefs = { sound: true, plain: false, coords: true, hints: true, coach: true, motion: 'system' };
let prefs: Prefs = { ...DEFAULTS };
const listeners = new Set<() => void>();

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) prefs = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
    else {
      // Settings from the first version lived in separate keys.
      if (localStorage.getItem('tc.sound') === '0') prefs.sound = false;
      if (localStorage.getItem('tc.plain') === '1') prefs.plain = true;
    }
  } catch {
    /* storage unavailable: defaults */
  }
  applyPrefs();
  return prefs;
}

export function getPrefs(): Prefs {
  return prefs;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  prefs = { ...prefs, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  applyPrefs();
  listeners.forEach((f) => f());
}

export function onPrefsChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

function applyPrefs(): void {
  setSoundEnabled(prefs.sound);
  document.body.classList.toggle('plain-board', prefs.plain);
  document.body.classList.toggle('no-coords', !prefs.coords);
  if (prefs.motion === 'off') document.documentElement.dataset.motion = 'off';
  else delete document.documentElement.dataset.motion;
}
