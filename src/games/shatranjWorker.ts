/// <reference lib="webworker" />
// The shatranj computer player runs here so the board stays smooth while it thinks.
import { Shatranj, parseMove, moveName, think, LEVELS } from './shatranj';

export interface ShatranjAsk {
  id: number;
  moves: string[];
  level: number;
}

self.onmessage = (e: MessageEvent<ShatranjAsk>) => {
  const { id, moves, level } = e.data;
  const g = new Shatranj();
  for (const s of moves) {
    const m = parseMove(g, s);
    if (m === null) break;
    g.make(m);
  }
  const m = think(g, LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level))]);
  (self as DedicatedWorkerGlobalScope).postMessage({ id, move: m === null ? null : moveName(m) });
};
