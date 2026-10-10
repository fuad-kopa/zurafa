// Toguz korgool (Kazakh toguz kumalak), "nine pebbles": the mancala of the Kyrgyz and Kazakh steppe.
// Each side has nine holes of nine stones. A move lifts every stone from one of your holes and sows them one by one
// round the board, starting in the same hole. If the last stone makes an even count in an enemy hole, you take them.
// If it makes exactly three, that hole can become your tuzdyk: once a game, never the ninth hole, never the hole
// facing the opponent's tuzdyk, and every stone that later falls into it is yours. More than 81 of 162 stones wins.

export type Side = 0 | 1;

export interface Sowing {
  /** holes in the order stones fell, the first is the lifted hole when it gets a stone back */
  path: number[];
  last: number;
  captured: number;
  tuzdyk: boolean;
}

export class Toguz {
  /** holes 0..8 belong to side 0 (its holes 1..9), 9..17 to side 1; sowing runs 0 -> 17 -> 0 */
  holes = new Int16Array(18).fill(9);
  kazan: [number, number] = [0, 0];
  /** the enemy hole each side owns as a tuzdyk, or -1 */
  tuzdyk: [number, number] = [-1, -1];
  side: Side = 0;

  clone(): Toguz {
    const c = new Toguz();
    c.holes = this.holes.slice();
    c.kazan = [this.kazan[0], this.kazan[1]];
    c.tuzdyk = [this.tuzdyk[0], this.tuzdyk[1]];
    c.side = this.side;
    return c;
  }

  static owner(h: number): Side {
    return h < 9 ? 0 : 1;
  }

  /** Holes the mover may lift (its own, non-empty). */
  moves(): number[] {
    const out: number[] = [];
    for (let i = 0; i < 9; i++) {
      const h = this.side * 9 + i;
      if (this.holes[h] > 0) out.push(h);
    }
    return out;
  }

  /** Who collects a stone falling into h: a tuzdyk sends it to its owner's kazan. */
  private tuzdykOwner(h: number): Side | -1 {
    if (this.tuzdyk[0] === h) return 0;
    if (this.tuzdyk[1] === h) return 1;
    return -1;
  }

  play(h: number): Sowing {
    const side = this.side;
    const opp = (1 - side) as Side;
    let n = this.holes[h];
    this.holes[h] = 0;
    const path: number[] = [];
    let cur = h;
    if (n === 1) cur = (h + 1) % 18;
    for (; n > 0; n--) {
      path.push(cur);
      const t = this.tuzdykOwner(cur);
      if (t >= 0) this.kazan[t as Side]++;
      else this.holes[cur]++;
      if (n > 1) cur = (cur + 1) % 18;
    }
    const last = cur;
    let captured = 0;
    let tuz = false;
    if (Toguz.owner(last) === opp && this.tuzdykOwner(last) < 0) {
      const c = this.holes[last];
      if (c % 2 === 0) {
        captured = c;
        this.kazan[side] += c;
        this.holes[last] = 0;
      } else if (c === 3 && this.tuzdyk[side] < 0 && last % 9 !== 8 && (this.tuzdyk[opp] < 0 || this.tuzdyk[opp] % 9 !== last % 9)) {
        this.tuzdyk[side] = last;
        this.kazan[side] += 3;
        this.holes[last] = 0;
        captured = 3;
        tuz = true;
      }
    }
    this.side = opp;
    return { path, last, captured, tuzdyk: tuz };
  }

  /** Stones still on a side's holes. */
  onSide(side: Side): number {
    let n = 0;
    for (let i = 0; i < 9; i++) n += this.holes[side * 9 + i];
    return n;
  }

  /**
   * The result, or null while play goes on. A side that cannot move ends the game: the other side
   * takes the stones still standing in its own holes.
   */
  result(): { winner: Side | null; final: [number, number] } | null {
    const k = this.kazan;
    if (k[0] > 81) return { winner: 0, final: [k[0], k[1]] };
    if (k[1] > 81) return { winner: 1, final: [k[0], k[1]] };
    if (k[0] === 81 && k[1] === 81) return { winner: null, final: [81, 81] };
    if (!this.moves().length) {
      const other = (1 - this.side) as Side;
      const final: [number, number] = [k[0], k[1]];
      final[other] += this.onSide(other);
      return { winner: final[0] > final[1] ? 0 : final[1] > final[0] ? 1 : null, final };
    }
    return null;
  }
}

// --- computer player -------------------------------------------------------------------------------

export interface ToguzLevel {
  depth: number;
  noise: number;
}
export const TOGUZ_LEVELS: ToguzLevel[] = [{ depth: 1, noise: 6 }, { depth: 3, noise: 1 }, { depth: 6, noise: 0 }];

function evalFor(g: Toguz, side: Side): number {
  const opp = (1 - side) as Side;
  let s = (g.kazan[side] - g.kazan[opp]) * 10;
  // a tuzdyk keeps paying for the rest of the game
  if (g.tuzdyk[side] >= 0) s += 25;
  if (g.tuzdyk[opp] >= 0) s -= 25;
  return s;
}

function search(g: Toguz, depth: number, alpha: number, beta: number): number {
  const r = g.result();
  if (r) {
    const me = g.side;
    const d = r.final[me] - r.final[1 - me];
    return d > 0 ? 100000 + d : d < 0 ? -100000 + d : 0;
  }
  if (depth === 0) return evalFor(g, g.side);
  let best = -Infinity;
  for (const h of g.moves()) {
    const c = g.clone();
    c.play(h);
    const v = -search(c, depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseHole(g: Toguz, level: ToguzLevel): number {
  const moves = g.moves();
  let best = moves[0];
  let bestV = -Infinity;
  for (const h of moves) {
    const c = g.clone();
    c.play(h);
    const v = -search(c, level.depth - 1, -Infinity, Infinity) + (level.noise ? (Math.random() - 0.5) * 2 * level.noise * 10 : 0);
    if (v > bestV) {
      bestV = v;
      best = h;
    }
  }
  return best;
}
