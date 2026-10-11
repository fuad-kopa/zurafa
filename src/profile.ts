// Local player profile: name, a rating earned against the computer, and the last games for review.
// Nothing leaves the device.

import type { Side } from './engine/geometry';
import type { RuleOptions } from './engine/position';
import type { ResultReason } from './engine/game';
import { solvedIds, dailyState } from './puzzles';

export interface GameRecord {
  id: string;
  /** ISO date-time */
  at: string;
  mode: 'ai' | 'local' | 'online';
  level?: number;
  mySide: Side | null;
  winner: Side | null;
  reason: ResultReason;
  plies: number;
  moves: string[];
  rules: RuleOptions;
  ratingBefore?: number;
  ratingAfter?: number;
  /** identity of an online game (room + game number), so a reload cannot store it twice */
  key?: string;
  /** battle scenario id when the game did not start from the standard array */
  battle?: string;
}

export interface Profile {
  name: string;
  rating: number;
  games: GameRecord[];
  /** the piece shown as the player's portrait */
  avatar?: { type: number; side: Side };
  /** finished games in the garden, by game id */
  garden?: Record<string, GardenTally>;
}

export interface GardenTally {
  played: number;
  wins: number;
  draws: number;
  losses: number;
}

/** Garden games, in the order of the garden. */
export const GARDEN_GAMES = ['shatranj', 'oblong', 'tamma', 'husun', 'nard', 'toguz', 'asyk'] as const;
export type GardenGame = (typeof GARDEN_GAMES)[number];

export interface Stats {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  /** strongest computer level beaten, 0 if none */
  bestLevel: number;
  puzzles: number;
  streak: number;
}

const KEY = 'zurafa.profile';
const MAX_GAMES = 60;
export const START_RATING = 1200;
/** Nominal strength of the six computer levels, for the Elo update. */
export const LEVEL_RATING: Record<number, number> = { 1: 700, 2: 950, 3: 1200, 4: 1450, 5: 1700, 6: 1950 };

let cache: Profile | null = null;
const recordedListeners = new Set<(g: GameRecord) => void>();

/** Called with every newly stored game (the cloud uploads it when signed in). */
export function onGameRecorded(f: (g: GameRecord) => void): () => void {
  recordedListeners.add(f);
  return () => recordedListeners.delete(f);
}

export function getProfile(): Profile {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Profile>) : {};
    cache = { name: saved.name ?? '', rating: saved.rating ?? START_RATING, games: Array.isArray(saved.games) ? saved.games : [], avatar: saved.avatar, garden: saved.garden ?? {} };
  } catch {
    cache = { name: '', rating: START_RATING, games: [] };
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable */
  }
}

export function setName(name: string): void {
  getProfile().name = name.trim().slice(0, 24);
  persist();
}

/** Elo change for one game against a computer level (K = 32). */
export function ratingDelta(rating: number, level: number, score: 0 | 0.5 | 1): number {
  const expected = 1 / (1 + Math.pow(10, ((LEVEL_RATING[level] ?? START_RATING) - rating) / 400));
  return Math.round(32 * (score - expected));
}

/** Store a finished game; only games against the computer move the rating. */
export function recordGame(rec: Omit<GameRecord, 'id' | 'at' | 'ratingBefore' | 'ratingAfter'>): GameRecord {
  const p = getProfile();
  if (rec.key) {
    const dup = p.games.find((g) => g.key === rec.key);
    if (dup) return dup;
  }
  const full: GameRecord = { ...rec, id: Math.random().toString(36).slice(2, 10), at: new Date().toISOString() };
  if (rec.mode === 'ai' && rec.level !== undefined && rec.mySide !== null && rec.plies >= 2) {
    const score = rec.winner === null ? 0.5 : rec.winner === rec.mySide ? 1 : 0;
    full.ratingBefore = p.rating;
    p.rating = Math.max(100, p.rating + ratingDelta(p.rating, rec.level, score));
    full.ratingAfter = p.rating;
  }
  p.games.unshift(full);
  if (p.games.length > MAX_GAMES) p.games.length = MAX_GAMES;
  persist();
  recordedListeners.forEach((f) => f(full));
  return full;
}

export function getGame(id: string): GameRecord | undefined {
  return getProfile().games.find((g) => g.id === id);
}

export function deleteGame(id: string): void {
  const p = getProfile();
  p.games = p.games.filter((g) => g.id !== id);
  persist();
}

export function outcome(g: GameRecord): 'win' | 'loss' | 'draw' | 'none' {
  if (g.winner === null) return 'draw';
  if (g.mySide === null) return 'none';
  return g.winner === g.mySide ? 'win' : 'loss';
}

export function stats(): Stats {
  const p = getProfile();
  const s: Stats = { played: 0, wins: 0, losses: 0, draws: 0, bestLevel: 0, puzzles: solvedIds().length, streak: dailyState().streak };
  for (const g of p.games) {
    if (g.mySide === null) continue; // two players at one device: nobody's score
    s.played++;
    const o = outcome(g);
    if (o === 'win') {
      s.wins++;
      if (g.mode === 'ai' && g.level !== undefined) s.bestLevel = Math.max(s.bestLevel, g.level);
    } else if (o === 'loss') s.losses++;
    else s.draws++;
  }
  return s;
}

/** Merge games from another device: unknown ids are added, the list stays newest first. */
export function mergeGames(incoming: GameRecord[]): number {
  const p = getProfile();
  const known = new Set(p.games.map((g) => g.id));
  const fresh = incoming.filter((g) => !known.has(g.id));
  if (!fresh.length) return 0;
  p.games = [...p.games, ...fresh].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, MAX_GAMES);
  persist();
  return fresh.length;
}

export function setRating(r: number): void {
  getProfile().rating = r;
  persist();
}

/** Test helper. */
export function resetProfileCache(): void {
  cache = null;
}

export function setAvatar(type: number, side: Side): void {
  getProfile().avatar = { type, side };
  persist();
}

/**
 * Count a finished garden game. `result` is from the player's side; null for two players at one device,
 * which counts as played but not as anyone's win.
 */
export function recordGarden(game: GardenGame, result: 'win' | 'draw' | 'loss' | null): void {
  const p = getProfile();
  p.garden ??= {};
  const g = (p.garden[game] ??= { played: 0, wins: 0, draws: 0, losses: 0 });
  g.played++;
  if (result === 'win') g.wins++;
  else if (result === 'draw') g.draws++;
  else if (result === 'loss') g.losses++;
  persist();
}

/** Ratings after each rated game, oldest first, ending with the current rating. */
export function ratingSeries(): number[] {
  const p = getProfile();
  const rated = p.games.filter((g) => g.ratingBefore !== undefined && g.ratingAfter !== undefined).reverse();
  if (!rated.length) return [p.rating];
  return [rated[0].ratingBefore!, ...rated.map((g) => g.ratingAfter!)];
}

/** Wins, draws and losses against each computer level, and as each colour. */
export function records(): { levels: Record<number, { w: number; d: number; l: number }>; colours: [{ w: number; d: number; l: number }, { w: number; d: number; l: number }] } {
  const levels: Record<number, { w: number; d: number; l: number }> = {};
  const colours: [{ w: number; d: number; l: number }, { w: number; d: number; l: number }] = [{ w: 0, d: 0, l: 0 }, { w: 0, d: 0, l: 0 }];
  for (const g of getProfile().games) {
    if (g.mySide === null) continue;
    const o = outcome(g);
    const k = o === 'win' ? 'w' : o === 'loss' ? 'l' : 'd';
    colours[g.mySide][k]++;
    if (g.mode === 'ai' && g.level !== undefined) (levels[g.level] ??= { w: 0, d: 0, l: 0 })[k]++;
  }
  return { levels, colours };
}

// --- a copy of everything, for players without an account --------------------------------------

/** What makes up a player's progress in this browser. Rooms in progress and client ids are left out. */
const PROGRESS_KEY = /^(zurafa\.(profile|course|daily|prefs|shatranj|nard|toguz|sh\.[a-z]+)|tc\.(puzzles|level|rules)|lang)$/;

export function exportProgress(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (PROGRESS_KEY.test(k)) data[k] = localStorage.getItem(k)!;
  }
  return JSON.stringify({ app: 'zurafa', v: 1, at: new Date().toISOString(), data }, null, 1);
}

/** Restore a copy made by exportProgress. Returns false when the file is not one. */
export function importProgress(text: string): boolean {
  try {
    const f = JSON.parse(text) as { app?: string; v?: number; data?: Record<string, unknown> };
    if (f.app !== 'zurafa' || f.v !== 1 || !f.data || typeof f.data !== 'object') return false;
    const entries = Object.entries(f.data).filter(([k, v]) => PROGRESS_KEY.test(k) && typeof v === 'string') as [string, string][];
    if (!entries.length) return false;
    for (const [k, v] of entries) localStorage.setItem(k, v);
    cache = null;
    return true;
  } catch {
    return false;
  }
}

/** Forget all progress in this browser. */
export function resetProgress(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (PROGRESS_KEY.test(k) && k !== 'lang' && k !== 'zurafa.prefs') keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  cache = null;
}
