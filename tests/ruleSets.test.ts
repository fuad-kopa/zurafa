import { describe, it, expect } from 'vitest';
import { sqFromName as sq, sqName } from '../src/engine/geometry';
import * as P from '../src/engine/pieces';
import { DEFAULT_RULES, RULE_SETS, RuleOptions, ruleSetOf, moveTo, moveKind, RELOCATE } from '../src/engine/position';
import { Game, moveFromString } from '../src/engine/game';
import { Searcher, MATE } from '../src/ai/search';

const rules = (extra: Partial<RuleOptions>): RuleOptions => ({ ...DEFAULT_RULES, ...extra });

/** White rook can take Black's last man on e7, landing next to the black king on e6; White has nothing else. */
function barePosition(r: RuleOptions, guarded = false): Game {
  const g = new Game(r);
  const p = g.pos;
  p.clear();
  p.put(sq(guarded ? 'd8' : 'a1'), P.KING);
  p.put(sq('e6'), -P.KING);
  p.put(sq('e7'), -P.GENERAL);
  p.put(sq('e9'), P.ROOK);
  p.swapUsed = [1, 1];
  return g;
}

describe('rule sets', () => {
  it('names the default as Murray and recognises every set', () => {
    expect(ruleSetOf(DEFAULT_RULES)).toBe('murray');
    for (const name of Object.keys(RULE_SETS) as (keyof typeof RULE_SETS)[]) {
      expect(ruleSetOf({ ...DEFAULT_RULES, ...RULE_SETS[name] })).toBe(name);
    }
    expect(ruleSetOf(rules({ picketOneStep: true, bareKingWins: true }))).toBeNull();
    // options missing from old saved games read as off
    const old = { ...DEFAULT_RULES } as Partial<RuleOptions>;
    delete old.bareKingReply;
    delete old.popOnlyEmpty;
    delete old.deadDrawNeedsEqualRoyals;
    expect(ruleSetOf(old as RuleOptions)).toBe('murray');
  });
});

describe('bare king, shatranj style', () => {
  it('without the exception, baring wins on the spot', () => {
    const g = barePosition(rules({ bareKingWins: true }));
    g.play(moveFromString('e9-e7'));
    expect(g.result).toEqual({ winner: 0, reason: 'bareKing' });
  });

  it('with it, the bared king may take the last man back and the game is drawn', () => {
    const g = barePosition(rules({ bareKingWins: true, bareKingReply: true }));
    g.play(moveFromString('e9-e7'));
    expect(g.result).toBeNull();
    g.play(moveFromString('e6-e7'));
    expect(g.result).toEqual({ winner: null, reason: 'deadPosition' });
  });

  it('a bared king that does not take back stays bare and loses', () => {
    const g = barePosition(rules({ bareKingWins: true, bareKingReply: true }));
    g.play(moveFromString('e9-e7'));
    g.play(moveFromString('e6-d5'));
    expect(g.result).toEqual({ winner: 0, reason: 'bareKing' });
  });

  it('a guarded last man wins at once, there is nothing to take back', () => {
    const g = barePosition(rules({ bareKingWins: true, bareKingReply: true }), true);
    g.play(moveFromString('e9-e7'));
    expect(g.result).toEqual({ winner: 0, reason: 'bareKing' });
  });

  it('the computer knows the exception: it takes back when it can', () => {
    const g = barePosition(rules({ bareKingWins: true, bareKingReply: true }));
    g.play(moveFromString('e9-e7'));
    const r = new Searcher().search(g.pos, { maxDepth: 3, maxNodes: 1e6, maxTimeMs: 5000, noise: 0 }, g.hashList());
    expect(sqName(moveTo(r.move!))).toBe('e7');
    expect(Math.abs(r.score)).toBeLessThan(MATE - 1000);
  });
});

describe('dead position with unequal royals', () => {
  it('decides on royals only when both armies are gone', () => {
    for (const equal of [false, true]) {
      const g = new Game(rules({ deadDrawNeedsEqualRoyals: equal }));
      const p = g.pos;
      p.clear();
      p.put(sq('a1'), P.KING);
      p.put(sq('c1'), P.PRINCE);
      p.put(sq('k10'), -P.KING);
      p.put(sq('k8'), -P.GENERAL);
      p.put(sq('j7'), P.GENERAL);
      p.swapUsed = [1, 1];
      g.play(moveFromString('j7-k8')); // White's general takes the last black man
      g.play(moveFromString('k10-k9'));
      g.play(moveFromString('k8-j9')); // and offers itself
      g.play(moveFromString('k9-j9')); // both armies gone, White has king and prince
      expect(g.result?.reason === 'deadPosition', `equal royals required: ${equal}`).toBe(!equal);
    }
  });
});

describe('pawn of pawns onto empty squares only', () => {
  it('relocates only to empty squares when asked', () => {
    for (const onlyEmpty of [false, true]) {
      const g = new Game(rules({ popOnlyEmpty: onlyEmpty }));
      const p = g.pos;
      p.clear();
      p.put(sq('a1'), P.KING);
      p.put(sq('k10'), -P.KING);
      p.put(sq('c10'), P.PAWN_PAWN);
      p.put(sq('f7'), -P.KNIGHT);
      p.put(sq('h7'), -P.PICKET);
      p.put(sq('g6'), -P.PAWN_ROOK);
      p.swapUsed = [1, 1];
      const relocs = g.legalMoves().filter((m) => moveKind(m) === RELOCATE).map((m) => sqName(moveTo(m)));
      expect(relocs.includes('g6'), `only empty: ${onlyEmpty}`).toBe(!onlyEmpty);
    }
  });
});
