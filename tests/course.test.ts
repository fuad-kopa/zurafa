import { describe, it, expect } from 'vitest';
import COURSE from '../src/course/lessons.json';
import { Lesson, Unit, isSolo, soloStart, solveSolo } from '../src/course/core';
import { Game } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/position';
import { matingMoves } from '../src/puzzles';

const units = (COURSE as unknown as { units: Unit[] }).units;
const all: Lesson[] = units.flatMap((u) => u.lessons);

describe('course', () => {
  it('has at least 200 lessons with unique ids', () => {
    expect(all.length).toBeGreaterThanOrEqual(200);
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
  });

  it('one-piece lessons: exactly one white piece, every other man is Black, best matches the solver', () => {
    for (const l of all.filter(isSolo)) {
      const white = l.men.filter(([, p]) => p > 0);
      expect(white.length, l.id).toBe(1);
      expect(l.men.every(([, p]) => p !== 0), l.id).toBe(true);
      const occupied = new Set(l.men.map(([sq]) => sq));
      expect(occupied.size, `${l.id} two men on one square`).toBe(l.men.length);
      for (const s of l.stars ?? []) expect(occupied.has(s), `${l.id} star under a piece`).toBe(false);
      const path = solveSolo(l, soloStart(l), l.best + 1);
      expect(path, l.id).not.toBeNull();
      expect(path!.length, l.id).toBe(l.best);
    }
  });

  it('mate and stalemate lessons are legal and have a winning move of the right kind', () => {
    for (const l of all.filter((x) => !isSolo(x))) {
      const g = Game.fromSpec(DEFAULT_RULES, { men: l.men, side: 0, swapUsed: [1, 1] });
      expect(g.pos.inCheck(1), `${l.id} black already in check`).toBe(false);
      const want = l.kind === 'mate' ? 'checkmate' : 'stalemate';
      const wins = matingMoves(g).filter((m) => { g.play(m); const r = g.result?.reason; g.undo(); return r === want; });
      expect(wins.length, l.id).toBeGreaterThan(0);
    }
  });
});
