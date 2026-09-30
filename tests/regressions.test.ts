// Focused regressions for engine bugs found by tests/fuzz.test.ts.

import { describe, it, expect } from 'vitest';
import { sqFromName as sq, BLACK, WHITE } from '../src/engine/geometry';
import * as P from '../src/engine/pieces';
import { Position, DEFAULT_RULES, makeMoveCode } from '../src/engine/position';
import { Game, moveFromString } from '../src/engine/game';
import { BATTLES, battleSpec } from '../src/battles';

describe('regressions', () => {
  it('two princes: capturing the one royalSq pointed at leaves check detection on the survivor', () => {
    // Isfahan gives Black two king's pawns, so two princes can stand at once.
    const p = new Position();
    p.clear();
    p.put(sq('a1'), P.KING);
    p.put(sq('c5'), -P.PRINCE);
    p.put(sq('h5'), -P.PRINCE); // placed last: royalSq points here
    p.put(sq('h1'), P.ROOK);
    expect(p.inCheck(BLACK)).toBe(false); // two royals: no check
    p.make(makeMoveCode(sq('h1'), sq('h5')));
    expect(p.royalCount(BLACK)).toBe(1);
    expect(p.topRoyalSq(BLACK)).toBe(sq('c5'));
    expect(p.inCheck(BLACK)).toBe(true); // the rook on h5 sees c5 along the fifth rank
    // And the prince may not stay on the rank.
    const bad = p.legalMoves().filter((m) => (m & 127) === sq('c5') && ((m >> 7) & 127) === sq('d5'));
    expect(bad).toEqual([]);
    p.unmake();
    expect(p.board[p.royalSq[4 + P.PRINCE]]).toBe(-P.PRINCE);
  });

  it('two princes promoted in play: after one falls, a move ignoring the check on the other is not legal', () => {
    const g = Game.fromSetup(DEFAULT_RULES, [
      [sq('k10'), -P.KING], [sq('c2'), -P.PAWN_KING], [sq('h2'), -P.PAWN_KING], [sq('k7'), -P.KNIGHT], [sq('a1'), -P.ROOK],
      [sq('e5'), P.KING], [sq('k5'), P.ROOK], [sq('c5'), P.ROOK],
    ], BLACK);
    // Princes appear on h1 and c1; White takes the king, then the prince on c1.
    for (const m of ['h2-h1', 'e5-e6', 'c2-c1', 'e6-e5', 'k7-i8', 'k5-k10', 'i8-g9', 'c5-c1']) g.play(moveFromString(m));
    // Black's last royal, the prince on h1, is attacked along the first rank: the rook on a1 may not wander off.
    expect(g.pos.royalCount(BLACK)).toBe(1);
    expect(g.inCheck()).toBe(true);
    expect(g.isLegal(moveFromString('a1-a2'))).toBe(false);
    expect(g.isLegal(moveFromString('a1-c1'))).toBe(true);
  });

  it('a hill no longer cancels the hash of a White pawn of pawns standing on it', () => {
    const men: [number, number][] = [[sq('a1'), P.KING], [sq('k10'), -P.KING]];
    const onHill = Game.fromSetup(DEFAULT_RULES, [...men, [sq('e5'), P.PAWN_PAWN_1]], WHITE, [0, 0], [sq('e5') + 256]);
    const plain = Game.fromSetup(DEFAULT_RULES, men, WHITE);
    expect([onHill.pos.hashLo, onHill.pos.hashHi]).not.toEqual([plain.pos.hashLo, plain.pos.hashHi]);
  });

  it('clone() keeps the terrain and the hash', () => {
    const g = Game.fromSpec(DEFAULT_RULES, battleSpec(BATTLES[0]));
    g.play(g.legalMoves()[0]);
    const c = g.pos.clone();
    expect(Array.from(c.terrain)).toEqual(Array.from(g.pos.terrain));
    expect([c.hashLo, c.hashHi, c.side, c.score]).toEqual([g.pos.hashLo, g.pos.hashHi, g.pos.side, g.pos.score]);
    expect(c.legalMoves().sort()).toEqual(g.pos.legalMoves().sort());
  });
});
