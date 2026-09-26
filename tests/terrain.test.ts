import { describe, it, expect } from 'vitest';
import { Game, moveToString, SetupSpec } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/position';
import { sqFromName } from '../src/engine/geometry';
import * as P from '../src/engine/pieces';

const W = (n: string) => sqFromName(n) + 128;
const men = (list: string[]): [number, number][] =>
  list.map((s) => { const [side, id, sq] = s.split(' '); const t = P.TYPE_ID.indexOf(id); return [sqFromName(sq), side === 'w' ? t : -t]; });
const movesFrom = (g: Game, sq: string) => g.legalMoves().filter((m) => (m & 127) === sqFromName(sq)).map(moveToString).sort();

describe('terrain: water', () => {
  it('stops sliders and pawns, leapers fly over, nothing lands on it', () => {
    const spec: SetupSpec = {
      men: men(['w king b1', 'b king k10', 'w rook a1', 'w knight d1', 'w pawnRook g1', 'w giraffe f1']),
      side: 0,
      terrain: [W('a3'), W('d2'), W('e2'), W('g2'), W('e3'), W('f2')],
    };
    const g = Game.fromSpec(DEFAULT_RULES, spec);
    const rook = movesFrom(g, 'a1');
    expect(rook).toContain('a1-a2');
    expect(rook).not.toContain('a1-a3');
    expect(rook).not.toContain('a1-a4');
    const knight = movesFrom(g, 'd1');
    expect(knight).toContain('d1-c3'); // jumps over the water on d2
    expect(knight).not.toContain('d1-e3'); // may not land in water
    expect(movesFrom(g, 'g1')).toEqual([]); // pawn blocked by water ahead
    expect(movesFrom(g, 'f1').every((m) => !m.endsWith('e2') && !m.endsWith('g2'))).toBe(true);
  });

  it('water shields against sliding checks and is part of the hash', () => {
    const base = men(['w king a1', 'b king a10', 'b rook a6']);
    const open = Game.fromSpec(DEFAULT_RULES, { men: base, side: 0 });
    expect(open.inCheck()).toBe(true);
    const shielded = Game.fromSpec(DEFAULT_RULES, { men: base, side: 0, terrain: [W('a4')] });
    expect(shielded.inCheck()).toBe(false);
    expect(shielded.pos.hashLo === open.pos.hashLo && shielded.pos.hashHi === open.pos.hashHi).toBe(false);
  });

  it('rebuilds a game from a setup with moves and survives undo', () => {
    const spec: SetupSpec = { men: men(['w king b1', 'b king k10', 'w rook a1']), side: 0, terrain: [W('a3')] };
    const g = Game.rebuild(DEFAULT_RULES, spec, ['a1-a2', 'k10-j10']);
    expect(g.ply).toBe(2);
    expect(g.pos.terrain[sqFromName('a3')]).toBe(1);
    g.undo(); g.undo();
    expect(movesFrom(g, 'a1')).not.toContain('a1-a3');
  });
});

describe('terrain: hills', () => {
  it('a piece on a hill cannot be taken by a pawn, but takes and is taken by anything else', () => {
    const H = (n: string) => sqFromName(n) + 256;
    const spec: SetupSpec = {
      men: men(['w king a1', 'b king k10', 'w pawnRook d4', 'b rook e5', 'b knight c5', 'w rook e1']),
      side: 0,
      terrain: [H('e5')],
    };
    const g = Game.fromSpec(DEFAULT_RULES, spec);
    const pawn = movesFrom(g, 'd4');
    expect(pawn).toContain('d4-c5'); // knight on open ground
    expect(pawn).not.toContain('d4-e5'); // rook on the hill
    expect(movesFrom(g, 'e1')).toContain('e1-e5'); // the rook still takes it
    const hill = Game.fromSpec(DEFAULT_RULES, { men: men(['w king h1', 'b king h10', 'w pawnRook g9']), side: 1, terrain: [H('h10')] });
    expect(hill.inCheck()).toBe(false); // the pawn does not check a king on a hill
    const flat = Game.fromSpec(DEFAULT_RULES, { men: men(['w king h1', 'b king h10', 'w pawnRook g9']), side: 1 });
    expect(flat.inCheck()).toBe(true);
    expect(hill.pos.hashLo === flat.pos.hashLo && hill.pos.hashHi === flat.pos.hashHi).toBe(false);
  });
});
