// Nard (takhte nard), the Persian dice game the Shahnameh credits to the sage Bozorgmehr.
// Rules as in modern Iranian takhte nard, the same as classical backgammon without the doubling cube:
// 15 checkers a side, a lone checker can be hit and must re-enter from the bar, bearing off from the home board,
// and a win before the opponent has borne off a single checker is a mars, worth two.

export type Side = 0 | 1;

/** One checker step. `from` and `to` are the mover's own point numbers: 24..1 on the board, 25 the bar, 0 off. */
export interface Step {
  from: number;
  to: number;
  die: number;
  hit: boolean;
}

export class Nard {
  /** pts[1..24] from White's view; White counts positive, Black negative. White moves 24 -> 1, Black 1 -> 24. */
  pts = new Int8Array(25);
  bar: [number, number] = [0, 0];
  off: [number, number] = [0, 0];
  side: Side = 0;

  constructor(empty = false) {
    if (empty) return;
    const setup: [number, number][] = [[24, 2], [13, 5], [8, 3], [6, 5]];
    for (const [p, n] of setup) {
      this.pts[p] = n;
      this.pts[25 - p] = -n;
    }
  }

  clone(): Nard {
    const c = new Nard(true);
    c.pts = this.pts.slice();
    c.bar = [this.bar[0], this.bar[1]];
    c.off = [this.off[0], this.off[1]];
    c.side = this.side;
    return c;
  }

  key(): string {
    return `${this.pts.join(',')}|${this.bar}|${this.off}|${this.side}`;
  }

  /** Absolute point of a side's own point number. */
  static abs(side: Side, r: number): number {
    return side === 0 ? r : 25 - r;
  }

  /** Checkers of `side` on its own point r (1..24). */
  count(side: Side, r: number): number {
    const v = this.pts[Nard.abs(side, r)];
    return side === 0 ? Math.max(0, v) : Math.max(0, -v);
  }

  /** Opponent checkers on the mover's own point r. */
  enemy(side: Side, r: number): number {
    return this.count((1 - side) as Side, 25 - r);
  }

  allHome(side: Side): boolean {
    if (this.bar[side]) return false;
    for (let r = 7; r <= 24; r++) if (this.count(side, r)) return false;
    return true;
  }

  /** The step of one checker by one die, or null when it is not allowed. */
  stepFor(side: Side, from: number, die: number): Step | null {
    if (this.bar[side] && from !== 25) return null;
    if (from === 25 ? !this.bar[side] : !this.count(side, from)) return null;
    const to = from - die;
    if (to <= 0) {
      if (!this.allHome(side)) return null;
      if (to < 0) for (let r = from + 1; r <= 6; r++) if (this.count(side, r)) return null;
      return { from, to: 0, die, hit: false };
    }
    const e = this.enemy(side, to);
    if (e >= 2) return null;
    return { from, to, die, hit: e === 1 };
  }

  apply(side: Side, s: Step): void {
    const me = side === 0 ? 1 : -1;
    if (s.from === 25) this.bar[side]--;
    else this.pts[Nard.abs(side, s.from)] -= me;
    if (s.to === 0) {
      this.off[side]++;
      return;
    }
    const a = Nard.abs(side, s.to);
    if (s.hit) {
      this.pts[a] = 0;
      this.bar[1 - side]++;
    }
    this.pts[a] += me;
  }

  /**
   * Every legal way to play the dice still to play, as step lists (`left` lists each die to play, so a double
   * rolled is four entries). Play as many dice as possible; if only one of two different dice can be played,
   * the larger one must be played when it can. Orders that reach the same position are listed once.
   */
  turnsFrom(left: number[]): Step[][] {
    const side = this.side;
    const out: Step[][] = [];
    const seen = new Set<string>();
    const rec = (pos: Nard, rest: number[], done: Step[]): void => {
      let moved = false;
      const tried = new Set<number>();
      for (let i = 0; i < rest.length; i++) {
        const d = rest[i];
        if (tried.has(d)) continue;
        tried.add(d);
        const after = rest.slice(0, i).concat(rest.slice(i + 1));
        const froms = pos.bar[side] ? [25] : FROMS.filter((r) => pos.count(side, r));
        for (const f of froms) {
          const st = pos.stepFor(side, f, d);
          if (!st) continue;
          moved = true;
          const next = pos.clone();
          next.apply(side, st);
          rec(next, after, done.concat(st));
        }
      }
      if (!moved) {
        const k = `${pos.key()}#${done.length}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(done);
        }
      }
    };
    rec(this, left, []);
    const most = Math.max(0, ...out.map((t) => t.length));
    let best = out.filter((t) => t.length === most);
    if (most === 1 && left.length === 2 && left[0] !== left[1]) {
      const big = Math.max(left[0], left[1]);
      if (best.some((t) => t[0].die === big)) best = best.filter((t) => t[0].die === big);
    }
    return best.filter((t) => t.length);
  }

  /** Every legal way to play a fresh roll. */
  turns(dice: number[]): Step[][] {
    return this.turnsFrom(dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(0, 2));
  }

  /** Single steps the mover may make now: each must begin some legal way of playing all the dice left. */
  firstSteps(left: number[]): Step[] {
    const side = this.side;
    const full = this.turnsFrom(left);
    if (!full.length) return [];
    const most = full[0].length;
    const out: Step[] = [];
    const tried = new Set<string>();
    for (let i = 0; i < left.length; i++) {
      const d = left[i];
      const after = left.slice(0, i).concat(left.slice(i + 1));
      const froms = this.bar[side] ? [25] : FROMS.filter((r) => this.count(side, r));
      for (const f of froms) {
        const st = this.stepFor(side, f, d);
        if (!st || tried.has(`${f}-${d}`)) continue;
        tried.add(`${f}-${d}`);
        const q = this.clone();
        q.apply(side, st);
        const deeper = most === 1 ? 0 : Math.max(0, ...q.turnsFrom(after).map((t) => t.length));
        if (deeper + 1 !== most) continue;
        if (most === 1 && !full.some((t) => t[0].die === d)) continue; // the larger-die rule
        out.push(st);
      }
    }
    return out;
  }

  play(steps: Step[]): void {
    for (const s of steps) this.apply(this.side, s);
    this.side = (1 - this.side) as Side;
  }

  /** Pip count: how far a side still has to travel. */
  pips(side: Side): number {
    let n = this.bar[side] * 25;
    for (let r = 1; r <= 24; r++) n += r * this.count(side, r);
    return n;
  }

  winner(): { side: Side; mars: boolean } | null {
    for (const s of [0, 1] as Side[]) if (this.off[s] === 15) return { side: s, mars: this.off[1 - s] === 0 };
    return null;
  }
}

const FROMS = [...Array(24).keys()].map((k) => 24 - k);

export const roll = (): [number, number] => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];

// --- computer player -------------------------------------------------------------------------------

/** Static judgement of a position from `side`'s point of view; higher is better. */
export function judge(p: Nard, side: Side): number {
  const opp = (1 - side) as Side;
  let score = (p.pips(opp) - p.pips(side)) * 1.0;
  score += (p.off[side] - p.off[opp]) * 4;
  score += (p.bar[opp] - p.bar[side]) * 6;
  // where the opponent's checkers stand, in our own point numbers; they travel towards our 24
  let lowestOpp = 25;
  for (let r = 1; r <= 24; r++) if (p.count(opp, 25 - r)) { lowestOpp = r; break; }
  const oppBar = p.bar[opp] > 0;
  let run = 0;
  for (let r = 1; r <= 24; r++) {
    const n = p.count(side, r);
    if (n >= 2) {
      score += r <= 6 ? 4 : r <= 9 ? 3 : 1.5; // made points, the home board and the bar point weigh most
      run++;
      if (run >= 3) score += run * 1.5; // a prime blocks the opponent
      continue;
    }
    run = 0;
    if (n !== 1 || !(oppBar || r > lowestOpp)) continue;
    // a blot that can be hit; a direct shot (within six) is worse, and a deep blot loses more pips
    let direct = oppBar && r <= 6;
    for (let k = 1; k <= 6 && !direct; k++) if (r - k >= 1 && p.count(opp, 25 - (r - k))) direct = true;
    score -= (direct ? 7 : 3) + (25 - r) * 0.2;
  }
  return score;
}

export interface NardLevel {
  /** random spread added to every choice */
  noise: number;
}
export const NARD_LEVELS: NardLevel[] = [{ noise: 40 }, { noise: 8 }, { noise: 0 }];

/** Pick the computer's way of playing the roll. */
export function choose(p: Nard, dice: number[], level: NardLevel): Step[] {
  const options = p.turns(dice);
  if (!options.length) return [];
  const side = p.side;
  let best = options[0];
  let bestScore = -Infinity;
  for (const t of options) {
    const q = p.clone();
    for (const s of t) q.apply(side, s);
    const v = judge(q, side) + (level.noise ? (Math.random() - 0.5) * 2 * level.noise : 0);
    if (v > bestScore) {
      bestScore = v;
      best = t;
    }
  }
  return best;
}
