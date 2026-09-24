import { describe, it, expect, beforeEach } from 'vitest';
import { getProfile, recordGame, ratingDelta, stats, resetProfileCache, START_RATING } from '../src/profile';
import { DEFAULT_RULES } from '../src/engine/position';

// Node has no Web Storage; a tiny in-memory stand-in is enough for the store.
const mem = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
} as Storage;

describe('local profile', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProfileCache();
  });

  it('starts at the base rating with no games', () => {
    expect(getProfile().rating).toBe(START_RATING);
    expect(stats().played).toBe(0);
  });

  it('elo delta is symmetric around an equal opponent', () => {
    expect(ratingDelta(1200, 3, 1)).toBe(16);
    expect(ratingDelta(1200, 3, 0)).toBe(-16);
    expect(ratingDelta(1200, 3, 0.5)).toBe(0);
    expect(ratingDelta(1200, 6, 1)).toBeGreaterThan(ratingDelta(1200, 1, 1));
  });

  it('records games and moves the rating only against the computer', () => {
    const base = { rules: DEFAULT_RULES, reason: 'checkmate' as const, plies: 40, moves: [] };
    recordGame({ ...base, mode: 'ai', level: 6, mySide: 0, winner: 0 });
    const afterWin = getProfile().rating;
    expect(afterWin).toBeGreaterThan(START_RATING);
    recordGame({ ...base, mode: 'online', mySide: 1, winner: 0 });
    expect(getProfile().rating).toBe(afterWin);
    recordGame({ ...base, mode: 'local', mySide: null, winner: 1 });
    const s = stats();
    expect(s.played).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.bestLevel).toBe(6);
    expect(getProfile().games).toHaveLength(3);
  });
});
