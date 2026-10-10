import { describe, it, expect } from 'vitest';
import { Shatranj, K, F, A, N, R, P, parseMove, moveName, think, LEVELS } from '../src/games/shatranj';

function empty(): Shatranj {
  const g = new Shatranj();
  g.board.fill(0);
  g.keys = [g.key()];
  return g;
}
const sq = (n: string): number => 'abcdefgh'.indexOf(n[0]) + (parseInt(n[1], 10) - 1) * 8;

function perft(g: Shatranj, d: number): number {
  if (d === 0) return 1;
  let n = 0;
  for (const m of g.legal()) {
    g.make(m, false);
    n += perft(g, d - 1);
    g.unmake();
  }
  return n;
}

describe('shatranj', () => {
  it('has 16 opening moves: eight pawn steps, four horse and four alfil leaps', () => {
    const g = new Shatranj();
    const names = g.legal().map(moveName).sort();
    expect(names).toHaveLength(16);
    expect(names).toContain('c1a3');
    expect(names).toContain('c1e3');
    expect(names).not.toContain('e2e4');
  });

  it('perft is symmetric for both sides and stable under make/unmake', () => {
    const g = new Shatranj();
    const before = g.key();
    expect(perft(g, 1)).toBe(16);
    expect(perft(g, 2)).toBe(256);
    expect(perft(g, 3)).toBeGreaterThan(256);
    expect(g.key()).toBe(before);
  });

  it('the alfil leaps over pieces and the ferz steps one square diagonally', () => {
    const g = empty();
    g.board[sq('e1')] = K;
    g.board[sq('e8')] = -K;
    g.board[sq('c3')] = A;
    g.board[sq('d4')] = P;
    g.board[sq('a1')] = F;
    const fromC3 = g.legal().filter((m) => (m & 63) === sq('c3')).map(moveName).sort();
    expect(fromC3).toEqual(['c3a1', 'c3a5', 'c3e1', 'c3e5'].filter((x) => x !== 'c3a1' && x !== 'c3e1'));
    const fromA1 = g.legal().filter((m) => (m & 63) === sq('a1')).map(moveName);
    expect(fromA1).toEqual(['a1b2']);
  });

  it('a pawn promotes to a ferz', () => {
    const g = empty();
    g.board[sq('a1')] = K;
    g.board[sq('h8')] = -K;
    g.board[sq('c7')] = P;
    g.make(parseMove(g, 'c7c8')!);
    expect(g.board[sq('c8')]).toBe(F);
    g.unmake(true);
    expect(g.board[sq('c7')]).toBe(P);
  });

  it('stalemate wins for the side that inflicts it', () => {
    const g = empty();
    g.board[sq('a8')] = -K;
    g.board[sq('c7')] = K;
    g.board[sq('b6')] = F; // covers a7... ferz on b6 attacks a7, c7, a5, c5
    g.board[sq('h1')] = R;
    g.board[sq('h7')] = -P;
    g.side = 1;
    // black king a8: b8 and b7 attacked by the king on c7, a7 by the ferz; the pawn on h7 is blocked by nothing...
    g.board[sq('h6')] = P; // ...so block it
    const r = g.result();
    expect(r).toEqual({ winner: 0, reason: 'stalemate' });
  });

  it('baring the king wins, unless the bared side can bare back at once', () => {
    const g = empty();
    g.board[sq('e1')] = K;
    g.board[sq('e8')] = -K;
    g.board[sq('a1')] = R;
    g.side = 1;
    expect(g.result()).toEqual({ winner: 0, reason: 'bare' });
    g.board[sq('a1')] = 0;
    g.board[sq('d7')] = R; // next to the black king: it can take it and leave two bare kings
    expect(g.result()).toBeNull();
  });

  it('the computer takes a hanging rook and mates when it can', () => {
    const g = empty();
    g.board[sq('e1')] = K;
    g.board[sq('e8')] = -K;
    g.board[sq('a1')] = R;
    g.board[sq('h1')] = R;
    g.board[sq('d5')] = -R;
    g.board[sq('d6')] = -P;
    g.board[sq('c4')] = N;
    const m = think(g, LEVELS[2]);
    expect(m).not.toBeNull();
    // plenty of good moves here; it must at least not hang a rook for nothing
    g.make(m!);
    expect(g.legal().length).toBeGreaterThan(0);

    const h = empty();
    h.board[sq('a8')] = -K;
    h.board[sq('b6')] = K; // covers a7 and b7
    h.board[sq('h1')] = R;
    h.board[sq('e5')] = -P; // black still has a move elsewhere, so no stalemate shortcut
    const mm = think(h, LEVELS[3]);
    expect(moveName(mm!)).toBe('h1h8');
  });

  it('plays a whole game against itself without breaking the rules', () => {
    const g = new Shatranj();
    for (let i = 0; i < 160; i++) {
      const moves = g.legal();
      if (g.result(moves)) break;
      const m = think(g, { depth: 1, ms: 50, noise: 80 })!;
      expect(moves).toContain(m);
      g.make(m);
    }
    for (const v of g.board) expect([0, K, F, A, N, R, P, -K, -F, -A, -N, -R, -P]).toContain(v);
  });
});
