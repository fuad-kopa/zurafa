// Board geometry: 11 files x 10 ranks (squares 0..109, index = y*11 + x) plus two citadels.
// White citadel (110) adjoins k2 on White's right; Black citadel (111) adjoins a9 on Black's right.

export const FILES = 11;
export const RANKS = 10;
export const NSQ = 112;
export const WHITE_CITADEL = 110;
export const BLACK_CITADEL = 111;

export const WHITE = 0;
export const BLACK = 1;
export type Side = 0 | 1;

export const SQX = new Int8Array(NSQ);
export const SQY = new Int8Array(NSQ);

export function sqAt(x: number, y: number): number {
  if (x >= 0 && x < FILES && y >= 0 && y < RANKS) return y * FILES + x;
  if (x === FILES && y === 1) return WHITE_CITADEL;
  if (x === -1 && y === 8) return BLACK_CITADEL;
  return -1;
}

function boardSqAt(x: number, y: number): number {
  return x >= 0 && x < FILES && y >= 0 && y < RANKS ? y * FILES + x : -1;
}

for (let s = 0; s < 110; s++) {
  SQX[s] = s % FILES;
  SQY[s] = (s / FILES) | 0;
}
SQX[WHITE_CITADEL] = FILES;
SQY[WHITE_CITADEL] = 1;
SQX[BLACK_CITADEL] = -1;
SQY[BLACK_CITADEL] = 8;

export function isCitadel(sq: number): boolean {
  return sq >= 110;
}

/** The citadel a side's king tries to reach (the opponent's own citadel). */
export function enemyCitadel(side: Side): number {
  return side === WHITE ? BLACK_CITADEL : WHITE_CITADEL;
}
export function ownCitadel(side: Side): number {
  return side === WHITE ? WHITE_CITADEL : BLACK_CITADEL;
}
export function lastRank(side: Side): number {
  return side === WHITE ? RANKS - 1 : 0;
}

/** 180-degree rotation: the opening arrays are point-symmetric. */
export function rotate(sq: number): number {
  if (sq === WHITE_CITADEL) return BLACK_CITADEL;
  if (sq === BLACK_CITADEL) return WHITE_CITADEL;
  return 109 - sq;
}

// Directions: 0 N, 1 E, 2 S, 3 W, 4 NE, 5 SE, 6 SW, 7 NW
export const DX = [0, 1, 0, -1, 1, 1, -1, -1];
export const DY = [1, 0, -1, 0, 1, -1, -1, 1];
export const OPPOSITE = [2, 3, 0, 1, 6, 7, 4, 5];
/** Orthogonal legs a giraffe may continue with after a given diagonal step (outward only). */
export const DIAG_ORTHO: number[][] = [[], [], [], [], [0, 1], [2, 1], [2, 3], [0, 3]];
/** Diagonals that contain a given orthogonal component. */
export const ORTHO_DIAGS: number[][] = [[4, 7], [4, 5], [5, 6], [6, 7]];

/** STEP[dir][sq] -> neighbouring board square or -1. Citadels are never reached by steps. */
export const STEP: Int16Array[] = [];
for (let d = 0; d < 8; d++) {
  const t = new Int16Array(NSQ).fill(-1);
  for (let s = 0; s < 110; s++) t[s] = boardSqAt(SQX[s] + DX[d], SQY[s] + DY[d]);
  STEP.push(t);
}

function leaperTable(offsets: [number, number][]): number[][] {
  const out: number[][] = [];
  for (let s = 0; s < NSQ; s++) {
    const list: number[] = [];
    if (s < 110) {
      for (const [dx, dy] of offsets) {
        const t = boardSqAt(SQX[s] + dx, SQY[s] + dy);
        if (t >= 0) list.push(t);
      }
    }
    out.push(list);
  }
  return out;
}

function symmetric(a: number, b: number): [number, number][] {
  const set = new Set<string>();
  const res: [number, number][] = [];
  for (const [x, y] of [[a, b], [b, a]]) {
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) {
        const k = `${x * sx},${y * sy}`;
        if (!set.has(k)) {
          set.add(k);
          res.push([x * sx, y * sy]);
        }
      }
    }
  }
  return res;
}

export const KNIGHT_LEAPS = leaperTable(symmetric(1, 2));
export const CAMEL_LEAPS = leaperTable(symmetric(1, 3));
export const ELEPHANT_LEAPS = leaperTable(symmetric(2, 2));
export const ENGINE_LEAPS = leaperTable(symmetric(2, 0));
export const GENERAL_LEAPS = leaperTable(symmetric(1, 1));
export const VIZIER_LEAPS = leaperTable(symmetric(1, 0));

/** King-step adjacency, the only table that includes the citadels. */
export const KING_ADJ: number[][] = [];
for (let s = 0; s < NSQ; s++) {
  const list: number[] = [];
  for (let d = 0; d < 8; d++) {
    const t = sqAt(SQX[s] + DX[d], SQY[s] + DY[d]);
    if (t >= 0) list.push(t);
  }
  KING_ADJ.push(list);
}

/** PAWN_FWD[side][sq], PAWN_ATT[side][sq] (squares a pawn on sq attacks). */
export const PAWN_FWD: Int16Array[] = [new Int16Array(NSQ).fill(-1), new Int16Array(NSQ).fill(-1)];
export const PAWN_ATT: number[][][] = [[], []];
for (let side = 0; side < 2; side++) {
  const dy = side === WHITE ? 1 : -1;
  for (let s = 0; s < NSQ; s++) {
    const att: number[] = [];
    if (s < 110) {
      PAWN_FWD[side][s] = boardSqAt(SQX[s], SQY[s] + dy);
      for (const dx of [-1, 1]) {
        const t = boardSqAt(SQX[s] + dx, SQY[s] + dy);
        if (t >= 0) att.push(t);
      }
    }
    PAWN_ATT[side].push(att);
  }
}

const FILE_NAMES = 'abcdefghijk';
export function sqName(sq: number): string {
  if (sq === WHITE_CITADEL) return 'l2';
  if (sq === BLACK_CITADEL) return 'z9';
  return FILE_NAMES[SQX[sq]] + (SQY[sq] + 1);
}
export function sqFromName(name: string): number {
  if (name === 'l2') return WHITE_CITADEL;
  if (name === 'z9') return BLACK_CITADEL;
  const x = FILE_NAMES.indexOf(name[0]);
  const y = parseInt(name.slice(1), 10) - 1;
  return boardSqAt(x, y);
}

export function distance(a: number, b: number): number {
  return Math.max(Math.abs(SQX[a] - SQX[b]), Math.abs(SQY[a] - SQY[b]));
}
