// Course lessons: data model and an exact solver on a sandbox board.
// The player always has White (side 0) and moves one piece; Black's men stand still and are only
// targets (and, in "safe" lessons, attackers: landing where they strike loses the attempt).

import { Position, moveTo } from '../engine/position';
import { SQY, enemyCitadel, lastRank, BLACK } from '../engine/geometry';
import * as P from '../engine/pieces';

/** reach: collect the stars without stepping onto an attacked square (black men only guard). */
export type LessonKind = 'stars' | 'capture' | 'safe' | 'reach' | 'promote' | 'citadel' | 'mate' | 'stalemate';

export interface Lesson {
  id: string;
  unit: string;
  kind: LessonKind;
  /** [square, signed piece]: positive = White (the player), negative = Black */
  men: [number, number][];
  stars?: number[];
  /** squares encoded sq + 128 * kind (1 water, 2 hill), as in SetupSpec */
  terrain?: number[];
  /** fewest moves that solve it (1 for mates) */
  best: number;
}

export interface Unit {
  id: string;
  /** the piece whose icon and move text introduce the unit */
  piece: number;
  lessons: Lesson[];
}

/** The state of a one-piece lesson: where the piece stands, which black men and stars remain. */
export interface SoloState {
  sq: number;
  piece: number;
  targets: [number, number][];
  stars: number[];
}

export function soloStart(l: Lesson): SoloState {
  const mine = l.men.find(([, p]) => p > 0)!;
  return { sq: mine[0], piece: mine[1], targets: l.men.filter(([, p]) => p < 0), stars: [...(l.stars ?? [])] };
}

const scratch = new Position();

/** Load the sandbox board for a state (terrain included). */
export function sandbox(l: Lesson, st: SoloState): Position {
  scratch.loadSetup([...st.targets, [st.sq, st.piece]], 0, [1, 1], l.terrain ?? []);
  return scratch;
}

/** Squares the player's piece may move to from this state. */
export function soloMoves(l: Lesson, st: SoloState): number[] {
  const pos = sandbox(l, st);
  const list: number[] = [];
  pos.genPiece(st.sq, list, false);
  // Only the enemy citadel is a goal; nothing else may enter a citadel in a lesson.
  return list.map(moveTo).filter((to) => to < 110 || (l.kind === 'citadel' && to === enemyCitadel(0)));
}

export interface StepResult {
  state: SoloState;
  /** the landing square is attacked by a remaining black man (safe lessons fail on this) */
  attacked: boolean;
  promoted: boolean;
  captured: boolean;
  collected: boolean;
}

/** Make one move of the player's piece. */
export function soloStep(l: Lesson, st: SoloState, to: number): StepResult {
  const captured = st.targets.some(([sq]) => sq === to);
  const targets = st.targets.filter(([sq]) => sq !== to);
  const collected = st.stars.includes(to);
  const stars = st.stars.filter((s) => s !== to);
  let piece = st.piece;
  let promoted = false;
  if (P.isPawn(piece) && !P.isPawnOfPawns(piece) && SQY[to] === lastRank(0)) {
    piece = P.pawnMaster(piece);
    promoted = true;
  }
  const state: SoloState = { sq: to, piece, targets, stars };
  let attacked = false;
  if (l.kind === 'safe' || l.kind === 'reach') attacked = sandbox(l, state).isAttacked(to, BLACK);
  return { state, attacked, promoted, captured, collected };
}

export function soloSolved(l: Lesson, st: SoloState, last: StepResult | null): boolean {
  switch (l.kind) {
    case 'stars':
    case 'reach': return st.stars.length === 0;
    case 'capture':
    case 'safe': return st.targets.length === 0;
    case 'promote': return last?.promoted === true && st.stars.length === 0 && st.targets.length === 0;
    case 'citadel': return st.sq === enemyCitadel(0);
    default: return false;
  }
}

const key = (st: SoloState): string => `${st.sq}|${st.piece}|${st.targets.map(([s]) => s).join(',')}|${st.stars.join(',')}`;

/** Breadth-first search for the shortest solution; returns the path of target squares or null. */
export function solveSolo(l: Lesson, from: SoloState = soloStart(l), limit = 40): number[] | null {
  if (soloSolved(l, from, null)) return [];
  const seen = new Set<string>([key(from)]);
  let frontier: { st: SoloState; path: number[] }[] = [{ st: from, path: [] }];
  for (let depth = 0; depth < limit && frontier.length; depth++) {
    const next: typeof frontier = [];
    for (const { st, path } of frontier) {
      for (const to of soloMoves(l, st)) {
        const r = soloStep(l, st, to);
        if (r.attacked) continue;
        // A promoted pawn ends the lesson; it must have done everything else first.
        if (r.promoted && !soloSolved(l, r.state, r)) continue;
        if (soloSolved(l, r.state, r)) return [...path, to];
        const k = key(r.state);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ st: r.state, path: [...path, to] });
      }
    }
    frontier = next;
    if (seen.size > 60_000) break;
  }
  return null;
}

export function isSolo(l: Lesson): boolean {
  return l.kind !== 'mate' && l.kind !== 'stalemate';
}

/** Stars for a finished lesson: 3 at the best count, 2 within two extra moves or with a hint, else 1. */
export function starsFor(l: Lesson, moves: number, hinted: boolean): 1 | 2 | 3 {
  if (!isSolo(l)) return hinted ? 2 : 3;
  const s = moves <= l.best ? 3 : moves <= l.best + 2 ? 2 : 1;
  return (hinted ? Math.min(s, 2) : s) as 1 | 2 | 3;
}
