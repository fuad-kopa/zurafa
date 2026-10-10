import { describe, it, expect } from 'vitest';
import { DAILY } from '../src/puzzles-daily';
import { solutions, buildPuzzle, forcedReply, matingMoves, dailyPuzzle, findPuzzle } from '../src/puzzles';

describe('daily puzzle pool', () => {
  it('has a puzzle for every day and finds them by id', () => {
    expect(DAILY.length).toBeGreaterThan(0);
    const p = dailyPuzzle(new Date('2026-10-11T12:00:00'));
    expect(DAILY).toContain(p);
    expect(findPuzzle(p.id)).toBe(p);
  });

  it('every puzzle is solvable, and mate-in-two keys survive the best defence', () => {
    for (const p of DAILY) {
      const sols = solutions(p);
      expect(sols.length, p.id).toBeGreaterThan(0);
      if (p.goal.type === 'mate2') {
        const game = buildPuzzle(p);
        expect(matingMoves(game).length, `${p.id} has no mate in one`).toBe(0);
        for (const m of sols) {
          game.play(m);
          const reply = forcedReply(game);
          expect(reply, p.id).not.toBeNull();
          game.play(reply!);
          expect(matingMoves(game).length, p.id).toBeGreaterThan(0);
          game.undo();
          game.undo();
        }
      }
    }
  }, 120000);
});
