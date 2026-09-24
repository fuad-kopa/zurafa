import { describe, it, expect } from 'vitest';
import { sqFromName as sq } from '../src/engine/geometry';
import * as P from '../src/engine/pieces';
import { Position } from '../src/engine/position';
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
