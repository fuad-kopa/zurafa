// Alpha-beta search (PVS, iterative deepening, transposition table, quiescence, LMR, guarded null move).

import { WHITE, Side, SQX, SQY, STEP, DIAG_ORTHO, enemyCitadel } from '../engine/geometry';
import * as P from '../engine/pieces';
import { Position, Move, NORMAL, SWAP } from '../engine/position';
import { VALUE } from '../engine/values';

export const MATE = 30000;
const INF = 32000;
const MAX_PLY = 64;

const TT_BITS = 19;
const TT_SIZE = 1 << TT_BITS;
const TT_MASK = TT_SIZE - 1;
const EXACT = 1;
const LOWER = 2;
const UPPER = 3;

export interface SearchLimits {
  maxDepth: number;
  maxNodes: number;
  maxTimeMs: number;
  /** Standard deviation (centipawns) of noise added to root scores; makes weak levels err like people do. */
  noise: number;
}

export interface SearchResult {
  move: Move | null;
  score: number;
  depth: number;
  nodes: number;
  pv: Move[];
}

class Abort extends Error {}

export class Searcher {
  private ttLo = new Int32Array(TT_SIZE);
  private ttHi = new Int32Array(TT_SIZE);
  private ttMove = new Int32Array(TT_SIZE);
  private ttScore = new Int16Array(TT_SIZE);
  private ttDepth = new Int8Array(TT_SIZE);
  private ttFlag = new Int8Array(TT_SIZE);
  private history = new Int32Array(2 * 16384);
  private killers = new Int32Array(MAX_PLY * 2);
  private moveLists: Move[][] = [];
  private scoreLists: number[][] = [];
  private pathLo = new Int32Array(MAX_PLY + 4);
  private pathHi = new Int32Array(MAX_PLY + 4);
  private gameHashes: number[] = [];
  private pos!: Position;
  private nodes = 0;
  private deadline = 0;
  private limits!: SearchLimits;

  constructor() {
    for (let i = 0; i < MAX_PLY + 4; i++) {
      this.moveLists.push([]);
      this.scoreLists.push([]);
    }
  }

  /** gameHashes: flattened [lo, hi] pairs of earlier positions, for repetition detection. */
  search(pos: Position, limits: SearchLimits, gameHashes: number[] = [], onInfo?: (r: SearchResult) => void): SearchResult {
    this.pos = pos;
    this.limits = limits;
    this.nodes = 0;
    this.deadline = performance.now() + limits.maxTimeMs;
    this.gameHashes = gameHashes;
    this.killers.fill(0);
    for (let i = 0; i < this.history.length; i++) this.history[i] >>= 2;

    const rootMoves = pos.legalMoves();
    let best: SearchResult = { move: rootMoves[0] ?? null, score: 0, depth: 0, nodes: 0, pv: [] };
    if (rootMoves.length <= 1) return best;

    const depth0 = pos.undoDepth;
    if (limits.noise > 0) return this.noisyRoot(rootMoves, limits, depth0);

    try {
      for (let depth = 1; depth <= limits.maxDepth; depth++) {
        let alpha = -INF;
        let beta = INF;
        if (depth >= 4) {
          alpha = best.score - 60;
          beta = best.score + 60;
        }
        let score: number;
        for (;;) {
          score = this.rootSearch(rootMoves, depth, alpha, beta);
          if (score <= alpha) alpha = -INF;
          else if (score >= beta) beta = INF;
          else break;
        }
        best = { move: rootMoves[0], score, depth, nodes: this.nodes, pv: this.extractPv(rootMoves[0]) };
        onInfo?.(best);
        if (Math.abs(score) > MATE - 100) break;
        if (performance.now() > this.deadline - limits.maxTimeMs * 0.45) break;
      }
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
      // Frames between the abort point and here skipped their unmake(); restore the root position.
      pos.unwindTo(depth0);
    }
    best.nodes = this.nodes;
    best.move = rootMoves[0];
    return best;
  }

  /** Searches every root move with a full window and picks by score plus noise. Only for shallow levels. */
  private noisyRoot(rootMoves: Move[], limits: SearchLimits, depth0: number): SearchResult {
    const pos = this.pos;
    let bestMove = rootMoves[0];
    let bestNoisy = -Infinity;
    let bestScore = 0;
    for (const m of rootMoves) {
      let score: number;
      pos.make(m);
      try {
        score = pos.citadelReached() ? 0 : -this.alphaBeta(limits.maxDepth - 1, -INF, INF, 1, true);
      } catch (e) {
        pos.unwindTo(depth0);
        if (e instanceof Abort) break;
        throw e;
      }
      pos.unmake();
      // A mate in one is never missed, even by the weakest level: that would feel broken, not human.
      const noisy = score > MATE - 100 ? score : score + gaussian() * limits.noise;
      if (noisy > bestNoisy) {
        bestNoisy = noisy;
        bestMove = m;
        bestScore = score;
      }
    }
    return { move: bestMove, score: bestScore, depth: limits.maxDepth, nodes: this.nodes, pv: [bestMove] };
  }

  private rootSearch(rootMoves: Move[], depth: number, alpha: number, beta: number): number {
    const pos = this.pos;
    this.pathLo[0] = pos.hashLo;
    this.pathHi[0] = pos.hashHi;
    let best = -INF;
    let bestIndex = 0;
    for (let i = 0; i < rootMoves.length; i++) {
      const m = rootMoves[i];
      pos.make(m);
      let score: number;
      try {
        if (pos.citadelReached()) score = 0;
        else if (i === 0) score = -this.alphaBeta(depth - 1, -beta, -alpha, 1, true);
        else {
          score = -this.alphaBeta(depth - 1, -alpha - 1, -alpha, 1, true);
          if (score > alpha && score < beta) score = -this.alphaBeta(depth - 1, -beta, -alpha, 1, true);
        }
      } catch (e) {
        pos.unmake();
        // Keep the best move found so far at the front before bailing out.
        if (bestIndex > 0) {
          const bm = rootMoves[bestIndex];
          rootMoves.splice(bestIndex, 1);
          rootMoves.unshift(bm);
        }
        throw e;
      }
      pos.unmake();
      if (score > best) {
        best = score;
        bestIndex = i;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }
    }
    if (bestIndex > 0) {
      const bm = rootMoves[bestIndex];
      rootMoves.splice(bestIndex, 1);
      rootMoves.unshift(bm);
    }
    return best;
  }

  private extractPv(first: Move): Move[] {
    const pos = this.pos;
    const pv: Move[] = [first];
    pos.make(first);
    let made = 1;
    while (made < 12) {
      const idx = pos.hashLo & TT_MASK;
      if (this.ttLo[idx] !== pos.hashLo || this.ttHi[idx] !== pos.hashHi) break;
      const m = this.ttMove[idx];
      if (!m || !pos.legalMoves().includes(m)) break;
      pv.push(m);
      pos.make(m);
      made++;
    }
    while (made--) pos.unmake();
    return pv;
  }

  private isRepetition(ply: number): boolean {
    const pos = this.pos;
    const lo = pos.hashLo;
    const hi = pos.hashHi;
    const span = Math.min(pos.halfmove, ply);
    for (let i = ply - 2; i >= ply - span && i >= 0; i -= 2) {
      if (this.pathLo[i] === lo && this.pathHi[i] === hi) return true;
    }
    const g = this.gameHashes;
    const back = Math.max(0, g.length - 2 * (pos.halfmove + 1));
    for (let i = g.length - 2; i >= back; i -= 2) if (g[i] === lo && g[i + 1] === hi) return true;
    return false;
  }

  private alphaBeta(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    const pos = this.pos;
    if ((++this.nodes & 2047) === 0) {
      if (this.nodes > this.limits.maxNodes || performance.now() > this.deadline) throw new Abort();
    }
    if (ply >= MAX_PLY - 1) return evaluate(pos);

    this.pathLo[ply] = pos.hashLo;
    this.pathHi[ply] = pos.hashHi;
    if (pos.rules.modernDraws && (pos.halfmove >= 100 || this.isRepetition(ply))) return 0;

    const side = pos.side;
    const checked = pos.inCheck(side);
    if (checked) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply);

    const idx = pos.hashLo & TT_MASK;
    let ttMove = 0;
    if (this.ttLo[idx] === pos.hashLo && this.ttHi[idx] === pos.hashHi) {
      ttMove = this.ttMove[idx];
      if (this.ttDepth[idx] >= depth) {
        let s = this.ttScore[idx];
        if (s > MATE - 200) s -= ply;
        else if (s < -MATE + 200) s += ply;
        const flag = this.ttFlag[idx];
        if (flag === EXACT) return s;
        if (flag === LOWER && s >= beta) return s;
        if (flag === UPPER && s <= alpha) return s;
      }
    }

    const soleRoyal = pos.royalCount(side) === 1;
    const isPv = beta - alpha > 1;

    // Null move: unsafe where zugzwang is common, so only with real attacking pieces on the board.
    if (allowNull && !isPv && !checked && depth >= 3 && soleRoyal && hasMovers(pos, side)) {
      const staticEval = evaluate(pos);
      if (staticEval >= beta) {
        pos.makeNull();
        const s = -this.alphaBeta(depth - 3, -beta, -beta + 1, ply + 1, false);
        pos.unmakeNull();
        if (s >= beta && s < MATE - 200) return beta;
      }
    }

    const moves = this.moveLists[ply];
    moves.length = 0;
    pos.genPseudo(moves);
    if (checked) pos.genSwaps(moves);
    this.orderMoves(moves, this.scoreLists[ply], ttMove, ply);

    const alphaOrig = alpha;
    let best = -INF;
    let bestMove = 0;
    let legal = 0;
    const scores = this.scoreLists[ply];

    for (let i = 0; i < moves.length; i++) {
      // Selection sort step: cheap because most nodes cut off early.
      let bi = i;
      for (let j = i + 1; j < moves.length; j++) if (scores[j] > scores[bi]) bi = j;
      if (bi !== i) {
        const tm = moves[i]; moves[i] = moves[bi]; moves[bi] = tm;
        const ts = scores[i]; scores[i] = scores[bi]; scores[bi] = ts;
      }
      const m = moves[i];
      const quiet = scores[i] < 1_000_000;

      pos.make(m);
      if (pos.moverInCheck()) {
        pos.unmake();
        continue;
      }
      legal++;
      let score: number;
      if (pos.citadelReached()) {
        score = 0;
      } else if (legal === 1) {
        score = -this.alphaBeta(depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        let reduction = 0;
        if (quiet && depth >= 3 && legal > 4 && !checked) {
          reduction = legal > 14 ? 2 : 1;
          if (depth >= 6 && legal > 24) reduction = 3;
        }
        score = -this.alphaBeta(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && reduction) score = -this.alphaBeta(depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && score < beta) score = -this.alphaBeta(depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmake();

      if (score > best) {
        best = score;
        bestMove = m;
        if (score > alpha) {
          alpha = score;
          if (alpha >= beta) {
            if (quiet) {
              const k = ply * 2;
              if (this.killers[k] !== m) {
                this.killers[k + 1] = this.killers[k];
                this.killers[k] = m;
              }
              this.history[side * 16384 + (m & 16383)] += depth * depth;
            }
            break;
          }
        }
      }
    }

    if (legal === 0) {
      // Out of moves. Murray's reading lets a stalemated Shah still use his swap.
      if (!checked && pos.rules.swapWhen === 'checkOrStalemate') {
        const swaps: Move[] = [];
        pos.genSwaps(swaps);
        for (const m of swaps) {
          pos.make(m);
          if (pos.moverInCheck()) {
            pos.unmake();
            continue;
          }
          legal++;
          const score = -this.alphaBeta(depth - 1, -beta, -alpha, ply + 1, true);
          pos.unmake();
          if (score > best) {
            best = score;
            bestMove = m;
            if (score > alpha) alpha = score;
            if (alpha >= beta) break;
          }
        }
      }
      if (legal === 0) return -MATE + ply; // checkmate and stalemate both lose
    }

    let store = best;
    if (store > MATE - 200) store += ply;
    else if (store < -MATE + 200) store -= ply;
    this.ttLo[idx] = pos.hashLo;
    this.ttHi[idx] = pos.hashHi;
    this.ttMove[idx] = bestMove;
    this.ttScore[idx] = store;
    this.ttDepth[idx] = depth;
    this.ttFlag[idx] = best <= alphaOrig ? UPPER : best >= beta ? LOWER : EXACT;
    return best;
  }

  private quiesce(alpha: number, beta: number, ply: number): number {
    const pos = this.pos;
    if ((++this.nodes & 2047) === 0) {
      if (this.nodes > this.limits.maxNodes || performance.now() > this.deadline) throw new Abort();
    }
    const stand = evaluate(pos);
    if (ply >= MAX_PLY - 1) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;

    const moves = this.moveLists[ply];
    const scores = this.scoreLists[ply];
    moves.length = 0;
    pos.genPseudo(moves, true);
    this.orderMoves(moves, scores, 0, ply);
    let best = stand;
    for (let i = 0; i < moves.length; i++) {
      let bi = i;
      for (let j = i + 1; j < moves.length; j++) if (scores[j] > scores[bi]) bi = j;
      if (bi !== i) {
        const tm = moves[i]; moves[i] = moves[bi]; moves[bi] = tm;
        const ts = scores[i]; scores[i] = scores[bi]; scores[bi] = ts;
      }
      const m = moves[i];
      const victim = pos.board[(m >> 7) & 127];
      const gain = victim ? VALUE[victim > 0 ? victim : -victim] : 300;
      if (stand + gain + 150 < alpha) continue; // delta pruning
      pos.make(m);
      if (pos.moverInCheck()) {
        pos.unmake();
        continue;
      }
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      pos.unmake();
      if (score > best) {
        best = score;
        if (score > alpha) {
          alpha = score;
          if (alpha >= beta) break;
        }
      }
    }
    return best;
  }

  private orderMoves(moves: Move[], scores: number[], ttMove: Move, ply: number): void {
    const pos = this.pos;
    const b = pos.board;
    const side = pos.side;
    const k0 = this.killers[ply * 2];
    const k1 = this.killers[ply * 2 + 1];
    scores.length = moves.length;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (m === ttMove) {
        scores[i] = 100_000_000;
        continue;
      }
      const kind = m >> 14;
      const from = m & 127;
      const to = (m >> 7) & 127;
      let s: number;
      if (kind !== NORMAL) {
        s = kind === SWAP ? 900_000 : 3_000_000;
      } else {
        const victim = b[to];
        const mover = b[from] > 0 ? b[from] : -b[from];
        if (victim !== 0) {
          s = 2_000_000 + VALUE[victim > 0 ? victim : -victim] * 16 - VALUE[mover];
        } else if (mover >= P.PAWN_KING && (SQY[to] === 9 || SQY[to] === 0)) {
          s = 1_900_000;
        } else if (m === k0) s = 950_000;
        else if (m === k1) s = 940_000;
        else s = Math.min(this.history[side * 16384 + (m & 16383)], 900_000);
      }
      scores[i] = s;
    }
  }
}

function hasMovers(pos: Position, side: Side): boolean {
  const b = side * P.NUM_TYPES;
  const c = pos.cnt;
  return c[b + P.ROOK] + c[b + P.KNIGHT] + c[b + P.PICKET] + c[b + P.GIRAFFE] + c[b + P.CAMEL] > 0;
}

function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Static evaluation from the side to move's point of view. */
export function evaluate(pos: Position): number {
  let score = pos.score;
  const b = pos.board;

  // Mobility of the long-range pieces; the giraffe in particular is worthless while boxed in.
  for (let sq = 0; sq < 110; sq++) {
    const p = b[sq];
    if (p === 0) continue;
    const t = p > 0 ? p : -p;
    if (t !== P.ROOK && t !== P.PICKET && t !== P.GIRAFFE) continue;
    let mob = 0;
    if (t === P.ROOK) {
      for (let d = 0; d < 4; d++) {
        const step = STEP[d];
        let s = step[sq];
        while (s >= 0 && b[s] === 0) { mob++; s = step[s]; }
      }
      mob *= 2;
    } else if (t === P.PICKET) {
      for (let d = 4; d < 8; d++) {
        const step = STEP[d];
        let s = step[sq];
        if (s < 0 || b[s] !== 0) continue;
        s = step[s];
        while (s >= 0 && b[s] === 0) { mob++; s = step[s]; }
      }
      mob *= 3;
    } else {
      for (let d = 4; d < 8; d++) {
        const d0 = STEP[d][sq];
        if (d0 < 0 || b[d0] !== 0) continue;
        mob += 1;
        const legs = DIAG_ORTHO[d];
        for (let k = 0; k < 2; k++) {
          const step = STEP[legs[k]];
          let s = step[d0];
          if (s < 0 || b[s] !== 0) continue;
          s = step[s];
          if (s < 0 || b[s] !== 0) continue;
          s = step[s];
          while (s >= 0 && b[s] === 0) { mob++; s = step[s]; }
        }
      }
      mob = mob * 4 - 12;
    }
    score += p > 0 ? mob : -mob;
  }

  // A side that is clearly losing should run its king towards the enemy citadel for the draw.
  const material = pos.score;
  for (let side = 0; side < 2; side++) {
    const behind = side === WHITE ? -material : material;
    if (behind < 250) continue;
    const ksq = pos.topRoyalSq(side as Side);
    if (ksq < 0) continue;
    const target = enemyCitadel(side as Side);
    const d = Math.max(Math.abs(SQX[ksq] - SQX[target]), Math.abs(SQY[ksq] - SQY[target]));
    const bonus = Math.min(behind / 2, 300) * (12 - Math.min(d, 12)) / 12;
    score += side === WHITE ? bonus : -bonus;
  }

  // Shelter: the sole royal likes friends next to it while the enemy still has heavy pieces.
  for (let side = 0; side < 2; side++) {
    if (pos.royalCount(side as Side) !== 1) continue;
    const opp = (1 - side) * P.NUM_TYPES;
    const threat = pos.cnt[opp + P.ROOK] * 2 + pos.cnt[opp + P.GIRAFFE] + pos.cnt[opp + P.PICKET] + pos.cnt[opp + P.KNIGHT];
    if (threat < 3) continue;
    const ksq = pos.topRoyalSq(side as Side);
    if (ksq >= 110) continue;
    let friends = 0;
    for (let d = 0; d < 8; d++) {
      const s = STEP[d][ksq];
      if (s >= 0 && b[s] !== 0 && b[s] > 0 === (side === WHITE)) friends++;
    }
    const shelter = Math.min(friends, 5) * 6;
    score += side === WHITE ? shelter : -shelter;
  }

  score = Math.round(score);
  return pos.side === WHITE ? score : -score;
}
