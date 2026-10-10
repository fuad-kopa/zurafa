// Shatranj: the 8x8 chess of the Caliphate and of Timur's court, the "lesser chess" beside the great game.
// Rules as given by Murray (1913) after al-Adli and as-Suli: the ferz steps one square diagonally, the alfil
// leaps exactly two squares diagonally over anything, pawns step one square and promote to a ferz, no castling.
// A player wins by checkmate, by stalemating the opponent, or by baring the opponent's king; a bared side that
// can bare the other king at once on its reply draws instead.

export const K = 1;
export const F = 2; // ferz (counsellor)
export const A = 3; // alfil (elephant)
export const N = 4; // faras (horse)
export const R = 5; // rukh
export const P = 6; // baidaq (pawn)

export type Side = 0 | 1;
/** from | to << 6 */
export type Move = number;
export const mFrom = (m: Move): number => m & 63;
export const mTo = (m: Move): number => m >> 6;
export const mk = (from: number, to: number): Move => from | (to << 6);

const X = (s: number): number => s & 7;
const Y = (s: number): number => s >> 3;

function table(offsets: [number, number][]): number[][] {
  const out: number[][] = [];
  for (let s = 0; s < 64; s++) {
    const l: number[] = [];
    for (const [dx, dy] of offsets) {
      const x = X(s) + dx;
      const y = Y(s) + dy;
      if (x >= 0 && x < 8 && y >= 0 && y < 8) l.push(y * 8 + x);
    }
    out.push(l);
  }
  return out;
}
const KING_T = table([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
const FERZ_T = table([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
const ALFIL_T = table([[2, 2], [2, -2], [-2, 2], [-2, -2]]);
const KNIGHT_T = table([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]);
const ROOK_D: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const BACK = [R, N, A, F, K, A, N, R];

export class Shatranj {
  /** +type White, -type Black; index = rank * 8 + file, rank 0 is White's back rank. */
  board = new Int8Array(64);
  side: Side = 0;
  /** half-moves since the last capture or pawn move */
  quiet = 0;
  /** position keys of the game so far, for repetition */
  keys: string[] = [];
  private stack: { m: Move; cap: number; promo: boolean; quiet: number }[] = [];

  constructor() {
    for (let x = 0; x < 8; x++) {
      this.board[x] = BACK[x];
      this.board[8 + x] = P;
      this.board[48 + x] = -P;
      this.board[56 + x] = -BACK[x];
    }
    this.keys.push(this.key());
  }

  clone(): Shatranj {
    const c = Object.create(Shatranj.prototype) as Shatranj;
    c.board = this.board.slice();
    c.side = this.side;
    c.quiet = this.quiet;
    c.keys = this.keys.slice();
    c.stack = [];
    return c;
  }

  key(): string {
    return this.side + String.fromCharCode(...Array.from(this.board, (v) => v + 80));
  }

  kingSq(side: Side): number {
    const k = side === 0 ? K : -K;
    return this.board.indexOf(k);
  }

  /** Is `sq` attacked by `by`? */
  attacked(sq: number, by: Side): boolean {
    const b = this.board;
    const s = by === 0 ? 1 : -1;
    for (const t of KING_T[sq]) if (b[t] === s * K) return true;
    for (const t of FERZ_T[sq]) if (b[t] === s * F) return true;
    for (const t of ALFIL_T[sq]) if (b[t] === s * A) return true;
    for (const t of KNIGHT_T[sq]) if (b[t] === s * N) return true;
    // a pawn of `by` attacks diagonally forward, so it stands one rank behind sq from its own point of view
    const py = Y(sq) - (by === 0 ? 1 : -1);
    if (py >= 0 && py < 8) {
      for (const dx of [-1, 1]) {
        const px = X(sq) + dx;
        if (px >= 0 && px < 8 && b[py * 8 + px] === s * P) return true;
      }
    }
    for (const [dx, dy] of ROOK_D) {
      let x = X(sq) + dx;
      let y = Y(sq) + dy;
      while (x >= 0 && x < 8 && y >= 0 && y < 8) {
        const v = b[y * 8 + x];
        if (v) {
          if (v === s * R) return true;
          break;
        }
        x += dx;
        y += dy;
      }
    }
    return false;
  }

  inCheck(side: Side = this.side): boolean {
    return this.attacked(this.kingSq(side), (1 - side) as Side);
  }

  /** Moves that obey piece movement, ignoring checks. */
  pseudo(capturesOnly = false): Move[] {
    const b = this.board;
    const me = this.side === 0 ? 1 : -1;
    const out: Move[] = [];
    const add = (f: number, t: number): void => {
      const v = b[t];
      if (v * me > 0) return;
      if (capturesOnly && !v) return;
      out.push(mk(f, t));
    };
    for (let s = 0; s < 64; s++) {
      const v = b[s] * me;
      if (v <= 0) continue;
      switch (v) {
        case K: for (const t of KING_T[s]) add(s, t); break;
        case F: for (const t of FERZ_T[s]) add(s, t); break;
        case A: for (const t of ALFIL_T[s]) add(s, t); break;
        case N: for (const t of KNIGHT_T[s]) add(s, t); break;
        case R:
          for (const [dx, dy] of ROOK_D) {
            let x = X(s) + dx;
            let y = Y(s) + dy;
            while (x >= 0 && x < 8 && y >= 0 && y < 8) {
              const t = y * 8 + x;
              if (b[t]) {
                if (b[t] * me < 0) out.push(mk(s, t));
                break;
              }
              if (!capturesOnly) out.push(mk(s, t));
              x += dx;
              y += dy;
            }
          }
          break;
        case P: {
          const y = Y(s) + me;
          if (y < 0 || y > 7) break;
          const fwd = y * 8 + X(s);
          if (!b[fwd] && (!capturesOnly || y === 0 || y === 7)) out.push(mk(s, fwd));
          for (const dx of [-1, 1]) {
            const x = X(s) + dx;
            if (x >= 0 && x < 8 && b[y * 8 + x] * me < 0) out.push(mk(s, y * 8 + x));
          }
          break;
        }
      }
    }
    return out;
  }

  legal(capturesOnly = false): Move[] {
    const side = this.side;
    return this.pseudo(capturesOnly).filter((m) => {
      this.make(m, false);
      const ok = !this.inCheck(side);
      this.unmake();
      return ok;
    });
  }

  make(m: Move, record = true): void {
    const f = mFrom(m);
    const t = mTo(m);
    const v = this.board[f];
    const cap = this.board[t];
    const promo = Math.abs(v) === P && (Y(t) === 0 || Y(t) === 7);
    this.stack.push({ m, cap, promo, quiet: this.quiet });
    this.board[t] = promo ? Math.sign(v) * F : v;
    this.board[f] = 0;
    this.quiet = cap || Math.abs(v) === P ? 0 : this.quiet + 1;
    this.side = (1 - this.side) as Side;
    if (record) this.keys.push(this.key());
  }

  unmake(record = false): void {
    const u = this.stack.pop()!;
    const f = mFrom(u.m);
    const t = mTo(u.m);
    const v = this.board[t];
    this.board[f] = u.promo ? Math.sign(v) * P : v;
    this.board[t] = u.cap;
    this.quiet = u.quiet;
    this.side = (1 - this.side) as Side;
    if (record) this.keys.pop();
  }

  /** Pieces other than the king. */
  army(side: Side): number {
    let n = 0;
    for (let s = 0; s < 64; s++) {
      const v = this.board[s];
      if (v && (v > 0) === (side === 0) && Math.abs(v) !== K) n++;
    }
    return n;
  }

  /** The result of the position, or null while the game goes on. */
  result(moves = this.legal()): Result | null {
    const s = this.side;
    const o = (1 - s) as Side;
    if (!moves.length) return this.inCheck() ? { winner: o, reason: 'mate' } : { winner: o, reason: 'stalemate' };
    const mine = this.army(s);
    const theirs = this.army(o);
    if (!mine && !theirs) return { winner: null, reason: 'bareBoth' };
    if (!theirs) return { winner: s, reason: 'bare' };
    if (!mine) {
      // the bared side may still take the last enemy piece at once; then both kings are bare and the game is drawn
      if (theirs === 1 && moves.some((m) => this.board[mTo(m)] !== 0)) return null;
      return { winner: o, reason: 'bare' };
    }
    if (this.quiet >= 140) return { winner: null, reason: 'quiet' };
    const k = this.keys[this.keys.length - 1];
    if (this.keys.filter((x) => x === k).length >= 3) return { winner: null, reason: 'repetition' };
    return null;
  }
}

export interface Result {
  winner: Side | null;
  reason: 'mate' | 'stalemate' | 'bare' | 'bareBoth' | 'quiet' | 'repetition' | 'resign';
}

export const FILES = 'abcdefgh';
export const sqName = (s: number): string => FILES[X(s)] + (Y(s) + 1);
export const moveName = (m: Move): string => sqName(mFrom(m)) + sqName(mTo(m));
export function parseMove(g: Shatranj, s: string): Move | null {
  const f = FILES.indexOf(s[0]) + (parseInt(s[1], 10) - 1) * 8;
  const t = FILES.indexOf(s[2]) + (parseInt(s[3], 10) - 1) * 8;
  return g.legal().find((m) => mFrom(m) === f && mTo(m) === t) ?? null;
}

// --- computer player -------------------------------------------------------------------------------

const VALUE = [0, 0, 180, 130, 310, 500, 100];
const MATE = 100000;

// Small centralisation bonus, White's point of view, index = rank * 8 + file.
const CENTRE = Array.from({ length: 64 }, (_, s) => {
  const dx = Math.abs(X(s) - 3.5);
  const dy = Math.abs(Y(s) - 3.5);
  return Math.round(12 - 3 * (dx + dy));
});

function evaluate(g: Shatranj): number {
  let score = 0;
  let wArmy = 0;
  let bArmy = 0;
  for (let s = 0; s < 64; s++) {
    const v = g.board[s];
    if (!v) continue;
    const t = Math.abs(v);
    const sign = v > 0 ? 1 : -1;
    let x = VALUE[t];
    if (t === N || t === F || t === K) x += CENTRE[s];
    if (t === P) x += 6 * (v > 0 ? Y(s) - 1 : 6 - Y(s));
    if (t !== K) v > 0 ? wArmy++ : bArmy++;
    score += sign * x;
  }
  // a lone king is lost, so stripping the last pieces is worth far more than their material
  if (!bArmy && wArmy) score += 2000;
  if (!wArmy && bArmy) score -= 2000;
  return g.side === 0 ? score : -score;
}

function order(g: Shatranj, moves: Move[], best: Move): Move[] {
  const sc = (m: Move): number => {
    if (m === best) return 1e6;
    const cap = Math.abs(g.board[mTo(m)]);
    return cap ? 1000 * VALUE[cap] - VALUE[Math.abs(g.board[mFrom(m)])] : 0;
  };
  return moves.map((m) => [sc(m), m]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

export interface Limits {
  depth: number;
  ms: number;
  /** random centipawns added at the root, to make the easy levels human */
  noise: number;
}

export const LEVELS: Limits[] = [
  { depth: 1, ms: 300, noise: 140 },
  { depth: 2, ms: 500, noise: 50 },
  { depth: 4, ms: 900, noise: 10 },
  { depth: 12, ms: 1800, noise: 0 },
];

export function think(start: Shatranj, lim: Limits): Move | null {
  const g = start.clone();
  const t0 = Date.now();
  let stop = false;
  let nodes = 0;
  const seen = new Set(g.keys.slice(0, -1));

  const quiesce = (alpha: number, beta: number): number => {
    const stand = evaluate(g);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    for (const m of order(g, g.legal(true), 0)) {
      g.make(m, false);
      const v = -quiesce(-beta, -alpha);
      g.unmake();
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  };

  const search = (depth: number, alpha: number, beta: number, ply: number): number => {
    if ((++nodes & 1023) === 0 && Date.now() - t0 > lim.ms) stop = true;
    if (stop) return 0;
    const moves = g.legal();
    if (!moves.length) return -(MATE - ply); // mate and stalemate both lose
    const key = g.key();
    if (ply > 0 && seen.has(key)) return 0;
    if (g.quiet >= 140) return 0;
    if (depth <= 0) return quiesce(alpha, beta);
    seen.add(key);
    let best = -Infinity;
    for (const m of order(g, moves, 0)) {
      g.make(m, false);
      const v = -search(depth - 1, -beta, -alpha, ply + 1);
      g.unmake();
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    seen.delete(key);
    return best;
  };

  const root = g.legal();
  if (!root.length) return null;
  let bestMove = root[0];
  for (let depth = 1; depth <= lim.depth; depth++) {
    let alpha = -Infinity;
    let iterBest = bestMove;
    for (const m of order(g, root, bestMove)) {
      g.make(m, false);
      const v = -search(depth - 1, -Infinity, -alpha, 1) + (lim.noise ? Math.round((Math.random() - 0.5) * 2 * lim.noise) : 0);
      g.unmake();
      if (stop) break;
      if (v > alpha) {
        alpha = v;
        iterBest = m;
      }
    }
    if (stop) break;
    bestMove = iterBest;
    if (alpha > MATE - 100 || Date.now() - t0 > lim.ms / 2) break;
  }
  return bestMove;
}
