// Link-based online play over WebRTC (Trystero): no accounts, no server of our own.
// The room creator is the "host" and owns the seat assignment; both sides validate every move.

import { joinRoom } from 'trystero';
import type { Side } from '../engine/geometry';
import { Game, GameResult, moveFromString } from '../engine/game';
import type { RuleOptions } from '../engine/position';

const APP_ID = 'tamerlane-chess.kopa.v1';

export type Role = 'host' | 'guest' | 'spectator' | 'pending';

export interface TimeControl {
  /** minutes per side */
  base: number;
  /** seconds added after each move */
  inc: number;
}

export interface RoomState {
  /** null or absent: no clock */
  tc?: TimeControl | null;
  /** milliseconds left per side as of the last move */
  clock?: [number, number];
  /** local wall-clock time when the last move was made or received */
  lastMoveAt?: number;
  gameNo: number;
  rules: RuleOptions;
  hostSide: Side;
  moves: string[];
  /** Set only for results that the moves themselves do not imply (resignation, agreed draw). */
  result: GameResult | null;
  hostId: string;
  guestId: string | null;
}

type Msg =
  | { t: 'hello'; id: string; state: RoomState | null }
  | { t: 'state'; state: RoomState }
  | { t: 'move'; g: number; n: number; m: string; c?: number }
  | { t: 'flag'; g: number; who: 'self' | 'opponent' }
  | { t: 'resign'; g: number }
  | { t: 'draw'; g: number; a: 'offer' | 'accept' | 'decline' }
  | { t: 'rematch'; g: number; a: 'offer' | 'accept' };

export interface OnlineEvents {
  onState(state: RoomState, role: Role): void;
  onMove(move: string): void;
  onPeers(opponentOnline: boolean): void;
  onNotice(kind: 'drawOffer' | 'drawDeclined' | 'rematchOffer'): void;
}

// ?p=2 gives a second identity in the same browser, so two tabs can play each other while testing.
const PROFILE = new URLSearchParams(location.search).get('p') ?? '';
const CLIENT_KEY = `tc.client${PROFILE}`;
const roomKey = (roomId: string): string => `tc.room${PROFILE}.${roomId}`;

function clientId(): string {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

export function newRoomId(): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
}

function isValidState(s: RoomState): boolean {
  try {
    Game.fromMoves(s.rules, s.moves);
    return true;
  } catch {
    return false;
  }
}

export class OnlineSession {
  readonly me = clientId();
  state: RoomState | null = null;
  role: Role = 'pending';
  private room: ReturnType<typeof joinRoom>;
  private send: (msg: Msg, target?: string) => void;
  /** peerId -> clientId, learned from hello messages */
  private peers = new Map<string, string>();

  constructor(readonly roomId: string, private events: OnlineEvents, create?: { rules: RuleOptions; hostSide: Side; tc?: TimeControl | null }) {
    const saved = localStorage.getItem(roomKey(roomId));
    if (saved) {
      try {
        this.state = JSON.parse(saved) as RoomState;
      } catch {
        this.state = null;
      }
    }
    if (!this.state && create) {
      const tc = create.tc ?? null;
      this.state = {
        gameNo: 1, rules: create.rules, hostSide: create.hostSide, moves: [], result: null, hostId: this.me, guestId: null,
        tc, clock: tc ? [tc.base * 60000, tc.base * 60000] : undefined,
      };
      this.persist();
    }
    this.updateRole();

    this.room = joinRoom({ appId: APP_ID }, roomId);
    // Messages travel as JSON strings: the payload type stays ours rather than the transport's.
    const action = this.room.makeAction<string>('m');
    this.send = (msg, target) => {
      void action.send(JSON.stringify(msg), target ? { target } : undefined);
    };
    action.onMessage = (raw, { peerId }) => {
      let msg: Msg;
      try {
        msg = JSON.parse(raw) as Msg;
      } catch {
        return;
      }
      this.receive(msg, peerId);
    };
    this.room.onPeerJoin = (peerId) => this.send({ t: 'hello', id: this.me, state: this.state }, peerId);
    this.room.onPeerLeave = (peerId) => {
      this.peers.delete(peerId);
      this.reportPeers();
    };
  }

  get mySide(): Side | null {
    if (!this.state) return null;
    if (this.role === 'host') return this.state.hostSide;
    if (this.role === 'guest') return (1 - this.state.hostSide) as Side;
    return null;
  }

  private opponentId(): string | null {
    if (!this.state) return null;
    return this.role === 'host' ? this.state.guestId : this.role === 'guest' ? this.state.hostId : null;
  }

  private updateRole(): void {
    const s = this.state;
    if (!s) this.role = 'pending';
    else if (s.hostId === this.me) this.role = 'host';
    else if (s.guestId === this.me) this.role = 'guest';
    else this.role = s.guestId ? 'spectator' : 'pending';
  }

  private persist(): void {
    if (this.state) localStorage.setItem(roomKey(this.roomId), JSON.stringify(this.state));
  }

  private reportPeers(): void {
    const opp = this.opponentId();
    let online = false;
    for (const id of this.peers.values()) if (id === opp) online = true;
    this.events.onPeers(online);
  }

  private adopt(state: RoomState): void {
    if (state.gameNo !== this.state?.gameNo) {
      this.drawOffered = false;
      this.rematchOffered = false;
    }
    this.state = state;
    this.updateRole();
    this.persist();
    this.events.onState(state, this.role);
    this.reportPeers();
  }

  private receive(msg: Msg, peerId: string): void {
    const s = this.state;
    switch (msg.t) {
      case 'hello': {
        this.peers.set(peerId, msg.id);
        if (this.role === 'host' && s) {
          if (!s.guestId && msg.id !== this.me) {
            s.guestId = msg.id;
            this.persist();
            this.events.onState(s, this.role);
          }
          // The guest may be ahead if the host's browser lost a move; take the longer valid game.
          const theirs = msg.state;
          if (theirs && msg.id === s.guestId && theirs.gameNo === s.gameNo && theirs.moves.length > s.moves.length && isValidState(theirs)) {
            s.moves = theirs.moves;
            s.result = theirs.result;
            this.persist();
            this.events.onState(s, this.role);
          }
          this.send({ t: 'state', state: s }, peerId);
        }
        this.reportPeers();
        break;
      }
      case 'state': {
        const from = this.peers.get(peerId);
        const incoming = msg.state;
        if (!isValidState(incoming)) return;
        if (s && from !== s.hostId && incoming.hostId !== s.hostId) return;
        if (s && incoming.gameNo === s.gameNo && incoming.moves.length < s.moves.length && this.role === 'guest') {
          // We are ahead of the host: tell them rather than roll back.
          this.send({ t: 'hello', id: this.me, state: s }, peerId);
          return;
        }
        this.adopt(incoming);
        break;
      }
      case 'move': {
        if (!s || msg.g !== s.gameNo) return;
        const from = this.peers.get(peerId);
        if (msg.n !== s.moves.length) {
          if (msg.n > s.moves.length) this.send({ t: 'hello', id: this.me, state: s }, peerId);
          return;
        }
        // Only the player whose turn it is may move.
        const mover: Side = (msg.n % 2) as Side;
        const moverId = mover === s.hostSide ? s.hostId : s.guestId;
        if (from !== moverId || from === this.me) return;
        try {
          const g = Game.fromMoves(s.rules, s.moves);
          g.play(moveFromString(msg.m));
        } catch {
          return;
        }
        s.moves.push(msg.m);
        if (s.tc && s.clock && typeof msg.c === 'number') {
          // The mover reports their own clock; it can never grow by more than the increment.
          s.clock[mover] = Math.max(0, Math.min(msg.c, s.clock[mover] + s.tc.inc * 1000));
        }
        s.lastMoveAt = Date.now();
        this.persist();
        this.events.onMove(msg.m);
        break;
      }
      case 'flag': {
        if (!s || msg.g !== s.gameNo || s.result || !s.tc || this.peers.get(peerId) !== this.opponentId()) return;
        const me = this.mySide;
        if (me === null) return;
        if (msg.who === 'self') {
          s.result = { winner: me, reason: 'timeout' };
        } else {
          // They claim our flag fell: agree only if our own clock says so too.
          if (s.moves.length % 2 !== me || this.liveRemaining(me) > 3000) return;
          s.result = { winner: (1 - me) as Side, reason: 'timeout' };
        }
        this.persist();
        this.events.onState(s, this.role);
        break;
      }
      case 'resign': {
        if (!s || msg.g !== s.gameNo || s.result) return;
        const from = this.peers.get(peerId);
        const loser: Side | null = from === s.hostId ? s.hostSide : from === s.guestId ? ((1 - s.hostSide) as Side) : null;
        if (loser === null) return;
        s.result = { winner: (1 - loser) as Side, reason: 'resign' };
        this.persist();
        this.events.onState(s, this.role);
        break;
      }
      case 'draw': {
        if (!s || msg.g !== s.gameNo || s.result || this.peers.get(peerId) !== this.opponentId()) return;
        if (msg.a === 'offer') this.events.onNotice('drawOffer');
        else if (msg.a === 'decline') this.events.onNotice('drawDeclined');
        else if (this.drawOffered) {
          s.result = { winner: null, reason: 'agreement' };
          this.persist();
          this.events.onState(s, this.role);
        }
        break;
      }
      case 'rematch': {
        if (!s || msg.g !== s.gameNo || this.peers.get(peerId) !== this.opponentId()) return;
        if (msg.a === 'offer') this.events.onNotice('rematchOffer');
        else if (this.role === 'host' && this.rematchOffered) this.startRematch();
        break;
      }
    }
  }

  private drawOffered = false;
  private rematchOffered = false;

  /** Milliseconds left for a side right now (its clock only runs on its own turn, after the first move). */
  liveRemaining(side: Side): number {
    const s = this.state;
    if (!s?.clock) return Infinity;
    const running = !s.result && s.moves.length >= 1 && s.moves.length % 2 === side;
    return s.clock[side] - (running ? Date.now() - (s.lastMoveAt ?? Date.now()) : 0);
  }

  sendMove(move: string, remaining?: number): void {
    const s = this.state;
    if (!s) return;
    const n = s.moves.length;
    s.moves.push(move);
    if (s.clock && remaining !== undefined) s.clock[n % 2] = remaining;
    s.lastMoveAt = Date.now();
    this.persist();
    this.send({ t: 'move', g: s.gameNo, n, m: move, c: remaining });
  }

  /** Our own flag fell, or (who = 'opponent') we claim that theirs did. */
  flag(who: 'self' | 'opponent'): void {
    const s = this.state;
    const me = this.mySide;
    if (!s || me === null || s.result) return;
    this.send({ t: 'flag', g: s.gameNo, who });
    if (who === 'self') {
      if (s.clock) s.clock[me] = 0;
      s.result = { winner: (1 - me) as Side, reason: 'timeout' };
      this.persist();
      this.events.onState(s, this.role);
    }
  }

  resign(): void {
    const s = this.state;
    const side = this.mySide;
    if (!s || side === null || s.result) return;
    s.result = { winner: (1 - side) as Side, reason: 'resign' };
    this.persist();
    this.send({ t: 'resign', g: s.gameNo });
    this.events.onState(s, this.role);
  }

  /** Results reached by moves are recorded so that a reconnecting peer sees a finished game. */
  noteResult(result: GameResult): void {
    if (this.state && !this.state.result) {
      this.state.result = result;
      this.persist();
    }
  }

  offerDraw(): void {
    if (!this.state) return;
    this.drawOffered = true;
    this.send({ t: 'draw', g: this.state.gameNo, a: 'offer' });
  }
  answerDraw(accept: boolean): void {
    const s = this.state;
    if (!s) return;
    this.send({ t: 'draw', g: s.gameNo, a: accept ? 'accept' : 'decline' });
    if (accept) {
      s.result = { winner: null, reason: 'agreement' };
      this.persist();
      this.events.onState(s, this.role);
    }
  }

  offerRematch(): void {
    if (!this.state) return;
    this.rematchOffered = true;
    this.send({ t: 'rematch', g: this.state.gameNo, a: 'offer' });
  }
  acceptRematch(): void {
    if (!this.state) return;
    if (this.role === 'host') this.startRematch();
    else this.send({ t: 'rematch', g: this.state.gameNo, a: 'accept' });
  }

  private startRematch(): void {
    const s = this.state;
    if (!s) return;
    const next: RoomState = {
      ...s, gameNo: s.gameNo + 1, hostSide: (1 - s.hostSide) as Side, moves: [], result: null,
      clock: s.tc ? [s.tc.base * 60000, s.tc.base * 60000] : undefined, lastMoveAt: undefined,
    };
    this.drawOffered = false;
    this.rematchOffered = false;
    this.adopt(next);
    this.send({ t: 'state', state: next });
  }

  leave(): void {
    void this.room.leave();
  }
}
