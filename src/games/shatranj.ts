// Shatranj and its medieval relatives, as Murray (1913, ch. XVI) reads them from the Arabic and Persian manuscripts:
//   - shatranj, the 8x8 chess of the Caliphate and of Timur's court, rules after al-Adli and as-Suli: the ferz steps
//     one square diagonally, the alfil leaps exactly two squares diagonally over anything, pawns step one square and
//     promote to a ferz, no castling; a player wins by checkmate, by stalemating the opponent, or by baring the
//     opponent's king, and a bared side that can bare the other king at once on its reply draws instead;
//   - oblong chess (shatranj al-mustatila), 4x16, the same men, played with a die that names the piece to move:
//     6 the shah, 5 the ferz, 4 the alfil, 3 the horse, 2 the rukh, 1 the pawn; described by al-Adli c. 850;
//   - complete or decimal chess (shatranj at-tamma), 10x10 with two dabbabas a side that step like the shah,
//     pawns on the third rank, and a pawn may not promote while its side still has a ferz;
//   - citadel chess (shatranj al-husun) from al-Amuli's encyclopaedia (1340s): 10x10, dabbabas that run like the
//     modern bishop, and four citadels behind the corners; a king that reaches a citadel on the far side draws.
// Ibn Arabshah saw the oblong and the round boards at the house of Ali ash-Shatranji, Timur's champion.

export const K = 1;
export const F = 2; // ferz (counsellor)
export const A = 3; // alfil (elephant)
export const N = 4; // faras (horse)
export const R = 5; // rukh
export const P = 6; // baidaq (pawn)
export const D = 7; // dabbaba (siege engine), only on the decimal boards

export type Side = 0 | 1;
/** from | to << 8 */
export type Move = number;
export const mFrom = (m: Move): number => m & 255;
export const mTo = (m: Move): number => m >> 8;
export const mk = (from: number, to: number): Move => from | (to << 8);
/** The turn passes: in dice chess, when the die names a piece that cannot move. */
export const PASS: Move = mk(255, 255);

export type VariantId = 'shatranj' | 'oblong' | 'tamma' | 'husun';

export interface Variant {
  id: VariantId;
  w: number;
  h: number;
  /** White's men as [file, rank, type]; Black's are the mirror image, or the 180° turn where `rotate` is set */
  setup: [number, number, number][];
  rotate?: boolean;
  /** how the dabbaba moves, where there is one */
  dabbaba?: 'king' | 'bishop';
  /** four citadel squares behind the corners; a king reaching one on the far side draws */
  citadels?: boolean;
  /** a die names the piece that must move; the king may be captured */
  dice?: boolean;
  /** baring the enemy king wins */
  bareKing: boolean;
  /** a pawn may not reach the last rank while its side has a ferz (the decimal game's rule) */
  oneFerz?: boolean;
  /** a king on the opponent's king's starting square wins "half the stake" (the decimal game's rule) */
  halfWin?: boolean;
}

const SHATRANJ_BACK = [R, N, A, F, K, A, N, R];
const DECIMAL_BACK = [R, N, A, D, K, F, D, A, N, R];

export const VARIANTS: Record<VariantId, Variant> = {
  shatranj: {
    id: 'shatranj', w: 8, h: 8, bareKing: true,
    setup: [...SHATRANJ_BACK.map((t, x) => [x, 0, t] as [number, number, number]), ...Array.from({ length: 8 }, (_, x) => [x, 1, P] as [number, number, number])],
  },
  // Murray's arrangement (b), from the Arabic manuscripts V and Man.: the shah on c1 facing the enemy shah on b16
  oblong: {
    id: 'oblong', w: 4, h: 16, bareKing: true, dice: true, rotate: true,
    setup: [[0, 0, A], [1, 0, F], [2, 0, K], [3, 0, A], [1, 1, N], [2, 1, N], [0, 2, R], [3, 2, R], [0, 4, P], [1, 4, P], [2, 4, P], [3, 4, P], [0, 5, P], [1, 5, P], [2, 5, P], [3, 5, P]],
  },
  tamma: {
    id: 'tamma', w: 10, h: 10, bareKing: false, dabbaba: 'king', oneFerz: true, halfWin: true,
    setup: [...DECIMAL_BACK.map((t, x) => [x, 0, t] as [number, number, number]), ...Array.from({ length: 10 }, (_, x) => [x, 2, P] as [number, number, number])],
  },
  husun: {
    id: 'husun', w: 10, h: 10, bareKing: false, dabbaba: 'bishop', citadels: true,
    setup: [...DECIMAL_BACK.map((t, x) => [x, 0, t] as [number, number, number]), ...Array.from({ length: 10 }, (_, x) => [x, 1, P] as [number, number, number])],
  },
};

/** The die's reading in oblong chess, by pips. */
export const DIE_PIECE = [0, P, R, N, A, F, K];

interface Geometry {
  v: Variant;
  n: number;
  X: (s: number) => number;
  Y: (s: number) => number;
  at: (x: number, y: number) => number;
  king: number[][];
  ferz: number[][];
  alfil: number[][];
  knight: number[][];
  /** citadel squares [whiteSideLeft, whiteSideRight, blackSideLeft, blackSideRight] */
  citadels: number[];
  /** squares of the board proper, excluding citadels */
  squares: number;
}

const ROOK_D: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_D: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

const GEOMETRY = new Map<VariantId, Geometry>();
export function geometry(v: Variant): Geometry {
  let g = GEOMETRY.get(v.id);
  if (g) return g;
  const squares = v.w * v.h;
  const X = (s: number): number => s % v.w;
  const Y = (s: number): number => Math.floor(s / v.w);
  const at = (x: number, y: number): number => y * v.w + x;
  const table = (offsets: [number, number][]): number[][] => {
    const out: number[][] = [];
    for (let s = 0; s < squares; s++) {
      const l: number[] = [];
      for (const [dx, dy] of offsets) {
        const x = X(s) + dx;
        const y = Y(s) + dy;
        if (x >= 0 && x < v.w && y >= 0 && y < v.h) l.push(at(x, y));
      }
      out.push(l);
    }
    return out;
  };
  g = {
    v, X, Y, at, squares,
    n: squares + (v.citadels ? 4 : 0),
    king: table([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]),
    ferz: table(BISHOP_D),
    alfil: table([[2, 2], [2, -2], [-2, 2], [-2, -2]]),
    knight: table([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]),
    citadels: v.citadels ? [squares, squares + 1, squares + 2, squares + 3] : [],
  };
  GEOMETRY.set(v.id, g);
  return g;
}

/** Where a citadel sits in board coordinates: behind the corners, just off the board. */
export function citadelXY(v: Variant, i: number): [number, number] {
  return [i % 2 === 0 ? 0 : v.w - 1, i < 2 ? -1 : v.h];
}

export class Shatranj {
  readonly v: Variant;
  readonly g: Geometry;
  /** +type White, -type Black; index = rank * w + file, rank 0 is White's back rank; citadels follow the board. */
  board: Int8Array;
  side: Side = 0;
  /** half-moves since the last capture or pawn move */
  quiet = 0;
  /** the die for the side to move in dice chess, 0 while unrolled */
  die = 0;
  /** position keys of the game so far, for repetition */
  keys: string[] = [];
  private stack: { m: Move; cap: number; promo: boolean; quiet: number; die: number }[] = [];

  constructor(variant: Variant | VariantId = 'shatranj') {
    this.v = typeof variant === 'string' ? VARIANTS[variant] : variant;
    this.g = geometry(this.v);
    this.board = new Int8Array(this.g.n);
    const { w, h } = this.v;
    for (const [x, y, t] of this.v.setup) {
      this.board[this.g.at(x, y)] = t;
      this.board[this.v.rotate ? this.g.at(w - 1 - x, h - 1 - y) : this.g.at(x, h - 1 - y)] = -t;
    }
    this.keys.push(this.key());
  }

  clone(): Shatranj {
    const c = Object.create(Shatranj.prototype) as Shatranj;
    Object.assign(c, { v: this.v, g: this.g });
    c.board = this.board.slice();
    c.side = this.side;
    c.quiet = this.quiet;
    c.die = this.die;
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

  private inBoard(x: number, y: number): boolean {
    return x >= 0 && x < this.v.w && y >= 0 && y < this.v.h;
  }

  /** Is `sq` attacked by `by`? Citadels are out of reach. */
  attacked(sq: number, by: Side): boolean {
    if (sq < 0 || sq >= this.g.squares) return false;
    const b = this.board;
    const g = this.g;
    const s = by === 0 ? 1 : -1;
    for (const t of g.king[sq]) if (b[t] === s * K || (this.v.dabbaba === 'king' && b[t] === s * D)) return true;
    for (const t of g.ferz[sq]) if (b[t] === s * F) return true;
    for (const t of g.alfil[sq]) if (b[t] === s * A) return true;
    for (const t of g.knight[sq]) if (b[t] === s * N) return true;
    // a pawn of `by` attacks diagonally forward, so it stands one rank behind sq from its own point of view
    const py = g.Y(sq) - (by === 0 ? 1 : -1);
    if (py >= 0 && py < this.v.h) {
      for (const dx of [-1, 1]) {
        const px = g.X(sq) + dx;
        if (px >= 0 && px < this.v.w && b[g.at(px, py)] === s * P) return true;
      }
    }
    const rider = (dirs: [number, number][], type: number): boolean => {
      for (const [dx, dy] of dirs) {
        let x = g.X(sq) + dx;
        let y = g.Y(sq) + dy;
        while (this.inBoard(x, y)) {
          const v = b[g.at(x, y)];
          if (v) {
            if (v === s * type) return true;
            break;
          }
          x += dx;
          y += dy;
        }
      }
      return false;
    };
    if (rider(ROOK_D, R)) return true;
    if (this.v.dabbaba === 'bishop' && rider(BISHOP_D, D)) return true;
    return false;
  }

  inCheck(side: Side = this.side): boolean {
    return this.attacked(this.kingSq(side), (1 - side) as Side);
  }

  /** Moves that obey piece movement, ignoring checks. */
  pseudo(capturesOnly = false): Move[] {
    const b = this.board;
    const g = this.g;
    const v = this.v;
    const me = this.side === 0 ? 1 : -1;
    const out: Move[] = [];
    const only = v.dice && this.die ? DIE_PIECE[this.die] : 0;
    const add = (f: number, t: number): void => {
      const x = b[t];
      if (x * me > 0) return;
      if (capturesOnly && !x) return;
      out.push(mk(f, t));
    };
    const ride = (s: number, dirs: [number, number][]): void => {
      for (const [dx, dy] of dirs) {
        let x = g.X(s) + dx;
        let y = g.Y(s) + dy;
        while (this.inBoard(x, y)) {
          const t = g.at(x, y);
          if (b[t]) {
            if (b[t] * me < 0) out.push(mk(s, t));
            break;
          }
          if (!capturesOnly) out.push(mk(s, t));
          x += dx;
          y += dy;
        }
      }
    };
    const hasFerz = v.oneFerz && b.includes(me * F);
    for (let s = 0; s < g.squares; s++) {
      const p = b[s] * me;
      if (p <= 0 || (only && p !== only)) continue;
      switch (p) {
        case K:
          for (const t of g.king[s]) add(s, t);
          if (v.citadels && !capturesOnly) {
            // the far side's citadels open to a king standing on the corner square next to them
            const far = this.side === 0 ? [2, 3] : [0, 1];
            for (const i of far) {
              const [cx, cy] = citadelXY(v, i);
              if (Math.abs(g.X(s) - cx) <= 1 && Math.abs(g.Y(s) - cy) <= 1 && !b[g.citadels[i]]) out.push(mk(s, g.citadels[i]));
            }
          }
          break;
        case F: for (const t of g.ferz[s]) add(s, t); break;
        case A: for (const t of g.alfil[s]) add(s, t); break;
        case N: for (const t of g.knight[s]) add(s, t); break;
        case R: ride(s, ROOK_D); break;
        case D:
          if (v.dabbaba === 'king') for (const t of g.king[s]) add(s, t);
          else ride(s, BISHOP_D);
          break;
        case P: {
          const y = g.Y(s) + me;
          if (y < 0 || y >= v.h) break;
          const last = y === 0 || y === v.h - 1;
          if (last && hasFerz) break;
          const fwd = g.at(g.X(s), y);
          if (!b[fwd] && (!capturesOnly || last)) out.push(mk(s, fwd));
          for (const dx of [-1, 1]) {
            const x = g.X(s) + dx;
            if (x >= 0 && x < v.w && b[g.at(x, y)] * me < 0) out.push(mk(s, g.at(x, y)));
          }
          break;
        }
      }
    }
    return out;
  }

  /** Legal moves. In dice chess checks do not bind (the king may be taken); a die with no move yields PASS. */
  legal(capturesOnly = false): Move[] {
    const side = this.side;
    if (this.v.dice) {
      if (this.kingSq(side) < 0 || this.kingSq((1 - side) as Side) < 0) return [];
      const moves = this.pseudo(capturesOnly);
      if (!moves.length && this.die && !capturesOnly) return [PASS];
      return moves;
    }
    return this.pseudo(capturesOnly).filter((m) => {
      this.make(m, false);
      const ok = !this.inCheck(side);
      this.unmake();
      return ok;
    });
  }

  make(m: Move, record = true): void {
    if (m === PASS) {
      this.stack.push({ m, cap: 0, promo: false, quiet: this.quiet, die: this.die });
      this.quiet++;
      this.side = (1 - this.side) as Side;
      this.die = 0;
      if (record) this.keys.push(this.key());
      return;
    }
    const f = mFrom(m);
    const t = mTo(m);
    const v = this.board[f];
    const cap = this.board[t];
    const promo = Math.abs(v) === P && t < this.g.squares && (this.g.Y(t) === 0 || this.g.Y(t) === this.v.h - 1);
    this.stack.push({ m, cap, promo, quiet: this.quiet, die: this.die });
    this.board[t] = promo ? Math.sign(v) * F : v;
    this.board[f] = 0;
    this.quiet = cap || Math.abs(v) === P ? 0 : this.quiet + 1;
    this.side = (1 - this.side) as Side;
    this.die = 0;
    if (record) this.keys.push(this.key());
  }

  unmake(record = false): void {
    const u = this.stack.pop()!;
    this.side = (1 - this.side) as Side;
    this.die = u.die;
    this.quiet = u.quiet;
    if (u.m !== PASS) {
      const f = mFrom(u.m);
      const t = mTo(u.m);
      const v = this.board[t];
      this.board[f] = u.promo ? Math.sign(v) * P : v;
      this.board[t] = u.cap;
    }
    if (record) this.keys.pop();
  }

  /** Pieces other than the king. */
  army(side: Side): number {
    let n = 0;
    for (let s = 0; s < this.g.n; s++) {
      const v = this.board[s];
      if (v && (v > 0) === (side === 0) && Math.abs(v) !== K) n++;
    }
    return n;
  }

  /** The result of the position, or null while the game goes on. */
  result(moves = this.legal()): Result | null {
    const s = this.side;
    const o = (1 - s) as Side;
    const v = this.v;
    if (v.dice) {
      if (this.kingSq(s) < 0) return { winner: o, reason: 'king' };
      if (this.kingSq(o) < 0) return { winner: s, reason: 'king' };
    }
    if (v.citadels) {
      for (let i = 0; i < 4; i++) {
        const k = this.board[this.g.citadels[i]];
        if (k === K && i >= 2) return { winner: null, reason: 'citadel' };
        if (k === -K && i < 2) return { winner: null, reason: 'citadel' };
      }
    }
    if (v.halfWin) {
      const home = (side: Side): number => {
        const [x, y] = v.setup.find((e) => e[2] === K)!;
        return side === 0 ? this.g.at(x, y) : this.g.at(x, v.h - 1 - y);
      };
      if (this.board[home(1)] === K) return { winner: 0, reason: 'half' };
      if (this.board[home(0)] === -K) return { winner: 1, reason: 'half' };
    }
    if (!v.dice && !moves.length) return this.inCheck() ? { winner: o, reason: 'mate' } : { winner: o, reason: 'stalemate' };
    const mine = this.army(s);
    const theirs = this.army(o);
    if (!mine && !theirs) return { winner: null, reason: 'bareBoth' };
    if (v.bareKing) {
      if (!theirs) return { winner: s, reason: 'bare' };
      if (!mine) {
        // the bared side may still take the last enemy piece at once; then both kings are bare and the game is drawn
        if (theirs === 1 && moves.some((m) => m !== PASS && this.board[mTo(m)] !== 0)) return null;
        return { winner: o, reason: 'bare' };
      }
    }
    if (this.quiet >= 140) return { winner: null, reason: 'quiet' };
    const k = this.keys[this.keys.length - 1];
    if (this.keys.filter((x) => x === k).length >= 3) return { winner: null, reason: 'repetition' };
    return null;
  }
}

export interface Result {
  winner: Side | null;
  reason: 'mate' | 'stalemate' | 'bare' | 'bareBoth' | 'quiet' | 'repetition' | 'resign' | 'king' | 'citadel' | 'half';
}

export const FILES = 'abcdefghij';
export const sqName = (s: number): string => sqText(VARIANTS.shatranj, s);
export function sqText(v: Variant, s: number): string {
  const g = geometry(v);
  if (s >= g.squares) {
    const [x, y] = citadelXY(v, s - g.squares);
    return `${FILES[x]}${y + 1}`; // a0 / j0 / a11 / j11
  }
  return FILES[g.X(s)] + (g.Y(s) + 1);
}
/** A move as text; die rolls travel in the same list as "d5", a pass as "pass". */
export const moveName = (m: Move): string => moveText(VARIANTS.shatranj, m);
export function moveText(v: Variant, m: Move): string {
  return m === PASS ? 'pass' : sqText(v, mFrom(m)) + sqText(v, mTo(m));
}
/** Reads a move (or applies a die roll and returns PASS - 1, i.e. "nothing to play") against the game's legal moves. */
export function parseMove(g: Shatranj, s: string): Move | null {
  if (s === 'pass') return g.legal().includes(PASS) ? PASS : null;
  if (/^d[1-6]$/.test(s)) {
    g.die = Number(s[1]);
    return DIE;
  }
  const parse = (t: string): number => {
    const x = FILES.indexOf(t[0]);
    const y = parseInt(t.slice(1), 10) - 1;
    if (y < 0 || y >= g.v.h) {
      const i = (y < 0 ? 0 : 2) + (x === 0 ? 0 : 1);
      return g.g.citadels[i] ?? -1;
    }
    return g.g.at(x, y);
  };
  const m = /^([a-j]\d+)([a-j]\d+)$/.exec(s);
  if (!m) return null;
  const f = parse(m[1]);
  const t = parse(m[2]);
  return g.legal().find((x) => mFrom(x) === f && mTo(x) === t) ?? null;
}
/** Returned by parseMove for a die token: the game's die is set, there is no move to make. */
export const DIE: Move = mk(254, 254);

// --- computer player -------------------------------------------------------------------------------

const VALUE = [0, 0, 180, 130, 310, 500, 100, 350];
const MATE = 100000;

const CENTRE = new Map<VariantId, number[]>();
function centre(v: Variant): number[] {
  let c = CENTRE.get(v.id);
  if (c) return c;
  const g = geometry(v);
  c = Array.from({ length: g.squares }, (_, s) => {
    const dx = Math.abs(g.X(s) - (v.w - 1) / 2) / (v.w / 8);
    const dy = Math.abs(g.Y(s) - (v.h - 1) / 2) / (v.h / 8);
    return Math.round(12 - 3 * (dx + dy));
  });
  CENTRE.set(v.id, c);
  return c;
}

function evaluate(g: Shatranj): number {
  let score = 0;
  let wArmy = 0;
  let bArmy = 0;
  const c = centre(g.v);
  const h = g.v.h;
  for (let s = 0; s < g.g.squares; s++) {
    const v = g.board[s];
    if (!v) continue;
    const t = Math.abs(v);
    const sign = v > 0 ? 1 : -1;
    let x = VALUE[t];
    if (t === N || t === F || t === K || t === D) x += c[s];
    if (t === P) x += Math.round((48 / h) * (v > 0 ? g.g.Y(s) - 1 : h - 2 - g.g.Y(s)));
    if (t !== K) v > 0 ? wArmy++ : bArmy++;
    score += sign * x;
  }
  if (g.v.bareKing) {
    // a lone king is lost, so stripping the last pieces is worth far more than their material
    if (!bArmy && wArmy) score += 2000;
    if (!wArmy && bArmy) score -= 2000;
  }
  return g.side === 0 ? score : -score;
}

function order(g: Shatranj, moves: Move[], best: Move): Move[] {
  const sc = (m: Move): number => {
    if (m === best) return 1e6;
    if (m === PASS) return 0;
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

/** Terminal scores the search must see before looking at moves. */
function terminal(g: Shatranj, ply: number): number | null {
  const r = g.result(g.legal());
  if (!r) return null;
  if (r.winner === null) return 0;
  const score = r.reason === 'half' ? MATE / 2 : MATE - ply;
  return r.winner === g.side ? score : -score;
}

export function think(start: Shatranj, lim: Limits): Move | null {
  const g = start.clone();
  const t0 = Date.now();
  let stop = false;
  let nodes = 0;
  const seen = new Set(g.keys.slice(0, -1));
  const dice = !!g.v.dice;

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
    if (dice) return expect(depth, ply);
    const moves = g.legal();
    if (!moves.length) return -(MATE - ply); // mate and stalemate both lose
    const end = terminal(g, ply);
    if (end !== null) return end;
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

  /** Dice chess: the die is unknown here, so average the best reply over its six faces. */
  const expect = (depth: number, ply: number): number => {
    const end = terminal(g, ply);
    if (end !== null) return end;
    if (depth <= 0) return evaluate(g);
    let total = 0;
    for (let d = 1; d <= 6; d++) {
      g.die = d;
      let best = -Infinity;
      for (const m of order(g, g.legal(), 0)) {
        g.make(m, false);
        const v = -expect(depth - 1, ply + 1);
        g.unmake();
        if (v > best) best = v;
      }
      total += best === -Infinity ? evaluate(g) : best;
    }
    g.die = 0;
    return total / 6;
  };

  const root = g.legal();
  if (!root.length) return null;
  if (root.length === 1) return root[0];
  let bestMove = root[0];
  const maxDepth = dice ? Math.min(lim.depth, 3) : lim.depth;
  for (let depth = 1; depth <= maxDepth; depth++) {
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
