// The game screen: board, players, move list, piece card, rule-moment notices, AI and online glue.

import { Side, SQY, lastRank, sqName, isCitadel } from '../engine/geometry';
import * as P from '../engine/pieces';
import { VALUE } from '../engine/values';
import { Move, RuleOptions, SWAP, RELOCATE, moveFrom, moveTo, moveKind } from '../engine/position';
import { Game, GameResult, MoveRecord, MoveEvent, moveToString, moveFromString } from '../engine/game';
import { LEVELS, HINT_LIMITS, ANALYSIS_LIMITS } from '../ai/levels';
import type { AiRequest, AiResponse, AnalyseResponse, PlyEval } from '../ai/worker';
import { judge, summarise, evalGraphSvg, formatEval, MoveJudgement } from './analysis';
import type { SearchLimits } from '../ai/search';
import { OnlineSession, Role, RoomState, TimeControl } from '../net/online';
import { BoardView, Mark } from './board';
import { pieceSvg, piecePhoto } from './pieces';
import { playSound, unlockAudio } from './sound';
import { getPrefs, setPref, onPrefsChange } from './prefs';
import { PUZZLES, Puzzle, buildPuzzle, goalMet, solutions, markSolved, forcedReply, matingMoves, isMultiMove, dailyState, markDailySolved } from '../puzzles';
import { getLang, t, pieceName, nativeName, pieceAbbr, moveText, likeText, Key } from '../i18n';

export type GameConfig =
  | { mode: 'ai'; rules: RuleOptions; mySide: Side; level: number; moves?: string[]; tc?: TimeControl | null; clockLeft?: [number, number] }
  | { mode: 'local'; rules: RuleOptions; moves?: string[]; tc?: TimeControl | null; clockLeft?: [number, number] }
  | { mode: 'online'; roomId: string; create?: { rules: RuleOptions; hostSide: Side; tc?: TimeControl | null } }
  | { mode: 'puzzle'; id: string; daily?: boolean };

const SAVE_KEY = 'tc.save';

export function loadSavedConfig(): GameConfig | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameConfig) : null;
  } catch {
    return null;
  }
}
export function clearSavedConfig(): void {
  localStorage.removeItem(SAVE_KEY);
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function formatMove(rec: MoveRecord, final: GameResult | null): string {
  const to = isCitadel(rec.to) ? t('abbr.citadel') : sqName(rec.to);
  let s: string;
  if (rec.kind === SWAP) s = `${pieceAbbr(P.KING)} ${sqName(rec.from)}⇄${to}`;
  else if (rec.kind === RELOCATE) s = `${sqName(rec.from)}↷${rec.captured ? '×' : ''}${to}`;
  else {
    s = `${pieceAbbr(rec.piece)}${sqName(rec.from)}${rec.captured ? '×' : '–'}${to}`;
    if (rec.events.includes('popSecond')) s += `→${sqName(rec.landed)}`;
    else if (rec.becomes !== rec.piece && rec.piece !== P.PAWN_PAWN) s += `=${pieceAbbr(rec.becomes)}`;
  }
  if (final && (final.reason === 'checkmate' || final.reason === 'stalemate')) s += '#';
  else if (rec.check) s += '+';
  return s;
}

export class GameScreen {
  private game!: Game;
  private board!: BoardView;
  private mySide: Side | null = null;
  private selected = -1;
  private swapMode = false;
  private worker: Worker | null = null;
  private aiRequestId = 0;
  private pendingAi = new Map<number, 'move' | 'hint' | 'analyse'>();
  /** Position being looked at in the move list; null = the live position. */
  private viewPly: number | null = null;
  private viewCache: { ply: number; game: Game } | null = null;
  private analysis: { evals: PlyEval[]; done: boolean; judgements: MoveJudgement[] } | null = null;
  private onKey = (e: KeyboardEvent): void => this.handleKey(e);
  private thinking = false;
  private online: OnlineSession | null = null;
  private onlineRole: Role = 'pending';
  private opponentOnline = false;
  private seenNotices = new Set<string>();
  private resultShown = false;
  private disposed = false;
  private els!: Record<string, HTMLElement>;
  private tc: TimeControl | null = null;
  private remaining: [number, number] = [0, 0];
  private turnStart = 0;
  private clockTimer = 0;
  /** Coach marks for the first game against the computer: 0 = not started, 1..3 = shown, 99 = done. */
  private coachStep = 0;
  private puzzle: Puzzle | null = null;
  private puzzleSolved = false;

  constructor(private root: HTMLElement, private config: GameConfig, private goHome: () => void, private newGame: () => void) {
    this.renderShell();
    if (config.mode === 'online') {
      this.game = new Game();
      this.startOnline(config);
    } else if (config.mode === 'puzzle') {
      this.puzzle = PUZZLES.find((p) => p.id === config.id) ?? PUZZLES[0];
      this.root.querySelector('.game')!.classList.add('is-puzzle');
      this.resetPuzzle();
    } else {
      this.game = config.moves ? Game.fromMoves(config.rules, config.moves) : new Game(config.rules);
      this.mySide = config.mode === 'ai' ? config.mySide : null;
      this.setClock(config.tc ?? null, config.clockLeft);
      this.board.setOrientation(this.mySide ?? 0);
      this.refresh();
      this.maybeAiMove();
    }
    this.clockTimer = window.setInterval(() => this.tick(), 200);
    this.offPrefs = onPrefsChange(() => {
      this.board.refreshTheme();
      this.select(this.selected);
    });
  }
  private offPrefs: () => void = () => {};

  dispose(): void {
    this.disposed = true;
    this.offPrefs();
    document.removeEventListener('keydown', this.onKey);
    clearInterval(this.clockTimer);
    this.worker?.terminate();
    this.online?.leave();
  }

  // --- layout ---------------------------------------------------------------------------------

  private renderShell(): void {
    this.root.innerHTML = `
      <div class="game">
        <div class="board-col">
          <div class="player-bar" data-el="topBar"></div>
          <div class="status" data-el="status" aria-live="polite"></div>
          <div class="board-wrap" data-el="boardWrap"></div>
          <div class="player-bar" data-el="bottomBar"></div>
          <div class="actions" data-el="actions"></div>
        </div>
        <aside class="side">
          <div class="result-card" data-el="result" hidden></div>
          <div class="notice" data-el="notice" hidden></div>
          <div class="online-box" data-el="onlineBox" hidden></div>
          <div class="info-card" data-el="info"></div>
          <div class="analysis" data-el="analysis" hidden></div>
          <div class="moves-box">
            <div class="moves-head"><h3>${esc(t('game.moves'))}</h3>
              <div class="nav-btns" data-el="nav">
                <button class="nav-btn" data-nav="first" aria-label="${esc(t('nav.first'))}">⏮</button>
                <button class="nav-btn" data-nav="prev" aria-label="${esc(t('nav.prev'))}">◀</button>
                <button class="nav-btn" data-nav="next" aria-label="${esc(t('nav.next'))}">▶</button>
                <button class="nav-btn" data-nav="last" aria-label="${esc(t('nav.last'))}">⏭</button>
              </div></div>
            <div class="moves" data-el="moves"></div>
          </div>
        </aside>
      </div>`;
    this.els = {};
    this.root.querySelectorAll<HTMLElement>('[data-el]').forEach((e) => (this.els[e.dataset.el!] = e));
    this.board = new BoardView(this.els.boardWrap);
    this.board.onSquareClick = (sq) => this.clickSquare(sq);
    this.board.canDrag = (sq) => this.isMyTurn() && this.ownPieceAt(sq) && !this.swapMode;
    this.board.onDrop = (from, to) => {
      const m = this.findMove(from, to);
      if (m === null) {
        playSound('illegal');
        return false;
      }
      this.play(m);
      return true;
    };
    this.els.actions.addEventListener('click', (e) => this.onAction(e));
    this.els.result.addEventListener('click', (e) => this.onAction(e));
    this.els.onlineBox.addEventListener('click', (e) => this.onAction(e));
    this.els.notice.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'coachOff') {
        setPref('coach', false);
        this.coachStep = 99;
      }
      this.els.notice.hidden = true;
      if (act === 'coachNext') this.coach(); // shows the next step, if its moment has come
    });
    this.els.nav.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
      if (b) this.navigate(b.dataset.nav!);
    });
    this.els.moves.addEventListener('click', (e) => {
      const mv = (e.target as HTMLElement).closest<HTMLElement>('[data-ply]');
      if (mv) this.goTo(Number(mv.dataset.ply) + 1);
    });
    this.els.analysis.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const act = target.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'showBest') return this.showBest();
      const svg = target.closest<SVGSVGElement>('svg.eval-graph');
      if (svg) {
        const r = svg.getBoundingClientRect();
        this.goTo(Math.round(((e as MouseEvent).clientX - r.left) / r.width * this.game.ply));
      }
    });
    document.addEventListener('keydown', this.onKey);
    this.root.addEventListener('pointerdown', unlockAudio, { once: true });
  }

  // --- clock --------------------------------------------------------------------------------------

  private setClock(tc: TimeControl | null, left?: [number, number], turnStart = Date.now()): void {
    this.tc = tc;
    this.remaining = left ? [left[0], left[1]] : tc ? [tc.base * 60000, tc.base * 60000] : [0, 0];
    this.turnStart = turnStart;
  }

  /** Time left for a side right now. Clocks start once White has made the first move. */
  private live(side: Side): number {
    const running = !this.game.result && this.game.ply >= 1 && this.game.side === side;
    return this.remaining[side] - (running ? Date.now() - this.turnStart : 0);
  }

  private tick(): void {
    if (!this.tc || this.disposed) return;
    for (const side of [0, 1] as Side[]) {
      const el = this.root.querySelector<HTMLElement>(`[data-clock="${side}"]`);
      if (!el) continue;
      const ms = Math.max(0, this.live(side));
      const total = Math.ceil(ms / 1000);
      el.textContent = ms < 10000 ? (ms / 1000).toFixed(1) : `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
      el.classList.toggle('low', ms < 30000);
      el.classList.toggle('running', !this.game.result && this.game.ply >= 1 && this.game.side === side);
    }
    if (this.game.result || this.game.ply < 1) return;
    const side = this.game.side;
    const left = this.live(side);
    if (left > 0) return;
    if (this.online) {
      if (side === this.mySide) this.online.flag('self');
      else if (left < -4000 && this.mySide !== null) this.online.flag('opponent');
    } else {
      this.cancelAi();
      this.remaining[side] = 0;
      this.game.end({ winner: (1 - side) as Side, reason: 'timeout' });
      playSound('end');
      this.save();
      this.refresh();
    }
  }

  // --- turn logic -----------------------------------------------------------------------------

  private resetPuzzle(): void {
    const p = this.puzzle!;
    this.game = buildPuzzle(p);
    this.mySide = p.side;
    this.puzzleSolved = false;
    this.els.result.hidden = true;
    this.board.setOrientation(p.side);
    this.board.sync(this.game.pos.board);
    this.select(-1);
    this.refresh();
  }

  private checkPuzzle(rec: MoveRecord): void {
    const p = this.puzzle!;
    if (rec.side !== p.side) return; // the scripted reply
    if (isMultiMove(p) && !this.game.result && this.game.ply === 1) {
      // First move of a mate-in-two: accept it only if every reply still allows a mate, then answer.
      const reply = forcedReply(this.game);
      if (reply === null) return this.puzzleFail();
      playSound('move');
      setTimeout(() => {
        if (this.disposed || this.game.ply !== 1) return;
        this.play(reply);
      }, 650);
      return;
    }
    if (goalMet(p, this.game, rec)) {
      this.puzzleSolved = true;
      markSolved(p.id);
      playSound('promote');
      const i = PUZZLES.indexOf(p);
      const next = PUZZLES[i + 1];
      const daily = this.config.mode === 'puzzle' && this.config.daily ? markDailySolved() : null;
      this.els.result.className = 'result-card win';
      this.els.result.innerHTML = `
        <h2>${esc(t('puzzle.solved'))}</h2>
        ${daily ? `<p class="gold-text">${esc(t('daily.streak', String(daily.streak)))}</p>` : ''}
        <p>${esc(p.text[getLang()].done)}</p>
        ${next ? '' : `<p class="gold-text">${esc(t('puzzle.allDone'))}</p>`}
        <div class="row">
          ${next ? `<a class="btn primary" href="#/puzzle/${next.id}">${esc(t('puzzle.next'))}</a>` : `<a class="btn primary" href="#/">${esc(t('puzzle.play'))}</a>`}
          <button class="btn" data-act="retry">${esc(t('puzzle.retry'))}</button>
        </div>`;
      setTimeout(() => !this.disposed && this.puzzleSolved && (this.els.result.hidden = false), 450);
    } else this.puzzleFail();
  }

  private puzzleFail(): void {
    playSound('illegal');
    this.showNotice(t('puzzle.wrong'));
    setTimeout(() => {
      if (this.disposed || this.puzzleSolved) return;
      this.resetPuzzle();
    }, 900);
  }

  // --- move-list navigation -------------------------------------------------------------------

  /** The game whose position is on the board: a replay up to viewPly, or the live one. */
  private displayed(): Game {
    if (this.viewPly === null) return this.game;
    if (!this.viewCache || this.viewCache.ply !== this.viewPly) {
      this.viewCache = { ply: this.viewPly, game: Game.fromMoves(this.game.rules, this.game.serialize().slice(0, this.viewPly)) };
    }
    return this.viewCache.game;
  }

  private viewedPly(): number {
    return this.viewPly ?? this.game.ply;
  }

  goTo(ply: number): void {
    ply = Math.max(0, Math.min(this.game.ply, ply));
    this.viewPly = ply === this.game.ply ? null : ply;
    this.select(-1);
    this.board.setHint(-1, -1);
    this.refresh();
  }

  private navigate(where: string): void {
    const cur = this.viewedPly();
    if (where === 'first') this.goTo(0);
    else if (where === 'prev') this.goTo(cur - 1);
    else if (where === 'next') this.goTo(cur + 1);
    else this.goTo(this.game.ply);
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.disposed || e.altKey || e.metaKey || e.ctrlKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
    if (e.target === this.board.svg) return; // the board handles arrows as a cursor
    const map: Record<string, string> = { ArrowLeft: 'prev', ArrowRight: 'next', Home: 'first', End: 'last' };
    const where = map[e.key];
    if (!where) return;
    e.preventDefault();
    this.navigate(where);
  }

  private isMyTurn(): boolean {
    if (this.viewPly !== null) return false;
    if (this.puzzle) return !this.puzzleSolved && !this.game.result && this.game.side === this.puzzle.side && (this.game.ply === 0 || (isMultiMove(this.puzzle) && this.game.ply === 2));
    if (this.game.result || this.thinking) return false;
    if (this.config.mode === 'local') return true;
    if (this.config.mode === 'online' && (this.onlineRole === 'spectator' || this.onlineRole === 'pending')) return false;
    return this.game.side === this.mySide;
  }

  private ownPieceAt(sq: number): boolean {
    const p = this.displayed().pos.board[sq];
    return p !== 0 && p > 0 === (this.game.side === 0);
  }

  private findMove(from: number, to: number): Move | null {
    for (const m of this.game.legalMoves()) {
      if (moveFrom(m) === from && moveTo(m) === to && (moveKind(m) === SWAP) === this.swapMode) return m;
    }
    return null;
  }

  private swapMoves(): Move[] {
    return this.game.legalMoves().filter((m) => moveKind(m) === SWAP);
  }

  private clickSquare(sq: number): void {
    this.board.setHint(-1, -1);
    const pos = this.displayed().pos;
    if (this.swapMode) {
      const ksq = pos.topRoyalSq(this.game.side);
      const m = this.findMove(ksq, sq);
      if (m !== null) return this.play(m);
      this.setSwapMode(false);
    }
    if (this.selected >= 0 && this.isMyTurn() && this.ownPieceAt(this.selected)) {
      const m = this.findMove(this.selected, sq);
      if (m !== null) return this.play(m);
    }
    if (sq === this.selected || pos.board[sq] === 0) return this.select(-1);
    this.select(sq);
  }

  private select(sq: number): void {
    this.selected = sq;
    this.board.setSelected(sq);
    const marks: Mark[] = [];
    if (sq >= 0) {
      const pos = this.displayed().pos;
      if (this.isMyTurn() && this.ownPieceAt(sq)) {
        if (getPrefs().hints) for (const m of this.game.legalMovesFrom(sq)) {
          const k = moveKind(m);
          if (k === SWAP) continue;
          const to = moveTo(m);
          marks.push({ sq: to, kind: k === RELOCATE ? 'reloc' : pos.board[to] !== 0 ? 'capture' : 'move' });
        }
      } else {
        // Someone else's piece, or not our turn: show where it could go, as a lesson rather than a choice.
        const list: Move[] = [];
        pos.genPiece(sq, list, false);
        for (const m of list) marks.push({ sq: moveTo(m), kind: pos.board[moveTo(m)] !== 0 ? 'ghostCapture' : 'ghost' });
      }
    }
    this.board.setMarks(marks);
    this.renderInfo();
  }

  private setSwapMode(on: boolean): void {
    this.swapMode = on;
    this.select(-1);
    if (on) {
      this.board.setSelected(this.game.pos.topRoyalSq(this.game.side));
      this.board.setMarks(this.swapMoves().map((m) => ({ sq: moveTo(m), kind: 'swap' as const })));
    }
    this.renderActions();
    this.renderStatus();
  }

  private play(m: Move, remote = false): void {
    const mover = this.game.side;
    if (this.tc) {
      if (remote && this.online?.state?.clock) this.remaining[mover] = this.online.state.clock[mover];
      else if (this.game.ply >= 1) this.remaining[mover] = Math.max(0, this.live(mover)) + this.tc.inc * 1000;
      this.turnStart = Date.now();
    }
    const rec = this.game.play(m);
    this.swapMode = false;
    this.selected = -1;
    this.board.setSelected(-1);
    this.board.setMarks([]);
    this.board.setHint(-1, -1);
    this.viewCache = null;
    if (this.viewPly === null) this.board.sync(this.game.pos.board, rec.kind === SWAP ? [[rec.from, rec.to], [rec.to, rec.from]] : [[rec.from, rec.landed]]);
    this.soundFor(rec);
    this.noticeFor(rec);
    if (this.online && !remote) {
      this.online.sendMove(moveToString(m), this.tc ? this.remaining[mover] : undefined);
      if (this.game.result) this.online.noteResult(this.game.result);
    }
    this.save();
    this.refresh();
    if (this.puzzle) this.checkPuzzle(rec);
    this.maybeAiMove();
  }

  private soundFor(rec: MoveRecord): void {
    if (this.game.result) playSound('end');
    else if (rec.check) playSound('check');
    else if (rec.becomes !== rec.piece) playSound('promote');
    else if (rec.captured || rec.displaced) playSound('capture');
    else playSound('move');
  }

  private noticeFor(rec: MoveRecord): void {
    const priority: MoveEvent[] = ['advKing', 'popSecond', 'popRelocated', 'popArrived', 'prince', 'ownCitadel', 'royalCaptured', 'swap'];
    const ev = priority.find((e) => rec.events.includes(e));
    if (ev) this.showNotice(t(`event.${ev}` as Key));
  }

  /** Shows the coach mark for the current step, if coaching is on and the moment fits. */
  private coach(): void {
    if (this.config.mode !== 'ai' || !getPrefs().coach || this.coachStep >= 3 || this.game.result) return;
    const step = this.coachStep + 1;
    if (step === 1 && this.game.ply > 1) { this.coachStep = 1; return this.coach(); }
    if (step === 2 && this.game.side !== this.mySide) return;
    if (step === 3 && this.game.ply < 2) return;
    this.coachStep = step;
    this.els.notice.innerHTML = `<span class="notice-mark">✦</span><div><p>${esc(t(`coach.${step}` as Key))}</p>
      <div class="row coach-row"><button class="btn small" data-act="coachNext">${esc(t('coach.ok'))}</button><button class="link" data-act="coachOff">${esc(t('coach.off'))}</button></div></div>`;
    this.els.notice.classList.add('coach');
    this.els.notice.hidden = false;
  }

  private showNotice(text: string, once?: string): void {
    this.els.notice.classList.remove('coach');
    if (once) {
      if (this.seenNotices.has(once)) return;
      this.seenNotices.add(once);
    }
    this.els.notice.innerHTML = `<span class="notice-mark">✦</span><p>${esc(text)}</p><button class="notice-close" aria-label="×">×</button>`;
    this.els.notice.hidden = false;
  }

  // --- AI -------------------------------------------------------------------------------------

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<AiResponse>) => this.onAiResponse(e.data);
    }
    return this.worker;
  }

  private askAi(purpose: 'move' | 'hint' | 'analyse', limits: SearchLimits): void {
    const id = ++this.aiRequestId;
    this.pendingAi.set(id, purpose);
    const req: AiRequest = { id, kind: purpose === 'analyse' ? 'analyse' : 'move', rules: this.game.rules, moves: this.game.serialize(), limits };
    this.ensureWorker().postMessage(req);
  }

  private maybeAiMove(): void {
    if (this.config.mode !== 'ai' || this.game.result || this.game.side === this.mySide) return;
    this.thinking = true;
    this.renderBars();
    this.renderActions();
    const started = performance.now();
    const level = LEVELS.find((l) => l.id === (this.config as { level: number }).level) ?? LEVELS[2];
    this.aiStarted = started;
    this.askAi('move', level.limits);
  }
  private aiStarted = 0;

  private onAiResponse(res: AiResponse | AnalyseResponse): void {
    if (res.kind === 'analyse') {
      if (this.disposed || !this.pendingAi.has(res.id)) return;
      if (res.done) this.pendingAi.delete(res.id);
      this.analysis = { evals: res.evals, done: res.done, judgements: judge(res.evals) };
      this.renderAnalysis();
      this.renderMoves();
      this.renderInfo();
      return;
    }
    const purpose = this.pendingAi.get(res.id);
    this.pendingAi.delete(res.id);
    if (this.disposed || !purpose || res.move === null) return;
    if (purpose === 'hint') {
      if (res.id !== this.aiRequestId) return;
      const m = moveFromString(res.move);
      this.board.setHint(moveFrom(m), moveTo(m));
      this.els.actions.querySelector('[data-act="hint"]')?.classList.remove('busy');
      return;
    }
    if (res.id !== this.aiRequestId || !this.thinking) return;
    // An instant reply feels mechanical; give the move a moment to be seen coming.
    const wait = Math.max(0, 450 - (performance.now() - this.aiStarted));
    const expectPly = this.game.ply;
    setTimeout(() => {
      if (this.disposed || !this.thinking || this.game.ply !== expectPly) return;
      this.thinking = false;
      this.play(moveFromString(res.move!));
    }, wait);
  }

  private cancelAi(): void {
    this.thinking = false;
    this.pendingAi.clear();
    this.analysis = null;
    this.viewPly = null;
    this.viewCache = null;
    this.els.analysis.hidden = true;
    this.worker?.terminate();
    this.worker = null;
  }

  // --- online ---------------------------------------------------------------------------------

  private startOnline(config: Extract<GameConfig, { mode: 'online' }>): void {
    this.online = new OnlineSession(
      config.roomId,
      {
        onState: (state, role) => this.applyRoomState(state, role),
        onMove: (move) => {
          try {
            this.play(moveFromString(move), true);
          } catch {
            if (this.online?.state) this.applyRoomState(this.online.state, this.onlineRole);
          }
        },
        onPeers: (online) => {
          this.opponentOnline = online;
          this.renderOnlineBox();
          this.renderBars();
        },
        onNotice: (kind) => this.renderOnlineBox(kind),
      },
      config.create,
    );
    if (this.online.state) this.applyRoomState(this.online.state, this.online.role);
    else this.refresh();
    this.renderOnlineBox();
  }

  private applyRoomState(state: RoomState, role: Role): void {
    this.onlineRole = role;
    this.mySide = this.online?.mySide ?? null;
    this.game = Game.fromMoves(state.rules, state.moves);
    this.viewPly = null;
    this.viewCache = null;
    if (state.result && !this.game.result) this.game.end(state.result);
    this.setClock(state.tc ?? null, state.clock, state.lastMoveAt ?? Date.now());
    this.resultShown = false;
    this.els.result.hidden = true;
    this.board.setOrientation(this.mySide ?? 0);
    this.board.sync(this.game.pos.board);
    this.select(-1);
    this.refresh();
    this.renderOnlineBox();
  }

  private renderOnlineBox(notice?: 'drawOffer' | 'drawDeclined' | 'rematchOffer'): void {
    const box = this.els.onlineBox;
    if (!this.online) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const s = this.online.state;
    let html = '';
    if (notice === 'drawOffer') {
      html = `<p>${esc(t('online.drawOffered'))}</p><div class="row"><button class="btn primary" data-act="drawAccept">${esc(t('online.accept'))}</button><button class="btn" data-act="drawDecline">${esc(t('online.decline'))}</button></div>`;
    } else if (notice === 'rematchOffer') {
      html = `<p>${esc(t('online.rematchOffer'))}</p><div class="row"><button class="btn primary" data-act="rematchAccept">${esc(t('online.accept'))}</button></div>`;
    } else if (!s) {
      html = `<p class="pulse">${esc(t('online.connecting'))}</p>`;
    } else if (this.onlineRole === 'spectator') {
      html = `<p>${esc(t('online.spectator'))}</p>`;
    } else if (this.onlineRole === 'host' && !s.guestId) {
      const url = location.href;
      html = `<p>${esc(t('online.share'))}</p><input class="link" readonly value="${esc(url)}" aria-label="link"><div class="row"><button class="btn primary" data-act="copy">${esc(t('online.copy'))}</button></div><p class="pulse dim">${esc(t('online.waiting'))}</p>`;
    } else if (!this.opponentOnline) {
      html = `<p class="pulse">${esc(t(this.game.ply === 0 && this.onlineRole !== 'host' ? 'online.connecting' : 'online.disconnected'))}</p>`;
    } else {
      html = `<p class="ok">● ${esc(t('online.connected'))}</p>`;
    }
    box.innerHTML = html;
    box.querySelector<HTMLInputElement>('input.link')?.addEventListener('focus', (e) => (e.target as HTMLInputElement).select());
  }

  // --- actions --------------------------------------------------------------------------------

  private onAction(e: Event): void {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'swap':
        this.setSwapMode(!this.swapMode);
        break;
      case 'undo':
        this.undo();
        break;
      case 'retry':
        this.resetPuzzle();
        break;
      case 'hint':
        if (this.puzzle) {
          const sol = this.game.ply === 2 ? matingMoves(this.game)[0] : solutions(this.puzzle)[0];
          if (sol !== undefined) {
            if (moveKind(sol) === SWAP) this.setSwapMode(true);
            else this.board.setHint(moveFrom(sol), moveTo(sol));
          }
        } else if (this.isMyTurn() && !btn.classList.contains('busy')) {
          btn.classList.add('busy');
          this.askAi('hint', HINT_LIMITS);
        }
        break;
      case 'review':
        if (!this.analysis) {
          this.analysis = { evals: [], done: false, judgements: [] };
          this.renderAnalysis();
          this.askAi('analyse', ANALYSIS_LIMITS);
        }
        this.els.analysis.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        break;
      case 'flip':
        this.board.setOrientation((1 - this.board.getOrientation()) as Side);
        this.renderBars();
        break;
      case 'resign':
        // Two taps instead of a system dialog: the first arms the button for a few seconds.
        if (!btn.classList.contains('armed')) {
          btn.classList.add('armed');
          btn.textContent = t('game.resign.confirm');
          setTimeout(() => {
            if (btn.isConnected && btn.classList.contains('armed')) {
              btn.classList.remove('armed');
              btn.textContent = t('game.resign');
            }
          }, 3000);
          break;
        }
        if (this.online) this.online.resign();
        else {
          this.cancelAi();
          const loser = this.config.mode === 'ai' ? this.mySide! : this.game.side;
          this.game.end({ winner: (1 - loser) as Side, reason: 'resign' });
          playSound('end');
          this.save();
          this.refresh();
        }
        break;
      case 'draw':
        this.online?.offerDraw();
        this.showNotice(t('online.drawSent'));
        break;
      case 'drawAccept':
        this.online?.answerDraw(true);
        break;
      case 'drawDecline':
        this.online?.answerDraw(false);
        this.renderOnlineBox();
        break;
      case 'rematch':
        if (this.online) {
          this.online.offerRematch();
          this.showNotice(t('online.rematchSent'));
        } else this.restart();
        break;
      case 'rematchAccept':
        this.online?.acceptRematch();
        break;
      case 'new':
        this.newGame();
        break;
      case 'home':
        this.goHome();
        break;
      case 'closeResult':
        this.els.result.hidden = true;
        break;
      case 'copy':
        void navigator.clipboard?.writeText(location.href).then(() => (btn.textContent = t('online.copied')));
        break;
    }
  }

  private undo(): void {
    if (this.online || this.game.ply === 0) return;
    this.cancelAi();
    this.game.undo();
    if (this.config.mode === 'ai' && this.game.side !== this.mySide && this.game.ply > 0) this.game.undo();
    this.resultShown = false;
    this.els.result.hidden = true;
    this.board.sync(this.game.pos.board);
    this.select(-1);
    this.save();
    this.refresh();
    this.maybeAiMove();
  }

  private restart(): void {
    if (this.config.mode === 'online' || this.config.mode === 'puzzle') return;
    this.cancelAi();
    if (this.config.mode === 'ai') {
      this.config = { ...this.config, mySide: (1 - this.config.mySide) as Side, moves: [] };
      this.mySide = this.config.mySide;
    }
    this.game = new Game(this.config.rules);
    this.setClock(this.tc);
    this.resultShown = false;
    this.els.result.hidden = true;
    this.board.setOrientation(this.mySide ?? 0);
    this.board.sync(this.game.pos.board);
    this.select(-1);
    this.save();
    this.refresh();
    this.maybeAiMove();
  }

  private save(): void {
    if (this.config.mode === 'online' || this.config.mode === 'puzzle') return;
    if (this.game.result) return clearSavedConfig();
    const cfg: GameConfig = { ...this.config, moves: this.game.serialize(), clockLeft: this.tc ? [this.live(0), this.live(1)] : undefined } as GameConfig;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(cfg));
    } catch {
      /* storage full or unavailable: the game simply will not resume */
    }
  }

  // --- rendering ------------------------------------------------------------------------------

  private refresh(): void {
    const g = this.displayed();
    this.board.sync(g.pos.board);
    const last = g.records[g.records.length - 1];
    this.board.setLastMove(last ? [last.from, last.landed] : []);
    this.board.setCheck(!g.result || g.result.reason === 'checkmate' ? (g.inCheck() ? g.pos.topRoyalSq(g.side) : -1) : -1);
    this.renderAnalysis();
    this.renderBars();
    this.renderStatus();
    this.renderActions();
    this.renderMoves();
    this.renderInfo();
    this.renderResult();
    if (this.isMyTurn() && !this.puzzle) {
      if (this.swapMoves().length) this.showNotice(t('event.swapAvailable'), 'swapAvailable');
      else if (g.legalMoves().some((m) => moveKind(m) === RELOCATE)) this.showNotice(t('event.relocAvailable'), 'relocAvailable');
      else if (this.els.notice.hidden) this.coach();
    }
  }

  private sideName(side: Side): string {
    if (this.config.mode === 'ai') {
      if (side === this.mySide) return t('game.you');
      const lvl = LEVELS.find((l) => l.id === (this.config as { level: number }).level)!;
      return t(`level.${lvl.key}` as Key);
    }
    if (this.puzzle) return t(side === this.mySide ? 'game.you' : side === 0 ? 'game.white' : 'game.black');
    if (this.config.mode === 'online' && this.mySide !== null) return t(side === this.mySide ? 'game.you' : 'game.opponent');
    return t(side === 0 ? 'game.white' : 'game.black');
  }

  private trophies(side: Side): number[] {
    const out: number[] = [];
    for (const r of this.game.records) {
      if (r.captured && r.capturedSide !== side) out.push(r.captured);
      if (r.displaced && r.displacedSide !== side) out.push(r.displaced);
    }
    return out.sort((a, b) => VALUE[b] - VALUE[a]);
  }

  private renderBars(): void {
    const bottom = this.board.getOrientation();
    const bars: [HTMLElement, Side][] = [[this.els.topBar, (1 - bottom) as Side], [this.els.bottomBar, bottom]];
    queueMicrotask(() => this.tick());
    for (const [el, side] of bars) {
      const active = !this.game.result && this.game.side === side;
      const thinking = this.thinking && active;
      const offline = this.online && side !== this.mySide && this.mySide !== null && !this.opponentOnline;
      const loot = this.trophies(side).map((p) => pieceSvg(p, (1 - side) as Side, 20)).join('');
      const isMe = this.mySide !== null && side === this.mySide;
      const aiLevel = this.config.mode === 'ai' && !isMe ? (this.config as { level: number }).level : 0;
      const avatar = aiLevel ? `<img class="avatar" src="./img/av-${aiLevel}.jpg" alt="" width="44" height="44">` : `<span class="avatar">${pieceSvg(P.KING, side, 34)}</span>`;
      let status = '';
      let dot = '';
      if (this.game.result) status = '';
      else if (thinking) { status = t('game.thinking'); dot = 'think'; }
      else if (offline) { status = t('online.offline'); dot = 'off'; }
      else if (active) { status = t(isMe ? 'game.turn.you' : this.mySide === null ? 'game.turn.now' : 'game.turn.opp'); dot = isMe ? 'me' : 'on'; }
      el.className = `player-bar${active ? (isMe || this.mySide === null ? ' active me' : ' active') : ''}`;
      el.innerHTML = `
        ${avatar}
        <span class="pinfo">
          <span class="pname">${esc(this.sideName(side))}${dot ? `<i class="dot ${dot}"></i>` : ''}</span>
          <span class="pstatus">${esc(status)}${loot ? `<span class="loot" title="${esc(t('game.captured'))}">${status ? ' · ' : ''}${loot}</span>` : ''}</span>
        </span>
        ${this.tc ? `<span class="clock" data-clock="${side}"></span>` : ''}`;
    }
  }

  private renderStatus(): void {
    const g = this.game;
    let text: string;
    let cls = 'plain';
    const mine = this.config.mode === 'local' || this.mySide === null || g.side === this.mySide;
    if (this.viewPly !== null) {
      text = t('game.viewing.short', String(Math.ceil(this.viewPly / 2)));
      cls = 'plain';
    } else if (this.puzzle && !this.swapMode) {
      const i = PUZZLES.indexOf(this.puzzle);
      const daily = this.config.mode === 'puzzle' && this.config.daily;
      text = `${daily ? t('daily.title') : t('puzzle.task', String(i + 1), String(PUZZLES.length))} · ${this.puzzle.text[getLang()].title}`;
      if (daily && dailyState().streak > 0) text += ` · ${t('daily.streak', String(dailyState().streak))}`;
      cls = g.inCheck() && !g.result ? 'err' : 'gold';
    } else if (g.result) {
      text = this.resultTitle(g.result);
      cls = 'ok';
    } else if (this.swapMode) {
      text = t('game.swap.active');
      cls = 'gold';
    } else if (this.online && this.onlineRole === 'host' && !this.online.state?.guestId) {
      text = t('online.waiting');
      cls = 'plain';
    } else if (g.inCheck()) {
      text = mine ? t('game.check.you') : t('game.check.opp');
      cls = mine ? 'err' : 'plain';
    } else if (this.tc && mine && this.live(g.side) < 30000 && g.ply > 0) {
      text = t('game.turn.time');
      cls = 'err';
    } else {
      if (this.config.mode === 'local' || this.mySide === null) text = t(g.side === 0 ? 'game.turn.white' : 'game.turn.black');
      else text = t(g.side === this.mySide ? 'game.turn.you' : this.thinking ? 'game.turn.thinking' : 'game.turn.opp');
      cls = mine ? 'teal' : 'plain';
    }
    this.els.status.className = `status ${cls}`;
    this.els.status.textContent = text;
  }

  private renderActions(): void {
    const g = this.game;
    const over = !!g.result;
    const canSwap = this.isMyTurn() && this.swapMoves().length > 0;
    const b = (act: string, label: string, cls = '', disabled = false): string =>
      `<button class="btn ${cls}" data-act="${act}"${disabled ? ' disabled' : ''}>${esc(label)}</button>`;
    if (this.puzzle) {
      let ph = canSwap ? b('swap', t(this.swapMode ? 'game.swap.cancel' : 'game.swap'), 'gold pulse-btn') : '';
      ph += b('hint', t('game.hint'), '', this.puzzleSolved) + b('retry', t('puzzle.retry')) + `<a class="btn" href="#/puzzles">${esc(t('puzzle.list'))}</a>`;
      this.els.actions.innerHTML = ph;
      return;
    }
    let html = '';
    if (canSwap) html += b('swap', t(this.swapMode ? 'game.swap.cancel' : 'game.swap'), 'gold pulse-btn');
    if (!this.online) {
      html += b('undo', t('game.undo'), '', g.ply === 0);
      if (!over) html += b('hint', t('game.hint'), '', !this.isMyTurn());
    } else if (!over && this.mySide !== null) {
      html += b('draw', t('online.drawOffer'));
    }
    html += b('flip', t('game.flip'));
    if (over && g.ply > 0) html += b('review', t('game.review'), this.analysis ? '' : 'gold');
    if (over) html += this.online ? (this.mySide !== null ? b('rematch', t('game.rematch'), 'primary') : '') : b('rematch', t('game.rematch'), 'primary');
    else if (this.mySide !== null || this.config.mode === 'local') html += b('resign', t('game.resign'), 'danger');
    html += b('new', t('game.new'));
    this.els.actions.innerHTML = html;
  }

  private renderMoves(): void {
    const recs = this.game.records;
    if (!recs.length) {
      this.els.moves.innerHTML = `<p class="dim">${esc(t('game.noMoves'))}</p>`;
      return;
    }
    const cur = this.viewedPly();
    const j = this.analysis?.judgements ?? [];
    const cell = (r: MoveRecord | undefined, i: number): string => {
      if (!r) return '<span class="mv"></span>';
      const fin = r === recs[recs.length - 1] ? this.game.result : null;
      const v = j[i]?.verdict;
      const mark = v === 'blunder' ? '??' : v === 'mistake' ? '?' : v === 'inaccuracy' ? '?!' : '';
      return `<button class="mv ${i + 1 === cur ? 'cur' : ''} ${v && v !== 'good' ? `v-${v}` : ''}" data-ply="${i}">${esc(formatMove(r, fin))}${mark ? `<b>${mark}</b>` : ''}</button>`;
    };
    let html = '<ol>';
    for (let i = 0; i < recs.length; i += 2) {
      html += `<li><span class="no">${i / 2 + 1}.</span>${cell(recs[i], i)}${cell(recs[i + 1], i + 1)}</li>`;
    }
    html += '</ol>';
    this.els.moves.innerHTML = html;
    const curEl = this.els.moves.querySelector<HTMLElement>('.mv.cur');
    if (curEl) curEl.scrollIntoView({ block: 'nearest' });
    else this.els.moves.scrollTop = this.els.moves.scrollHeight;
    for (const b of this.els.nav.querySelectorAll<HTMLButtonElement>('[data-nav]')) {
      const w = b.dataset.nav!;
      b.disabled = (w === 'first' || w === 'prev') ? cur === 0 : cur === this.game.ply;
    }
  }

  private renderInfo(): void {
    const sq = this.selected;
    const p = sq >= 0 ? this.displayed().pos.board[sq] : 0;
    if (!p) {
      const cur = this.viewedPly();
      const jd = this.analysis?.judgements[cur - 1];
      if (jd && cur > 0) {
        const rec = this.game.records[cur - 1];
        const ev = this.analysis!.evals[cur];
        const bestDiffers = jd.best !== null && jd.best !== moveToString(rec.move);
        this.els.info.innerHTML = `
          <div class="judge v-${jd.verdict}">
            <span class="jmove">${Math.floor(cur / 2) + (cur % 2 ? 1 : 0)}${cur % 2 ? '.' : '…'} ${esc(formatMove(rec, null))}</span>
            <span class="jverdict">${esc(t(`verdict.${jd.verdict}` as Key))}</span>
            ${ev ? `<span class="jeval">${esc(formatEval(ev))}</span>` : ''}
          </div>
          ${bestDiffers && jd.verdict !== 'good' ? `<p class="better">${esc(t('analysis.better'))} <b>${esc(this.describeMove(jd.best!, cur - 1))}</b> <button class="link" data-act="showBest">${esc(t('analysis.show'))}</button></p>` : ''}`;
        this.els.info.querySelector('[data-act="showBest"]')?.addEventListener('click', () => this.showBest());
        return;
      }
      this.els.info.innerHTML = this.puzzle
        ? `<p class="task">${esc(this.puzzle.text[getLang()].task)}</p>`
        : `<p class="dim tip">${esc(t(this.viewPly !== null ? 'game.viewing' : 'game.tapPiece'))}</p>`;
      return;
    }
    const type = Math.abs(p);
    const side: Side = p > 0 ? 0 : 1;
    const waiting = type === P.PAWN_PAWN && SQY[sq] === lastRank(side);
    const like = likeText(type);
    const promo = P.isPawn(type) && !P.isPawnOfPawns(type) ? `<span class="promo">→ ${pieceSvg(P.PROMOTES_TO[type], side, 26)}</span>` : '';
    this.els.info.innerHTML = `
      <img class="photo" src="${piecePhoto(type)}" alt="" width="640" height="640" loading="lazy">
      <div class="info-head">
        ${pieceSvg(type, side, 52)}
        <div><h3>${esc(pieceName(type))} ${promo}</h3><span class="native">${esc(nativeName(type))}</span></div>
      </div>
      ${like ? `<p class="like">≈ ${esc(like)}</p>` : ''}
      <p>${esc(moveText(type, waiting))}</p>`;
  }

  /** Human-readable form of a move string in the position after `ply` plies. */
  private describeMove(move: string, ply: number): string {
    const g = Game.fromMoves(this.game.rules, this.game.serialize().slice(0, ply));
    try {
      const rec = g.play(moveFromString(move));
      return formatMove(rec, null);
    } catch {
      return move;
    }
  }

  /** Jump to the position before the viewed move and draw the engine's preference. */
  private showBest(): void {
    const cur = this.viewedPly();
    const jd = this.analysis?.judgements[cur - 1];
    if (!jd?.best) return;
    this.goTo(cur - 1);
    const m = moveFromString(jd.best);
    this.board.setHint(moveFrom(m), moveTo(m));
  }

  private renderAnalysis(): void {
    const a = this.analysis;
    const box = this.els.analysis;
    if (!a) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const cur = this.viewedPly();
    const total = this.game.ply;
    const progress = a.done ? '' : `<div class="progress"><div style="width:${Math.round((a.evals.length / (total + 1)) * 100)}%"></div></div>`;
    const ev = a.evals[cur];
    const sum = (side: Side): string => {
      const s = summarise(a.judgements, side);
      return `<div class="sum"><b>${esc(this.sideName(side))}</b><span>${s.accuracy}%</span>
        <small>${s.blunders} ?? · ${s.mistakes} ? · ${s.inaccuracies} ?!</small></div>`;
    };
    box.innerHTML = `
      <div class="an-head"><h3>${esc(t('analysis.title'))}</h3>${ev ? `<span class="an-eval">${esc(formatEval(ev))}</span>` : ''}</div>
      ${progress}
      ${evalGraphSvg(a.evals, total, cur)}
      ${a.done ? `<div class="sums">${sum(0)}${sum(1)}</div><p class="dim small">${esc(t('analysis.legend'))}</p>` : `<p class="dim small pulse">${esc(t('analysis.progress'))}</p>`}`;
  }

  private resultTitle(r: GameResult): string {
    if (r.winner === null) return t('result.draw');
    if (this.mySide !== null) return t(r.winner === this.mySide ? 'result.win' : 'result.loss');
    return t(r.winner === 0 ? 'result.whiteWins' : 'result.blackWins');
  }

  private renderResult(): void {
    const r = this.game.result;
    if (!r || this.resultShown || this.puzzle) return;
    this.resultShown = true;
    let reason = t(`reason.${r.reason}` as Key);
    if (r.reason === 'resign' && this.mySide !== null && r.winner !== this.mySide) reason = t('reason.resign.self');
    const mood = r.winner === null ? 'draw' : this.mySide === null || r.winner === this.mySide ? 'win' : 'loss';
    const rematch = !this.online || this.mySide !== null ? `<button class="btn primary" data-act="rematch">${esc(t('game.rematch'))}</button>` : '';
    this.els.result.className = `result-card ${mood}`;
    this.els.result.innerHTML = `
      <button class="notice-close" data-act="closeResult" aria-label="×">×</button>
      <img class="medal" src="./img/m-${mood}.jpg" alt="" width="120" height="120">
      <h2>${esc(this.resultTitle(r))}</h2>
      <p>${esc(reason)}</p>
      <div class="row">${rematch}<button class="btn" data-act="new">${esc(t('game.new'))}</button></div>`;
    this.els.result.hidden = false;
  }
}
