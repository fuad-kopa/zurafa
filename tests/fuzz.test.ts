// Randomised rules checking: thousands of random legal games from every array, rule combination, battle
// and puzzle start, with invariants asserted at every ply. Fixed seeds, so failures reproduce.
// FUZZ_SCALE=10 npx vitest run tests/fuzz.test.ts  runs ten times as many games.

import { describe, it, expect } from 'vitest';
import { NSQ, WHITE, BLACK, Side, SQX, SQY, lastRank, enemyCitadel, ownCitadel, sqName, sqFromName, PAWN_ATT } from '../src/engine/geometry';
import * as P from '../src/engine/pieces';
import { Position, RuleOptions, ArrayName, Move, NORMAL, SWAP, RELOCATE, moveFrom, moveTo, moveKind } from '../src/engine/position';
import { Game, GameResult, SetupSpec, moveToString, moveFromString } from '../src/engine/game';
import { PSQ } from '../src/engine/values';
import { BATTLES, battleSpec, buildBattle } from '../src/battles';
import { PUZZLES, buildPuzzle, solutions, goalMet, forcedReply, matingMoves, isMultiMove } from '../src/puzzles';
import { Searcher } from '../src/ai/search';

const SCALE = Number(process.env.FUZZ_SCALE ?? 1);
/** vitest hides console output of passing tests; totals go straight to stdout. */
const report = (msg: string): void => void process.stdout.write(`[fuzz] ${msg}\n`);

// ---------- helpers ----------

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ARRAYS: ArrayName[] = ['masculine', 'feminine', 'third'];

function ruleCombos(array: ArrayName): RuleOptions[] {
  const out: RuleOptions[] = [];
  for (const swapWhen of ['check', 'checkOrStalemate'] as const)
    for (const modernDraws of [false, true])
      for (const picketOneStep of [false, true])
        for (const bareKingWins of [false, true])
          for (const popMayTargetKing of [false, true])
            out.push({ array, swapWhen, modernDraws, picketOneStep, bareKingWins, popMayTargetKing });
  return out;
}

function menOf(list: string[]): [number, number][] {
  return list.map((s) => {
    const [side, id, sq] = s.split(' ');
    const t = P.TYPE_ID.indexOf(id);
    if (t <= 0) throw new Error(`bad piece ${id}`);
    return [sqFromName(sq), side === 'w' ? t : -t];
  });
}

interface Start {
  name: string;
  spec: SetupSpec | null;
  /** only the standard array depends on RuleOptions.array */
  array?: ArrayName;
}

/** Hand-made positions that reach the rare rules quickly: pawn-of-pawns stages, princes, swaps, citadels. */
const LABS: Start[] = [
  {
    name: 'lab:pawnOfPawns',
    spec: {
      side: 0,
      men: menOf([
        'w king f1', 'b king f10', 'w pawnPawn b8', 'w pawnPawn1 h8', 'w pawnPawn2 j8', 'w pawnKing e8', 'w rook a1', 'w knight k1',
        'b pawnPawn j3', 'b pawnPawn1 d3', 'b pawnPawn2 b3', 'b pawnKing g3', 'b rook k10', 'b knight a10', 'b picket c9', 'w picket i2',
      ]),
    },
  },
  {
    name: 'lab:dummyWaiting',
    spec: {
      side: 1,
      men: menOf([
        'w king a1', 'b king k10', 'w pawnPawn c10', 'b knight f7', 'b picket h7', 'b pawnRook g6', 'b rook d6', 'b camel e5',
        'b pawnPawn i1', 'w giraffe c3', 'w knight h3', 'w rook k2',
      ]),
    },
  },
  {
    name: 'lab:royals',
    spec: {
      side: 0,
      men: menOf([
        'w king f2', 'w prince c5', 'w advKing i4', 'b king f9', 'b prince h7', 'b advKing b8', 'w rook a2', 'b rook k9',
        'w giraffe d1', 'b giraffe h10', 'w pawnKing d8', 'b pawnKing h3',
      ]),
    },
  },
  {
    name: 'lab:citadelRun',
    spec: {
      side: 0,
      men: menOf(['w king b8', 'b king j3', 'w rook e1', 'b rook e10', 'w advKing k4', 'b advKing a7', 'w knight c3', 'b knight i8']),
      swapUsed: [0, 0],
    },
  },
  {
    name: 'lab:terrainMix',
    spec: {
      side: 0,
      men: menOf(['w king f1', 'b king f10', 'w giraffe c2', 'b giraffe i9', 'w picket e3', 'b picket g8', 'w rook a1', 'b rook k10',
        'w pawnRook d4', 'b pawnRook h7', 'w pawnPawn1 c7', 'b pawnPawn1 i4']),
      terrain: ['e5', 'f5', 'g6', 'b6', 'j5'].map((s) => sqFromName(s) + 128).concat(['d5', 'h6', 'c8', 'i3', 'f9'].map((s) => sqFromName(s) + 256)),
    },
  },
];

function puzzleSpec(p: (typeof PUZZLES)[number]): SetupSpec {
  return { men: menOf(p.men), side: p.side, swapUsed: p.swapUsed };
}

const STARTS: Start[] = [
  ...ARRAYS.map((a) => ({ name: `array:${a}`, spec: null, array: a })),
  ...BATTLES.map((b) => ({ name: `battle:${b.id}`, spec: battleSpec(b) })),
  ...PUZZLES.map((p) => ({ name: `puzzle:${p.id}`, spec: puzzleSpec(p) })),
  ...LABS,
];

function newGame(start: Start, rules: RuleOptions): Game {
  return start.spec ? Game.fromSpec(rules, start.spec) : new Game(rules);
}

const sideOf = (p: number): Side => (p > 0 ? WHITE : BLACK);
const abs = (p: number) => (p < 0 ? -p : p);

function terrainList(pos: Position): number[] {
  const out: number[] = [];
  for (let sq = 0; sq < NSQ; sq++) if (pos.terrain[sq]) out.push(sq + 128 * pos.terrain[sq]);
  return out;
}

const scratch = new Position();
/** Hash, counts and score of the same position built from nothing. */
function fromScratch(pos: Position): { lo: number; hi: number; score: number; cnt: number[] } {
  const men: [number, number][] = [];
  for (let sq = 0; sq < NSQ; sq++) if (pos.board[sq]) men.push([sq, pos.board[sq]]);
  scratch.rules = pos.rules;
  scratch.loadSetup(men, pos.side, [pos.swapUsed[0], pos.swapUsed[1]], terrainList(pos));
  return { lo: scratch.hashLo, hi: scratch.hashHi, score: scratch.score, cnt: Array.from(scratch.cnt) };
}

function royalSquares(pos: Position, side: Side): number[] {
  const out: number[] = [];
  for (let sq = 0; sq < NSQ; sq++) {
    const p = pos.board[sq];
    if (p !== 0 && sideOf(p) === side && P.isRoyal(abs(p))) out.push(sq);
  }
  return out;
}
function topRoyalByScan(pos: Position, side: Side): number {
  let best = 0;
  for (const sq of royalSquares(pos, side)) {
    const t = abs(pos.board[sq]);
    if (!best || t < best) best = t;
  }
  return best;
}

/** Brute-force attack test: does some pseudo-move of `by` land on sq? (sq must hold a man of the other side) */
function bruteAttacked(pos: Position, sq: number, by: Side): boolean {
  const list: Move[] = [];
  for (let s = 0; s < NSQ; s++) {
    const p = pos.board[s];
    if (p !== 0 && sideOf(p) === by) pos.genPiece(s, list, false);
  }
  for (const m of list) if (moveTo(m) === sq) return true;
  return false;
}
function attackedSet(pos: Position, by: Side): Set<number> {
  const list: Move[] = [];
  for (let s = 0; s < NSQ; s++) {
    const p = pos.board[s];
    if (p !== 0 && sideOf(p) === by) pos.genPiece(s, list, false);
  }
  return new Set(list.map(moveTo));
}
/** Check by the independent definition: a side with exactly one royal whose square an enemy move reaches. */
function bruteInCheck(pos: Position, side: Side): boolean {
  const r = royalSquares(pos, side);
  return r.length === 1 && bruteAttacked(pos, r[0], (1 - side) as Side);
}

function bruteLegal(pos: Position): Move[] {
  const side = pos.side;
  const pseudo: Move[] = [];
  pos.genPseudo(pseudo);
  const swaps: Move[] = [];
  pos.genSwaps(swaps);
  const ok = (m: Move) => {
    pos.make(m);
    const bad = bruteInCheck(pos, side);
    pos.unmake();
    return !bad;
  };
  const checked = bruteInCheck(pos, side);
  let legal = pseudo.filter(ok);
  if (checked) legal = legal.concat(swaps.filter(ok));
  else if (legal.length === 0 && pos.rules.swapWhen === 'checkOrStalemate') legal = swaps.filter(ok);
  return legal;
}

/** Is there any legal move? Same definition as bruteLegal, stopping at the first one found. */
function bruteHasLegal(pos: Position): boolean {
  const side = pos.side;
  const ok = (m: Move) => {
    pos.make(m);
    const bad = bruteInCheck(pos, side);
    pos.unmake();
    return !bad;
  };
  const pseudo: Move[] = [];
  pos.genPseudo(pseudo);
  if (pseudo.some(ok)) return true;
  const checked = bruteInCheck(pos, side);
  if (!checked && pos.rules.swapWhen !== 'checkOrStalemate') return false;
  const swaps: Move[] = [];
  pos.genSwaps(swaps);
  return swaps.some(ok);
}

/**
 * Puzzles whose start is not a legal chess position: the side NOT to move is already in check.
 * mateKingHelps: White Ki9, Tc2, Ra8; Black Kk10, pawn j10. The picket on c2 checks k10 along c2-k10,
 * and the pawn on j10 checks i9 too. Kept as the owner designed it (see the fuzz report); the test pins
 * the list so a fix, or a new such puzzle, is noticed.
 */
const ILLEGAL_START_PUZZLES: string[] = [];

interface Snap {
  board: number[]; lo: number; hi: number; cnt: number[]; score: number; side: Side; swap: number[]; half: number; undo: number; royals: number[];
}
function snap(pos: Position): Snap {
  const royals: number[] = [];
  // royalSq is only defined for a royal type present exactly once (with two of a kind it may name either).
  for (const s of [0, 1]) for (let t = 1; t <= 3; t++) royals.push(pos.cnt[s * P.NUM_TYPES + t] === 1 ? pos.royalSq[s * 4 + t] : -1);
  return {
    board: Array.from(pos.board), lo: pos.hashLo, hi: pos.hashHi, cnt: Array.from(pos.cnt), score: pos.score, side: pos.side,
    swap: [...pos.swapUsed], half: pos.halfmove, undo: pos.undoDepth, royals,
  };
}

function sameArr(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function sameSnap(a: Snap, b: Snap): boolean {
  return a.lo === b.lo && a.hi === b.hi && a.score === b.score && a.side === b.side && a.half === b.half && a.undo === b.undo &&
    sameArr(a.board, b.board) && sameArr(a.cnt, b.cnt) && sameArr(a.swap, b.swap) && sameArr(a.royals, b.royals);
}

class Fail extends Error {}
function must(cond: boolean, msg: () => string): void {
  if (!cond) throw new Fail(msg());
}

function describePos(pos: Position): string {
  const men: string[] = [];
  for (let sq = 0; sq < NSQ; sq++) {
    const p = pos.board[sq];
    if (p) men.push(`${p > 0 ? 'w' : 'b'} ${P.TYPE_ID[abs(p)]} ${sqName(sq)}`);
  }
  const terr = terrainList(pos).map((t) => `${(t >> 7) === 1 ? 'water' : 'hill'} ${sqName(t & 127)}`);
  return `side=${pos.side} swap=${pos.swapUsed} rules=${JSON.stringify(pos.rules)}\n  men: ${men.join(', ')}\n  terrain: ${terr.join(', ')}`;
}

/** Static invariants of any reachable position. */
function checkConsistent(pos: Position, where: () => string): void {
  const fresh = fromScratch(pos);
  must(fresh.lo === pos.hashLo && fresh.hi === pos.hashHi, () => `incremental hash differs from recomputed at ${where()}`);
  must(fresh.score === pos.score, () => `score ${pos.score} vs recomputed ${fresh.score} at ${where()}`);
  must(fresh.cnt.every((c, i) => c === pos.cnt[i]), () => `piece counts differ at ${where()}`);
  let score = 0;
  for (let sq = 0; sq < NSQ; sq++) if (pos.board[sq]) score += PSQ[(pos.board[sq] + 25) * NSQ + sq];
  must(score === pos.score, () => `score not the PSQ sum at ${where()}`);
  for (const s of [WHITE, BLACK] as Side[]) {
    const sign = s === WHITE ? 1 : -1;
    for (let t = P.KING; t <= P.ADV_KING; t++) {
      if (!pos.cnt[s * P.NUM_TYPES + t]) continue;
      const rsq = pos.royalSq[s * 4 + t];
      must(pos.board[rsq] === sign * t, () => `royalSq[${s},${P.TYPE_ID[t]}] = ${sqName(rsq)} is stale at ${where()}`);
    }
    must(pos.topRoyal(s) === topRoyalByScan(pos, s), () => `topRoyal mismatch at ${where()}`);
    must(pos.royalCount(s) === royalSquares(pos, s).length, () => `royalCount mismatch at ${where()}`);
  }
  for (let sq = 0; sq < NSQ; sq++) {
    const p = pos.board[sq];
    if (!p) continue;
    const t = abs(p);
    const s = sideOf(p);
    must(pos.terrain[sq] !== 1, () => `${P.TYPE_ID[t]} stands in water on ${sqName(sq)} at ${where()}`);
    if (sq >= 110) {
      must(P.isRoyal(t), () => `non-royal ${P.TYPE_ID[t]} in a citadel at ${where()}`);
      if (sq === ownCitadel(s)) must(t === P.ADV_KING, () => `${P.TYPE_ID[t]} in its own citadel at ${where()}`);
    }
    if (P.isPawn(t) && sq < 110 && SQY[sq] === lastRank(s)) {
      must(t === P.PAWN_PAWN, () => `${P.TYPE_ID[t]} resting unpromoted on its last rank ${sqName(sq)} at ${where()}`);
    }
  }
}

/** isAttacked must agree with the move generator on every occupied square (and a few empty ones). */
function checkAttacks(pos: Position, rng: () => number, where: () => string): void {
  for (const by of [WHITE, BLACK] as Side[]) {
    const hit = attackedSet(pos, by);
    for (let sq = 0; sq < NSQ; sq++) {
      const p = pos.board[sq];
      if (p === 0 || sideOf(p) === by || pos.isImmune(sq)) continue;
      const a = pos.isAttacked(sq, by);
      must(a === hit.has(sq), () => `isAttacked(${sqName(sq)}, ${by}) = ${a} but generator says ${hit.has(sq)} at ${where()}\n${describePos(pos)}`);
    }
    // Empty squares: drop in an enemy general and ask both again.
    for (let k = 0; k < 3; k++) {
      const sq = Math.floor(rng() * 110);
      if (pos.board[sq] !== 0 || pos.terrain[sq] === 1) continue;
      pos.board[sq] = by === WHITE ? -P.GENERAL : P.GENERAL;
      const a = pos.isAttacked(sq, by);
      const b = bruteAttacked(pos, sq, by);
      pos.board[sq] = 0;
      must(a === b, () => `isAttacked(empty ${sqName(sq)}, ${by}) = ${a} but generator says ${b} at ${where()}\n${describePos(pos)}`);
    }
  }
}

const EXPECT_PROMO = (t: number): number => (t === P.PAWN_KING ? P.PRINCE : t === P.PAWN_PAWN_2 ? P.ADV_KING : P.pawnMaster(t));

const menCount = (pos: Position): number => {
  let n = 0;
  for (let sq = 0; sq < NSQ; sq++) if (pos.board[sq]) n++;
  return n;
};

/** Everything that must hold for one legal move: make it, inspect, unmake, compare. */
function checkMove(pos: Position, m: Move, where: () => string): void {
  const side = pos.side;
  const opp = (1 - side) as Side;
  const sign = side === WHITE ? 1 : -1;
  const from = moveFrom(m);
  const to = moveTo(m);
  const kind = moveKind(m);
  const piece = pos.board[from];
  const type = abs(piece);
  const target = pos.board[to];
  const before = snap(pos);
  const oppRoyals = pos.royalCount(opp);
  const men = menCount(pos);
  const ms = () => `${moveToString(m)} at ${where()}\n${describePos(pos)}`;

  must(moveFromString(moveToString(m)) === m, () => `move string does not round-trip: ${ms()}`);
  must(piece !== 0 && sideOf(piece) === side, () => `move of a man that is not the mover's: ${ms()}`);
  must(pos.terrain[to] !== 1 && pos.terrain[from] !== 1, () => `move touches water: ${ms()}`);
  let removed = 0;

  if (kind === SWAP) {
    must(type === P.KING, () => `swap by a non-king: ${ms()}`);
    must(target !== 0 && sideOf(target) === side && !P.isRoyal(abs(target)) && !pos.isImmune(to), () => `swap with an illegal partner: ${ms()}`);
    must(pos.swapUsed[side] === 0, () => `second swap: ${ms()}`);
    must(pos.royalCount(side) === 1, () => `swap while not sole royal: ${ms()}`);
    must(!(P.isPawn(abs(target)) && SQY[from] === lastRank(side)), () => `swap puts a pawn on its last rank: ${ms()}`);
  } else if (kind === RELOCATE) {
    must(type === P.PAWN_PAWN && SQY[from] === lastRank(side), () => `relocation of something other than the waiting pawn of pawns: ${ms()}`);
    must(to < 110 && to !== from, () => `relocation to a bad square: ${ms()}`);
    if (target) {
      must(!P.isRoyal(abs(target)) && !pos.isImmune(to), () => `relocation displaces a royal or immune man: ${ms()}`);
      removed = 1;
    }
  } else {
    must(from !== to, () => `null move: ${ms()}`);
    if (target) {
      must(sideOf(target) === opp, () => `captures own man: ${ms()}`);
      must(!pos.isImmune(to), () => `captures the immune pawn of pawns: ${ms()}`);
      if (P.isRoyal(abs(target))) must(oppRoyals >= 2, () => `captures the last royal: ${ms()}`);
      removed = 1;
    }
    if (to >= 110) {
      must(P.isRoyal(type) && target === 0, () => `bad citadel entry: ${ms()}`);
      if (to === enemyCitadel(side)) must(type === topRoyalByScan(pos, side), () => `a lesser royal enters the enemy citadel: ${ms()}`);
      else must(type === P.ADV_KING, () => `own citadel entered by ${P.TYPE_ID[type]}: ${ms()}`);
    }
    if (P.isPawn(type)) {
      const dy = SQY[to] - SQY[from];
      const dx = SQX[to] - SQX[from];
      must(dy === (side === WHITE ? 1 : -1), () => `pawn not moving one rank forward: ${ms()}`);
      if (dx === 0) must(target === 0, () => `pawn captures straight ahead: ${ms()}`);
      else must(Math.abs(dx) === 1 && target !== 0 && pos.terrain[to] !== 2, () => `bad pawn diagonal: ${ms()}`);
    }
  }

  const secondSq = kind === NORMAL && type === P.PAWN_PAWN_1 && SQY[to] === lastRank(side) ? pos.secondArrivalSquare(side) : -1;
  let displacedMan = 0;
  if (secondSq >= 0) {
    const d = pos.board[secondSq];
    if (d !== 0) {
      must(!P.isRoyal(abs(d)) && !pos.isImmune(secondSq), () => `second arrival displaces a royal/immune man: ${ms()}`);
      displacedMan = 1;
    }
    must(SQY[secondSq] === SQY[pos.kingPawnHome[side]], () => `second arrival off the king's pawn rank: ${ms()}`);
  }

  pos.make(m);
  must(pos.side === opp, () => `side not flipped: ${ms()}`);
  must(!bruteInCheck(pos, side), () => `legal move leaves the mover's sole royal attacked: ${ms()}`);
  must(pos.moverInCheck() === false, () => `moverInCheck true after a legal move: ${ms()}`);
  if (kind === SWAP) {
    must(pos.board[to] === piece && pos.board[from] === target, () => `swap did not exchange: ${ms()}`);
    must(pos.swapUsed[side] === 1, () => `swap not recorded: ${ms()}`);
  } else if (kind === RELOCATE) {
    must(pos.board[from] === 0 && pos.board[to] === sign * P.PAWN_PAWN_1, () => `relocation result wrong: ${ms()}`);
    // The fork rule: two attacked enemy pieces (not pawns, not on hills), or one that now has no move at all.
    const att = PAWN_ATT[side][to].filter((s) => {
      const e = -pos.board[s] * sign;
      return e > 0 && !P.isPawn(e) && pos.terrain[s] !== 2 && (!P.isRoyal(e) || pos.rules.popMayTargetKing);
    });
    const frozen = att.some((s) => { const l: Move[] = []; pos.genPiece(s, l, false); return l.length === 0; });
    must(att.length === 2 || (att.length === 1 && frozen), () => `relocation without fork or frozen target: ${ms()}`);
  } else {
    must(pos.board[from] === 0, () => `origin not vacated: ${ms()}`);
    if (P.isPawn(type) && SQY[to] === lastRank(side)) {
      if (type === P.PAWN_PAWN) {
        must(pos.board[to] === sign * P.PAWN_PAWN && pos.isImmune(to), () => `first arrival wrong: ${ms()}`);
      } else if (type === P.PAWN_PAWN_1) {
        must(pos.board[to] === 0 && pos.board[secondSq] === sign * P.PAWN_PAWN_2, () => `second arrival wrong: ${ms()}`);
      } else {
        must(pos.board[to] === sign * EXPECT_PROMO(type), () => `${P.TYPE_ID[type]} promoted to ${P.TYPE_ID[abs(pos.board[to])]}: ${ms()}`);
      }
    } else {
      must(pos.board[to] === piece, () => `piece changed type while moving: ${ms()}`);
    }
  }
  must(pos.swapUsed[opp] === before.swap[opp] && (kind === SWAP || pos.swapUsed[side] === before.swap[side]), () => `swap flags changed: ${ms()}`);
  must(menCount(pos) === men - removed - displacedMan, () => `men count ${menCount(pos)} != ${men} - ${removed} - ${displacedMan}: ${ms()}`);
  const irreversible = removed > 0 || P.isPawn(type) || kind !== NORMAL;
  must(pos.halfmove === (irreversible ? 0 : before.half + 1), () => `halfmove clock wrong: ${ms()}`);
  checkConsistent(pos, () => `after ${ms()}`);
  pos.unmake();
  const after = snap(pos);
  must(sameSnap(after, before), () => `unmake did not restore the position: ${ms()}\n${JSON.stringify(before)}\n${JSON.stringify(after)}`);
}

interface Stats { games: number; plies: number; movesChecked: number; results: Record<string, number>; events: Record<string, number> }
const stats: Stats = { games: 0, plies: 0, movesChecked: 0, results: {}, events: {} };

function expectedResult(game: Game, mover: Side, counts: Map<string, number>, key: string): GameResult | null {
  const pos = game.pos;
  const opp = (1 - mover) as Side;
  const cit = pos.board[enemyCitadel(mover)];
  if (cit !== 0 && sideOf(cit) === mover) return { winner: null, reason: 'citadel' };
  if (royalSquares(pos, opp).length === 0) return { winner: mover, reason: 'checkmate' };
  if (!bruteHasLegal(pos)) return { winner: mover, reason: bruteInCheck(pos, opp) ? 'checkmate' : 'stalemate' };
  if (pos.armySize(WHITE) === 0 && pos.armySize(BLACK) === 0) return { winner: null, reason: 'deadPosition' };
  if (pos.rules.bareKingWins && pos.armySize(opp) === 0 && pos.armySize(mover) > 0) return { winner: mover, reason: 'bareKing' };
  if (pos.rules.modernDraws) {
    if ((counts.get(key) ?? 0) >= 3) return { winner: null, reason: 'repetition' };
    if (pos.halfmove >= 100) return { winner: null, reason: 'fiftyMoves' };
  }
  return null;
}

function pickMove(pos: Position, moves: Move[], rng: () => number, biased: boolean): Move {
  if (!biased) return moves[Math.floor(rng() * moves.length)];
  let total = 0;
  const w = moves.map((m) => {
    const kind = moveKind(m);
    const t = abs(pos.board[moveFrom(m)]);
    const target = pos.board[moveTo(m)];
    let x = 1;
    if (kind === RELOCATE) x = 25;
    else if (kind === SWAP) x = 6;
    else {
      if (target) x += P.isRoyal(abs(target)) ? 40 : 6;
      if (P.isPawn(t)) x += 5 + (t >= P.PAWN_PAWN ? 10 : 0);
      if (moveTo(m) >= 110) x += 8;
    }
    total += x;
    return x;
  });
  let r = rng() * total;
  for (let i = 0; i < moves.length; i++) if ((r -= w[i]) < 0) return moves[i];
  return moves[moves.length - 1];
}

interface PlayOpts { maxPlies: number; deepEvery: number; biased: boolean; onPosition?: (g: Game) => void }

/** One random game with every invariant checked; returns the finished game. */
function playRandom(start: Start, rules: RuleOptions, seed: number, opts: PlayOpts): Game {
  const rng = mulberry32(seed);
  const game = newGame(start, rules);
  const pos = game.pos;
  const initial = snap(pos);
  const where = () => `${start.name} seed=${seed} ply=${game.ply} moves=[${game.serialize().join(' ')}]`;
  const hashKey = () => `${pos.hashLo},${pos.hashHi}`;
  const counts = new Map<string, number>([[hashKey(), 1]]);
  const swaps = [0, 0];
  checkConsistent(pos, where);
  // A start position must be legal: the side not to move is not in check.
  must(bruteInCheck(pos, (1 - pos.side) as Side) === ILLEGAL_START_PUZZLES.includes(start.name),
    () => `start position legality unexpected (side not to move in check?): ${where()}`);

  while (!game.result && game.ply < opts.maxPlies) {
    const legal = game.legalMoves();
    must(game.inCheck() === bruteInCheck(pos, pos.side), () => `inCheck disagrees with brute force at ${where()}\n${describePos(pos)}`);
    must(legal.length > 0, () => `no legal moves but no result at ${where()}`);
    checkAttacks(pos, rng, where);
    if (game.ply % opts.deepEvery === 0) {
      const brute = bruteLegal(pos);
      const a = [...legal].sort((x, y) => x - y);
      const b = [...brute].sort((x, y) => x - y);
      must(JSON.stringify(a) === JSON.stringify(b), () => `legalMoves ${a.map(moveToString)} vs brute ${b.map(moveToString)} at ${where()}\n${describePos(pos)}`);
      for (const m of legal) checkMove(pos, m, where);
      stats.movesChecked += legal.length;
    }
    opts.onPosition?.(game);

    const m = pickMove(pos, legal, rng, opts.biased);
    const mover = pos.side;
    const rec = game.play(m);
    stats.plies++;
    for (const e of rec.events) stats.events[e] = (stats.events[e] ?? 0) + 1;
    if (moveKind(m) === SWAP) {
      swaps[mover]++;
      must(swaps[mover] + initial.swap[mover] <= 1, () => `king swapped twice by side ${mover}: ${where()}`);
    }
    must(rec.side === mover && rec.move === m, () => `record mismatch at ${where()}`);
    if (P.isRoyal(rec.captured) && rec.kind === NORMAL) must(pos.royalCount(rec.capturedSide!) >= 1, () => `last royal captured at ${where()}`);
    counts.set(hashKey(), (counts.get(hashKey()) ?? 0) + 1);
    must(game.repetitions() === counts.get(hashKey()), () => `repetition count ${game.repetitions()} vs ${counts.get(hashKey())} at ${where()}`);
    checkConsistent(pos, where);
    const exp = expectedResult(game, mover, counts, hashKey());
    must(JSON.stringify(game.result) === JSON.stringify(exp), () => `result ${JSON.stringify(game.result)} expected ${JSON.stringify(exp)} at ${where()}\n${describePos(pos)}`);
    must(rec.check === bruteInCheck(pos, pos.side), () => `record check flag wrong at ${where()}`);

    // Occasionally take the move back and play it again through Game.undo().
    if (rng() < 0.05) {
      const h = [pos.hashLo, pos.hashHi, JSON.stringify(game.result)];
      game.undo();
      game.play(m);
      must(JSON.stringify([pos.hashLo, pos.hashHi, JSON.stringify(game.result)]) === JSON.stringify(h), () => `undo/replay differs at ${where()}`);
    }
  }
  if (game.result) {
    stats.results[game.result.reason] = (stats.results[game.result.reason] ?? 0) + 1;
    must(game.legalMoves().length === 0, () => `finished game still offers moves at ${where()}`);
  }

  // serialize -> rebuild reproduces the game exactly.
  const moves = game.serialize();
  const copy = Game.rebuild(rules, start.spec, moves);
  must(copy.pos.hashLo === pos.hashLo && copy.pos.hashHi === pos.hashHi && JSON.stringify(Array.from(copy.pos.board)) === JSON.stringify(Array.from(pos.board)),
    () => `rebuild differs at ${where()}`);
  must(JSON.stringify(copy.result) === JSON.stringify(game.result), () => `rebuild result ${JSON.stringify(copy.result)} vs ${JSON.stringify(game.result)} at ${where()}`);
  must(copy.pos.halfmove === pos.halfmove && copy.pos.swapUsed.join() === pos.swapUsed.join(), () => `rebuild clocks differ at ${where()}`);
  if (!start.spec) {
    const fm = Game.fromMoves(rules, moves);
    must(fm.pos.hashLo === pos.hashLo && fm.pos.hashHi === pos.hashHi, () => `fromMoves differs at ${where()}`);
  }
  // And undoing every move returns to the start.
  const end = snap(pos);
  const result = game.result;
  const recs = game.records.slice();
  while (game.undo());
  const back = snap(pos);
  must(sameSnap(back, initial), () => `undoing all moves does not restore the start: ${start.name} seed=${seed}`);
  for (const r of recs) game.play(r.move);
  must(sameSnap(snap(pos), end) && JSON.stringify(game.result) === JSON.stringify(result), () => `replay after full undo differs: ${start.name} seed=${seed}`);
  stats.games++;
  return game;
}

// ---------- tests ----------

describe('fuzz: random legal games', () => {
  it('every array x every rule combination from the standard start', () => {
    let seed = 1;
    for (const array of ARRAYS) {
      for (const rules of ruleCombos(array)) {
        for (let k = 0; k < Math.max(1, Math.round(SCALE)); k++) {
          playRandom({ name: `array:${array}`, spec: null }, rules, seed, { maxPlies: 200, deepEvery: 12, biased: (seed & 1) === 1 });
          seed++;
        }
      }
    }
  }, 600_000);

  it('every battle and lab position x every rule combination', () => {
    let seed = 10_000;
    for (const start of [...STARTS.filter((s) => s.name.startsWith('battle:')), ...LABS]) {
      for (const rules of ruleCombos('masculine')) {
        for (let k = 0; k < Math.max(1, Math.round(SCALE)); k++) {
          playRandom(start, rules, seed, { maxPlies: 110, deepEvery: 16, biased: (seed & 1) === 1 });
          seed++;
        }
      }
    }
  }, 600_000);

  it('every puzzle start x every rule combination', () => {
    let seed = 50_000;
    for (const start of STARTS.filter((s) => s.name.startsWith('puzzle:'))) {
      for (const rules of ruleCombos('masculine')) {
        for (let k = 0; k < Math.max(1, Math.round(SCALE)); k++) {
          playRandom(start, rules, seed, { maxPlies: 100, deepEvery: 6, biased: (seed & 1) === 0 });
          seed++;
        }
      }
    }
    report(`fuzz totals: ${stats.games} games, ${stats.plies} plies, ${stats.movesChecked} moves deep-checked`);
    report(`results: ${JSON.stringify(stats.results)}`);
    report(`events: ${JSON.stringify(stats.events)}`);
  }, 600_000);
});

describe('perft: legal generator vs brute-force attack filter', () => {
  function perft(pos: Position, depth: number, brute: boolean): number {
    const moves = brute ? bruteLegal(pos) : pos.legalMoves();
    if (depth === 1) return moves.length;
    let n = 0;
    for (const m of moves) {
      pos.make(m);
      n += perft(pos, depth - 1, brute);
      pos.unmake();
    }
    return n;
  }
  for (const array of ARRAYS) {
    for (const picketOneStep of [false, true]) {
      it(`${array}, picketOneStep=${picketOneStep}: depth 3 agrees`, () => {
        const rules: RuleOptions = { ...ruleCombos(array)[0], picketOneStep };
        const pos = new Position(rules);
        const h = [pos.hashLo, pos.hashHi];
        const counts = [1, 2, 3].map((d) => perft(pos, d, false));
        const bruteCounts = [1, 2, 3].map((d) => perft(pos, d, true));
        report(`perft ${array} oneStep=${picketOneStep}: ${counts.join(' / ')}`);
        expect(counts).toEqual(bruteCounts);
        expect([pos.hashLo, pos.hashHi]).toEqual(h);
      }, 120_000);
    }
  }
  it('each battle: depth 2 agrees', () => {
    for (const b of BATTLES) {
      const g = buildBattle(b);
      expect(perft(g.pos, 2, false)).toBe(perft(g.pos, 2, true));
    }
  }, 120_000);
});

describe('AI search on random positions', () => {
  it('returns a legal move (null only without moves) and leaves the position untouched', () => {
    const searcher = new Searcher();
    const samples: { g: Game; name: string }[] = [];
    let seed = 90_000;
    for (const start of STARTS) {
      const rules = ruleCombos(start.array ?? 'masculine')[(seed * 7) % 32];
      const rng = mulberry32(seed++);
      const game = newGame(start, rules);
      const stop = 5 + Math.floor(rng() * 60);
      while (!game.result && game.ply < stop) {
        const ms = game.legalMoves();
        game.play(pickMove(game.pos, ms, rng, true));
      }
      samples.push({ g: game, name: start.name });
    }
    let searched = 0;
    for (const { g, name } of samples) {
      for (const noise of [0, 80]) {
        const pos = g.pos;
        const before = snap(pos);
        const legal = pos.legalMoves();
        const r = searcher.search(pos, { maxDepth: 4, maxNodes: 6000, maxTimeMs: 3000, noise }, g.hashList());
        searched++;
        expect(JSON.stringify(snap(pos)), name).toBe(JSON.stringify(before));
        if (legal.length === 0) expect(r.move, name).toBeNull();
        else expect(legal.includes(r.move!), `${name}: ${r.move === null ? 'null' : moveToString(r.move)}`).toBe(true);
        for (let i = 1; i < r.pv.length; i++) expect(r.pv[i]).toBeGreaterThan(0);
      }
    }
    report(`search: ${searched} searches on ${samples.length} positions`);
  }, 120_000);
});

describe('puzzles and battles start sound', () => {
  for (const p of PUZZLES) {
    it(`puzzle ${p.id}: legal start, solvable, every solution meets its goal`, () => {
      const g = buildPuzzle(p);
      const pos = g.pos;
      expect(bruteInCheck(pos, (1 - pos.side) as Side)).toBe(ILLEGAL_START_PUZZLES.includes(`puzzle:${p.id}`));
      checkConsistent(pos, () => p.id);
      const sols = solutions(p);
      expect(sols.length).toBeGreaterThan(0);
      for (const m of sols) {
        const rec = g.play(m);
        if (isMultiMove(p)) {
          const reply = forcedReply(g);
          expect(reply).not.toBeNull();
          // Every reply leaves at least one mate.
          for (const r of [...g.legalMoves()]) {
            g.play(r);
            expect(g.result !== null || matingMoves(g).length > 0).toBe(true);
            g.undo();
          }
        } else {
          expect(goalMet(p, g, rec)).toBe(true);
        }
        g.undo();
      }
    });
  }
  for (const b of BATTLES) {
    it(`battle ${b.id}: legal start, both sides can move`, () => {
      const g = buildBattle(b);
      const pos = g.pos;
      checkConsistent(pos, () => b.id);
      expect(bruteInCheck(pos, BLACK)).toBe(false);
      expect(g.legalMoves().length).toBeGreaterThan(0);
      pos.makeNull();
      expect(pos.legalMoves().length).toBeGreaterThan(0);
      pos.unmakeNull();
      // No man starts on water.
      for (let sq = 0; sq < 110; sq++) if (pos.board[sq]) expect(pos.terrain[sq]).not.toBe(1);
    });
  }
});
