// Post-game analysis: classify every move by how much it lost against the engine's best line.

import type { Side } from '../engine/geometry';
import type { PlyEval } from '../ai/worker';
import { MATE } from '../ai/search';

export type Verdict = 'blunder' | 'mistake' | 'inaccuracy' | 'good';

export interface MoveJudgement {
  ply: number;
  side: Side;
  /** Centipawns lost by the mover relative to the best move (0 if best). */
  loss: number;
  verdict: Verdict;
  best: string | null;
}

/** Clamp for the graph: mates and huge material swings should not flatten the rest of the curve. */
export const GRAPH_CAP = 1200;

export function clampScore(cp: number): number {
  if (Math.abs(cp) > MATE - 500) return Math.sign(cp) * GRAPH_CAP;
  return Math.max(-GRAPH_CAP, Math.min(GRAPH_CAP, cp));
}

export function judge(evals: PlyEval[]): MoveJudgement[] {
  const out: MoveJudgement[] = [];
  for (let i = 1; i < evals.length; i++) {
    const side: Side = ((i - 1) % 2) as Side;
    const sign = side === 0 ? 1 : -1;
    const before = clampScore(evals[i - 1].score) * sign;
    const after = clampScore(evals[i].score) * sign;
    const loss = Math.max(0, before - after);
    const verdict: Verdict = loss >= 300 ? 'blunder' : loss >= 120 ? 'mistake' : loss >= 50 ? 'inaccuracy' : 'good';
    out.push({ ply: i - 1, side, loss, verdict, best: evals[i - 1].best });
  }
  return out;
}

export interface Summary {
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  /** 0..100: how close the side stayed to the engine's choices. */
  accuracy: number;
}

export function summarise(judgements: MoveJudgement[], side: Side): Summary {
  const mine = judgements.filter((j) => j.side === side);
  const s: Summary = { blunders: 0, mistakes: 0, inaccuracies: 0, accuracy: 100 };
  if (!mine.length) return s;
  let total = 0;
  for (const j of mine) {
    if (j.verdict === 'blunder') s.blunders++;
    else if (j.verdict === 'mistake') s.mistakes++;
    else if (j.verdict === 'inaccuracy') s.inaccuracies++;
    total += Math.min(j.loss, 600);
  }
  // Average loss maps to accuracy along a gentle curve: 0 cp -> 100, 100 cp -> ~70, 300 cp -> ~35.
  const avg = total / mine.length;
  s.accuracy = Math.round(100 * Math.exp(-avg / 280));
  return s;
}

/** Eval graph as an SVG string, White's advantage up. `cur` marks the viewed position. */
export function evalGraphSvg(evals: PlyEval[], totalPlies: number, cur: number): string {
  const W = 300;
  const H = 72;
  const n = Math.max(totalPlies, 1);
  const x = (i: number): number => (i / n) * W;
  const y = (cp: number): number => H / 2 - (clampScore(cp) / GRAPH_CAP) * (H / 2 - 4);
  let up = `M0 ${H / 2}`;
  let down = `M0 ${H / 2}`;
  let line = '';
  evals.forEach((e, i) => {
    const px = x(i).toFixed(1);
    const py = y(e.score).toFixed(1);
    line += `${i ? 'L' : 'M'}${px} ${py} `;
    up += ` L${px} ${Math.min(Number(py), H / 2).toFixed(1)}`;
    down += ` L${px} ${Math.max(Number(py), H / 2).toFixed(1)}`;
  });
  const lastX = x(Math.max(evals.length - 1, 0)).toFixed(1);
  up += ` L${lastX} ${H / 2} Z`;
  down += ` L${lastX} ${H / 2} Z`;
  const cursor = cur >= 0 ? `<line x1="${x(cur).toFixed(1)}" y1="0" x2="${x(cur).toFixed(1)}" y2="${H}" class="eg-cursor"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="eval-graph" aria-hidden="true">
    <rect width="${W}" height="${H}" class="eg-bg"/>
    <path d="${up}" class="eg-white"/><path d="${down}" class="eg-black"/>
    <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" class="eg-mid"/>
    <path d="${line}" class="eg-line"/>${cursor}</svg>`;
}

export function formatEval(e: PlyEval): string {
  if (e.mateIn !== null) return e.mateIn === 0 ? '#' : `#${Math.abs(e.mateIn)}`;
  const v = e.score / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}
