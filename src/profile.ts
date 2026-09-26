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
}

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

export function getProfile(): Profile {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Profile>) : {};
    cache = { name: saved.name ?? '', rating: saved.rating ?? START_RATING, games: Array.isArray(saved.games) ? saved.games : [] };
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

/** Test helper. */
export function resetProfileCache(): void {
  cache = null;
}
