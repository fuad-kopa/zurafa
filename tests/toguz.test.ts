import { describe, it, expect } from 'vitest';
import { Toguz, chooseHole, TOGUZ_LEVELS } from '../src/games/toguz';

const total = (g: Toguz): number => g.holes.reduce((a, b) => a + b, 0) + g.kazan[0] + g.kazan[1];

describe('toguz korgool', () => {
  it('sows from the lifted hole itself and captures an even count', () => {
    const g = new Toguz();
    // hole 9 of side 0 (index 8): nine stones -> one back in 8, then 9..16; the last lands in 16 with 10 stones
    const s = g.play(8);
    expect(s.path).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(s.last).toBe(16);
    expect(s.captured).toBe(10);
    expect(g.kazan[0]).toBe(10);
    expect(g.holes[16]).toBe(0);
    expect(total(g)).toBe(162);
  });

  it('a single stone moves on to the next hole', () => {
    const g = new Toguz();
    g.holes.fill(0);
    g.holes[3] = 1;
    g.holes[12] = 5;
    g.kazan = [80, 76];
    const s = g.play(3);
    expect(s.path).toEqual([4]);
    expect(g.holes[4]).toBe(1);
  });

  it('three stones in an enemy hole make a tuzdyk that collects later stones', () => {
    const g = new Toguz();
    g.holes.fill(0);
    g.holes[7] = 3; // 7, 8, 9: the last stone makes hole 9 (enemy hole 1) hold 3
    g.holes[9] = 2;
    g.holes[13] = 4;
    g.kazan = [70, 78];
    const s = g.play(7);
    expect(s.tuzdyk).toBe(true);
    expect(g.tuzdyk[0]).toBe(9);
    expect(g.kazan[0]).toBe(73);
    // the opponent's sowing round the board passes the tuzdyk, and that stone goes to side 0's kazan
    g.holes[17] = 11; // 17, 0, 1, ..., 8, 9
    const before = g.kazan[0];
    const t = g.play(17);
    expect(t.last).toBe(9);
    expect(g.holes[9]).toBe(0);
    expect(g.kazan[0]).toBe(before + 1);
  });

  it('never makes a tuzdyk in the ninth hole', () => {
    const h = new Toguz();
    h.holes.fill(0);
    h.holes[6] = 12; // 6..17: the last stone lands in 17
    h.holes[17] = 2; // becomes 3
    h.holes[10] = 1;
    h.kazan = [60, 70];
    const s = h.play(6);
    expect(s.last).toBe(17);
    expect(s.tuzdyk).toBe(false);
    expect(h.tuzdyk[0]).toBe(-1);
  });

  it('ends when a side cannot move, the other side keeping its stones', () => {
    const g = new Toguz();
    g.holes.fill(0);
    g.holes[12] = 20;
    g.kazan = [70, 72];
    g.side = 0;
    expect(g.result()).toEqual({ winner: 1, final: [70, 92] });
  });

  it('plays whole games without losing stones', () => {
    for (let k = 0; k < 6; k++) {
      const g = new Toguz();
      let n = 0;
      while (!g.result() && n < 400) {
        g.play(chooseHole(g, TOGUZ_LEVELS[k % 2]));
        expect(total(g)).toBe(162);
        n++;
      }
      expect(g.result()).not.toBeNull();
    }
  });

  it('the strong level beats the weakest', () => {
    let wins = 0;
    for (let k = 0; k < 6; k++) {
      const g = new Toguz();
      const strong = (k % 2) as 0 | 1;
      while (!g.result()) g.play(chooseHole(g, TOGUZ_LEVELS[g.side === strong ? 2 : 0]));
      if (g.result()!.winner === strong) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(5);
  });
});
