// Position: board state, move generation, make/unmake, attack detection.

import {
  NSQ, WHITE, BLACK, Side, SQX, SQY, STEP, OPPOSITE, DIAG_ORTHO, ORTHO_DIAGS, KING_ADJ, PAWN_FWD, PAWN_ATT,
  KNIGHT_LEAPS, CAMEL_LEAPS, ELEPHANT_LEAPS, ENGINE_LEAPS, GENERAL_LEAPS, VIZIER_LEAPS,
  enemyCitadel, lastRank, rotate, sqAt,
} from './geometry';
import * as P from './pieces';
import { PSQ } from './values';

export type ArrayName = 'masculine' | 'feminine' | 'third';

export interface RuleOptions {
  /** Opening array (Murray's RAS 1, RAS 2, and the Ibn Arabshah array). */
  array: ArrayName;
  /** When the once-per-game king swap is available. */
  swapWhen: 'check' | 'checkOrStalemate';
  /** Threefold repetition and a 50-move rule. Not historical, but games need to end. */
  modernDraws: boolean;
  /** Forbes' reading: the picket moves exactly like a modern bishop. */
  picketOneStep: boolean;
  /** Stripping the opponent down to bare royals wins. Gollon and Forbes assume no such rule. */
  bareKingWins: boolean;
  /** The pawn of pawns' relocation may count a king among the pieces it attacks (Forbes yes, Cazaux no). */
  popMayTargetKing: boolean;
}

export const DEFAULT_RULES: RuleOptions = {
  array: 'masculine',
  swapWhen: 'checkOrStalemate',
  modernDraws: true,
  picketOneStep: false,
  bareKingWins: false,
  popMayTargetKing: true,
};

// Move = from | to << 7 | kind << 14
export const NORMAL = 0;
export const SWAP = 1; // from = king square, to = partner square
export const RELOCATE = 2; // pawn of pawns lifted from its last rank
export type Move = number;
export const moveFrom = (m: Move): number => m & 127;
export const moveTo = (m: Move): number => (m >> 7) & 127;
export const moveKind = (m: Move): number => m >> 14;
export const makeMoveCode = (from: number, to: number, kind = NORMAL): Move => from | (to << 7) | (kind << 14);

// Zobrist keys as two 32-bit halves (BigInt is too slow for the hot path).
let seed = 0x9e3779b9;
function rand32(): number {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed | 0;
}
const Z_LO = new Int32Array(51 * NSQ);
const Z_HI = new Int32Array(51 * NSQ);
for (let i = 0; i < Z_LO.length; i++) {
  Z_LO[i] = rand32();
  Z_HI[i] = rand32();
}
const Z_SIDE_LO = rand32();
const Z_SIDE_HI = rand32();
const Z_SWAP_LO = [rand32(), rand32()];
const Z_SWAP_HI = [rand32(), rand32()];

const L = { E: P.ELEPHANT, C: P.CAMEL, D: P.WAR_ENGINE, R: P.ROOK, N: P.KNIGHT, T: P.PICKET, Z: P.GIRAFFE, F: P.GENERAL, K: P.KING, W: P.VIZIER,
  PP: P.PAWN_PAWN, DP: P.PAWN_ENGINE, CP: P.PAWN_CAMEL, EP: P.PAWN_ELEPHANT, FP: P.PAWN_GENERAL, KP: P.PAWN_KING, WP: P.PAWN_VIZIER,
  ZP: P.PAWN_GIRAFFE, TP: P.PAWN_PICKET, NP: P.PAWN_KNIGHT, RP: P.PAWN_ROOK, '.': 0 } as const;
type Cell = keyof typeof L;

// White's first three ranks, a..k. Black is the 180-degree rotation.
const ARRAYS: Record<ArrayName, Cell[][]> = {
  masculine: [
    ['E', '.', 'C', '.', 'D', '.', 'D', '.', 'C', '.', 'E'],
    ['R', 'N', 'T', 'Z', 'F', 'K', 'W', 'Z', 'T', 'N', 'R'],
    ['PP', 'DP', 'CP', 'EP', 'FP', 'KP', 'WP', 'ZP', 'TP', 'NP', 'RP'],
  ],
  feminine: [
    ['E', '.', 'C', '.', 'F', 'K', 'W', '.', 'C', '.', 'E'],
    ['R', 'N', 'T', 'Z', 'D', 'KP', 'D', 'Z', 'T', 'N', 'R'],
    ['PP', 'DP', 'CP', 'EP', 'FP', '.', 'WP', 'ZP', 'TP', 'NP', 'RP'],
  ],
  third: [
    ['E', '.', 'C', '.', 'F', 'K', 'W', '.', 'C', '.', 'E'],
    ['R', 'N', 'D', 'T', 'Z', 'KP', 'Z', 'T', 'D', 'N', 'R'],
    ['PP', 'FP', 'WP', 'CP', 'EP', '.', 'ZP', 'TP', 'DP', 'NP', 'RP'],
  ],
};

const UNDO_SIZE = 1 << 16;

export class Position {
  board = new Int8Array(NSQ);
  side: Side = WHITE;
  swapUsed = [0, 0];
  /** Battle maps: 0 open ground, 1 water (nothing enters or slides through; leapers fly over), 2 hills (looks only). */
  terrain = new Uint8Array(NSQ);
  halfmove = 0;
  hashLo = 0;
  hashHi = 0;
  /** Material + piece-square score, White-relative, maintained incrementally. */
  score = 0;
  /** cnt[side * NUM_TYPES + type] */
  cnt = new Int8Array(2 * P.NUM_TYPES);
  /** royalSq[side * 4 + type] for KING, PRINCE, ADV_KING (valid only while cnt > 0). */
  royalSq = new Int16Array(8);
  /** The king's pawn's original square per side: where the pawn of pawns goes on its second arrival. */
  kingPawnHome = [0, 0];
  rules: RuleOptions;

  private undo = new Int32Array(UNDO_SIZE);
  private undoTop = 0;

  constructor(rules: RuleOptions = DEFAULT_RULES) {
    this.rules = { ...rules };
    this.setup();
  }

  setup(): void {
    this.clear();
    const rows = ARRAYS[this.rules.array];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 11; x++) {
        const type = L[rows[y][x]];
        if (!type) continue;
        const sq = sqAt(x, y);
        this.put(sq, type);
        this.put(rotate(sq), -type);
        if (type === P.PAWN_KING) {
          this.kingPawnHome[WHITE] = sq;
          this.kingPawnHome[BLACK] = rotate(sq);
        }
      }
    }
  }

  clear(): void {
    this.board.fill(0);
    this.cnt.fill(0);
    this.terrain.fill(0);
    this.side = WHITE;
    this.swapUsed = [0, 0];
    this.halfmove = 0;
    this.hashLo = 0;
    this.hashHi = 0;
    this.score = 0;
    this.undoTop = 0;
    this.kingPawnHome = [sqAt(5, 2), sqAt(5, 7)];
  }

  /** Load an arbitrary position (puzzles, tests). Each entry is [square, signed piece]. */
  loadSetup(men: [number, number][], side: Side, swapUsed: [number, number] = [0, 0], terrain: number[] = []): void {
    this.clear();
    for (const [sq, piece] of men) this.put(sq, piece);
    for (const t of terrain) {
      // Encoded as sq + 128 * kind; kind 1 = water, 2 = hill.
      const sq = t & 127;
      const kind = t >> 7 || 1;
      this.terrain[sq] = kind;
      if (kind === 1) {
        // Water changes what moves exist, so it must tell positions apart in the hash table.
        this.hashLo ^= Z_LO[50 * NSQ + sq];
        this.hashHi ^= Z_HI[50 * NSQ + sq];
      }
    }
    if (side === BLACK) this.makeNull();
    for (const s of [0, 1]) {
      if (swapUsed[s]) {
        this.swapUsed[s] = 1;
        this.hashLo ^= Z_SWAP_LO[s];
        this.hashHi ^= Z_SWAP_HI[s];
      }
    }
  }

  /** Low-level square write keeping hash, counts, score and royal squares in sync. */
  put(sq: number, piece: number): void {
    const old = this.board[sq];
    if (old !== 0) {
      const i = (old + 25) * NSQ + sq;
      this.hashLo ^= Z_LO[i];
      this.hashHi ^= Z_HI[i];
      this.score -= PSQ[i];
      this.cnt[old > 0 ? old : P.NUM_TYPES - old]--;
    }
    this.board[sq] = piece;
    if (piece !== 0) {
      const i = (piece + 25) * NSQ + sq;
      this.hashLo ^= Z_LO[i];
      this.hashHi ^= Z_HI[i];
      this.score += PSQ[i];
      if (piece > 0) {
        this.cnt[piece]++;
        if (piece <= P.ADV_KING) this.royalSq[piece] = sq;
      } else {
        this.cnt[P.NUM_TYPES - piece]++;
        if (piece >= -P.ADV_KING) this.royalSq[4 - piece] = sq;
      }
    }
  }

  private change(sq: number, piece: number): void {
    this.undo[this.undoTop++] = sq;
    this.undo[this.undoTop++] = this.board[sq];
    this.put(sq, piece);
  }

  count(side: Side, type: number): number {
    return this.cnt[side * P.NUM_TYPES + type];
  }
  royalCount(side: Side): number {
    const b = side * P.NUM_TYPES;
    return this.cnt[b + P.KING] + this.cnt[b + P.PRINCE] + this.cnt[b + P.ADV_KING];
  }
  /** Highest-ranking royal present: Shah, then prince, then adventitious king. */
  topRoyal(side: Side): number {
    const b = side * P.NUM_TYPES;
    if (this.cnt[b + P.KING]) return P.KING;
    if (this.cnt[b + P.PRINCE]) return P.PRINCE;
    if (this.cnt[b + P.ADV_KING]) return P.ADV_KING;
    return P.NONE;
  }
  topRoyalSq(side: Side): number {
    const t = this.topRoyal(side);
    return t ? this.royalSq[side * 4 + t] : -1;
  }
  /** Number of men that are not royal. */
  armySize(side: Side): number {
    let n = 0;
    const b = side * P.NUM_TYPES;
    for (let t = P.GENERAL; t < P.NUM_TYPES; t++) n += this.cnt[b + t];
    return n;
  }

  /** A pawn of pawns resting on its last rank cannot be captured. */
  isImmune(sq: number): boolean {
    const p = this.board[sq];
    if (p === P.PAWN_PAWN) return SQY[sq] === 9;
    if (p === -P.PAWN_PAWN) return SQY[sq] === 0;
    return false;
  }

  /** Check only exists for a side down to its last royal. */
  inCheck(side: Side): boolean {
    if (this.royalCount(side) !== 1) return false;
    return this.isAttacked(this.topRoyalSq(side), (1 - side) as Side);
  }

  isAttacked(sq: number, by: Side): boolean {
    if (sq >= 110) return false;
    const b = this.board;
    const sign = by === WHITE ? 1 : -1;

    for (const f of PAWN_ATT[1 - by][sq]) {
      const p = b[f] * sign;
      if (p >= P.PAWN_KING) return true;
    }
    let list = KNIGHT_LEAPS[sq];
    for (let i = 0; i < list.length; i++) if (b[list[i]] * sign === P.KNIGHT) return true;
    list = CAMEL_LEAPS[sq];
    for (let i = 0; i < list.length; i++) if (b[list[i]] * sign === P.CAMEL) return true;
    list = ELEPHANT_LEAPS[sq];
    for (let i = 0; i < list.length; i++) if (b[list[i]] * sign === P.ELEPHANT) return true;
    list = ENGINE_LEAPS[sq];
    for (let i = 0; i < list.length; i++) if (b[list[i]] * sign === P.WAR_ENGINE) return true;
    list = GENERAL_LEAPS[sq];
    for (let i = 0; i < list.length; i++) if (b[list[i]] * sign === P.GENERAL) return true;
    list = VIZIER_LEAPS[sq];
    for (let i = 0; i < list.length; i++) if (b[list[i]] * sign === P.VIZIER) return true;
    list = KING_ADJ[sq];
    for (let i = 0; i < list.length; i++) {
      const p = b[list[i]] * sign;
      if (p >= P.KING && p <= P.ADV_KING) return true;
    }

    const rook = P.ROOK * sign;
    const giraffe = P.GIRAFFE * sign;
    for (let d = 0; d < 4; d++) {
      const step = STEP[d];
      let s = step[sq];
      let n = 1;
      while (s >= 0 && b[s] === 0 && this.terrain[s] !== 1) {
        // Walking away from sq against a giraffe's orthogonal leg: from the third empty square on,
        // s may be the square a giraffe reached with its diagonal step.
        if (n >= 3) {
          const diags = ORTHO_DIAGS[OPPOSITE[d]];
          const g0 = STEP[OPPOSITE[diags[0]]][s];
          if (g0 >= 0 && b[g0] === giraffe) return true;
          const g1 = STEP[OPPOSITE[diags[1]]][s];
          if (g1 >= 0 && b[g1] === giraffe) return true;
        }
        s = step[s];
        n++;
      }
      if (s >= 0 && b[s] === rook) return true;
    }

    const picket = P.PICKET * sign;
    const oneStep = this.rules.picketOneStep;
    for (let d = 4; d < 8; d++) {
      const step = STEP[d];
      let s = step[sq];
      if (s < 0) continue;
      if (b[s] !== 0 || this.terrain[s] === 1) {
        if (oneStep && b[s] === picket) return true;
        continue;
      }
      s = step[s];
      while (s >= 0 && b[s] === 0 && this.terrain[s] !== 1) s = step[s];
      if (s >= 0 && b[s] === picket) return true;
    }
    return false;
  }

  /** Pseudo-legal moves of the piece on sq, appended to list. */
  genPiece(sq: number, list: Move[], capsOnly: boolean): void {
    const b = this.board;
    const piece = b[sq];
    const white = piece > 0;
    const type = white ? piece : -piece;
    const side: Side = white ? WHITE : BLACK;

    const water = this.terrain;
    const tryTarget = (to: number): void => {
      if (water[to] === 1) return;
      const t = b[to];
      if (t === 0) {
        if (!capsOnly) list.push(sq | (to << 7));
      } else if (t > 0 !== white && !this.isImmune(to)) {
        list.push(sq | (to << 7));
      }
    };
    const leap = (targets: number[]): void => {
      for (let i = 0; i < targets.length; i++) tryTarget(targets[i]);
    };

    switch (type) {
      case P.KING:
      case P.PRINCE:
      case P.ADV_KING: {
        const adj = KING_ADJ[sq];
        for (let i = 0; i < adj.length; i++) {
          const to = adj[i];
          if (to >= 110) {
            if (capsOnly || b[to] !== 0) continue;
            if (to === enemyCitadel(side)) {
              if (type === this.topRoyal(side)) list.push(sq | (to << 7));
            } else if (type === P.ADV_KING) {
              list.push(sq | (to << 7));
            }
          } else {
            tryTarget(to);
          }
        }
        break;
      }
      case P.GENERAL: leap(GENERAL_LEAPS[sq]); break;
      case P.VIZIER: leap(VIZIER_LEAPS[sq]); break;
      case P.KNIGHT: leap(KNIGHT_LEAPS[sq]); break;
      case P.ELEPHANT: leap(ELEPHANT_LEAPS[sq]); break;
      case P.CAMEL: leap(CAMEL_LEAPS[sq]); break;
      case P.WAR_ENGINE: leap(ENGINE_LEAPS[sq]); break;
      case P.ROOK:
        for (let d = 0; d < 4; d++) {
          const step = STEP[d];
          let s = step[sq];
          while (s >= 0 && b[s] === 0 && water[s] !== 1) {
            if (!capsOnly) list.push(sq | (s << 7));
            s = step[s];
          }
          if (s >= 0) tryTarget(s);
        }
        break;
      case P.PICKET:
        for (let d = 4; d < 8; d++) {
          const step = STEP[d];
          let s = step[sq];
          if (s < 0) continue;
          if (b[s] !== 0 || water[s] === 1) {
            if (this.rules.picketOneStep) tryTarget(s);
            continue;
          }
          if (this.rules.picketOneStep && !capsOnly) list.push(sq | (s << 7));
          s = step[s];
          while (s >= 0 && b[s] === 0 && water[s] !== 1) {
            if (!capsOnly) list.push(sq | (s << 7));
            s = step[s];
          }
          if (s >= 0) tryTarget(s);
        }
        break;
      case P.GIRAFFE:
        for (let d = 4; d < 8; d++) {
          const d0 = STEP[d][sq];
          if (d0 < 0 || b[d0] !== 0 || water[d0] === 1) continue;
          const legs = DIAG_ORTHO[d];
          for (let k = 0; k < 2; k++) {
            const step = STEP[legs[k]];
            let s = step[d0];
            if (s < 0 || b[s] !== 0 || water[s] === 1) continue;
            s = step[s];
            if (s < 0 || b[s] !== 0 || water[s] === 1) continue;
            s = step[s];
            while (s >= 0 && b[s] === 0 && water[s] !== 1) {
              if (!capsOnly) list.push(sq | (s << 7));
              s = step[s];
            }
            if (s >= 0) tryTarget(s);
          }
        }
        break;
      default: {
        // Pawns. The pawn of pawns on its last rank has no forward square, so it generates nothing here.
        const fwd = PAWN_FWD[side][sq];
        if (fwd >= 0 && b[fwd] === 0 && water[fwd] !== 1 && (!capsOnly || SQY[fwd] === lastRank(side))) list.push(sq | (fwd << 7));
        const att = PAWN_ATT[side][sq];
        for (let i = 0; i < att.length; i++) {
          const to = att[i];
          const t = b[to];
          if (t !== 0 && t > 0 !== white && !this.isImmune(to)) list.push(sq | (to << 7));
        }
      }
    }
  }

  /** All pseudo-legal ordinary moves plus pawn-of-pawns relocations. King swaps are generated separately. */
  genPseudo(list: Move[], capsOnly = false): void {
    const b = this.board;
    const white = this.side === WHITE;
    for (let sq = 0; sq < NSQ; sq++) {
      const p = b[sq];
      if (p !== 0 && p > 0 === white) this.genPiece(sq, list, capsOnly);
    }
    if (!capsOnly && this.cnt[this.side * P.NUM_TYPES + P.PAWN_PAWN]) this.genRelocations(list);
  }

  private dummySquare(side: Side): number {
    const y = lastRank(side);
    const want = side === WHITE ? P.PAWN_PAWN : -P.PAWN_PAWN;
    for (let x = 0; x < 11; x++) if (this.board[y * 11 + x] === want) return y * 11 + x;
    return -1;
  }

  /**
   * The pawn of pawns waiting on its last rank may be lifted to any square from which, as a pawn, it forks
   * two enemy pieces or attacks one that cannot move. It replaces whatever stands there, kings excepted.
   */
  private genRelocations(list: Move[]): void {
    const side = this.side;
    const from = this.dummySquare(side);
    if (from < 0) return;
    const b = this.board;
    const sign = side === WHITE ? 1 : -1;
    const pawn = b[from];
    const scratch: Move[] = [];
    for (let t = 0; t < 110; t++) {
      if (t === from || this.terrain[t] === 1) continue;
      const occ = b[t];
      if (occ !== 0) {
        const ot = occ > 0 ? occ : -occ;
        if (P.isRoyal(ot) || this.isImmune(t)) continue;
      }
      const att = PAWN_ATT[side][t];
      let targets = 0;
      for (let i = 0; i < att.length; i++) if (this.isRelocationTarget(att[i], sign)) targets++;
      if (targets === 0) continue;
      let ok = targets === 2;
      if (!ok) {
        b[from] = 0;
        b[t] = pawn;
        for (let i = 0; i < att.length && !ok; i++) {
          if (!this.isRelocationTarget(att[i], sign)) continue;
          scratch.length = 0;
          this.genPiece(att[i], scratch, false);
          ok = scratch.length === 0;
        }
        b[from] = pawn;
        b[t] = occ;
      }
      if (ok) list.push(from | (t << 7) | (RELOCATE << 14));
    }
  }

  private isRelocationTarget(sq: number, sign: number): boolean {
    const e = -this.board[sq] * sign;
    if (e <= 0 || P.isPawn(e)) return false;
    if (P.isRoyal(e) && !this.rules.popMayTargetKing) return false;
    return true;
  }

  /** Once per game the Shah, as sole royal, may change places with any of his men. */
  genSwaps(list: Move[]): void {
    const side = this.side;
    if (this.swapUsed[side] || !this.count(side, P.KING) || this.royalCount(side) !== 1) return;
    const ksq = this.royalSq[side * 4 + P.KING];
    if (ksq >= 110) return;
    const b = this.board;
    const white = side === WHITE;
    const kingOnLastRank = SQY[ksq] === lastRank(side);
    for (let sq = 0; sq < 110; sq++) {
      const p = b[sq];
      if (p === 0 || p > 0 !== white || sq === ksq) continue;
      const t = white ? p : -p;
      if (P.isRoyal(t) || this.isImmune(sq)) continue;
      if (P.isPawn(t) && kingOnLastRank) continue;
      list.push(ksq | (sq << 7) | (SWAP << 14));
    }
  }

  /** Where a pawn of pawns lands on its second arrival: the king's pawn square, or the nearest free spot on that rank. */
  secondArrivalSquare(side: Side): number {
    const home = this.kingPawnHome[side];
    const y = SQY[home];
    const x0 = SQX[home];
    for (let d = 0; d < 11; d++) {
      for (const x of d === 0 ? [x0] : [x0 - d, x0 + d]) {
        if (x < 0 || x > 10) continue;
        const sq = y * 11 + x;
        const occ = this.board[sq];
        const ot = occ > 0 ? occ : -occ;
        if (occ === 0 || !(P.isRoyal(ot) || this.isImmune(sq))) return sq;
      }
    }
    return home;
  }

  make(m: Move): void {
    const from = m & 127;
    const to = (m >> 7) & 127;
    const kind = m >> 14;
    const side = this.side;
    const base = this.undoTop;
    const savedHalf = this.halfmove;
    const savedSwap = this.swapUsed[0] | (this.swapUsed[1] << 1);
    const savedLo = this.hashLo;
    const savedHi = this.hashHi;
    const b = this.board;
    const piece = b[from];
    const type = piece > 0 ? piece : -piece;
    let irreversible = b[to] !== 0 || type >= P.PAWN_KING;

    if (kind === SWAP) {
      const other = b[to];
      this.change(from, other);
      this.change(to, piece);
      this.swapUsed[side] = 1;
      this.hashLo ^= Z_SWAP_LO[side];
      this.hashHi ^= Z_SWAP_HI[side];
      irreversible = true;
    } else if (kind === RELOCATE) {
      this.change(from, 0);
      this.change(to, side === WHITE ? P.PAWN_PAWN_1 : -P.PAWN_PAWN_1);
    } else {
      this.change(from, 0);
      if (type >= P.PAWN_KING && SQY[to] === lastRank(side)) {
        const promo = P.PROMOTES_TO[type];
        if (type === P.PAWN_PAWN_1) {
          this.change(to, 0);
          this.change(this.secondArrivalSquare(side), side === WHITE ? promo : -promo);
        } else {
          this.change(to, side === WHITE ? promo : -promo);
        }
      } else {
        this.change(to, piece);
      }
    }

    this.halfmove = irreversible ? 0 : savedHalf + 1;
    this.side = (1 - side) as Side;
    this.hashLo ^= Z_SIDE_LO;
    this.hashHi ^= Z_SIDE_HI;

    const u = this.undo;
    u[this.undoTop++] = savedLo;
    u[this.undoTop++] = savedHi;
    u[this.undoTop++] = savedHalf;
    u[this.undoTop++] = savedSwap;
    u[this.undoTop++] = base;
  }

  unmake(): void {
    const u = this.undo;
    const base = u[--this.undoTop];
    const savedSwap = u[--this.undoTop];
    const savedHalf = u[--this.undoTop];
    const savedHi = u[--this.undoTop];
    const savedLo = u[--this.undoTop];
    while (this.undoTop > base) {
      const old = u[--this.undoTop];
      const sq = u[--this.undoTop];
      this.put(sq, old);
    }
    this.swapUsed[0] = savedSwap & 1;
    this.swapUsed[1] = savedSwap >> 1;
    this.halfmove = savedHalf;
    this.hashLo = savedLo;
    this.hashHi = savedHi;
    this.side = (1 - this.side) as Side;
  }

  /** A null move for search pruning. It gets an undo frame like any move, so unwindTo() can undo it. */
  makeNull(): void {
    const u = this.undo;
    const base = this.undoTop;
    u[this.undoTop++] = this.hashLo;
    u[this.undoTop++] = this.hashHi;
    u[this.undoTop++] = this.halfmove;
    u[this.undoTop++] = this.swapUsed[0] | (this.swapUsed[1] << 1);
    u[this.undoTop++] = base;
    this.side = (1 - this.side) as Side;
    this.hashLo ^= Z_SIDE_LO;
    this.hashHi ^= Z_SIDE_HI;
  }
  unmakeNull(): void {
    this.unmake();
  }

  /** Depth of the undo stack, for unwinding after an aborted search. */
  get undoDepth(): number {
    return this.undoTop;
  }
  unwindTo(depth: number): void {
    while (this.undoTop > depth) this.unmake();
  }

  /** After make(): did the side that just moved leave its sole royal attacked? */
  moverInCheck(): boolean {
    return this.inCheck((1 - this.side) as Side);
  }

  /** After make(): the mover's royal stands in the opponent's citadel, which draws the game. */
  citadelReached(): boolean {
    const mover = (1 - this.side) as Side;
    const p = this.board[enemyCitadel(mover)];
    return p !== 0 && p > 0 === (mover === WHITE);
  }

  legalMoves(): Move[] {
    const pseudo: Move[] = [];
    this.genPseudo(pseudo);
    const checked = this.inCheck(this.side);
    if (checked) this.genSwaps(pseudo);
    let legal = this.filterLegal(pseudo);
    if (legal.length === 0 && !checked && this.rules.swapWhen === 'checkOrStalemate') {
      const swaps: Move[] = [];
      this.genSwaps(swaps);
      legal = this.filterLegal(swaps);
    }
    return legal;
  }

  private filterLegal(moves: Move[]): Move[] {
    const out: Move[] = [];
    for (const m of moves) {
      this.make(m);
      if (!this.moverInCheck()) out.push(m);
      this.unmake();
    }
    return out;
  }

  clone(): Position {
    const c = new Position(this.rules);
    c.terrain.set(this.terrain);
    c.clear();
    for (let sq = 0; sq < NSQ; sq++) if (this.board[sq]) c.put(sq, this.board[sq]);
    c.kingPawnHome = [...this.kingPawnHome];
    c.swapUsed = [...this.swapUsed];
    c.halfmove = this.halfmove;
    if (this.side === BLACK) c.makeNull();
    for (const s of [0, 1]) {
      if (c.swapUsed[s]) {
        c.hashLo ^= Z_SWAP_LO[s];
        c.hashHi ^= Z_SWAP_HI[s];
      }
    }
    return c;
  }
}
