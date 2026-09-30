// Generates src/course/lessons.json: a course of 200+ lessons, every one solved exactly by the engine.
// Run: npx tsx scripts/gen-course.ts  (deterministic: same seed, same course)

import { writeFileSync } from 'node:fs';
import * as P from '../src/engine/pieces';
import { sqAt, SQX, SQY, enemyCitadel, KING_ADJ } from '../src/engine/geometry';
import { Game } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/position';
import { Lesson, LessonKind, Unit, soloStart, soloMoves, soloStep, solveSolo } from '../src/course/core';
import { matingMoves } from '../src/puzzles';

let seed = 0x2e1a7f;
const rnd = (): number => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const shuffle = <T>(a: T[]): T[] => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SQUARES = Array.from({ length: 110 }, (_, i) => i);
const inner = (sq: number, m = 1): boolean => SQX[sq] >= m && SQX[sq] <= 10 - m && SQY[sq] >= m && SQY[sq] <= 9 - m;

const BLACK_MEN = [P.PAWN_ROOK, P.PAWN_KNIGHT, P.PAWN_CAMEL, P.PAWN_GIRAFFE, P.PAWN_VIZIER, P.PAWN_GENERAL, P.PAWN_ELEPHANT, P.KNIGHT, P.CAMEL, P.ELEPHANT, P.VIZIER, P.GENERAL, P.WAR_ENGINE];
const ATTACKERS = [P.KNIGHT, P.ROOK, P.CAMEL, P.PICKET, P.GIRAFFE, P.ELEPHANT, P.WAR_ENGINE, P.GENERAL, P.VIZIER, P.PAWN_ROOK, P.PAWN_KNIGHT];

function reach(piece: number, from: number, terrain: number[] = []): Set<number> {
  const l: Lesson = { id: 'r', unit: 'r', kind: 'stars', men: [[from, piece]], stars: [], terrain, best: 0 };
  const seen = new Set([from]);
  let front = [from];
  while (front.length) {
    const nxt: number[] = [];
    for (const sq of front) for (const to of soloMoves(l, { sq, piece, targets: [], stars: [] })) if (!seen.has(to)) { seen.add(to); nxt.push(to); }
    front = nxt;
  }
  seen.delete(from);
  return seen;
}

const used = new Set<string>();
function unique(l: Lesson): boolean {
  const k = `${l.kind}|${l.men.map((m) => m.join(':')).sort().join(',')}|${(l.stars ?? []).join(',')}|${(l.terrain ?? []).join(',')}`;
  if (used.has(k)) return false;
  used.add(k);
  return true;
}

let maxDepth = 12;
function make(unit: string, n: number, kind: LessonKind, men: [number, number][], extra: Partial<Lesson> = {}): Lesson | null {
  const l: Lesson = { id: `${unit}-${n}`, unit, kind, men, best: 0, ...extra };
  const path = solveSolo(l, soloStart(l), maxDepth);
  if (!path || path.length === 0) return null;
  l.best = path.length;
  return l;
}

function starsLesson(unit: string, n: number, piece: number, k: number, minBest: number, maxBest: number, terrain: number[] = []): Lesson {
  for (let tries = 0; tries < 4000; tries++) {
    const from = pick(SQUARES.filter((s) => (P.isPawn(piece) ? SQY[s] >= 1 && SQY[s] <= 6 : inner(s, 0)) && !terrain.some((t) => (t & 127) === s)));
    const r = [...reach(piece, from, terrain)];
    if (r.length < k) continue;
    const stars = shuffle(r).slice(0, k).sort((a, b) => a - b);
    maxDepth = maxBest;
    const l = make(unit, n, 'stars', [[from, piece]], { stars, terrain: terrain.length ? terrain : undefined });
    if (l && l.best >= minBest && l.best <= maxBest && unique(l)) return l;
  }
  throw new Error(`stars ${unit}-${n}`);
}

function captureLesson(unit: string, n: number, piece: number, k: number, kind: 'capture' | 'safe', minBest: number, maxBest: number, terrain: number[] = []): Lesson {
  for (let tries = 0; tries < 20000; tries++) {
    const from = pick(SQUARES.filter((s) => (P.isPawn(piece) ? SQY[s] >= 1 && SQY[s] <= 5 : true) && !terrain.some((t) => (t & 127) === s)));
    const r = [...reach(piece, from, terrain)].filter((s) => SQY[s] < 9 || !P.isPawn(piece));
    if (r.length < k + (kind === 'safe' ? 2 : 0)) continue;
    const spots = shuffle(r).slice(0, k);
    const men: [number, number][] = [[from, piece], ...spots.map((s): [number, number] => [s, -(kind === 'safe' ? pick(ATTACKERS) : pick(BLACK_MEN))])];
    maxDepth = maxBest;
    const l = make(unit, n, kind, men, { terrain: terrain.length ? terrain : undefined });
    if (!l || l.best < minBest || l.best > maxBest) continue;
    if (kind === 'safe') {
      // Order must matter: some capture right now would land on a defended square.
      const st = soloStart(l);
      const trap = soloMoves(l, st).some((to) => soloStep(l, st, to).attacked);
      if (!trap) continue;
    }
    if (unique(l)) return l;
  }
  throw new Error(`${kind} ${unit}-${n}`);
}

// --- units of one piece -------------------------------------------------------------------------
const PIECE_UNITS: [string, number][] = [
  ['rook', P.ROOK], ['vizier', P.VIZIER], ['general', P.GENERAL], ['knight', P.KNIGHT], ['king', P.KING],
  ['elephant', P.ELEPHANT], ['engine', P.WAR_ENGINE], ['camel', P.CAMEL], ['picket', P.PICKET], ['giraffe', P.GIRAFFE],
];
const STAR_PLAN: [number, number, number][] = [[1, 1, 1], [2, 2, 3], [2, 2, 4], [3, 3, 5], [3, 4, 6], [4, 4, 8], [5, 5, 10]];

function pieceUnit(id: string, piece: number): Unit {
  const lessons: Lesson[] = [];
  let n = 1;
  for (const [k, lo, hi] of STAR_PLAN) lessons.push(starsLesson(id, n++, piece, k, lo, hi));
  for (const [k, lo, hi] of [[2, 2, 4], [3, 3, 6], [4, 4, 9]] as const) lessons.push(captureLesson(id, n++, piece, k, 'capture', lo, hi));
  for (const [k, lo, hi] of [[2, 2, 6], [3, 3, 9]] as const) lessons.push(captureLesson(id, n++, piece, k, 'safe', lo, hi));
  return { id, piece, lessons };
}

// --- pawns --------------------------------------------------------------------------------------
const PAWNS = [P.PAWN_ROOK, P.PAWN_KNIGHT, P.PAWN_CAMEL, P.PAWN_GIRAFFE, P.PAWN_ELEPHANT, P.PAWN_PICKET, P.PAWN_VIZIER, P.PAWN_GENERAL, P.PAWN_ENGINE, P.PAWN_KING];
function pawnUnit(): Unit {
  const lessons: Lesson[] = [];
  let n = 1;
  for (let i = 0; i < 6; i++) {
    for (let tries = 0; ; tries++) {
      if (tries > 20000) throw new Error('promote');
      const pawn = PAWNS[i % PAWNS.length];
      const from = sqAt(1 + Math.floor(rnd() * 9), 5 + Math.floor(rnd() * 3));
      const k = i < 2 ? 0 : i < 4 ? 1 : 2;
      const men: [number, number][] = [[from, pawn]];
      for (let j = 0; j < k; j++) {
        const s = sqAt(SQX[from] + pick([-2, -1, 1, 2]), SQY[from] + 1 + j);
        if (s >= 0 && !men.some(([q]) => q === s) && SQY[s] < 9) men.push([s, -pick(BLACK_MEN)]);
      }
      if (men.length !== k + 1) continue;
      maxDepth = 8;
      const l = make('pawns', n, 'promote', men);
      if (l && l.best >= 2 && unique(l)) { lessons.push(l); n++; break; }
    }
  }
  // Pawns take diagonally forward: build a chain of captures, with the odd quiet step between them.
  for (const k of [2, 2, 3, 3]) {
    for (let tries = 0; ; tries++) {
      if (tries > 20000) throw new Error('pawn capture');
      const pawn = pick(PAWNS.slice(0, 9));
      let at = sqAt(1 + Math.floor(rnd() * 9), 1 + Math.floor(rnd() * 3));
      const men: [number, number][] = [[at, pawn]];
      let ok = true;
      for (let j = 0; j < k && ok; j++) {
        if (rnd() < 0.35) at = sqAt(SQX[at], SQY[at] + 1);
        const next = sqAt(SQX[at] + (rnd() < 0.5 ? -1 : 1), SQY[at] + 1);
        if (at < 0 || next < 0 || SQY[next] >= 9 || men.some(([q]) => q === next)) { ok = false; break; }
        men.push([next, -pick(BLACK_MEN)]);
        at = next;
      }
      if (!ok) continue;
      maxDepth = k + 3;
      const l = make('pawns', n, 'capture', men);
      if (l && l.best >= k && l.best <= k + 3 && unique(l)) { lessons.push(l); n++; break; }
    }
  }
  return { id: 'pawns', piece: P.PAWN_ROOK, lessons };
}

// --- prince and adventitious king, citadel ------------------------------------------------------
function royalsUnit(): Unit {
  const lessons: Lesson[] = [];
  let n = 1;
  for (const [piece, k, lo, hi] of [[P.PRINCE, 2, 2, 5], [P.PRINCE, 3, 4, 8], [P.PRINCE, 4, 6, 10], [P.ADV_KING, 2, 2, 5], [P.ADV_KING, 3, 4, 8], [P.ADV_KING, 4, 6, 10]] as const) lessons.push(starsLesson('royals', n++, piece, k, lo, hi));
  for (const [k, lo, hi] of [[2, 2, 5], [3, 3, 7]] as const) lessons.push(captureLesson('royals', n++, P.PRINCE, k, 'safe', lo, hi));
  return { id: 'royals', piece: P.PRINCE, lessons };
}

function citadelUnit(): Unit {
  const lessons: Lesson[] = [];
  const cit = enemyCitadel(0);
  const near = KING_ADJ[cit].filter((s) => s < 110)[0];
  const plan: [number, number, number][] = [[1, 1, 0], [2, 3, 0], [4, 5, 0], [6, 8, 0], [5, 8, 3], [7, 10, 5]];
  let n = 1;
  for (const [lo, hi, obstacles] of plan) {
    for (let tries = 0; ; tries++) {
      if (tries > 20000) throw new Error('citadel');
      const from = pick(SQUARES.filter((s) => { const d = Math.max(Math.abs(SQX[s] - SQX[near]), Math.abs(SQY[s] - SQY[near])) + 1; return d >= lo && d <= hi; }));
      const men: [number, number][] = [[from, P.KING]];
      for (let j = 0; j < obstacles; j++) {
        const s = pick(SQUARES.filter((q) => Math.abs(SQX[q] - SQX[near]) <= 3 && Math.abs(SQY[q] - SQY[near]) <= 3 && q !== from && !men.some(([m]) => m === q)));
        men.push([s, -pick(ATTACKERS)]);
      }
      maxDepth = hi + 2;
      const l = make('citadel', n, 'citadel', men);
      if (l && l.best >= lo && l.best <= hi + 2 && unique(l)) { lessons.push(l); n++; break; }
    }
  }
  return { id: 'citadel', piece: P.KING, lessons };
}

// --- water and hills ----------------------------------------------------------------------------
function terrainUnit(): Unit {
  const lessons: Lesson[] = [];
  let n = 1;
  const river = (y: number, gaps: number[]): number[] => Array.from({ length: 11 }, (_, x) => x).filter((x) => !gaps.includes(x)).map((x) => sqAt(x, y) + 128);
  const plan: [number, number[], number, number, number][] = [
    [P.ROOK, [0, 10], 2, 3, 7], [P.KNIGHT, [], 2, 2, 5], [P.CAMEL, [], 2, 2, 6], [P.ELEPHANT, [], 2, 2, 6], [P.WAR_ENGINE, [], 2, 2, 6],
    [P.GIRAFFE, [3, 7], 2, 3, 8], [P.PICKET, [5], 2, 3, 7], [P.ROOK, [5], 3, 4, 9], [P.KNIGHT, [], 3, 4, 8], [P.CAMEL, [2, 8], 3, 4, 9],
  ];
  for (const [piece, gaps, k, lo, hi] of plan) {
    const y = 4 + Math.floor(rnd() * 2);
    const water = river(y, gaps);
    for (let tries = 0; ; tries++) {
      if (tries > 4000) throw new Error('water');
      const from = pick(SQUARES.filter((s) => SQY[s] < y - 1));
      const r = [...reach(piece, from, water)].filter((s) => SQY[s] > y);
      if (r.length < k) continue;
      const stars = shuffle(r).slice(0, k).sort((a, b) => a - b);
      maxDepth = hi;
      const l = make('terrain', n, 'stars', [[from, piece]], { stars, terrain: water });
      if (l && l.best >= lo && l.best <= hi && unique(l)) { lessons.push(l); n++; break; }
    }
  }
  // Hills: a piece on a hill cannot be taken by a pawn. A knight must reach the star through a hill
  // that black pawns strike; the plain squares on the way are struck too.
  for (let i = 0; i < 2; i++) {
    for (let tries = 0; ; tries++) {
      if (tries > 40000) throw new Error('hills');
      const piece = P.KNIGHT;
      const from = pick(SQUARES.filter((q) => SQY[q] <= 3 && inner(q, 1)));
      const hop = (q: number): number[] => { const l: Lesson = { id: 'h', unit: 'h', kind: 'stars', men: [[q, piece]], stars: [], best: 0 }; return soloMoves(l, { sq: q, piece, targets: [], stars: [] }); };
      const k1 = hop(from);
      const hill = pick(k1);
      const k2 = hop(hill).filter((q) => q !== from && SQY[q] > SQY[hill] && !k1.includes(q));
      if (!k2.length) continue;
      const star = pick(k2);
      const men: [number, number][] = [[from, piece]];
      const taken = new Set([from, star, hill]);
      const guards = i === 0 ? [hill, ...k1.filter((q) => q !== hill)] : [hill, ...k1.filter((q) => q !== hill), ...hop(star)];
      for (const g of guards) {
        const p = sqAt(SQX[g] + (rnd() < 0.5 ? -1 : 1), SQY[g] + 1);
        if (p >= 0 && p < 110 && !taken.has(p) && SQY[p] <= 8) { men.push([p, -pick(PAWNS)]); taken.add(p); }
      }
      maxDepth = 6;
      const withHill = make('terrain', n, 'reach', men, { stars: [star], terrain: [hill + 256] });
      if (!withHill || withHill.best < 2) continue;
      const route = solveSolo(withHill, soloStart(withHill), withHill.best) ?? [];
      if (!route.includes(hill)) continue;
      const flat = make('terrain', n, 'reach', men, { stars: [star] });
      if (flat && flat.best <= withHill.best) continue; // without the hill it must be impossible or longer
      if (unique(withHill)) { lessons.push(withHill); n++; break; }
    }
  }
  return { id: 'terrain', piece: P.CAMEL, lessons };
}

// --- mate in one and stalemate --------------------------------------------------------------------
function mateUnit(): Unit {
  const lessons: Lesson[] = [];
  const combos: number[][] = [
    [P.ROOK], [P.ROOK, P.ROOK], [P.GIRAFFE], [P.CAMEL, P.ROOK], [P.PICKET, P.ROOK], [P.KNIGHT, P.ROOK], [P.GIRAFFE, P.VIZIER],
    [P.ELEPHANT, P.ROOK], [P.WAR_ENGINE, P.ROOK], [P.GENERAL, P.ROOK], [P.CAMEL, P.KNIGHT], [P.PICKET, P.GIRAFFE],
  ];
  const want = (kind: 'checkmate' | 'stalemate', count: number): void => {
    let made = 0;
    for (let tries = 0; made < count; tries++) {
      if (tries > 400000) throw new Error(`${kind} ${made}`);
      const bk = pick(SQUARES.filter((s) => SQY[s] >= 7 || SQX[s] === 0 || SQX[s] === 10));
      const wk = pick(SQUARES.filter((s) => Math.max(Math.abs(SQX[s] - SQX[bk]), Math.abs(SQY[s] - SQY[bk])) >= 2));
      const combo = pick(combos);
      const men: [number, number][] = [[wk, P.KING], [bk, -P.KING]];
      const free = shuffle(SQUARES.filter((s) => s !== wk && s !== bk));
      combo.forEach((p, i) => men.push([free[i], p]));
      const blockers = Math.floor(rnd() * 3);
      for (let j = 0; j < blockers; j++) {
        const s = free[combo.length + j];
        if (Math.max(Math.abs(SQX[s] - SQX[bk]), Math.abs(SQY[s] - SQY[bk])) <= 2 && SQY[s] > 0) men.push([s, -pick([P.PAWN_ROOK, P.PAWN_KNIGHT, P.PAWN_VIZIER])]);
      }
      const g = Game.fromSetup(DEFAULT_RULES, men, 0, [1, 1]);
      if (g.pos.inCheck(1) || g.pos.inCheck(0) || g.legalMoves().length < 6) continue;
      const wins = matingMoves(g).filter((m) => { g.play(m); const r = g.result?.reason; g.undo(); return r === kind; });
      if (wins.length < 1 || wins.length > 2) continue;
      // No other kind of instant win (the lesson is about this one).
      if (matingMoves(g).length !== wins.length) continue;
      const l: Lesson = { id: '', unit: 'mate', kind: kind === 'checkmate' ? 'mate' : 'stalemate', men, best: 1 };
      if (!unique(l)) continue;
      lessons.push(l);
      made++;
    }
  };
  want('checkmate', 45);
  want('stalemate', 5);
  // Easier first: fewer white pieces, fewer black blockers.
  lessons.sort((a, b) => (a.kind === b.kind ? a.men.length - b.men.length : a.kind === 'mate' ? -1 : 1));
  lessons.forEach((l, i) => (l.id = `mate-${i + 1}`));
  return { id: 'mate', piece: P.KING, lessons };
}

const t0 = Date.now();
const units: Unit[] = [];
const order: [string, number][] = [PIECE_UNITS[0], PIECE_UNITS[1], PIECE_UNITS[2], PIECE_UNITS[3], PIECE_UNITS[4]];
const log = (u: Unit): Unit => { console.log(`${u.id} ${u.lessons.length} ${Date.now() - t0} ms`); return u; };
for (const [id, piece] of order) units.push(log(pieceUnit(id, piece)));
units.push(log(pawnUnit()));
for (const [id, piece] of PIECE_UNITS.slice(5)) units.push(log(pieceUnit(id, piece)));
units.push(log(royalsUnit()));
units.push(log(citadelUnit()));
units.push(log(terrainUnit()));
units.push(log(mateUnit()));
const total = units.reduce((s, u) => s + u.lessons.length, 0);
writeFileSync('src/course/lessons.json', JSON.stringify({ version: 1, units }));
console.log(`units ${units.length}, lessons ${total}, ${Date.now() - t0} ms`);
for (const u of units) console.log(u.id.padEnd(9), u.lessons.length, u.lessons.map((l) => l.best).join(' '));
