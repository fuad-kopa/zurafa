// Shatranj screen: an 8x8 board with the carved set, against the computer or two players on one device.

import { t, Key } from '../i18n';
import { Shatranj, Move, Side, Result, mFrom, mTo, moveName, parseMove, sqName, K, F, A, N, R, P } from '../games/shatranj';
import type { ShatranjAsk } from '../games/shatranjWorker';
import * as TP from '../engine/pieces';
import { pieceDefs, pieceHref } from './pieces';
import { getPrefs } from './prefs';
import { playSound } from './sound';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const STORE = 'zurafa.shatranj';

/** Our carved set already holds every shatranj piece; the pawn wears the ferz badge it promotes to. */
const ART: Record<number, number> = { [K]: TP.KING, [F]: TP.GENERAL, [A]: TP.ELEPHANT, [N]: TP.KNIGHT, [R]: TP.ROOK, [P]: TP.PAWN_GENERAL };

const LEVEL_NAMES: Key[] = ['level.recruit', 'level.archer', 'level.rider', 'level.emir'];

interface Saved {
  moves: string[];
  /** -1 = two players on this device, 0..3 = computer level */
  level: number;
  human: Side;
}

function el<K2 extends keyof SVGElementTagNameMap>(tag: K2, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K2] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

function load(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Saved | null;
    return s && Array.isArray(s.moves) ? s : null;
  } catch {
    return null;
  }
}

export function renderShatranj(root: HTMLElement): () => void {
  let saved = load();
  let game = new Shatranj();
  let moves: Move[] = [];
  let level = saved?.level ?? 1;
  let human: Side = saved?.human ?? 0;
  let started = false;
  let selected = -1;
  let flipped = false;
  let thinking = false;
  let resigned: Side | null = null;
  let worker: Worker | null = null;
  let askId = 0;

  root.innerHTML = `
    <section class="shatranj">
      <a class="link lib-back" href="#/games">← ${esc(t('games.title'))}</a>
      <div class="game">
        <div class="board-col">
          <div class="status" data-el="status" aria-live="polite"></div>
          <div class="board-wrap" data-el="wrap"></div>
          <div class="actions" data-el="actions"></div>
        </div>
        <aside class="side">
          <div class="result-card" data-el="result" hidden></div>
          <div class="info-card" data-el="setup"></div>
          <div class="info-card sh-rules">
            <h3>${esc(t('shatranj.rulesTitle'))}</h3>
            <ul>${(['k', 'f', 'a', 'n', 'r', 'p', 'win'] as const).map((k) => `<li>${esc(t(`shatranj.rule.${k}` as Key))}</li>`).join('')}</ul>
            <a class="link" href="#/library/shatranj">${esc(t('shatranj.more'))}</a>
          </div>
          <div class="moves-box"><div class="moves-head"><h3>${esc(t('game.moves'))}</h3></div><div class="moves" data-el="moves"></div></div>
        </aside>
      </div>
    </section>`;
  const $ = (k: string): HTMLElement => root.querySelector(`[data-el="${k}"]`)!;

  const svg = el('svg', { viewBox: '0 0 8 8', class: 'board sh-board', role: 'application', 'aria-label': t('a11y.board') });
  const defs = el('defs');
  defs.innerHTML = pieceDefs();
  const gSq = el('g');
  const gHl = el('g');
  const gPc = el('g');
  const gMk = el('g');
  svg.append(defs, gSq, gHl, gPc, gMk);
  $('wrap').append(svg);

  const col = (s: number): number => (flipped ? 7 - (s & 7) : s & 7);
  const row = (s: number): number => (flipped ? s >> 3 : 7 - (s >> 3));
  const nodes = new Map<number, SVGGElement>();

  function drawSquares(): void {
    gSq.replaceChildren();
    svg.classList.toggle('plain-board', getPrefs().board === 'plain');
    for (let s = 0; s < 64; s++) {
      const dark = ((s & 7) + (s >> 3)) % 2 === 0;
      gSq.append(el('rect', { x: col(s), y: row(s), width: 1, height: 1, class: dark ? 'sq sq-d' : 'sq sq-l' }));
    }
    if (getPrefs().coords) {
      for (let i = 0; i < 8; i++) {
        const fx = el('text', { x: i + 0.94, y: 7.95, class: 'coord', 'text-anchor': 'end' });
        fx.textContent = 'abcdefgh'[flipped ? 7 - i : i];
        const fy = el('text', { x: 0.05, y: i + 0.24, class: 'coord' });
        fy.textContent = String(flipped ? i + 1 : 8 - i);
        gSq.append(fx, fy);
      }
    }
  }

  function pieceNode(v: number): SVGGElement {
    const g = el('g', { class: 'piece' });
    const type = ART[Math.abs(v)];
    if (getPrefs().pieces === 'carved') {
      const id = TP.isPawn(type) ? 'pawn' : TP.TYPE_ID[type];
      g.append(el('ellipse', { cx: 0.5, cy: 0.93, rx: 0.3, ry: 0.075, class: 'carved-shadow' }));
      g.append(el('ellipse', { cx: 0.5, cy: 0.9, rx: 0.36, ry: 0.09, class: `carved-base ${v > 0 ? 'side-w' : 'side-b'}` }));
      g.append(el('image', { href: `./carved/${v > 0 ? 'w' : 'b'}-${id}.png`, x: 0.04, y: 0.04, width: 0.92, height: 0.92, preserveAspectRatio: 'xMidYMax meet' }));
      if (TP.isPawn(type)) {
        const cy = v > 0 ? 0.47 : 0.58;
        g.append(el('use', { href: `#bg-${type}`, x: 0.35, y: cy - 0.15, width: 0.3, height: 0.3, class: `badge ${v > 0 ? 'badge-w' : 'badge-b'}` }));
      }
      g.classList.add('carved');
    } else {
      g.append(el('use', { href: pieceHref(type, v > 0 ? 0 : 1), x: 0.06, y: 0.05, width: 0.88, height: 0.88 }));
    }
    return g;
  }

  const place = (g: SVGGElement, s: number): void => {
    g.style.transform = `translate(${col(s)}px, ${row(s)}px)`;
  };

  /** Redraw pieces; the last move slides in from its square. */
  function drawPieces(slide: Move | null = null): void {
    gPc.replaceChildren();
    nodes.clear();
    const order = [...Array(64).keys()].filter((s) => game.board[s]).sort((a, b) => row(a) - row(b));
    for (const s of order) {
      const g = pieceNode(game.board[s]);
      place(g, s);
      gPc.append(g);
      nodes.set(s, g);
    }
    if (slide !== null && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const g = nodes.get(mTo(slide));
      const f = mFrom(slide);
      g?.animate([{ transform: `translate(${col(f)}px, ${row(f)}px)` }, { transform: g.style.transform }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  function legalFrom(s: number): Move[] {
    return game.legal().filter((m) => mFrom(m) === s);
  }

  function drawMarks(): void {
    gHl.replaceChildren();
    gMk.replaceChildren();
    const last = moves[moves.length - 1];
    if (last !== undefined) for (const s of [mFrom(last), mTo(last)]) gHl.append(el('rect', { x: col(s), y: row(s), width: 1, height: 1, class: 'hl hl-last' }));
    if (game.inCheck()) {
      const k = game.kingSq(game.side);
      gHl.append(el('rect', { x: col(k), y: row(k), width: 1, height: 1, class: 'hl hl-check' }));
    }
    if (selected >= 0) {
      gHl.append(el('rect', { x: col(selected), y: row(selected), width: 1, height: 1, class: 'hl hl-selected' }));
      if (getPrefs().hints) {
        for (const m of legalFrom(selected)) {
          const s = mTo(m);
          gMk.append(game.board[s]
            ? el('circle', { cx: col(s) + 0.5, cy: row(s) + 0.5, r: 0.44, class: 'mark mark-capture' })
            : el('circle', { cx: col(s) + 0.5, cy: row(s) + 0.5, r: 0.15, class: 'mark mark-move' }));
        }
      }
    }
  }

  const result = (): Result | null => (resigned !== null ? { winner: (1 - resigned) as Side, reason: 'resign' as Result['reason'] } : started ? game.result() : null);
  const vsComputer = (): boolean => level >= 0;
  const myTurn = (): boolean => started && !thinking && !result() && (!vsComputer() || game.side === human);

  function persist(): void {
    try {
      localStorage.setItem(STORE, JSON.stringify({ moves: moves.map(moveName), level, human } satisfies Saved));
    } catch {
      /* private mode */
    }
  }

  function status(): void {
    const s = $('status');
    const r = result();
    s.className = 'status';
    if (!started) {
      s.textContent = t('shatranj.pick');
    } else if (r) {
      s.classList.add('over');
      s.textContent = r.winner === null ? t('result.draw') : t(r.winner === 0 ? 'result.whiteWins' : 'result.blackWins');
    } else if (thinking) {
      s.textContent = t('game.turn.thinking');
    } else {
      const check = game.inCheck();
      if (check) s.classList.add('check');
      const turn = vsComputer() ? t(game.side === human ? 'game.turn.you' : 'game.turn.opp') : t(game.side === 0 ? 'game.turn.white' : 'game.turn.black');
      s.textContent = check ? `${t('game.check')} ${turn}` : turn;
    }
  }

  function movesList(): void {
    const rows: string[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      rows.push(`<li><span class="no">${i / 2 + 1}.</span><span>${fmt(i)}</span><span>${moves[i + 1] !== undefined ? fmt(i + 1) : ''}</span></li>`);
    }
    const box = $('moves');
    box.innerHTML = rows.length ? `<ol>${rows.join('')}</ol>` : `<p class="dim">—</p>`;
    box.scrollTop = box.scrollHeight;
  }
  // replay to know captures for the list
  function fmt(i: number): string {
    const g = new Shatranj();
    for (let j = 0; j < i; j++) g.make(moves[j]);
    const m = moves[i];
    return `${sqName(mFrom(m))}${g.board[mTo(m)] ? '×' : '–'}${sqName(mTo(m))}`;
  }

  function resultCard(): void {
    const box = $('result');
    const r = result();
    if (!r) {
      box.hidden = true;
      return;
    }
    const won = vsComputer() ? (r.winner === null ? 'draw' : r.winner === human ? 'win' : 'loss') : r.winner === null ? 'draw' : 'win';
    const title = vsComputer()
      ? t(won === 'win' ? 'result.win' : won === 'loss' ? 'result.loss' : 'result.draw')
      : r.winner === null ? t('result.draw') : t(r.winner === 0 ? 'result.whiteWins' : 'result.blackWins');
    box.className = `result-card ${won}`;
    box.innerHTML = `<h2>${esc(title)}</h2><p>${esc(t(`shatranj.end.${r.reason}` as Key))}</p>
      <div class="row"><button class="btn primary" data-act="again">${esc(t('game.rematch'))}</button><button class="btn" data-act="setup">${esc(t('game.new'))}</button></div>`;
    box.hidden = false;
  }

  function setupCard(): void {
    const box = $('setup');
    if (started) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const opp = [-1, 0, 1, 2, 3]
      .map((l) => `<button type="button" data-level="${l}" class="${l === level ? 'on' : ''}">${esc(l < 0 ? t('shatranj.friend') : t(LEVEL_NAMES[l]))}</button>`)
      .join('');
    const side = (['w', 'b', 'r'] as const)
      .map((c) => `<button type="button" data-side="${c}">${esc(t(c === 'w' ? 'setup.white' : c === 'b' ? 'setup.black' : 'setup.random'))}</button>`)
      .join('');
    box.innerHTML = `<h3>${esc(t('setup.title'))}</h3>
      <p class="sh-label">${esc(t('setup.level'))}</p><div class="seg">${opp}</div>
      <p class="sh-label">${esc(level < 0 ? t('shatranj.startHint') : t('setup.color'))}</p>
      <div class="seg sh-sides">${level < 0 ? `<button type="button" data-side="w" class="on">${esc(t('setup.start'))}</button>` : side}</div>`;
  }

  function actions(): void {
    const a = $('actions');
    if (!started) {
      a.innerHTML = '';
      return;
    }
    const over = !!result();
    a.innerHTML = `
      <button class="btn" data-act="undo"${moves.length && !thinking ? '' : ' disabled'}>${esc(t('game.undo'))}</button>
      <button class="btn" data-act="flip">${esc(t('game.flip'))}</button>
      ${over ? `<button class="btn" data-act="setup">${esc(t('game.new'))}</button>` : `<button class="btn danger" data-act="resign">${esc(t('game.resign'))}</button>`}`;
  }

  function refresh(slide: Move | null = null): void {
    drawPieces(slide);
    drawMarks();
    status();
    movesList();
    setupCard();
    resultCard();
    actions();
  }

  function play(m: Move): void {
    const capture = game.board[mTo(m)] !== 0;
    const promo = Math.abs(game.board[mFrom(m)]) === P && ((mTo(m) >> 3) === 0 || (mTo(m) >> 3) === 7);
    game.make(m);
    moves.push(m);
    selected = -1;
    persist();
    const r = game.result();
    playSound(r ? 'end' : game.inCheck() ? 'check' : promo ? 'promote' : capture ? 'capture' : 'move');
    refresh(m);
    if (!r) maybeComputer();
  }

  function maybeComputer(): void {
    if (!started || !vsComputer() || game.side === human || result()) return;
    thinking = true;
    status();
    actions();
    worker ??= new Worker(new URL('../games/shatranjWorker.ts', import.meta.url), { type: 'module' });
    const id = ++askId;
    const t0 = Date.now();
    worker.onmessage = (e: MessageEvent<{ id: number; move: string | null }>) => {
      if (e.data.id !== askId) return;
      // a beat of thought even when the answer is instant
      setTimeout(() => {
        if (id !== askId) return;
        thinking = false;
        const m = e.data.move ? parseMove(game, e.data.move) : null;
        if (m !== null) play(m);
        else refresh();
      }, Math.max(0, 350 - (Date.now() - t0)));
    };
    worker.postMessage({ id, moves: moves.map(moveName), level } satisfies ShatranjAsk);
  }

  function start(side: Side): void {
    game = new Shatranj();
    moves = [];
    resigned = null;
    selected = -1;
    human = side;
    flipped = vsComputer() && side === 1;
    started = true;
    askId++;
    thinking = false;
    persist();
    drawSquares();
    refresh();
    maybeComputer();
  }

  function clickSquare(s: number): void {
    if (!myTurn()) return;
    const v = game.board[s];
    const mine = v !== 0 && (v > 0) === (game.side === 0);
    if (selected >= 0) {
      const m = legalFrom(selected).find((x) => mTo(x) === s);
      if (m !== undefined) return play(m);
    }
    selected = mine && selected !== s ? s : -1;
    if (mine && !legalFrom(s).length) playSound('illegal');
    drawMarks();
  }

  // --- pointer: tap to select and tap to move, or drag ----------------------------------------
  let drag: { s: number; x: number; y: number; moved: boolean; g: SVGGElement | null } | null = null;
  const cell = (e: PointerEvent): number => {
    const r = svg.getBoundingClientRect();
    const c = Math.floor(((e.clientX - r.left) / r.width) * 8);
    const rw = Math.floor(((e.clientY - r.top) / r.height) * 8);
    if (c < 0 || c > 7 || rw < 0 || rw > 7) return -1;
    return flipped ? rw * 8 + (7 - c) : (7 - rw) * 8 + c;
  };
  svg.addEventListener('pointerdown', (e) => {
    const s = cell(e);
    if (s < 0) return;
    const v = game.board[s];
    if (myTurn() && v && (v > 0) === (game.side === 0)) {
      drag = { s, x: e.clientX, y: e.clientY, moved: false, g: nodes.get(s) ?? null };
      svg.setPointerCapture(e.pointerId);
    }
    clickSquare(s);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || !drag.g) return;
    const r = svg.getBoundingClientRect();
    const dx = ((e.clientX - drag.x) / r.width) * 8;
    const dy = ((e.clientY - drag.y) / r.height) * 8;
    if (!drag.moved && Math.hypot(dx, dy) < 0.2) return;
    drag.moved = true;
    drag.g.classList.add('dragging');
    drag.g.style.transform = `translate(${col(drag.s) + dx}px, ${row(drag.s) + dy}px)`;
    gPc.append(drag.g);
  });
  svg.addEventListener('pointerup', (e) => {
    const d = drag;
    drag = null;
    if (!d || !d.moved) return;
    const s = cell(e);
    const m = legalFrom(d.s).find((x) => mTo(x) === s);
    if (m !== undefined) play(m);
    else {
      d.g?.classList.remove('dragging');
      if (d.g) place(d.g, d.s);
    }
  });

  root.querySelector('.shatranj')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-level],[data-side],[data-act]');
    if (!b) return;
    if (b.dataset.level !== undefined) {
      level = Number(b.dataset.level);
      setupCard();
      return;
    }
    if (b.dataset.side) {
      const c = b.dataset.side;
      start(c === 'w' ? 0 : c === 'b' ? 1 : (Math.random() < 0.5 ? 0 : 1));
      return;
    }
    switch (b.dataset.act) {
      case 'undo': {
        askId++;
        thinking = false;
        // against the computer take back the whole exchange, so it is the player's turn again
        const n = vsComputer() ? (game.side === human ? 2 : 1) : 1;
        for (let i = 0; i < n && moves.length; i++) {
          game.unmake(true);
          moves.pop();
        }
        resigned = null;
        selected = -1;
        persist();
        refresh();
        maybeComputer();
        break;
      }
      case 'flip':
        flipped = !flipped;
        drawSquares();
        refresh();
        break;
      case 'resign':
        if (!b.classList.contains('armed')) {
          b.classList.add('armed');
          b.textContent = t('game.resign.confirm');
          return;
        }
        resigned = vsComputer() ? human : game.side;
        askId++;
        thinking = false;
        playSound('end');
        refresh();
        break;
      case 'again':
        start(vsComputer() ? ((1 - human) as Side) : 0);
        break;
      case 'setup':
        started = false;
        askId++;
        thinking = false;
        resigned = null;
        game = new Shatranj();
        moves = [];
        selected = -1;
        refresh();
        break;
    }
  });

  // resume an unfinished game
  if (saved && saved.moves.length) {
    for (const s of saved.moves) {
      const m = parseMove(game, s);
      if (m === null) break;
      game.make(m);
      moves.push(m);
    }
    started = true;
    flipped = level >= 0 && human === 1;
    if (game.result()) {
      game = new Shatranj();
      moves = [];
      started = false;
    }
  }
  saved = null;
  drawSquares();
  refresh();
  maybeComputer();

  return () => {
    askId++;
    worker?.terminate();
  };
}
