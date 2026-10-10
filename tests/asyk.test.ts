import { describe, it, expect } from 'vitest';
import { setupRow, makeSaka, simulate, inRing, planShot, ASYK_LEVELS, RING, BASELINE, MAX_SPEED, FIELD_W, FIELD_H } from '../src/games/asyk';

describe('asyk atu', () => {
  it('sets ten bones in a row inside the ring', () => {
    const row = setupRow();
    expect(row).toHaveLength(10);
    expect(row.every(inRing)).toBe(true);
  });

  it('a hard straight shot knocks a bone out of the ring', () => {
    const row = setupRow();
    const target = row[4];
    const saka = makeSaka(target.x);
    saka.vy = -MAX_SPEED;
    const world = [...row, saka];
    simulate(world);
    expect(world.filter((b) => !b.saka && b.out).length).toBeGreaterThanOrEqual(1);
    for (const b of world) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(FIELD_W);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(FIELD_H);
      expect(Math.hypot(b.vx, b.vy)).toBe(0);
    }
  });

  it('a soft shot stops short and moves nothing', () => {
    const row = setupRow();
    const saka = makeSaka(RING.x);
    saka.vy = -20;
    const world = [...row, saka];
    simulate(world);
    expect(saka.y).toBeGreaterThan(RING.y + RING.r);
    expect(world.filter((b) => !b.saka).every((b) => inRing(b) && !b.out)).toBe(true);
    expect(saka.y).toBeLessThan(BASELINE);
  });

  it('the strong computer wins bones more often than the weak one', () => {
    const score = (lvl: number): number => {
      let won = 0;
      for (let k = 0; k < 25; k++) {
        const row = setupRow();
        const shot = planShot(row, ASYK_LEVELS[lvl]);
        const saka = makeSaka(shot.x);
        saka.vx = shot.vx;
        saka.vy = shot.vy;
        const world = [...row, saka];
        simulate(world);
        won += world.filter((b) => !b.saka && b.out).length;
      }
      return won;
    };
    const strong = score(2);
    expect(strong).toBeGreaterThan(10);
    expect(strong).toBeGreaterThan(score(0));
  }, 60000);
});
