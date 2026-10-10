/// <reference lib="webworker" />
// The shatranj-family computer player runs here so the board stays smooth while it thinks.
import { Shatranj, VariantId, VARIANTS, parseMove, moveText, think, LEVELS, DIE } from './shatranj';

export interface ShatranjAsk {
  id: number;
  variant: VariantId;
  /** oblong chess with or without the die */
  dice?: boolean;
  /** the game so far, die rolls included ("d4") */
  moves: string[];
  level: number;
}

self.onmessage = (e: MessageEvent<ShatranjAsk>) => {
  const { id, moves, level, variant, dice } = e.data;
  const base = VARIANTS[variant ?? 'shatranj'];
  const g = new Shatranj(base.dice && dice === false ? { ...base, dice: false } : base);
  for (const s of moves) {
    const m = parseMove(g, s);
    if (m === null) break;
    if (m !== DIE) g.make(m);
  }
  const m = think(g, LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level))]);
  (self as DedicatedWorkerGlobalScope).postMessage({ id, move: m === null ? null : moveText(g.v, m) });
};
