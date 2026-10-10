import { describe, it, expect } from 'vitest';
import { Nard, choose, NARD_LEVELS, roll } from '../src/games/nard';

const total = (p: Nard, side: 0 | 1): number => {
  let n = p.bar[side] + p.off[side];
  for (let r = 1; r <= 24; r++) n += p.count(side, r);
  return n;
};

describe('nard', () => {
  it('starts with fifteen checkers a side in the classical array', () => {
    const p = new Nard();
    expect(total(p, 0)).toBe(15);
    expect(total(p, 1)).toBe(15);
    expect(p.pips(0)).toBe(167);
    expect(p.pips(1)).toBe(167);
  });

  it('an opening 6-1 can make the bar point', () => {
    const p = new Nard();
    const turns = p.turns([6, 1]);
    const made = turns.some((t) => {
      const q = p.clone();
      q.play(t);
      return q.count(0, 7) === 2;
    });
    expect(made).toBe(true);
  });

  it('a double is played four times', () => {
    const p = new Nard();
    expect(p.turns([3, 3]).every((t) => t.length === 4)).toBe(true);
  });

  it('a checker on the bar must enter first, and a closed point blocks it', () => {
    const p = new Nard(true);
    p.bar[0] = 1;
    p.pts[6] = 5;
    // black holds White's entry point 24 - 5 + 1 ... White enters on its points 19..24 = absolute 19..24
    p.pts[19] = -2; // blocks a 6
    p.pts[1] = -13;
    const steps = p.firstSteps([6, 5]);
    expect(steps.every((s) => s.from === 25)).toBe(true);
    expect(steps.map((s) => s.die)).toEqual([5]);
  });

  it('hits a lone checker and sends it to the bar', () => {
    const p = new Nard(true);
    p.pts[10] = 1;
    p.pts[7] = -1;
    p.pts[1] = -14;
    p.off[0] = 14;
    const st = p.stepFor(0, 10, 3)!;
    expect(st.hit).toBe(true);
    p.apply(0, st);
    expect(p.bar[1]).toBe(1);
    expect(p.count(0, 7)).toBe(1);
  });

  it('bears off only from home, with a higher die only when nothing stands further back', () => {
    const p = new Nard(true);
    p.pts[5] = 1;
    p.pts[2] = 1;
    p.off[0] = 13;
    p.pts[24] = -15;
    expect(p.stepFor(0, 2, 6)).toBeNull(); // the checker on 5 is further back
    expect(p.stepFor(0, 5, 6)).toEqual({ from: 5, to: 0, die: 6, hit: false });
    p.pts[9] = 1;
    p.off[0] = 12;
    expect(p.stepFor(0, 5, 5)).toBeNull(); // not all home yet
  });

  it('when only one die can be played, it must be the larger one', () => {
    const p = new Nard(true);
    p.pts[13] = 1; // 13-6 = 7 and 13-5 = 8 are open, but both lead on to 2, which is closed
    p.pts[2] = -2;
    p.pts[24] = -13;
    p.off[0] = 14;
    const firsts = p.firstSteps([5, 6]);
    expect(firsts.map((s) => s.die)).toEqual([6]);
    expect(p.turns([5, 6]).every((t) => t.length === 1 && t[0].die === 6)).toBe(true);
  });

  it('plays whole games against itself without losing or creating checkers', () => {
    for (let g = 0; g < 5; g++) {
      const p = new Nard();
      let turns = 0;
      while (!p.winner() && turns < 600) {
        const dice = roll();
        const t = choose(p, dice, NARD_LEVELS[g % 3]);
        p.play(t);
        turns++;
        expect(total(p, 0)).toBe(15);
        expect(total(p, 1)).toBe(15);
        for (let r = 1; r <= 24; r++) expect(p.count(0, r) > 0 && p.count(1, 25 - r) > 0).toBe(false);
      }
      expect(p.winner()).not.toBeNull();
    }
  });

  it('the strong level usually beats random play', () => {
    let wins = 0;
    for (let g = 0; g < 20; g++) {
      const p = new Nard();
      while (!p.winner()) {
        const dice = roll();
        const opts = p.turns(dice);
        p.play(p.side === 0 ? choose(p, dice, NARD_LEVELS[2]) : opts.length ? opts[Math.floor(Math.random() * opts.length)] : []);
      }
      if (p.winner()!.side === 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(14);
  });
});
