import { describe, it, expect } from 'vitest';
import { Shatranj, VARIANTS, K, F, A, N, R, P, D, PASS, DIE, DIE_PIECE, parseMove, moveText, sqText, mFrom, mTo, think, LEVELS, citadelXY } from '../src/games/shatranj';

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

describe('oblong chess, 4x16 with a die', () => {
  it('sets both armies at the narrow ends, turned about: the shahs on c1 and b16', () => {
    const g = new Shatranj('oblong');
    const v = g.v;
    expect(g.board[g.g.at(2, 0)]).toBe(K);
    expect(g.board[g.g.at(1, 15)]).toBe(-K);
    expect(sqText(v, g.kingSq(1))).toBe('b16');
    let men = 0;
    for (const x of g.board) if (x) men++;
    expect(men).toBe(32);
  });

  it('the die names the piece: 1 pawn, 2 rukh, 3 horse, 4 alfil, 5 ferz, 6 shah', () => {
    const g = new Shatranj('oblong');
    g.die = 1;
    expect(g.legal().every((m) => Math.abs(g.board[mFrom(m)]) === P)).toBe(true);
    expect(g.legal()).toHaveLength(4);
    g.die = 3;
    expect(g.legal().every((m) => Math.abs(g.board[mFrom(m)]) === N)).toBe(true);
    expect(DIE_PIECE[6]).toBe(K);
  });

  it('a die with no move passes the turn, and the pass is recorded and undone', () => {
    const g = new Shatranj('oblong');
    g.board.fill(0);
    g.board[g.g.at(2, 0)] = K;
    g.board[g.g.at(1, 15)] = -K;
    g.die = 1; // no pawns to move
    expect(g.legal()).toEqual([PASS]);
    const key = g.key();
    g.make(PASS);
    expect(g.side).toBe(1);
    expect(g.die).toBe(0);
    g.unmake(true);
    expect(g.key()).toBe(key);
    expect(g.die).toBe(1);
  });

  it('die rolls and passes travel in the move list', () => {
    const g = new Shatranj('oblong');
    expect(parseMove(g, 'd1')).toBe(DIE);
    expect(g.die).toBe(1);
    const m = parseMove(g, 'a6a7');
    expect(m).not.toBeNull();
    g.make(m!);
    expect(parseMove(g, 'd2')).toBe(DIE);
    expect(parseMove(g, 'pass')).toBeNull(); // the rukhs can move, so no pass
    expect(moveText(g.v, PASS)).toBe('pass');
  });

  it('checks do not bind; taking the shah ends the game', () => {
    const g = new Shatranj('oblong');
    g.board.fill(0);
    g.board[g.g.at(2, 0)] = K;
    g.board[g.g.at(2, 15)] = -K;
    g.board[g.g.at(2, 8)] = -R; // gives check down the c-file
    g.die = 1;
    g.board[g.g.at(0, 3)] = P;
    expect(g.legal().every((m) => Math.abs(g.board[mFrom(m)]) === P)).toBe(true); // the pawn moves although the shah is in check
    g.side = 1;
    g.die = 2;
    const take = g.legal().find((m) => mTo(m) === g.g.at(2, 0));
    expect(take).toBeDefined();
    g.make(take!);
    expect(g.result()).toEqual({ winner: 1, reason: 'king' });
  });

  it('the computer plays a legal move for the die it was given', () => {
    const g = new Shatranj('oblong');
    for (let i = 0; i < 40; i++) {
      g.die = 1 + Math.floor(Math.random() * 6);
      const moves = g.legal();
      if (g.result(moves)) break;
      const m = think(g, LEVELS[1]);
      expect(moves).toContain(m);
      g.make(m!);
    }
  });
});

describe('complete chess, 10x10 with dabbabas', () => {
  it('sets ten pawns on the third rank and dabbabas beside the shah and the ferz', () => {
    const g = new Shatranj('tamma');
    expect(g.board[g.g.at(3, 0)]).toBe(D);
    expect(g.board[g.g.at(6, 0)]).toBe(D);
    expect(g.board[g.g.at(4, 0)]).toBe(K);
    expect(g.board[g.g.at(5, 0)]).toBe(F);
    for (let x = 0; x < 10; x++) expect(g.board[g.g.at(x, 2)]).toBe(P);
    for (let x = 0; x < 10; x++) expect(g.board[g.g.at(x, 1)]).toBe(0);
    expect(g.board[g.g.at(4, 9)]).toBe(-K);
  });

  it('the dabbaba steps one square any way, like the shah, and both take and are taken', () => {
    const g = new Shatranj('tamma');
    g.board.fill(0);
    g.board[g.g.at(4, 0)] = K;
    g.board[g.g.at(4, 9)] = -K;
    g.board[g.g.at(5, 5)] = D;
    g.board[g.g.at(6, 6)] = -P;
    const from = g.legal().filter((m) => mFrom(m) === g.g.at(5, 5)).map((m) => sqText(g.v, mTo(m))).sort();
    expect(from).toEqual(['e5', 'e6', 'e7', 'f5', 'f7', 'g5', 'g6', 'g7']);
    expect(perft(g, 2)).toBeGreaterThan(0);
  });

  it('a pawn may not reach the last rank while its side has a ferz', () => {
    const g = new Shatranj('tamma');
    g.board.fill(0);
    g.board[g.g.at(0, 0)] = K;
    g.board[g.g.at(9, 9)] = -K;
    g.board[g.g.at(4, 8)] = P;
    g.board[g.g.at(5, 0)] = F;
    expect(g.legal().some((m) => mFrom(m) === g.g.at(4, 8))).toBe(false);
    g.board[g.g.at(5, 0)] = 0;
    const promo = g.legal().find((m) => mFrom(m) === g.g.at(4, 8));
    expect(promo).toBeDefined();
    g.make(promo!);
    expect(g.board[g.g.at(4, 9)]).toBe(F);
  });

  it('a shah on the enemy shah\'s square wins half the stake, and a bare shah plays on', () => {
    const g = new Shatranj('tamma');
    g.board.fill(0);
    g.board[g.g.at(4, 9)] = K;
    g.board[g.g.at(0, 5)] = -K;
    g.board[g.g.at(0, 0)] = -R;
    expect(g.result()).toEqual({ winner: 0, reason: 'half' });
    g.board[g.g.at(4, 9)] = 0;
    g.board[g.g.at(4, 4)] = K;
    g.side = 1;
    expect(g.result()).toBeNull(); // White is bare, but the decimal game has no bare-king rule
  });
});

describe('citadel chess, 10x10 with four citadels', () => {
  it('has the citadels behind the corners and dabbabas that run like bishops', () => {
    const g = new Shatranj('husun');
    expect(citadelXY(g.v, 0)).toEqual([0, -1]);
    expect(citadelXY(g.v, 3)).toEqual([9, 10]);
    expect(sqText(g.v, g.g.citadels[2])).toBe('a11');
    g.board.fill(0);
    g.board[g.g.at(4, 0)] = K;
    g.board[g.g.at(4, 9)] = -K;
    g.board[g.g.at(2, 2)] = D;
    g.board[g.g.at(5, 5)] = -P;
    const from = g.legal().filter((m) => mFrom(m) === g.g.at(2, 2)).map((m) => sqText(g.v, mTo(m))).sort();
    expect(from).toEqual(['a1', 'a5', 'b2', 'b4', 'd2', 'd4', 'e5', 'f6']); // e1 holds its own shah
    expect(perft(new Shatranj('husun'), 1)).toBe(10 + 4 + 4 + 0); // ten pawn steps, four horse and four alfil leaps; the bishops are walled in
  });

  it('a king next to a far citadel may step in, and the game is drawn', () => {
    const g = new Shatranj('husun');
    g.board.fill(0);
    g.board[g.g.at(1, 9)] = K;
    g.board[g.g.at(8, 0)] = -K;
    g.board[g.g.at(9, 5)] = -R;
    const into = g.legal().find((m) => mTo(m) === g.g.citadels[2]);
    expect(into).toBeDefined();
    expect(moveText(g.v, into!)).toBe('b10a11');
    g.make(into!);
    expect(g.result()).toEqual({ winner: null, reason: 'citadel' });
    expect(parseMove(new Shatranj('husun'), 'b10a11')).toBeNull(); // not from the opening array
  });

  it('a king may not enter the citadels on its own side', () => {
    const g = new Shatranj('husun');
    g.board.fill(0);
    g.board[g.g.at(0, 0)] = K;
    g.board[g.g.at(9, 9)] = -K;
    expect(g.legal().some((m) => mTo(m) >= g.g.squares)).toBe(false);
  });

  it('the strong level beats the weak one from the opening often enough', () => {
    let wins = 0;
    for (let k = 0; k < 2; k++) {
      const g = new Shatranj('husun');
      // without a bare-king rule a lone shah takes a while to mate, so the games run long
      for (let i = 0; i < 220; i++) {
        const moves = g.legal();
        const r = g.result(moves);
        if (r) {
          if (r.winner === 0) wins++;
          break;
        }
        const m = think(g, g.side === 0 ? { depth: 3, ms: 120, noise: 0 } : { depth: 1, ms: 40, noise: 120 })!;
        expect(moves).toContain(m);
        g.make(m);
      }
    }
    expect(wins).toBeGreaterThanOrEqual(1);
  }, 120000);
});

describe('all variants', () => {
  it('make/unmake leaves every position intact', () => {
    for (const id of Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]) {
      const g = new Shatranj(id);
      if (g.v.dice) g.die = 6;
      const before = g.key();
      perft(g, 2);
      expect(g.key()).toBe(before);
    }
    expect([K, F, A, N, R, P, D]).toHaveLength(7);
  });
});
