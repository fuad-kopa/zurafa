import { describe, it, expect } from 'vitest';
import { PUZZLES, solutions, buildPuzzle, forcedReply, matingMoves, isMultiMove } from '../src/puzzles';
import { moveToString } from '../src/engine/game';

describe('puzzles', () => {
  for (const p of PUZZLES) {
    it(`${p.id} is solvable${isMultiMove(p) ? ' in two' : ''}`, () => {
      const game = buildPuzzle(p);
      const sols = solutions(p);
      console.log(p.id, 'legal', game.legalMoves().length, 'solutions', sols.map(moveToString).join(' '));
      expect(sols.length).toBeGreaterThan(0);
      if (isMultiMove(p)) {
        // Every solution must survive the hardest reply and still mate.
        for (const m of sols) {
          game.play(m);
          const reply = forcedReply(game);
          expect(reply).not.toBeNull();
          game.play(reply!);
          expect(matingMoves(game).length).toBeGreaterThan(0);
          game.undo(); game.undo();
        }
      }
    });
  }
  it('swap puzzle leaves the swap as the only legal move', () => {
    const p = PUZZLES.find((x) => x.id === 'swap')!;
    expect(buildPuzzle(p).legalMoves().map(moveToString)).toEqual(['f1=a5']);
  });
});
