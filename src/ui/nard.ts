// Nard screen: the board, the dice, tap a checker then its destination; against the computer or two on one device.

import { t, Key } from '../i18n';
import { Nard, Step, Side, roll, choose, NARD_LEVELS } from '../games/nard';
import { playSound } from './sound';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const STORE = 'zurafa.nard';
const LEVEL_NAMES: Key[] = ['level.recruit', 'level.rider', 'level.emir'];

// Board geometry (viewBox 15 x 12): two fields of six points with the bar between them and a tray on the right.
const W = 15;
const H = 12;
const FIELD_L = 0.35;
const BAR = 6.35;
const FIELD_R = 7.35;
const TRAY = 13.55;
const TOP = 0.35;
const BOTTOM = 11.65;
const R = 0.45;

interface Saved {
  pts: number[];
  bar: [number, number];
  off: [number, number];
  side: Side;
  dice: number[] | null;
  level: number;
  human: Side;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

export function renderNard(root: HTMLElement): () => void {
  let game = new Nard();
  let level = 1;
  let human: Side = 0;
  let started = false;
  let dice: number[] = [];
  let left: number[] = [];
  let turnStart: Nard | null = null;
  let selected: number | null = null;
  let resigned: Side | null = null;
  let note = '';
  let timers: number[] = [];
  let busy = false;

  root.innerHTML = `
    <section class="nard">
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
          <div class="info-card nd-score" data-el="score"></div>
          <div class="info-card sh-rules">
            <h3>${esc(t('nard.rulesTitle'))}</h3>
            <ul>${(['start', 'move', 'hit', 'bar', 'off', 'win'] as const).map((k) => `<li>${esc(t(`nard.rule.${k}` as Key))}</li>`).join('')}</ul>
          </div>
        </aside>
      </div>
    </section>`;
  const $ = (k: string): HTMLElement => root.querySelector(`[data-el="${k}"]`)!;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'nard-board', role: 'application', 'aria-label': t('a11y.board') });
  $('wrap').append(svg);

  const flip = (): boolean => human === 1 && level >= 0;
  /** Point a checker column stands on: x of its centre and whether it grows down from the top edge. */
  function column(abs: number): { x: number; top: boolean } {
    let x: number;
    let top: boolean;
    if (abs <= 6) [x, top] = [FIELD_R + (6 - abs) + 0.5, false];
    else if (abs <= 12) [x, top] = [FIELD_L + (12 - abs) + 0.5, false];
    else if (abs <= 18) [x, top] = [FIELD_L + (abs - 13) + 0.5, true];
    else [x, top] = [FIELD_R + (abs - 19) + 0.5, true];
    // when Black plays at the bottom the board turns half a circle; the tray stays on the right
    if (flip()) [x, top] = [FIELD_L + FIELD_R + 6 - x, !top];
    return { x, top };
  }

  function checker(cx: number, cy: number, side: Side, cls = ''): SVGGElement {
    const g = el('g', { class: `nd-checker ${side === 0 ? 'nd-w' : 'nd-b'} ${cls}` });
    g.append(el('circle', { cx, cy, r: R, class: 'nd-c-body' }), el('circle', { cx, cy, r: R * 0.62, class: 'nd-c-ring' }));
    return g;
  }

  /** The point number of the mover that a board point is, or 25 for the bar. */
  const own = (side: Side, abs: number): number => (side === 0 ? abs : 25 - abs);

  function draw(): void {
    svg.replaceChildren();
    svg.append(
      el('rect', { x: 0, y: 0, width: W, height: H, rx: 0.3, class: 'nd-frame' }),
      el('rect', { x: FIELD_L, y: TOP, width: 6, height: BOTTOM - TOP, class: 'nd-field' }),
      el('rect', { x: FIELD_R, y: TOP, width: 6, height: BOTTOM - TOP, class: 'nd-field' }),
      el('rect', { x: BAR, y: TOP, width: 1, height: BOTTOM - TOP, class: 'nd-bar' }),
      el('rect', { x: TRAY, y: TOP, width: 1.1, height: BOTTOM - TOP, rx: 0.1, class: 'nd-tray' }),
    );
    const steps = legalSteps();
    const sources = new Set(steps.map((s) => s.from));
    const targets = selected === null ? [] : steps.filter((s) => s.from === selected);
    // points
    for (let abs = 1; abs <= 24; abs++) {
      const { x, top } = column(abs);
      const base = top ? TOP : BOTTOM;
      const tip = top ? TOP + 4.7 : BOTTOM - 4.7;
      svg.append(el('path', { d: `M${x - 0.5} ${base} L${x + 0.5} ${base} L${x} ${tip} Z`, class: `nd-point ${abs % 2 ? 'nd-p1' : 'nd-p2'}` }));
      const hit = el('rect', { x: x - 0.5, y: top ? TOP : BOTTOM - 5.3, width: 1, height: 5.3, class: 'nd-hit', 'data-abs': abs });
      svg.append(hit);
    }
    // checkers on points
    for (let abs = 1; abs <= 24; abs++) {
      const v = game.pts[abs];
      if (!v) continue;
      const side: Side = v > 0 ? 0 : 1;
      const n = Math.abs(v);
      const { x, top } = column(abs);
      const isSource = busy ? false : sources.has(own(side, abs)) && side === game.side;
      for (let i = 0; i < Math.min(n, 5); i++) {
        const cy = top ? TOP + R + 0.02 + i * 0.92 : BOTTOM - R - 0.02 - i * 0.92;
        const last = i === Math.min(n, 5) - 1;
        const cls = last && isSource ? (selected === own(side, abs) ? 'nd-selected' : 'nd-movable') : '';
        const g = checker(x, cy, side, cls);
        g.dataset.abs = String(abs);
        svg.append(g);
        if (last && n > 5) {
          const tx = el('text', { x, y: cy + 0.16, class: `nd-count ${side === 0 ? 'nd-count-w' : 'nd-count-b'}`, 'text-anchor': 'middle' });
          tx.textContent = String(n);
          svg.append(tx);
        }
      }
    }
    // the bar: each side's hit checkers wait on the half facing its entry
    for (const side of [0, 1] as Side[]) {
      const n = game.bar[side];
      const towardTop = (side === 0) !== flip();
      for (let i = 0; i < Math.min(n, 4); i++) {
        const cy = towardTop ? H / 2 - 0.7 - i * 0.92 : H / 2 + 0.7 + i * 0.92;
        const isSource = !busy && side === game.side && sources.has(25);
        const g = checker(BAR + 0.5, cy, side, i === Math.min(n, 4) - 1 && isSource ? (selected === 25 ? 'nd-selected' : 'nd-movable') : '');
        g.dataset.abs = 'bar';
        svg.append(g);
      }
      if (n > 4) {
        const tx = el('text', { x: BAR + 0.5, y: towardTop ? H / 2 - 0.55 - 3 * 0.92 : H / 2 + 0.85 + 3 * 0.92, class: `nd-count ${side === 0 ? 'nd-count-w' : 'nd-count-b'}`, 'text-anchor': 'middle' });
        tx.textContent = String(n);
        svg.append(tx);
      }
    }
    // borne-off checkers lie in the tray as thin slabs, each side at its own end
    for (const side of [0, 1] as Side[]) {
      const atBottom = (side === 0) !== flip();
      for (let i = 0; i < game.off[side]; i++) {
        const y = atBottom ? BOTTOM - 0.3 - i * 0.3 : TOP + 0.05 + i * 0.3;
        svg.append(el('rect', { x: TRAY + 0.12, y, width: 0.86, height: 0.25, rx: 0.06, class: `nd-slab ${side === 0 ? 'nd-w' : 'nd-b'}` }));
      }
    }
    // destinations of the selected checker
    for (const s of targets) {
      if (s.to === 0) {
        const atBottom = (game.side === 0) !== flip();
        svg.append(el('rect', { x: TRAY + 0.05, y: atBottom ? H / 2 : TOP, width: 1, height: H / 2 - TOP, rx: 0.1, class: 'nd-target-tray', 'data-abs': 'off' }));
        continue;
      }
      const abs = Nard.abs(game.side, s.to);
      const { x, top } = column(abs);
      const n = Math.abs(game.pts[abs]);
      const k = s.hit ? 0 : Math.min(n, 4);
      const cy = top ? TOP + R + 0.02 + k * 0.92 : BOTTOM - R - 0.02 - k * 0.92;
      svg.append(el('circle', { cx: x, cy, r: R * 0.9, class: s.hit ? 'nd-target nd-target-hit' : 'nd-target', 'data-abs': abs }));
    }
    // dice sit in the middle of the mover's half
    if (dice.length) {
      const cx = FIELD_R + 3;
      const pairs = dice[0] === dice[1] ? [dice[0], dice[0]] : dice;
      const usedCount = dice[0] === dice[1] ? 4 - left.length : 0;
      pairs.forEach((d, i) => {
        const used = dice[0] === dice[1] ? usedCount >= (i + 1) * 2 : !left.includes(d);
        svg.append(die(cx - 1.2 + i * 1.5, H / 2 - 0.55, d, game.side, used));
      });
      if (dice[0] === dice[1] && left.length) {
        const tx = el('text', { x: cx + 2.3, y: H / 2 + 0.2, class: 'nd-left', 'text-anchor': 'middle' });
        tx.textContent = `×${left.length}`;
        svg.append(tx);
      }
    }
  }

  function die(x: number, y: number, n: number, side: Side, used: boolean): SVGGElement {
    const g = el('g', { class: `nd-die ${side === 0 ? 'nd-die-w' : 'nd-die-b'} ${used ? 'nd-used' : ''}` });
    g.append(el('rect', { x, y, width: 1.1, height: 1.1, rx: 0.18, class: 'nd-die-face' }));
    const P: Record<number, [number, number][]> = {
      1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
      4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
      6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
    };
    for (const [px, py] of P[n]) g.append(el('circle', { cx: x + px * 1.1, cy: y + py * 1.1, r: 0.1, class: 'nd-pip' }));
    return g;
  }

  const vsComputer = (): boolean => level >= 0;
  const winner = (): { side: Side; mars: boolean; resign?: boolean } | null =>
    resigned !== null ? { side: (1 - resigned) as Side, mars: false, resign: true } : game.winner();
  const humanTurn = (): boolean => started && !busy && !winner() && (!vsComputer() || game.side === human);
  function legalSteps(): Step[] {
    if (!started || !left.length || winner()) return [];
    return game.firstSteps(left);
  }

  function persist(): void {
    try {
      const s: Saved = { pts: Array.from(turnStart?.pts ?? game.pts), bar: turnStart?.bar ?? game.bar, off: turnStart?.off ?? game.off, side: game.side, dice: dice.length ? dice : null, level, human };
      if (started && !winner()) localStorage.setItem(STORE, JSON.stringify(s));
      else localStorage.removeItem(STORE);
    } catch {
      /* private mode */
    }
  }

  const sideName = (s: Side): string => t(s === 0 ? 'setup.white' : 'setup.black');

  function status(): void {
    const s = $('status');
    s.className = 'status';
    const w = winner();
    if (!started) s.textContent = t('shatranj.pick');
    else if (w) {
      s.classList.add('over');
      s.textContent = vsComputer() ? t(w.side === human ? 'result.win' : 'result.loss') : t(w.side === 0 ? 'result.whiteWins' : 'result.blackWins');
    } else if (note) s.textContent = note;
    else if (busy && vsComputer()) s.textContent = t('game.turn.thinking');
    else if (!dice.length) s.textContent = vsComputer() ? t('nard.yourRoll') : `${t('game.turn.now')}: ${sideName(game.side)}`;
    else s.textContent = vsComputer() ? t('game.turn.you') : `${t('game.turn.now')}: ${sideName(game.side)}`;
  }

  function score(): void {
    const b = $('score');
    if (!started) {
      b.hidden = true;
      return;
    }
    b.hidden = false;
    b.innerHTML = `<h3>${esc(t('nard.pips'))}</h3>
      <p class="nd-pips"><span class="nd-swatch nd-w"></span>${esc(sideName(0))} <b>${game.pips(0)}</b> · ${esc(t('nard.borne'))} ${game.off[0]}/15</p>
      <p class="nd-pips"><span class="nd-swatch nd-b"></span>${esc(sideName(1))} <b>${game.pips(1)}</b> · ${esc(t('nard.borne'))} ${game.off[1]}/15</p>`;
  }

  function setupCard(): void {
    const box = $('setup');
    if (started) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const opp = [-1, 0, 1, 2]
      .map((l) => `<button type="button" data-level="${l}" class="${l === level ? 'on' : ''}">${esc(l < 0 ? t('shatranj.friend') : t(LEVEL_NAMES[l]))}</button>`)
      .join('');
    const side = (['w', 'b', 'r'] as const)
      .map((c) => `<button type="button" data-side="${c}">${esc(t(c === 'w' ? 'setup.white' : c === 'b' ? 'setup.black' : 'setup.random'))}</button>`)
      .join('');
    box.innerHTML = `<h3>${esc(t('setup.title'))}</h3>
      <p class="sh-label">${esc(t('setup.level'))}</p><div class="seg">${opp}</div>
      <p class="sh-label">${esc(level < 0 ? t('nard.startHint') : t('setup.color'))}</p>
      <div class="seg">${level < 0 ? `<button type="button" data-side="w">${esc(t('setup.start'))}</button>` : side}</div>`;
  }

  function resultCard(): void {
    const box = $('result');
    const w = winner();
    if (!w) {
      box.hidden = true;
      return;
    }
    const won = vsComputer() ? (w.side === human ? 'win' : 'loss') : 'win';
    const title = vsComputer() ? t(won === 'win' ? 'result.win' : 'result.loss') : t(w.side === 0 ? 'result.whiteWins' : 'result.blackWins');
    box.className = `result-card ${won}`;
    box.innerHTML = `<h2>${esc(title)}</h2><p>${esc(t(w.resign ? 'shatranj.end.resign' : w.mars ? 'nard.mars' : 'nard.end'))}</p>
      <div class="row"><button class="btn primary" data-act="again">${esc(t('game.rematch'))}</button><button class="btn" data-act="setup">${esc(t('game.new'))}</button></div>`;
    box.hidden = false;
  }

  function actions(): void {
    const a = $('actions');
    if (!started) {
      a.innerHTML = '';
      return;
    }
    const over = !!winner();
    const mine = humanTurn();
    a.innerHTML = `
      ${mine && !dice.length && !over ? `<button class="btn primary" data-act="roll">${esc(t('nard.roll'))}</button>` : ''}
      ${mine && dice.length ? `<button class="btn" data-act="undo"${turnStart && left.length !== (dice[0] === dice[1] ? 4 : 2) ? '' : ' disabled'}>${esc(t('nard.undo'))}</button>` : ''}
      ${over ? `<button class="btn" data-act="setup">${esc(t('game.new'))}</button>` : `<button class="btn danger" data-act="resign">${esc(t('game.resign'))}</button>`}`;
  }

  function refresh(): void {
    draw();
    status();
    score();
    setupCard();
    resultCard();
    actions();
  }

  function later(f: () => void, ms: number): void {
    timers.push(window.setTimeout(f, ms));
  }

  function startTurn(d: number[]): void {
    dice = d;
    left = d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : [d[0], d[1]];
    turnStart = game.clone();
    selected = null;
    playSound('move');
    persist();
    if (!game.firstSteps(left).length) {
      // nothing can be played: the turn passes
      note = t('nard.noMoves');
      busy = true;
      refresh();
      later(() => {
        note = '';
        busy = false;
        endTurn();
      }, 1400);
      return;
    }
    refresh();
    if (vsComputer() && game.side !== human) computerMoves();
  }

  function endTurn(): void {
    // the steps were applied one by one; flip the side now
    game.side = (1 - game.side) as Side;
    dice = [];
    left = [];
    turnStart = null;
    selected = null;
    const w = game.winner();
    persist();
    if (w) {
      playSound('end');
      refresh();
      return;
    }
    refresh();
    if (vsComputer() && game.side !== human) {
      busy = true;
      refresh();
      later(() => {
        busy = false;
        startTurn(roll());
      }, 600);
    }
  }

  function step(s: Step): void {
    game.apply(game.side, s);
    const i = left.indexOf(s.die);
    left.splice(i, 1);
    selected = null;
    playSound(s.hit ? 'capture' : 'move');
    if (!left.length || !game.firstSteps(left).length || game.winner()) {
      busy = true;
      refresh();
      later(() => {
        busy = false;
        endTurn();
      }, 350);
      return;
    }
    refresh();
  }

  function computerMoves(): void {
    busy = true;
    refresh();
    const plan = choose(game, dice, NARD_LEVELS[level]);
    let i = 0;
    const next = (): void => {
      if (i >= plan.length) {
        busy = false;
        endTurn();
        return;
      }
      const s = plan[i++];
      game.apply(game.side, s);
      left.splice(left.indexOf(s.die), 1);
      playSound(s.hit ? 'capture' : 'move');
      refresh();
      later(next, 520);
    };
    later(next, 700);
  }

  function start(side: Side): void {
    timers.forEach(clearTimeout);
    timers = [];
    game = new Nard();
    human = side;
    resigned = null;
    started = true;
    busy = false;
    // the opening roll: one die each, the higher starts and plays both numbers
    let a: number;
    let b: number;
    do [a, b] = roll(); while (a === b);
    game.side = a > b ? 0 : 1;
    note = `${t('nard.opening')}: ${sideName(0)} ${a}, ${sideName(1)} ${b}`;
    refresh();
    later(() => {
      note = '';
      startTurn([a, b]);
    }, 1300);
  }

  svg.addEventListener('click', (e) => {
    if (!humanTurn() || !dice.length) return;
    const target = (e.target as Element).closest<SVGElement>('[data-abs]');
    if (!target) return;
    const raw = target.dataset.abs!;
    const steps = legalSteps();
    if (selected !== null) {
      const to = raw === 'off' ? 0 : raw === 'bar' ? -1 : own(game.side, Number(raw));
      const opts = steps.filter((s) => s.from === selected && s.to === to);
      if (opts.length) {
        // with two dice reaching the same place (bearing off), use the exact or smaller one
        opts.sort((x, y) => x.die - y.die);
        return step(opts[0]);
      }
    }
    const from = raw === 'bar' ? 25 : raw === 'off' ? -1 : own(game.side, Number(raw));
    if (steps.some((s) => s.from === from)) {
      const mine = steps.filter((s) => s.from === from);
      // one way only: play it straight away
      if (mine.length === 1 && selected === from) return step(mine[0]);
      selected = selected === from ? null : from;
    } else selected = null;
    draw();
  });

  root.querySelector('.nard')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-level],[data-side],[data-act]');
    if (!b) return;
    if (b.dataset.level !== undefined) {
      level = Number(b.dataset.level);
      setupCard();
      return;
    }
    if (b.dataset.side) {
      const c = b.dataset.side;
      start(c === 'w' ? 0 : c === 'b' ? 1 : Math.random() < 0.5 ? 0 : 1);
      return;
    }
    switch (b.dataset.act) {
      case 'roll':
        startTurn(roll());
        break;
      case 'undo':
        if (turnStart) {
          game = turnStart.clone();
          left = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
          selected = null;
          refresh();
        }
        break;
      case 'resign':
        if (!b.classList.contains('armed')) {
          b.classList.add('armed');
          b.textContent = t('game.resign.confirm');
          return;
        }
        timers.forEach(clearTimeout);
        timers = [];
        busy = false;
        resigned = vsComputer() ? human : game.side;
        playSound('end');
        persist();
        refresh();
        break;
      case 'again':
        start(vsComputer() ? ((1 - human) as Side) : 0);
        break;
      case 'setup':
        timers.forEach(clearTimeout);
        timers = [];
        started = false;
        busy = false;
        resigned = null;
        dice = [];
        left = [];
        game = new Nard();
        persist();
        refresh();
        break;
    }
  });

  // resume an unfinished game at the start of the turn it was in, with the dice already rolled
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Saved | null;
    if (s && Array.isArray(s.pts) && s.pts.length === 25) {
      game = new Nard(true);
      game.pts = Int8Array.from(s.pts);
      game.bar = s.bar;
      game.off = s.off;
      game.side = s.side;
      level = s.level;
      human = s.human;
      started = !game.winner();
    }
    if (started && s?.dice) {
      refresh();
      startTurn(s.dice);
    } else if (started && vsComputer() && game.side !== human) {
      refresh();
      startTurn(roll());
    }
  } catch {
    /* a damaged save: start afresh */
  }
  refresh();

  return () => {
    timers.forEach(clearTimeout);
  };
}
