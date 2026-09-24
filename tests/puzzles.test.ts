import { describe, it, expect } from 'vitest';
import { PUZZLES, solutions, buildPuzzle } from '../src/puzzles';
import { moveToString } from '../src/engine/game';

describe('puzzles', () => {
  for (const p of PUZZLES) {
    it(`${p.id} is solvable in one move`, () => {
      const game = buildPuzzle(p);
      const sols = solutions(p).map(moveToString);
      console.log(p.id, 'legal', game.legalMoves().length, 'solutions', sols.join(' '));
      expect(sols.length).toBeGreaterThan(0);
    });
  }
  it('swap puzzle leaves the swap as the only legal move', () => {
    const p = PUZZLES.find((x) => x.id === 'swap')!;
    expect(buildPuzzle(p).legalMoves().map(moveToString)).toEqual(['f1=a5']);
  });
});
