// Game: a Position plus history, results and the move records the interface needs.

import { Side, SQY, lastRank, isCitadel, enemyCitadel, sqName, sqFromName } from './geometry';
import * as P from './pieces';
import { Position, RuleOptions, DEFAULT_RULES, Move, NORMAL, SWAP, RELOCATE, moveFrom, moveTo, moveKind, makeMoveCode } from './position';

export type ResultReason = 'checkmate' | 'stalemate' | 'citadel' | 'repetition' | 'fiftyMoves' | 'bareKing' | 'deadPosition' | 'resign' | 'agreement' | 'timeout';

export interface GameResult {
  /** 0 White, 1 Black, null for a draw. */
  winner: Side | null;
  reason: ResultReason;
}

export type MoveEvent =
  | 'promotion' // an ordinary pawn became its piece
  | 'prince' // the king's pawn became a prince
  | 'popArrived' // pawn of pawns reached the last rank for the first time
  | 'popRelocated'
  | 'popSecond' // second arrival: sent to the king's pawn square
  | 'advKing' // third arrival
  | 'swap'
  | 'citadel'
  | 'royalCaptured'
  | 'ownCitadel';

export interface MoveRecord {
  move: Move;
  side: Side;
  kind: number;
  from: number;
  to: number;
  /** Piece type that moved (before any promotion). */
  piece: number;
  /** Piece type captured on the destination square, or 0. */
  captured: number;
  /** Side owning the captured/displaced man (a relocation may displace a friendly man). */
  capturedSide: Side | null;
  /** Type after the move if it changed. */
  becomes: number;
  /** Where the piece really ended up (differs from `to` on the pawn of pawns' second arrival). */
  landed: number;
  /** A man removed from the landing square on the pawn of pawns' second arrival. */
  displaced: number;
  displacedSide: Side | null;
  check: boolean;
  events: MoveEvent[];
}

export class Game {
  pos: Position;
  records: MoveRecord[] = [];
  result: GameResult | null = null;
  private hashes: number[] = [];
  private legalCache: Move[] | null = null;

  constructor(rules: RuleOptions = DEFAULT_RULES) {
    this.pos = new Position(rules);
    this.pushHash();
  }

  get rules(): RuleOptions {
    return this.pos.rules;
  }
  get side(): Side {
    return this.pos.side;
  }
  get ply(): number {
    return this.records.length;
  }

  private pushHash(): void {
    this.hashes.push(this.pos.hashLo, this.pos.hashHi);
  }

  legalMoves(): Move[] {
    if (this.result) return [];
    if (!this.legalCache) this.legalCache = this.pos.legalMoves();
    return this.legalCache;
  }

  legalMovesFrom(sq: number): Move[] {
    return this.legalMoves().filter((m) => moveFrom(m) === sq);
  }

  isLegal(m: Move): boolean {
    return this.legalMoves().includes(m);
  }

  inCheck(): boolean {
    return this.pos.inCheck(this.pos.side);
  }

  /** Flattened [lo, hi] hashes of every position so far, for the search's repetition check. */
  hashList(): number[] {
    return this.hashes.slice(0, -2);
  }

  /** How many times the current position has occurred. */
  repetitions(): number {
    const n = this.hashes.length;
    const lo = this.hashes[n - 2];
    const hi = this.hashes[n - 1];
    let count = 0;
    for (let i = n - 2; i >= 0; i -= 2) if (this.hashes[i] === lo && this.hashes[i + 1] === hi) count++;
    return count;
  }

  play(m: Move): MoveRecord {
    if (!this.isLegal(m)) throw new Error(`Illegal move ${moveToString(m)}`);
    const pos = this.pos;
    const side = pos.side;
    const from = moveFrom(m);
    const to = moveTo(m);
    const kind = moveKind(m);
    const pieceRaw = pos.board[from];
    const piece = Math.abs(pieceRaw);
    const targetRaw = pos.board[to];
    const events: MoveEvent[] = [];
    let captured = 0;
    let capturedSide: Side | null = null;
    let becomes = piece;
    let landed = to;
    let displaced = 0;
    let displacedSide: Side | null = null;

    if (kind === SWAP) {
      events.push('swap');
    } else {
      if (targetRaw !== 0) {
        captured = Math.abs(targetRaw);
        capturedSide = targetRaw > 0 ? 0 : 1;
      }
      if (kind === RELOCATE) {
        becomes = P.PAWN_PAWN_1;
        events.push('popRelocated');
      } else if (P.isPawn(piece) && SQY[to] === lastRank(side)) {
        becomes = P.PROMOTES_TO[piece];
        if (piece === P.PAWN_PAWN) events.push('popArrived');
        else if (piece === P.PAWN_PAWN_1) {
          events.push('popSecond');
          landed = pos.secondArrivalSquare(side);
          const there = pos.board[landed];
          if (there !== 0) {
            displaced = Math.abs(there);
            displacedSide = there > 0 ? 0 : 1;
          }
        }
        else if (piece === P.PAWN_PAWN_2) events.push('advKing');
        else if (piece === P.PAWN_KING) events.push('prince');
        else events.push('promotion');
      }
      if (isCitadel(to)) events.push(to === enemyCitadel(side) ? 'citadel' : 'ownCitadel');
      if (captured && P.isRoyal(captured)) events.push('royalCaptured');
    }

    pos.make(m);
    this.legalCache = null;


    const rec: MoveRecord = { move: m, side, kind, from, to, piece, captured, capturedSide, becomes, landed, displaced, displacedSide, check: false, events };
    this.records.push(rec);
    this.pushHash();
    this.result = this.computeResult(rec);
    rec.check = pos.inCheck(pos.side);
    return rec;
  }

  private computeResult(rec: MoveRecord): GameResult | null {
    const pos = this.pos;
    const mover = rec.side;
    const opp = pos.side;
    if (pos.citadelReached()) return { winner: null, reason: 'citadel' };
    if (pos.royalCount(opp) === 0) return { winner: mover, reason: 'checkmate' };
    const replies = this.legalMoves();
    if (replies.length === 0) {
      return { winner: mover, reason: pos.inCheck(opp) ? 'checkmate' : 'stalemate' };
    }
    if (pos.armySize(0) === 0 && pos.armySize(1) === 0) return { winner: null, reason: 'deadPosition' };
    if (pos.rules.bareKingWins && pos.armySize(opp) === 0 && pos.armySize(mover) > 0) {
      return { winner: mover, reason: 'bareKing' };
    }
    if (pos.rules.modernDraws) {
      if (this.repetitions() >= 3) return { winner: null, reason: 'repetition' };
      if (pos.halfmove >= 100) return { winner: null, reason: 'fiftyMoves' };
    }
    return null;
  }

  undo(): MoveRecord | null {
    const rec = this.records.pop();
    if (!rec) return null;
    this.pos.unmake();
    this.hashes.length -= 2;
    this.result = null;
    this.legalCache = null;
    return rec;
  }

  end(result: GameResult): void {
    this.result = result;
    this.legalCache = null;
  }

  /** Moves as compact strings, enough to rebuild the game on another machine. */
  serialize(): string[] {
    return this.records.map((r) => moveToString(r.move));
  }

  /** A game that starts from an arbitrary position. */
  static fromSetup(rules: RuleOptions, men: [number, number][], side: Side, swapUsed: [number, number] = [0, 0], terrain: number[] = []): Game {
    const g = new Game(rules);
    g.pos.loadSetup(men, side, swapUsed, terrain);
    g.hashes = [g.pos.hashLo, g.pos.hashHi];
    return g;
  }

  static fromSpec(rules: RuleOptions, spec: SetupSpec): Game {
    return Game.fromSetup(rules, spec.men, spec.side, spec.swapUsed ?? [0, 0], spec.terrain ?? []);
  }

  /** The standard array, or a setup, with moves replayed on top. */
  static rebuild(rules: RuleOptions, spec: SetupSpec | null | undefined, moves: string[]): Game {
    const g = spec ? Game.fromSpec(rules, spec) : new Game(rules);
    for (const s of moves) g.play(moveFromString(s));
    return g;
  }

  static fromMoves(rules: RuleOptions, moves: string[]): Game {
    const g = new Game(rules);
    for (const s of moves) g.play(moveFromString(s));
    return g;
  }
}

/** A starting position that can be sent to the AI worker or stored with a game. */
export interface SetupSpec {
  men: [number, number][];
  side: Side;
  swapUsed?: [number, number];
  /** squares encoded as sq + 128 * kind (1 water, 2 hill) */
  terrain?: number[];
}

export function moveToString(m: Move): string {
  const k = moveKind(m);
  return sqName(moveFrom(m)) + (k === SWAP ? '=' : k === RELOCATE ? '@' : '-') + sqName(moveTo(m));
}

export function moveFromString(s: string): Move {
  const match = /^([a-lz]\d+)([-=@])([a-lz]\d+)$/.exec(s);
  if (!match) throw new Error(`Bad move string: ${s}`);
  const kind = match[2] === '=' ? SWAP : match[2] === '@' ? RELOCATE : NORMAL;
  return makeMoveCode(sqFromName(match[1]), sqFromName(match[3]), kind);
}
