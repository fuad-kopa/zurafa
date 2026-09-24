import { describe, it, expect } from 'vitest';
import { sqFromName as sq, sqName, WHITE, BLACK, WHITE_CITADEL, BLACK_CITADEL } from '../src/engine/geometry';
import * as P from '../src/engine/pieces';
import { Position, DEFAULT_RULES, Move, moveFrom, moveTo, moveKind, SWAP, RELOCATE, makeMoveCode } from '../src/engine/position';
import { Game, moveFromString } from '../src/engine/game';

function empty(rules = DEFAULT_RULES): Position {
  const p = new Position(rules);
  p.clear();
  return p;
}
function targets(p: Position, from: string): string[] {
  const list: Move[] = [];
  p.genPiece(sq(from), list, false);
  return list.map((m) => sqName(moveTo(m))).sort();
}
function legalFrom(p: Position, from: string): string[] {
  return p.legalMoves().filter((m) => moveFrom(m) === sq(from) && moveKind(m) === 0).map((m) => sqName(moveTo(m))).sort();
}

describe('setup', () => {
  it('matches Murray: kings on the f-file, general on the king\'s left, rotational symmetry', () => {
    const p = new Position();
    expect(p.board[sq('f2')]).toBe(P.KING);
    expect(p.board[sq('e2')]).toBe(P.GENERAL);
    expect(p.board[sq('g2')]).toBe(P.VIZIER);
    expect(p.board[sq('f9')]).toBe(-P.KING);
    expect(p.board[sq('g9')]).toBe(-P.GENERAL);
    expect(p.board[sq('e9')]).toBe(-P.VIZIER);
    expect(p.board[sq('a3')]).toBe(P.PAWN_PAWN);
    expect(p.board[sq('k8')]).toBe(-P.PAWN_PAWN);
    expect(p.board[sq('j8')]).toBe(-P.PAWN_ENGINE);
    expect(p.board[sq('k3')]).toBe(P.PAWN_ROOK);
    expect(p.score).toBe(0);
    let men = 0;
    for (let i = 0; i < 112; i++) if (p.board[i]) men++;
    expect(men).toBe(56);
  });

  it('all three arrays are balanced and keep 28 men a side', () => {
    for (const array of ['masculine', 'feminine', 'third'] as const) {
      const p = new Position({ ...DEFAULT_RULES, array });
      expect(p.score).toBe(0);
      expect(p.armySize(WHITE)).toBe(27);
      expect(p.armySize(BLACK)).toBe(27);
    }
    const f = new Position({ ...DEFAULT_RULES, array: 'feminine' });
    expect(sqName(f.kingPawnHome[WHITE])).toBe('f2');
    expect(sqName(f.kingPawnHome[BLACK])).toBe('f9');
  });
});

describe('piece movement', () => {
  it('giraffe: one diagonal then at least three straight, outward, blockable (Bodlaender: a1 -> b5, b6...)', () => {
    const p = empty();
    p.put(sq('a1'), P.GIRAFFE);
    const t = targets(p, 'a1');
    expect(t).toContain('b5');
    expect(t).toContain('b10');
    expect(t).toContain('e2');
    expect(t).toContain('k2');
    expect(t).not.toContain('b4');
    expect(t).not.toContain('d2');
    expect(t.length).toBe(6 + 7);
    p.put(sq('b3'), P.PAWN_ROOK);
    expect(targets(p, 'a1').some((s) => s.startsWith('b'))).toBe(false);
    p.put(sq('b2'), -P.PAWN_ROOK);
    expect(targets(p, 'a1')).toEqual([]);
  });

  it('giraffe moves from Gollon\'s sample game are generated', () => {
    const p = empty();
    p.put(sq('d2'), P.GIRAFFE);
    expect(targets(p, 'd2')).toContain('j1');
    p.put(sq('d9'), -P.GIRAFFE);
    expect(targets(p, 'd9')).toContain('h10');
    expect(targets(p, 'd9')).not.toContain('g10');
  });

  it('giraffe has no move in the opening position', () => {
    const p = new Position();
    expect(targets(p, 'd2')).toEqual([]);
    expect(targets(p, 'h2')).toEqual([]);
  });

  it('picket: bishop move of at least two squares, cannot jump the first', () => {
    const p = empty();
    p.put(sq('c2'), P.PICKET);
    const t = targets(p, 'c2');
    expect(t).not.toContain('d3');
    expect(t).not.toContain('b1');
    expect(t).toContain('e4');
    expect(t).toContain('a4');
    p.put(sq('d3'), P.PAWN_ROOK);
    expect(targets(p, 'c2')).not.toContain('e4');
    const forbes = empty({ ...DEFAULT_RULES, picketOneStep: true });
    forbes.put(sq('c2'), P.PICKET);
    expect(targets(forbes, 'c2')).toContain('d3');
  });

  it('leapers', () => {
    const p = empty();
    p.put(sq('a1'), P.CAMEL);
    expect(targets(p, 'a1')).toEqual(['b4', 'd2']);
    p.put(sq('f5'), P.ELEPHANT);
    expect(targets(p, 'f5')).toEqual(['d3', 'd7', 'h3', 'h7']);
    p.put(sq('e5'), -P.ROOK); // jumped over
    p.put(sq('f1'), P.WAR_ENGINE);
    expect(targets(p, 'f1')).toEqual(['d1', 'f3', 'h1']);
  });

  it('pawns: single step, diagonal capture, no double step', () => {
    const p = new Position();
    expect(targets(p, 'f3')).toEqual(['f4']);
  });

  it('attack detection agrees with move generation for every piece', () => {
    const g = new Game();
    let rng = 12345;
    const next = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff);
    for (let i = 0; i < 300 && !g.result; i++) {
      const moves = g.legalMoves();
      g.play(moves[next() % moves.length]);
      const pos = g.pos;
      for (const by of [WHITE, BLACK] as const) {
        const attacked = new Set<number>();
        const list: Move[] = [];
        for (let s = 0; s < 110; s++) {
          const pc = pos.board[s];
          if (pc === 0 || (pc > 0) !== (by === WHITE)) continue;
          if (P.isPawn(Math.abs(pc))) continue;
          list.length = 0;
          pos.genPiece(s, list, false);
          for (const m of list) if (moveTo(m) < 110) attacked.add(moveTo(m));
        }
        for (const t of attacked) expect(pos.isAttacked(t, by)).toBe(true);
      }
    }
  });
});

describe('make / unmake', () => {
  it('restores hash, score and counts through random play', () => {
    const p = new Position();
    let rng = 777;
    const next = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff);
    const snapshots: [number, number, number][] = [];
    for (let i = 0; i < 400; i++) {
      const moves = p.legalMoves();
      if (!moves.length || p.citadelReached()) break;
      snapshots.push([p.hashLo, p.hashHi, p.score]);
      p.make(moves[next() % moves.length]);
      const c = p.clone();
      expect([c.hashLo, c.hashHi, c.score]).toEqual([p.hashLo, p.hashHi, p.score]);
    }
    while (snapshots.length) {
      p.unmake();
      const [lo, hi, score] = snapshots.pop()!;
      expect([p.hashLo, p.hashHi, p.score]).toEqual([lo, hi, score]);
    }
    expect(p.score).toBe(0);
  });
});

describe('royalty', () => {
  it('stalemate is a loss for the stalemated side', () => {
    const g = new Game();
    const p = g.pos;
    p.clear();
    p.put(sq('a1'), -P.KING);
    p.put(sq('a3'), P.KING);
    p.put(sq('j10'), P.ROOK);
    p.swapUsed = [1, 1];
    g.play(makeMoveCode(sq('j10'), sq('b10')));
    expect(g.result).toEqual({ winner: WHITE, reason: 'stalemate' });
  });

  it('with two royals a side may leave one en prise; it is captured like any piece', () => {
    const p = empty();
    p.put(sq('a1'), P.KING);
    p.put(sq('e5'), P.PRINCE);
    p.put(sq('e10'), -P.ROOK);
    p.put(sq('k10'), -P.KING);
    expect(p.inCheck(WHITE)).toBe(false);
    expect(legalFrom(p, 'e5')).toContain('e6');
    p.make(makeMoveCode(sq('a1'), sq('a2')));
    expect(legalFrom(p, 'e10')).toContain('e5');
    p.make(makeMoveCode(sq('e10'), sq('e5')));
    expect(p.royalCount(WHITE)).toBe(1);
  });

  it('king swap: once, when in check, result must be safe', () => {
    const p = empty();
    p.put(sq('f1'), P.KING);
    p.put(sq('f10'), -P.ROOK);
    p.put(sq('a5'), P.KNIGHT);
    p.put(sq('f6'), P.PAWN_ROOK);
    p.put(sq('k10'), -P.KING);
    expect(p.legalMoves().some((m) => moveKind(m) === SWAP)).toBe(false);
    p.put(sq('f6'), 0);
    const swaps = p.legalMoves().filter((m) => moveKind(m) === SWAP);
    expect(swaps.map((m) => sqName(moveTo(m)))).toEqual(['a5']);
    p.make(swaps[0]);
    expect(p.board[sq('a5')]).toBe(P.KING);
    expect(p.board[sq('f1')]).toBe(P.KNIGHT);
    expect(p.swapUsed[WHITE]).toBe(1);
    p.unmake();
    expect(p.swapUsed[WHITE]).toBe(0);
    expect(p.board[sq('f1')]).toBe(P.KING);
  });

  it('king swap rescues a stalemated king under Murray\'s reading only', () => {
    const build = (swapWhen: 'check' | 'checkOrStalemate') => {
      const p = empty({ ...DEFAULT_RULES, swapWhen });
      p.put(sq('a1'), P.KING);
      p.put(sq('a2'), P.PAWN_ROOK);
      p.put(sq('a3'), -P.PAWN_ROOK);
      p.put(sq('c2'), -P.KING);
      p.put(sq('b10'), -P.ROOK);
      return p;
    };
    expect(build('check').legalMoves().length).toBe(0);
    const moves = build('checkOrStalemate').legalMoves();
    expect(moves.map((m) => [moveKind(m), sqName(moveTo(m))])).toEqual([[SWAP, 'a2']]);
    const p = build('checkOrStalemate');
    p.put(sq('k5'), P.KNIGHT);
    // The knight can still move, so no swap is offered.
    expect(p.legalMoves().every((m) => moveKind(m) !== SWAP)).toBe(true);
  });
});

describe('citadels', () => {
  it('only the top royal enters the enemy citadel, and the game is drawn', () => {
    const g = new Game();
    const p = g.pos;
    p.clear();
    p.put(sq('a8'), P.KING);
    p.put(sq('b9'), P.PRINCE);
    p.put(sq('k1'), -P.KING);
    p.put(sq('e5'), -P.ROOK);
    expect(legalFrom(p, 'a8')).toContain('z9');
    const princeMoves: Move[] = [];
    p.genPiece(sq('b9'), princeMoves, false);
    expect(princeMoves.map((m) => moveTo(m))).not.toContain(BLACK_CITADEL);
    g.play(moveFromString('a8-z9'));
    expect(g.result).toEqual({ winner: null, reason: 'citadel' });
  });

  it('no other piece enters a citadel; own citadel is for the adventitious king alone', () => {
    const p = empty();
    p.put(sq('a2'), P.ROOK);
    p.put(sq('k1'), P.KING);
    p.put(sq('k3'), P.ADV_KING);
    p.put(sq('a10'), -P.KING);
    expect(targets(p, 'a2')).not.toContain('l2');
    expect(targets(p, 'k1')).not.toContain('l2');
    expect(targets(p, 'k3')).toContain('l2');
    p.make(makeMoveCode(sq('k3'), WHITE_CITADEL));
    expect(p.citadelReached()).toBe(false);
    // An occupied citadel cannot be entered, so Black's draw is blocked.
    p.clear();
    p.put(WHITE_CITADEL, P.ADV_KING);
    p.put(sq('k3'), -P.KING);
    p.put(sq('a1'), P.KING);
    p.side = BLACK;
    expect(targets(p, 'k3')).not.toContain('l2');
    expect(p.isAttacked(WHITE_CITADEL, BLACK)).toBe(false);
  });
});

describe('pawn of pawns', () => {
  it('first arrival: stays, immune; relocates to fork; second arrival goes to f3; third makes a king', () => {
    const g = new Game();
    const p = g.pos;
    p.clear();
    p.put(sq('a1'), P.KING);
    p.put(sq('k10'), -P.KING);
    p.put(sq('c9'), P.PAWN_PAWN);
    p.put(sq('c2'), -P.ROOK);
    p.put(sq('f7'), -P.KNIGHT);
    p.put(sq('h7'), -P.PICKET);
    p.put(sq('g6'), -P.PAWN_ROOK);
    p.put(sq('f3'), -P.CAMEL);

    let rec = g.play(moveFromString('c9-c10'));
    expect(rec.events).toContain('popArrived');
    expect(p.board[sq('c10')]).toBe(P.PAWN_PAWN);
    // Black rook attacks c10 along the file but may not take the immune pawn.
    expect(legalFrom(p, 'c2')).not.toContain('c10');
    g.play(moveFromString('c2-c9'));

    const relocs = g.legalMoves().filter((m) => moveKind(m) === RELOCATE).map((m) => sqName(moveTo(m)));
    expect(relocs).toContain('g6'); // forks knight f7 and picket h7, displacing the pawn on g6
    rec = g.play(moveFromString('c10@g6'));
    expect(rec.captured).toBe(P.PAWN_ROOK);
    expect(p.board[sq('g6')]).toBe(P.PAWN_PAWN_1);
    expect(p.board[sq('c10')]).toBe(0);

    g.play(moveFromString('c9-c8'));
    g.play(moveFromString('g6-h7'));
    g.play(moveFromString('c8-c7'));
    g.play(moveFromString('h7-h8'));
    g.play(moveFromString('c7-c6'));
    g.play(moveFromString('h8-h9'));
    g.play(moveFromString('c6-c5'));
    rec = g.play(moveFromString('h9-h10'));
    expect(rec.events).toContain('popSecond');
    expect(sqName(rec.landed)).toBe('f3');
    expect(rec.displaced).toBe(P.CAMEL);
    expect(p.board[sq('f3')]).toBe(P.PAWN_PAWN_2);
    expect(p.board[sq('h10')]).toBe(0);

    p.put(sq('f3'), 0);
    p.put(sq('e9'), P.PAWN_PAWN_2);
    g.play(moveFromString('c5-c4'));
    rec = g.play(moveFromString('e9-e10'));
    expect(rec.events).toContain('advKing');
    expect(p.board[sq('e10')]).toBe(P.ADV_KING);
    expect(p.royalCount(WHITE)).toBe(2);
  });

  it('king\'s pawn promotes to a prince, others to their own piece', () => {
    const g = new Game();
    const p = g.pos;
    p.clear();
    p.put(sq('a1'), P.KING);
    p.put(sq('k10'), -P.KING);
    p.put(sq('c9'), P.PAWN_KING);
    p.put(sq('e2'), -P.PAWN_GIRAFFE);
    expect(g.play(moveFromString('c9-c10')).becomes).toBe(P.PRINCE);
    expect(g.play(moveFromString('e2-e1')).becomes).toBe(P.GIRAFFE);
  });
});

describe('serialisation', () => {
  it('replays a game from move strings', () => {
    const g = new Game();
    let rng = 99;
    const next = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff);
    for (let i = 0; i < 80 && !g.result; i++) {
      const moves = g.legalMoves();
      g.play(moves[next() % moves.length]);
    }
    const copy = Game.fromMoves(g.rules, g.serialize());
    expect(copy.pos.hashLo).toBe(g.pos.hashLo);
    expect(copy.pos.hashHi).toBe(g.pos.hashHi);
  });
});
