import { describe, it, expect } from 'vitest';
import { sqFromName as sq } from '../src/engine/geometry';
import * as P from '../src/engine/pieces';
import { Position, DEFAULT_RULES } from '../src/engine/position';
import { Game, moveToString } from '../src/engine/game';
import { Searcher, MATE } from '../src/ai/search';

describe('search', () => {
  it('finds a mate in one', () => {
    const p = new Position();
    p.clear();
    p.put(sq('a1'), -P.KING);
    p.put(sq('b3'), P.KING);
    p.put(sq('j5'), P.ROOK);
    p.swapUsed = [1, 1];
    const r = new Searcher().search(p, { maxDepth: 4, maxNodes: 1e6, maxTimeMs: 5000, noise: 0 });
    expect(r.score).toBeGreaterThan(MATE - 10);
  });

  it('wins material and reports speed from the opening', () => {
    const p = new Position();
    const t0 = performance.now();
    const r = new Searcher().search(p, { maxDepth: 30, maxNodes: 1e9, maxTimeMs: 3000, noise: 0 });
    const dt = performance.now() - t0;
    console.log(`depth ${r.depth}, ${r.nodes} nodes, ${Math.round(r.nodes / dt * 1000)} nps, pv ${r.pv.map(moveToString).join(' ')}`);
    expect(r.depth).toBeGreaterThanOrEqual(4);
  });

  it('leaves the position intact after an aborted search', () => {
    const g = new Game();
    const s = new Searcher();
    for (const noise of [0, 60]) {
      const lo = g.pos.hashLo, hi = g.pos.hashHi, side = g.pos.side;
      const r = s.search(g.pos, { maxDepth: 30, maxNodes: 3000, maxTimeMs: 5000, noise }, g.hashList());
      expect(r.move).not.toBeNull();
      expect([g.pos.hashLo, g.pos.hashHi, g.pos.side]).toEqual([lo, hi, side]);
      expect(g.legalMoves().includes(r.move!)).toBe(true);
    }
  });

  it('plays a full self-play game without errors', () => {
    const g = new Game();
    const s = new Searcher();
    for (let i = 0; i < 120 && !g.result; i++) {
      const r = s.search(g.pos, { maxDepth: 3, maxNodes: 40_000, maxTimeMs: 2000, noise: 0 }, g.hashList());
      expect(r.move).not.toBeNull();
      g.play(r.move!);
    }
    console.log(`self-play: ${g.ply} plies, result ${JSON.stringify(g.result)}, material ${g.pos.score}`);
  }, 120_000);
});

describe('search and the rule options', () => {
  // White can take Black's last man with the rook; without the bare-king rule that is just a pawn's worth,
  // with it the game is over on the spot.
  const bareable = (bareKingWins: boolean): Position => {
    const p = new Position({ ...DEFAULT_RULES, bareKingWins });
    p.clear();
    p.put(sq('a1'), -P.KING);
    p.put(sq('j9'), -P.GENERAL);
    p.put(sq('e5'), P.KING);
    p.put(sq('j5'), P.ROOK);
    p.swapUsed = [1, 1];
    return p;
  };

  it('knows that baring the enemy king wins when the rule is on', () => {
    const on = new Searcher().search(bareable(true), { maxDepth: 3, maxNodes: 1e6, maxTimeMs: 5000, noise: 0 });
    expect(on.score).toBeGreaterThan(MATE - 10);
    expect(moveToString(on.move!)).toBe('j5-j9');
    const off = new Searcher().search(bareable(false), { maxDepth: 3, maxNodes: 1e6, maxTimeMs: 5000, noise: 0 });
    expect(off.score).toBeLessThan(MATE - 1000);
  });
});
