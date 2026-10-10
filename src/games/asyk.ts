// Asyk atu, "shooting the knucklebones": the steppe game where players flick a heavy shooter bone, the saka,
// at a row of knucklebones standing in a ring (the kon). Every bone knocked out of the ring goes to the shooter,
// who shoots again; a shot that wins nothing passes the turn. A bone counts as knocked out once it crosses the ring. When the ring is empty, the larger pile wins.
// The physics is deliberately simple: discs on packed earth with linear friction and elastic knocks.

export const FIELD_W = 100;
export const FIELD_H = 150;
export const RING = { x: 50, y: 58, r: 27 };
export const BASELINE = 132;
export const BONE_R = 2.3;
export const SAKA_R = 2.8;
const SAKA_MASS = 1.8;
const FRICTION = 42; // units per second squared
const RESTITUTION = 0.86;
export const MAX_SPEED = 135;

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  /** drawing angle, spun a little by knocks */
  a: number;
  spin: number;
  saka?: boolean;
  out?: boolean;
}

export function setupRow(n = 10, seed = Math.random): Body[] {
  const out: Body[] = [];
  const gap = BONE_R * 2 + 0.3;
  for (let i = 0; i < n; i++) {
    out.push({ x: RING.x - ((n - 1) * gap) / 2 + i * gap, y: RING.y, vx: 0, vy: 0, r: BONE_R, m: 1, a: Math.PI / 2 + (seed() - 0.5) * 0.3, spin: 0 });
  }
  return out;
}

export function makeSaka(x: number): Body {
  return { x, y: BASELINE, vx: 0, vy: 0, r: SAKA_R, m: SAKA_MASS, a: 0, spin: 0, saka: true };
}

/** Advance the world by dt seconds. Returns true while anything still moves. */
export function step(bodies: Body[], dt: number): boolean {
  let moving = false;
  for (const b of bodies) {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 0.4) {
      b.vx = b.vy = 0;
      b.spin *= 0.9;
      continue;
    }
    moving = true;
    const ns = Math.max(0, sp - FRICTION * dt);
    b.vx *= ns / sp;
    b.vy *= ns / sp;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.a += b.spin * dt;
    b.spin *= 0.985;
    // the field's edge is a low bank of earth
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.45; }
    if (b.x > FIELD_W - b.r) { b.x = FIELD_W - b.r; b.vx = -Math.abs(b.vx) * 0.45; }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.45; }
    if (b.y > FIELD_H - b.r) { b.y = FIELD_H - b.r; b.vy = -Math.abs(b.vy) * 0.45; }
    // a bone is won the moment it crosses the ring line, wherever it rolls afterwards
    if (!b.saka && !b.out && !inRing(b)) b.out = true;
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (d >= min || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      // push apart in proportion to the other's mass
      const overlap = min - d;
      const tm = a.m + b.m;
      a.x -= nx * overlap * (b.m / tm);
      a.y -= ny * overlap * (b.m / tm);
      b.x += nx * overlap * (a.m / tm);
      b.y += ny * overlap * (a.m / tm);
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      const imp = ((1 + RESTITUTION) * rel) / (1 / a.m + 1 / b.m);
      a.vx -= (imp / a.m) * nx;
      a.vy -= (imp / a.m) * ny;
      b.vx += (imp / b.m) * nx;
      b.vy += (imp / b.m) * ny;
      const kick = (rel * 0.06) * (Math.random() < 0.5 ? -1 : 1);
      a.spin += kick;
      b.spin -= kick;
      moving = true;
    }
  }
  return moving;
}

export const inRing = (b: Body): boolean => Math.hypot(b.x - RING.x, b.y - RING.y) <= RING.r;

/** Run a whole shot to rest (for the computer's planning and for tests). */
export function simulate(bodies: Body[], maxSeconds = 12): void {
  const dt = 1 / 120;
  for (let t = 0; t < maxSeconds; t += dt) if (!step(bodies, dt)) break;
}

// --- computer player -------------------------------------------------------------------------------

export interface AsykLevel {
  /** aiming error, radians */
  aim: number;
  /** relative power error */
  power: number;
  /** how many start positions and targets it tries */
  tries: number;
}
export const ASYK_LEVELS: AsykLevel[] = [
  { aim: 0.075, power: 0.25, tries: 3 },
  { aim: 0.035, power: 0.12, tries: 8 },
  { aim: 0.012, power: 0.05, tries: 30 },
];

export interface Shot {
  x: number;
  vx: number;
  vy: number;
}

const clone = (bs: Body[]): Body[] => bs.map((b) => ({ ...b }));

/** Plan a shot by trying candidate start points and targets in simulation, then add the level's human error. */
export function planShot(bones: Body[], level: AsykLevel, rnd = Math.random): Shot {
  const live = bones.filter((b) => !b.out);
  let best: Shot = { x: RING.x, vx: 0, vy: -MAX_SPEED * 0.7 };
  let bestScore = -Infinity;
  for (let k = 0; k < level.tries; k++) {
    const target = live[Math.floor(rnd() * live.length)];
    if (!target) break;
    const x = Math.max(8, Math.min(FIELD_W - 8, target.x + (rnd() - 0.5) * 50));
    const dx = target.x - x;
    const dy = target.y - BASELINE;
    const dist = Math.hypot(dx, dy);
    // aim slightly off-centre at random, and hit hard enough to carry through the ring
    const off = (rnd() - 0.5) * 0.12;
    const ang = Math.atan2(dy, dx) + off;
    const speed = Math.min(MAX_SPEED, Math.sqrt(2 * FRICTION * (dist + RING.r * 1.6)) * (0.9 + rnd() * 0.3));
    const shot: Shot = { x, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed };
    const world = clone(live);
    const saka = makeSaka(x);
    saka.vx = shot.vx;
    saka.vy = shot.vy;
    world.push(saka);
    simulate(world);
    const won = world.filter((b) => !b.saka && b.out).length;
    const score = won + (inRing(saka) ? -0.2 : 0) + rnd() * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = shot;
    }
  }
  // the hand is not a machine
  const ang = Math.atan2(best.vy, best.vx) + (rnd() - 0.5) * 2 * level.aim;
  const sp = Math.min(MAX_SPEED, Math.hypot(best.vx, best.vy) * (1 + (rnd() - 0.5) * 2 * level.power));
  return { x: best.x, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
}
