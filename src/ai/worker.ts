/// <reference lib="webworker" />
import { Game, moveToString, SetupSpec } from '../engine/game';
import type { RuleOptions } from '../engine/position';
import { Searcher, SearchLimits, MATE } from './search';

export interface AiRequest {
  id: number;
  kind?: 'move' | 'analyse';
  rules: RuleOptions;
  moves: string[];
  limits: SearchLimits;
  /** starting position when the game did not begin from the standard array (battles) */
  setup?: SetupSpec;
}
export interface AiResponse {
  id: number;
  kind: 'move';
  move: string | null;
  score: number;
  depth: number;
  nodes: number;
  pv: string[];
}
/** One entry per position (0 = start, n = final). Scores are centipawns from White's point of view. */
export interface PlyEval {
  score: number;
  /** Best move from this position, or null when the game is over there. */
  best: string | null;
  mateIn: number | null;
}
export interface AnalyseResponse {
  id: number;
  kind: 'analyse';
  evals: PlyEval[];
  done: boolean;
}

const searcher = new Searcher();
const post = (m: AiResponse | AnalyseResponse): void => (self as DedicatedWorkerGlobalScope).postMessage(m);

function analyse(req: AiRequest): void {
  const game = req.setup ? Game.fromSpec(req.rules, req.setup) : new Game(req.rules);
  const evals: PlyEval[] = [];
  const total = req.moves.length;
  for (let i = 0; i <= total; i++) {
    if (i > 0) game.play(moveStr(req.moves[i - 1]));
    const sideSign = game.side === 0 ? 1 : -1;
    if (game.result) {
      const r = game.result;
      evals.push({ score: r.winner === null ? 0 : r.winner === 0 ? MATE : -MATE, best: null, mateIn: r.winner === null ? null : 0 });
    } else {
      const res = searcher.search(game.pos, req.limits, game.hashList());
      let mateIn: number | null = null;
      if (Math.abs(res.score) > MATE - 200) mateIn = Math.ceil((MATE - Math.abs(res.score)) / 2) * Math.sign(res.score);
      evals.push({ score: res.score * sideSign, best: res.move === null ? null : moveToString(res.move), mateIn });
    }
    if (i % 4 === 3 || i === total) post({ id: req.id, kind: 'analyse', evals: evals.slice(), done: i === total });
  }
}

function moveStr(s: string): number {
  // Local import to keep the worker's dependency list explicit.
  return moveFromStringImpl(s);
}
import { moveFromString as moveFromStringImpl } from '../engine/game';

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const req = e.data;
  if (req.kind === 'analyse') return analyse(req);
  const { id, rules, moves, limits } = req;
  const game = Game.rebuild(rules, req.setup, moves);
  let lim = limits;
  // Strong levels are deterministic; a touch of noise in the first moves keeps openings varied.
  if (lim.noise === 0 && moves.length < 8) lim = { ...lim, maxDepth: Math.min(lim.maxDepth, 3), noise: 14 };
  const res = searcher.search(game.pos, lim, game.hashList());
  post({
    id, kind: 'move',
    move: res.move === null ? null : moveToString(res.move),
    score: res.score, depth: res.depth, nodes: res.nodes, pv: res.pv.map(moveToString),
  });
};
