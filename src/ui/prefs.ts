// Player preferences: persisted in localStorage and applied to the document.

import { setSoundEnabled } from './sound';
import { setMusicEnabled } from './music';

export type BoardTheme = 'classic' | 'plain' | 'lapis' | 'walnut';
export const BOARD_THEMES: BoardTheme[] = ['classic', 'plain', 'lapis', 'walnut'];

export interface Prefs {
  sound: boolean;
  /** background music per screen */
  music: boolean;
  /** classic = flat chequered; plain = unchequered as in the manuscripts; lapis / walnut = carved boards */
  board: BoardTheme;
  coords: boolean;
  /** legal-move dots and rings when a piece is selected */
  hints: boolean;
  /** one-time coach marks in the first games */
  coach: boolean;
  motion: 'system' | 'off';
  /** 'icons' = flat glyphs; 'carved' = photo cut-outs of the carved set (pawns carry their master's emblem). */
  pieces: 'icons' | 'carved';
}

const KEY = 'zurafa.prefs';
// The carved set on the lapis board is the look of the game; flat glyphs and plain boards stay one tap away.
const DEFAULTS: Prefs = { sound: true, music: true, board: 'lapis', coords: true, hints: true, coach: true, motion: 'system', pieces: 'carved' };
/** Bumped when defaults change in a way untouched settings should follow. */
const PREFS_VERSION = 2;
let prefs: Prefs = { ...DEFAULTS };
const listeners = new Set<() => void>();

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Prefs> & { plain?: boolean; v?: number };
      if (saved.board === undefined && saved.plain) saved.board = 'plain'; // pre-theme setting
      delete saved.plain;
      // v2: players who never changed the old flat defaults get the carved set on the lapis board once.
      if ((saved.v ?? 1) < 2) {
        if ((saved.board ?? 'classic') === 'classic') saved.board = 'lapis';
        if ((saved.pieces ?? 'icons') === 'icons') saved.pieces = 'carved';
      }
      delete saved.v;
      prefs = { ...DEFAULTS, ...saved };
      if (!BOARD_THEMES.includes(prefs.board)) prefs.board = 'lapis';
      persist();
    } else {
      // Settings from the first version lived in separate keys.
      if (localStorage.getItem('tc.sound') === '0') prefs.sound = false;
      if (localStorage.getItem('tc.plain') === '1') prefs.board = 'plain';
    }
  } catch {
    /* storage unavailable: defaults */
  }
  applyPrefs();
  return prefs;
}

export function is3dBoard(): boolean {
  return prefs.board === 'lapis' || prefs.board === 'walnut';
}

export function getPrefs(): Prefs {
  return prefs;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...prefs, v: PREFS_VERSION }));
  } catch {
    /* ignore */
  }
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  prefs = { ...prefs, [key]: value };
  persist();
  applyPrefs();
  listeners.forEach((f) => f());
}

export function onPrefsChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

function applyPrefs(): void {
  setSoundEnabled(prefs.sound);
  setMusicEnabled(prefs.music);
  document.body.classList.toggle('plain-board', prefs.board === 'plain');
  document.body.classList.toggle('board-3d', is3dBoard());
  for (const th of BOARD_THEMES) document.body.classList.toggle(`board-${th}`, prefs.board === th);
  document.body.classList.toggle('no-coords', !prefs.coords);
  if (prefs.motion === 'off') document.documentElement.dataset.motion = 'off';
  else delete document.documentElement.dataset.motion;
}
