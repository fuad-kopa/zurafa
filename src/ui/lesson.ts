// One lesson: a sandbox board with the player's piece, stars and black men, or a mate-in-one position.

import { ALL, UNITS, unitTitle, nextLesson } from './course';
import { Lesson, isSolo, soloStart, soloMoves, soloStep, soloSolved, solveSolo, starsFor, SoloState, StepResult } from '../course/core';
import { starsOf, recordStars } from '../course/progress';
import { BoardView, Mark } from './board';
import { NSQ, enemyCitadel } from '../engine/geometry';
import * as P from '../engine/pieces';
import { Game } from '../engine/game';
import { DEFAULT_RULES, Move, moveFrom, moveTo } from '../engine/position';
import { matingMoves } from '../puzzles';
import { pieceSvg, piecePortrait } from './pieces';
import { playSound } from './sound';
import { getPrefs, onPrefsChange } from './prefs';
import { t, pieceName, moveText, Key } from '../i18n';
import { trackEvent } from '../analytics';
import { syncPuzzle } from '../cloud';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function taskText(l: Lesson, piece: number): string {
  switch (l.kind) {
    case 'stars': return t(l.terrain?.some((x) => x >> 7 === 1) ? 'task.water' : 'task.stars', pieceName(piece));
    case 'capture': return t('task.capture', pieceName(piece));
    case 'safe': return t('task.safe', pieceName(piece));
    case 'reach': return t('task.hills', pieceName(piece));
    case 'promote': return t('task.promote', pieceName(P.pawnMaster(piece)));
    case 'citadel': return t('task.citadel');
    case 'mate': return t('task.mate');
    case 'stalemate': return t('task.stalemate');
  }
}

export function renderLesson(root: HTMLElement, id: string, go: (route: string) => void): () => void {
  const l = ALL.find((x) => x.id === id) ?? nextLesson();
  const unit = UNITS.find((u) => u.id === l.unit)!;
  const index = unit.lessons.indexOf(l);
  const next = ALL[ALL.indexOf(l) + 1] ?? null;
  const solo = isSolo(l);
  const intro = solo && index === 0 && unit.id !== 'pawns' && unit.id !== 'terrain' && unit.id !== 'citadel';
  const still = document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mainPiece = solo ? soloStart(l).piece : P.KING;

  root.innerHTML = `
    <section class="lesson">
      <div class="lesson-head">
        <a class="link" href="#/course">← ${esc(t('lesson.back'))}</a>
        <span class="dim">${esc(unitTitle(unit))} · ${esc(t('lesson.of', String(index + 1), String(unit.lessons.length)))}</span>
      </div>
      <div class="lesson-grid">
        <div class="lesson-board"><div class="board-wrap" data-el="board"></div></div>
        <aside class="lesson-side">
          <div class="task card-soft">
            <span class="task-icon">${pieceSvg(mainPiece, 0, 44)}</span>
            <p data-el="task">${esc(taskText(l, mainPiece))}</p>
          </div>
          <p class="lesson-meta" data-el="meta"></p>
          <p class="lesson-note" data-el="note" aria-live="polite"></p>
          <div class="row lesson-actions">
            <button class="btn" data-act="retry">${esc(t('lesson.retry'))}</button>
            <button class="btn" data-act="hint">${esc(t('lesson.hint'))}</button>
          </div>
          <div class="lesson-done card-soft" data-el="done" hidden></div>
          ${intro ? `<div class="lesson-intro card-soft">
            ${piecePortrait(mainPiece, 0, still)}
            <h3>${esc(pieceName(mainPiece))}</h3><p>${esc(moveText(mainPiece, false))}</p>
          </div>` : ''}
        </aside>
      </div>
    </section>`;
  const q = (n: string): HTMLElement => root.querySelector<HTMLElement>(`[data-el="${n}"]`)!;
  const board = new BoardView(q('board'));
  const terrain = new Uint8Array(NSQ);
  for (const x of l.terrain ?? []) terrain[x & 127] = x >> 7 || 1;
  board.setTerrain(l.terrain?.length ? terrain : null);

  let moves = 0;
  let hinted = false;
  let finished = false;
  let busy = false;
  let timer = 0;

  const note = (key: Key | '', ...args: string[]): void => {
    q('note').textContent = key ? t(key, ...args) : '';
  };
  const meta = (): void => {
    q('meta').textContent = solo ? t('lesson.moves', String(moves), String(l.best)) : '';
  };

  const finish = (): void => {
    finished = true;
    const s = starsFor(l, moves, hinted);
    recordStars(l.id, s);
    void syncPuzzle(`course:${l.id}`);
    trackEvent(`lesson/${l.id}/${s}`);
    playSound('promote');
    const unitDone = unit.lessons.every((x) => starsOf(x.id) > 0);
    const done = q('done');
    done.hidden = false;
    done.innerHTML = `
      <div class="stars-big">${[1, 2, 3].map((i) => `<i class="${i <= s ? 'on' : ''}">★</i>`).join('')}</div>
      <p><b>${esc(t(unitDone && index === unit.lessons.length - 1 ? 'lesson.unitDone' : 'lesson.done'))}</b></p>
      ${solo && s < 3 ? `<p class="dim">${esc(t('lesson.better', String(l.best)))}</p>` : ''}
      <div class="row">${next ? `<a class="btn primary" href="#/lesson/${next.id}">${esc(t('lesson.next'))}</a>` : `<a class="btn primary" href="#/course">${esc(t('lesson.back'))}</a>`}
      <button class="btn" data-act="retry">${esc(t('lesson.retry'))}</button></div>`;
    done.querySelector<HTMLElement>('.btn.primary')?.focus();
  };

  // --- one-piece lessons -------------------------------------------------------------------------
  let st: SoloState = soloStart(l);
  const soloBoard = (): Int8Array => {
    const b = new Int8Array(NSQ);
    for (const [sq, p] of st.targets) b[sq] = p;
    b[st.sq] = st.piece;
    return b;
  };
  const soloDraw = (slide: [number, number] | null = null): void => {
    board.sync(soloBoard(), slide ? [slide] : []);
    const marks: Mark[] = st.stars.map((sq) => ({ sq, kind: 'star' as const }));
    if (l.kind === 'citadel' && !finished) marks.push({ sq: enemyCitadel(0), kind: 'star' }); // the goal: the enemy citadel, not our own
    if (!finished && getPrefs().hints) for (const to of soloMoves(l, st)) if (!marks.some((m) => m.sq === to)) marks.push({ sq: to, kind: st.targets.some(([s]) => s === to) ? 'capture' : 'move' });
    board.setMarks(marks);
    board.setSelected(finished ? -1 : st.sq);
    meta();
  };
  const soloMove = (to: number): boolean => {
    if (finished || busy || !soloMoves(l, st).includes(to)) return false;
    const from = st.sq;
    const r: StepResult = soloStep(l, st, to);
    moves++;
    board.setHint(-1, -1);
    st = r.state;
    soloDraw([from, to]);
    if (r.captured) { playSound('capture'); board.fx('capture', to); } else playSound('move');
    if (r.collected) board.fx('citadel', to);
    if (r.promoted) { playSound('promote'); note('lesson.promoted', pieceName(st.piece)); }
    if (r.attacked) {
      busy = true;
      note('lesson.eaten');
      playSound('illegal');
      board.fx('check', to);
      timer = window.setTimeout(reset, 1200);
      return true;
    }
    if (soloSolved(l, st, r)) finish();
    else if (l.kind === 'promote' && r.promoted) { busy = true; note('lesson.promoteFirst'); timer = window.setTimeout(reset, 1400); }
    return true;
  };

  // --- mate / stalemate lessons --------------------------------------------------------------------
  let game = solo ? null : Game.fromSpec(DEFAULT_RULES, { men: l.men, side: 0, swapUsed: [1, 1] });
  let selected = -1;
  const gameDraw = (slide: [number, number] | null = null): void => {
    if (!game) return;
    board.sync(game.pos.board, slide ? [slide] : []);
    const marks: Mark[] = [];
    if (selected >= 0 && getPrefs().hints) for (const m of game.legalMovesFrom(selected)) marks.push({ sq: moveTo(m), kind: game.pos.board[moveTo(m)] ? 'capture' : 'move' });
    board.setMarks(marks);
    board.setSelected(selected);
  };
  const gamePlay = (m: Move): void => {
    if (!game) return;
    const from = moveFrom(m);
    const to = moveTo(m);
    const rec = game.play(m);
    moves++;
    selected = -1;
    board.setHint(-1, -1);
    gameDraw([from, to]);
    if (rec.captured) board.fx('capture', to);
    playSound(rec.check ? 'check' : rec.captured ? 'capture' : 'move');
    const want = l.kind === 'mate' ? 'checkmate' : 'stalemate';
    if (game.result?.winner === 0 && game.result.reason === want) {
      if (want === 'checkmate') board.fx('check', game.pos.topRoyalSq(1));
      finish();
    } else {
      busy = true;
      note(l.kind === 'mate' ? 'lesson.notMate' : 'lesson.notStalemate');
      playSound('illegal');
      timer = window.setTimeout(reset, 1100);
    }
  };

  function reset(): void {
    clearTimeout(timer);
    busy = false;
    finished = false;
    moves = 0;
    q('done').hidden = true;
    note('');
    board.setHint(-1, -1);
    if (solo) {
      st = soloStart(l);
      soloDraw();
    } else {
      game = Game.fromSpec(DEFAULT_RULES, { men: l.men, side: 0, swapUsed: [1, 1] });
      selected = -1;
      gameDraw();
    }
    meta();
  }

  board.onSquareClick = (sq) => {
    if (finished || busy) return;
    if (solo) {
      soloMove(sq);
      return;
    }
    if (!game) return;
    if (selected >= 0) {
      const m = game.legalMovesFrom(selected).find((x) => moveTo(x) === sq);
      if (m !== undefined) return gamePlay(m);
    }
    selected = game.pos.board[sq] > 0 ? sq : -1;
    gameDraw();
  };
  board.canDrag = (sq) => !finished && !busy && (solo ? sq === st.sq : !!game && game.pos.board[sq] > 0);
  board.onDrop = (from, to) => {
    if (solo) return from === st.sq && soloMove(to);
    if (!game) return false;
    const m = game.legalMovesFrom(from).find((x) => moveTo(x) === to);
    if (m === undefined) return false;
    gamePlay(m);
    return true;
  };

  root.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'retry') reset();
    if (act === 'hint' && !finished && !busy) {
      hinted = true;
      if (solo) {
        const path = solveSolo(l, st, 24);
        if (path?.length) board.setHint(st.sq, path[0]);
      } else if (game) {
        const want = l.kind === 'mate' ? 'checkmate' : 'stalemate';
        const m = matingMoves(game).find((x) => { game!.play(x); const ok = game!.result?.reason === want; game!.undo(); return ok; });
        if (m !== undefined) board.setHint(moveFrom(m), moveTo(m));
      }
    }
  });
  const offPrefs = onPrefsChange(() => { board.refreshTheme(); if (solo) soloDraw(); else gameDraw(); });
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && finished && next) go(`#/lesson/${next.id}`);
  };
  document.addEventListener('keydown', onKey);
  if (solo) soloDraw(); else gameDraw();
  return () => {
    clearTimeout(timer);
    offPrefs();
    document.removeEventListener('keydown', onKey);
  };
}
