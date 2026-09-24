// "Meet the pieces": pick a piece, see its moves on a sandbox board, move it around.

import { sqFromName, SQY, lastRank } from '../engine/geometry';
import * as P from '../engine/pieces';
import { Position, Move, moveTo } from '../engine/position';
import { BoardView, Mark } from './board';
import { pieceSvg, piecePhoto } from './pieces';
import { t, pieceName, nativeName, moveText, likeText } from '../i18n';
import { onPrefsChange } from './prefs';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

const ORDER = [
  P.ROOK, P.KNIGHT, P.GENERAL, P.VIZIER, P.ELEPHANT, P.WAR_ENGINE, P.CAMEL, P.PICKET, P.GIRAFFE,
  P.KING, P.PRINCE, P.ADV_KING, P.PAWN_ROOK, P.PAWN_KING, P.PAWN_PAWN,
];
const START: Record<number, string> = { [P.KING]: 'b8', [P.ADV_KING]: 'k3', [P.PAWN_ROOK]: 'f3', [P.PAWN_KING]: 'f8', [P.PAWN_PAWN]: 'f10' };
const FORBES: Record<number, string> = {
  [P.ROOK]: '16', [P.GIRAFFE]: '14', [P.PICKET]: '12', [P.KNIGHT]: '10', [P.VIZIER]: '8', [P.GENERAL]: '6', [P.CAMEL]: '5', [P.WAR_ENGINE]: '4', [P.ELEPHANT]: '3',
};
// Own pawns and enemy men scattered to show blocking, jumping and captures.
const BLOCKERS: [string, number][] = [
  ['f7', P.PAWN_ROOK], ['g6', -P.PAWN_KNIGHT], ['d5', P.PAWN_CAMEL], ['h5', -P.KNIGHT], ['e4', -P.PAWN_ROOK], ['g4', P.PAWN_VIZIER],
  ['f3', -P.ELEPHANT], ['c8', -P.CAMEL], ['i8', -P.ROOK], ['d3', -P.PAWN_GIRAFFE], ['h7', -P.PAWN_ELEPHANT], ['b5', P.PAWN_ENGINE], ['j5', -P.PAWN_PICKET],
];

export function renderLearn(root: HTMLElement): void {
  let type = P.GIRAFFE;
  let at = sqFromName('f5');
  let blockers = false;
  let slideFrom = -1;
  const targets = new Set<number>();
  /** Blockers taken by a demonstrated capture, until the blockers are toggled. */
  const taken = new Set<number>();
  const pos = new Position();

  root.innerHTML = `
    <section class="learn">
      <h1>${esc(t('learn.title'))}</h1>
      <p class="lead">${esc(t('learn.intro'))}</p>
      <div class="learn-grid">
        <div class="piece-list" data-el="list"></div>
        <div class="learn-board">
          <div class="board-wrap" data-el="board"></div>
          <div class="row"><button class="btn" data-el="toggle"></button></div>
        </div>
        <div class="info-card" data-el="card"></div>
      </div>
      <div class="class-box"><h3>${esc(t('class.title'))}</h3><p>${esc(t('class.text'))}</p></div>
    </section>`;
  const q = (n: string): HTMLElement => root.querySelector<HTMLElement>(`[data-el="${n}"]`)!;
  const board = new BoardView(q('board'));

  const draw = (): void => {
    pos.clear();
    pos.put(sqFromName('k10'), -P.KING);
    if (type !== P.KING) pos.put(sqFromName('a1'), P.KING);
    if (blockers) for (const [name, piece] of BLOCKERS) if (sqFromName(name) !== at && !taken.has(sqFromName(name))) pos.put(sqFromName(name), piece);
    if (type === P.PAWN_PAWN && SQY[at] === lastRank(0)) {
      // Give the waiting pawn of pawns something to fork.
      pos.put(sqFromName('d7'), -P.KNIGHT);
      pos.put(sqFromName('f7'), -P.ROOK);
    }
    pos.put(at, type);
    const marks: Mark[] = [];
    const list: Move[] = [];
    targets.clear();
    if (type === P.PAWN_PAWN && SQY[at] === lastRank(0)) {
      pos.genPseudo(list);
      for (const m of list) if (m >> 14 === 2) { marks.push({ sq: moveTo(m), kind: 'reloc' }); targets.add(moveTo(m)); }
    } else {
      pos.genPiece(at, list, false);
      for (const m of list) { marks.push({ sq: moveTo(m), kind: pos.board[moveTo(m)] ? 'capture' : 'move' }); targets.add(moveTo(m)); }
    }
    board.sync(pos.board, slideFrom >= 0 ? [[slideFrom, at]] : []);
    slideFrom = -1;
    board.setSelected(at);
    board.setMarks(marks);

    q('list').innerHTML = ORDER.map((p) => `<button class="piece-pick ${p === type ? 'on' : ''}" data-type="${p}" title="${esc(pieceName(p))}">${pieceSvg(p, 0, 44)}<small>${esc(pieceName(p))}</small></button>`).join('');
    const like = likeText(type);
    const waiting = type === P.PAWN_PAWN && SQY[at] === lastRank(0);
    q('card').innerHTML = `
      <img class="photo" src="${piecePhoto(type)}" alt="" width="640" height="640">
      <div class="info-head">${pieceSvg(type, 0, 52)}<div><h3>${esc(pieceName(type))}</h3><span class="native">${esc(nativeName(type))}</span></div></div>
      ${like ? `<p class="like">≈ ${esc(like)}</p>` : ''}
      <p>${esc(moveText(type, waiting))}</p>
      ${FORBES[type] ? `<p class="dim">${esc(t('learn.value'))}: ${FORBES[type]} <span class="dim">(${esc(pieceName(P.KNIGHT).toLowerCase())} = 10)</span></p>` : ''}`;
    q('toggle').textContent = t(blockers ? 'learn.clear' : 'learn.blockers');
  };

  // A tap on a marked square makes that move (a capture removes the blocker); dragging repositions the piece.
  board.onSquareClick = (sq) => {
    if (!targets.has(sq)) return;
    if (pos.board[sq] !== 0) taken.add(sq);
    slideFrom = at;
    at = sq;
    draw();
  };
  board.canDrag = (sq) => sq === at;
  board.onDrop = (from, to) => {
    if (from !== at || to === at) return false;
    if (to >= 110 && !(type === P.KING || type === P.ADV_KING)) return false;
    at = to;
    draw();
    return true;
  };
  q('list').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-type]');
    if (!b) return;
    type = Number(b.dataset.type);
    at = sqFromName(START[type] ?? 'f5');
    draw();
  });
  q('toggle').addEventListener('click', () => {
    blockers = !blockers;
    taken.clear();
    draw();
  });
  const off = onPrefsChange(() => board.refreshTheme());
  new MutationObserver(() => {
    if (!root.isConnected || !root.contains(board.svg)) off();
  }).observe(document.body, { childList: true, subtree: true });
  draw();
}
