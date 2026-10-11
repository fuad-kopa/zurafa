// The shatranj family on screen: shatranj 8x8, oblong chess 4x16 with a die, complete chess 10x10 and citadel chess
// 10x10, all with the carved set, against the computer or two players on one device.

import { t, Key } from '../i18n';
import { Shatranj, Variant, VariantId, VARIANTS, Move, Side, Result, PASS, DIE, DIE_PIECE, mFrom, mTo, moveText, parseMove, sqText, citadelXY, K, F, A, N, R, P, D } from '../games/shatranj';
import type { ShatranjAsk } from '../games/shatranjWorker';
import * as TP from '../engine/pieces';
import { pieceDefs, pieceHref } from './pieces';
import { getPrefs } from './prefs';
import { playSound } from './sound';
import { recordGarden } from '../profile';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Our carved set already holds every piece of the family; the pawn wears the ferz badge it promotes to. */
const ART: Record<number, number> = { [K]: TP.KING, [F]: TP.GENERAL, [A]: TP.ELEPHANT, [N]: TP.KNIGHT, [R]: TP.ROOK, [P]: TP.PAWN_GENERAL, [D]: TP.WAR_ENGINE };
const PIECE_KEY: Record<number, Key> = { [K]: 'shatranj.p.k', [F]: 'shatranj.p.f', [A]: 'shatranj.p.a', [N]: 'shatranj.p.n', [R]: 'shatranj.p.r', [P]: 'shatranj.p.p' };

const LEVEL_NAMES: Key[] = ['level.recruit', 'level.archer', 'level.rider', 'level.emir'];
const DIE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** The rule cards beside each board. */
const RULES: Record<VariantId, Key[]> = {
  shatranj: ['shatranj.rule.k', 'shatranj.rule.f', 'shatranj.rule.a', 'shatranj.rule.n', 'shatranj.rule.r', 'shatranj.rule.p', 'shatranj.rule.win'],
  oblong: ['oblong.rule.board', 'oblong.rule.die', 'oblong.rule.check', 'oblong.rule.win'],
  tamma: ['tamma.rule.board', 'tamma.rule.dabbaba', 'tamma.rule.pawn', 'tamma.rule.half', 'tamma.rule.win'],
  husun: ['husun.rule.board', 'husun.rule.dabbaba', 'husun.rule.citadel', 'husun.rule.win'],
};
const ARTICLE: Record<VariantId, string> = { shatranj: 'shatranj', oblong: 'oblong', tamma: 'tamma', husun: 'husun' };

interface Saved {
  /** moves, die rolls ("d4") and passes, in order */
  log: string[];
  /** -1 = two players on this device, 0..3 = computer level */
  level: number;
  human: Side;
  dice?: boolean;
}

function el<K2 extends keyof SVGElementTagNameMap>(tag: K2, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K2] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

function load(store: string): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(store) ?? 'null') as (Saved & { moves?: string[] }) | null;
    if (!s) return null;
    if (!Array.isArray(s.log)) s.log = Array.isArray(s.moves) ? s.moves : [];
    return s;
  } catch {
    return null;
  }
}

export function renderShatranj(root: HTMLElement, id: VariantId = 'shatranj'): () => void {
  const base = VARIANTS[id];
  const STORE = id === 'shatranj' ? 'zurafa.shatranj' : `zurafa.sh.${id}`;
  let saved = load(STORE);
  let dice = base.dice ? saved?.dice !== false : false;
  const variant = (): Variant => (base.dice ? { ...base, dice } : base);
  let game = new Shatranj(variant());
  const v = (): Variant => game.v;
  /** the game as tokens: moves, die rolls and passes */
  let log: string[] = [];
  /** moves and passes only, for highlights and the list */
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
  let passTimer = 0;
  /** the finished game has been counted in the profile */
  let counted = false;

  root.innerHTML = `
    <section class="shatranj sh-${id}">
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
            <h3>${esc(t(`${id}.rulesTitle` as Key))}</h3>
            <ul>${RULES[id].map((k) => `<li>${esc(t(k))}</li>`).join('')}</ul>
            <a class="link" href="#/library/${ARTICLE[id]}">${esc(t('shatranj.more'))}</a>
          </div>
          <div class="moves-box"><div class="moves-head"><h3>${esc(t('game.moves'))}</h3></div><div class="moves" data-el="moves"></div></div>
        </aside>
      </div>
    </section>`;
  const $ = (k: string): HTMLElement => root.querySelector(`[data-el="${k}"]`)!;

  // --- geometry: the long board lies on its side where the screen is wide ---------------------
  const W = base.w;
  const H = base.h;
  const horizontal = H > W * 2 && !matchMedia('(max-width: 640px)').matches;
  const pad = base.citadels ? 1 : 0;
  const viewW = horizontal ? H : W;
  const viewH = horizontal ? W : H + 2 * pad;
  const svg = el('svg', { viewBox: `0 ${horizontal ? 0 : -pad} ${viewW} ${viewH}`, class: `board sh-board${horizontal ? ' sh-wide' : ''}`, role: 'application', 'aria-label': t('a11y.board') });
  const defs = el('defs');
  defs.innerHTML = pieceDefs();
  const gSq = el('g');
  const gHl = el('g');
  const gPc = el('g');
  const gMk = el('g');
  svg.append(defs, gSq, gHl, gPc, gMk);
  $('wrap').append(svg);

  const xyOf = (s: number): [number, number] => (s >= game.g.squares ? citadelXY(v(), s - game.g.squares) : [game.g.X(s), game.g.Y(s)]);
  const col = (s: number): number => {
    const [x, y] = xyOf(s);
    if (horizontal) return flipped ? H - 1 - y : y;
    return flipped ? W - 1 - x : x;
  };
  const row = (s: number): number => {
    const [x, y] = xyOf(s);
    if (horizontal) return flipped ? x : W - 1 - x;
    return flipped ? y : H - 1 - y;
  };
  const nodes = new Map<number, SVGGElement>();
  /** keyboard cursor in view cells */
  let cursor: [number, number] = [0, horizontal ? W - 1 : H - 1];

  function drawSquares(): void {
    gSq.replaceChildren();
    svg.classList.toggle('plain-board', getPrefs().board === 'plain');
    for (let s = 0; s < game.g.squares; s++) {
      const dark = (game.g.X(s) + game.g.Y(s)) % 2 === 0;
      gSq.append(el('rect', { x: col(s), y: row(s), width: 1, height: 1, class: dark ? 'sq sq-d' : 'sq sq-l' }));
    }
    for (let i = 0; i < game.g.citadels.length; i++) {
      const s = game.g.citadels[i];
      const g = el('g', { class: 'citadel', transform: `translate(${col(s)} ${row(s)})` });
      g.append(el('rect', { x: 0.06, y: 0.06, width: 0.88, height: 0.88, rx: 0.12, class: 'citadel-bg' }));
      g.append(el('path', { d: 'M0.3 0.66 V0.4 H0.38 V0.47 H0.46 V0.4 H0.54 V0.47 H0.62 V0.4 H0.7 V0.66 Z', class: 'citadel-icon' }));
      gSq.append(g);
    }
    if (getPrefs().coords) {
      for (let x = 0; x < W; x++) {
        const s = game.g.at(x, flipped ? H - 1 : 0);
        const fx = el('text', { x: col(s) + (horizontal ? 0.05 : 0.94), y: row(s) + (horizontal ? 0.24 : 0.95), class: 'coord', 'text-anchor': horizontal ? 'start' : 'end' });
        fx.textContent = 'abcdefghij'[x];
        gSq.append(fx);
      }
      for (let y = 0; y < H; y++) {
        const s = game.g.at(flipped ? W - 1 : 0, y);
        const fy = el('text', { x: col(s) + (horizontal ? 0.94 : 0.05), y: row(s) + (horizontal ? 0.95 : 0.24), class: 'coord', 'text-anchor': horizontal ? 'end' : 'start' });
        fy.textContent = String(y + 1);
        gSq.append(fy);
      }
    }
  }

  function pieceNode(p: number): SVGGElement {
    const g = el('g', { class: 'piece' });
    const type = ART[Math.abs(p)];
    if (getPrefs().pieces === 'carved') {
      const pid = TP.isPawn(type) ? 'pawn' : TP.TYPE_ID[type];
      g.append(el('ellipse', { cx: 0.5, cy: 0.93, rx: 0.3, ry: 0.075, class: 'carved-shadow' }));
      g.append(el('ellipse', { cx: 0.5, cy: 0.9, rx: 0.36, ry: 0.09, class: `carved-base ${p > 0 ? 'side-w' : 'side-b'}` }));
      g.append(el('image', { href: `./carved/${p > 0 ? 'w' : 'b'}-${pid}.png`, x: 0.04, y: 0.04, width: 0.92, height: 0.92, preserveAspectRatio: 'xMidYMax meet' }));
      if (TP.isPawn(type)) {
        const cy = p > 0 ? 0.47 : 0.58;
        g.append(el('use', { href: `#bg-${type}`, x: 0.35, y: cy - 0.15, width: 0.3, height: 0.3, class: `badge ${p > 0 ? 'badge-w' : 'badge-b'}` }));
      }
      g.classList.add('carved');
    } else {
      g.append(el('use', { href: pieceHref(type, p > 0 ? 0 : 1), x: 0.06, y: 0.05, width: 0.88, height: 0.88 }));
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
    const order = [...Array(game.g.n).keys()].filter((s) => game.board[s]).sort((a, b) => row(a) - row(b));
    for (const s of order) {
      const g = pieceNode(game.board[s]);
      place(g, s);
      gPc.append(g);
      nodes.set(s, g);
    }
    if (slide !== null && slide !== PASS && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const g = nodes.get(mTo(slide));
      const f = mFrom(slide);
      g?.animate([{ transform: `translate(${col(f)}px, ${row(f)}px)` }, { transform: g.style.transform }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  function legalFrom(s: number): Move[] {
    return game.legal().filter((m) => m !== PASS && mFrom(m) === s);
  }

  function drawMarks(): void {
    gHl.replaceChildren();
    gMk.replaceChildren();
    const last = moves[moves.length - 1];
    if (last !== undefined && last !== PASS) for (const s of [mFrom(last), mTo(last)]) gHl.append(el('rect', { x: col(s), y: row(s), width: 1, height: 1, class: 'hl hl-last' }));
    if (!v().dice && game.inCheck()) {
      const k = game.kingSq(game.side);
      gHl.append(el('rect', { x: col(k), y: row(k), width: 1, height: 1, class: 'hl hl-check' }));
    }
    if (document.activeElement === svg) gHl.append(el('rect', { x: cursor[0] + 0.04, y: cursor[1] + 0.04, width: 0.92, height: 0.92, class: 'hl hl-cursor' }));
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
  const mustPass = (): boolean => !!v().dice && game.die > 0 && game.legal()[0] === PASS;

  function persist(): void {
    try {
      localStorage.setItem(STORE, JSON.stringify({ log, level, human, dice } satisfies Saved));
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
      const check = !v().dice && game.inCheck();
      if (check) s.classList.add('check');
      const turn = vsComputer() ? t(game.side === human ? 'game.turn.you' : 'game.turn.opp') : t(game.side === 0 ? 'game.turn.white' : 'game.turn.black');
      let text = check ? `${t('game.check')} ${turn}` : turn;
      if (v().dice && game.die) {
        const piece = t(PIECE_KEY[DIE_PIECE[game.die]]);
        text += ` · ${DIE_FACES[game.die]} ${mustPass() ? t('oblong.pass') : t('oblong.die').replace('{0}', String(game.die)).replace('{1}', piece)}`;
      }
      s.textContent = text;
    }
  }

  function movesList(): void {
    const rows: string[] = [];
    const shown = fmtAll();
    for (let i = 0; i < shown.length; i += 2) {
      rows.push(`<li><span class="no">${i / 2 + 1}.</span><span>${shown[i]}</span><span>${shown[i + 1] ?? ''}</span></li>`);
    }
    const box = $('moves');
    box.innerHTML = rows.length ? `<ol>${rows.join('')}</ol>` : `<p class="dim">—</p>`;
    box.scrollTop = box.scrollHeight;
  }
  /** Replays the log to know captures for the list; die rolls are shown as faces before the move. */
  function fmtAll(): string[] {
    const g = new Shatranj(variant());
    const out: string[] = [];
    let die = '';
    for (const tok of log) {
      const m = parseMove(g, tok);
      if (m === null) break;
      if (m === DIE) {
        die = `${DIE_FACES[g.die]} `;
        continue;
      }
      out.push(m === PASS ? `${die}—` : `${die}${sqText(g.v, mFrom(m))}${g.board[mTo(m)] ? '×' : '–'}${sqText(g.v, mTo(m))}`);
      die = '';
      g.make(m);
    }
    return out;
  }

  function resultCard(): void {
    const box = $('result');
    const r = result();
    if (!r) {
      box.hidden = true;
      return;
    }
    const won = vsComputer() ? (r.winner === null ? 'draw' : r.winner === human ? 'win' : 'loss') : r.winner === null ? 'draw' : 'win';
    if (!counted && moves.length) {
      counted = true;
      recordGarden(id, vsComputer() || r.winner === null ? won : null);
    }
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
    const diceRow = base.dice
      ? `<p class="sh-label">${esc(t('oblong.dice'))}</p><div class="seg"><button type="button" data-dice="1" class="${dice ? 'on' : ''}">${esc(t('oblong.dice.on'))}</button><button type="button" data-dice="0" class="${dice ? '' : 'on'}">${esc(t('oblong.dice.off'))}</button></div>`
      : '';
    const side = (['w', 'b', 'r'] as const)
      .map((c) => `<button type="button" data-side="${c}">${esc(t(c === 'w' ? 'setup.white' : c === 'b' ? 'setup.black' : 'setup.random'))}</button>`)
      .join('');
    box.innerHTML = `<h3>${esc(t('setup.title'))}</h3>
      <p class="sh-label">${esc(t('setup.level'))}</p><div class="seg">${opp}</div>${diceRow}
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

  /** Dice chess: throw for the side to move; a throw with nothing to play passes after a beat. */
  function roll(): void {
    if (!v().dice || game.die || result()) return;
    game.die = 1 + Math.floor(Math.random() * 6);
    log.push(`d${game.die}`);
    persist();
    playSound('move');
    if (mustPass()) {
      status();
      clearTimeout(passTimer);
      passTimer = window.setTimeout(() => {
        if (!started || result()) return;
        play(PASS);
      }, 900);
    }
  }

  function play(m: Move): void {
    const capture = m !== PASS && game.board[mTo(m)] !== 0;
    const promo = m !== PASS && Math.abs(game.board[mFrom(m)]) === P && mTo(m) < game.g.squares && (game.g.Y(mTo(m)) === 0 || game.g.Y(mTo(m)) === H - 1);
    game.make(m);
    moves.push(m);
    log.push(moveText(v(), m));
    selected = -1;
    persist();
    const r = game.result();
    if (m !== PASS) playSound(r ? 'end' : !v().dice && game.inCheck() ? 'check' : promo ? 'promote' : capture ? 'capture' : 'move');
    refresh(m);
    if (!r) {
      roll();
      status();
      if (!mustPass()) maybeComputer();
    }
  }

  function maybeComputer(): void {
    if (!started || !vsComputer() || game.side === human || result() || mustPass()) return;
    thinking = true;
    status();
    actions();
    worker ??= new Worker(new URL('../games/shatranjWorker.ts', import.meta.url), { type: 'module' });
    const askNo = ++askId;
    const t0 = Date.now();
    worker.onmessage = (e: MessageEvent<{ id: number; move: string | null }>) => {
      if (e.data.id !== askId) return;
      // a beat of thought even when the answer is instant
      setTimeout(() => {
        if (askNo !== askId) return;
        thinking = false;
        const m = e.data.move ? parseMove(game, e.data.move) : null;
        if (m !== null && m !== DIE) play(m);
        else refresh();
      }, Math.max(0, 350 - (Date.now() - t0)));
    };
    worker.postMessage({ id: askNo, variant: id, dice, moves: log.slice(), level } satisfies ShatranjAsk);
  }

  /** Rebuilds the game from the log; returns false where the log stops making sense. */
  function rebuild(tokens: string[]): boolean {
    game = new Shatranj(variant());
    moves = [];
    log = [];
    for (const tok of tokens) {
      const m = parseMove(game, tok);
      if (m === null) return false;
      log.push(tok);
      if (m === DIE) continue;
      game.make(m);
      moves.push(m);
    }
    return true;
  }

  function start(side: Side): void {
    counted = false;
    clearTimeout(passTimer);
    rebuild([]);
    resigned = null;
    selected = -1;
    human = side;
    flipped = vsComputer() && side === 1;
    started = true;
    askId++;
    thinking = false;
    persist();
    drawSquares();
    roll();
    refresh();
    maybeComputer();
  }

  function clickSquare(s: number): void {
    if (!myTurn() || mustPass()) return;
    const p = game.board[s];
    const mine = p !== 0 && (p > 0) === (game.side === 0);
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
    const c = Math.floor(((e.clientX - r.left) / r.width) * viewW);
    const rw = Math.floor(((e.clientY - r.top) / r.height) * viewH) - (horizontal ? 0 : pad);
    return squareAt(c, rw);
  };
  /** The square under view column `c` and row `rw` (rows counted from the board's top edge), or -1. */
  function squareAt(c: number, rw: number): number {
    if (c < 0 || c >= viewW) return -1;
    let x: number;
    let y: number;
    if (horizontal) {
      if (rw < 0 || rw >= W) return -1;
      y = flipped ? H - 1 - c : c;
      x = flipped ? rw : W - 1 - rw;
    } else {
      x = flipped ? W - 1 - c : c;
      y = flipped ? rw : H - 1 - rw;
    }
    if (y < 0 || y >= H) {
      // a citadel row: only the corner cells mean anything
      if (!base.citadels || (x !== 0 && x !== W - 1)) return -1;
      return game.g.citadels[(y < 0 ? 0 : 2) + (x === 0 ? 0 : 1)];
    }
    return game.g.at(x, y);
  }

  // --- keyboard: the arrows move a cursor over the board, Enter or Space acts as a tap -------------
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('keydown', (e) => {
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (d[e.key]) {
      e.preventDefault();
      const rows = horizontal ? W : H;
      const top = horizontal || !base.citadels ? 0 : -1;
      cursor = [Math.max(0, Math.min(viewW - 1, cursor[0] + d[e.key][0])), Math.max(top, Math.min(rows - 1 + (top < 0 ? 1 : 0), cursor[1] + d[e.key][1]))];
      const s = squareAt(cursor[0], cursor[1]);
      if (s >= 0) svg.setAttribute('aria-label', `${sqText(v(), s)}${game.board[s] ? ` · ${t(PIECE_KEY[Math.abs(game.board[s])] ?? 'a11y.board')}` : ''}`);
      drawMarks();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const s = squareAt(cursor[0], cursor[1]);
      if (s >= 0) clickSquare(s);
    }
  });
  svg.addEventListener('focus', () => drawMarks());
  svg.addEventListener('blur', () => drawMarks());
  svg.addEventListener('pointerdown', (e) => {
    const s = cell(e);
    if (s < 0) return;
    const p = game.board[s];
    if (myTurn() && p && (p > 0) === (game.side === 0)) {
      drag = { s, x: e.clientX, y: e.clientY, moved: false, g: nodes.get(s) ?? null };
      svg.setPointerCapture(e.pointerId);
    }
    clickSquare(s);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || !drag.g) return;
    const r = svg.getBoundingClientRect();
    const dx = ((e.clientX - drag.x) / r.width) * viewW;
    const dy = ((e.clientY - drag.y) / r.height) * viewH;
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
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-level],[data-side],[data-dice],[data-act]');
    if (!b) return;
    if (b.dataset.level !== undefined) {
      level = Number(b.dataset.level);
      setupCard();
      return;
    }
    if (b.dataset.dice !== undefined) {
      dice = b.dataset.dice === '1';
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
        clearTimeout(passTimer);
        // against the computer take back the whole exchange, so it is the player's turn again;
        // a die thrown for that turn stays on the table
        const n = vsComputer() ? (game.side === human ? 2 : 1) : 1;
        let cut = log.length;
        for (let i = 0; i < n; i++) {
          cut--;
          while (cut > 0 && /^d\d$/.test(log[cut])) cut--;
          if (cut < 0) break;
        }
        const kept = log.slice(0, Math.max(0, cut));
        if (cut > 0 && /^d\d$/.test(log[cut])) kept.push(log[cut]);
        rebuild(kept);
        resigned = null;
        selected = -1;
        persist();
        roll();
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
        clearTimeout(passTimer);
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
        clearTimeout(passTimer);
        resigned = null;
        rebuild([]);
        selected = -1;
        refresh();
        break;
    }
  });

  // resume an unfinished game
  if (saved && saved.log.length) {
    if (rebuild(saved.log)) {
      started = true;
      flipped = level >= 0 && human === 1;
      if (game.result()) {
        rebuild([]);
        started = false;
      }
    } else rebuild([]);
  }
  saved = null;
  drawSquares();
  if (started) roll();
  refresh();
  maybeComputer();

  return () => {
    askId++;
    clearTimeout(passTimer);
    worker?.terminate();
  };
}
