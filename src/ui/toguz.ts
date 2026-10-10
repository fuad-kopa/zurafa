// Toguz korgool screen: two rows of nine holes and two kazans; tap one of your holes to sow.

import { t, Key } from '../i18n';
import { Toguz, Side, chooseHole, TOGUZ_LEVELS } from '../games/toguz';
import { playSound } from './sound';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const STORE = 'zurafa.toguz';
const LEVEL_NAMES: Key[] = ['level.recruit', 'level.rider', 'level.emir'];
const W = 20;
const H = 11.4;

interface Saved {
  holes: number[];
  kazan: [number, number];
  tuzdyk: [number, number];
  side: Side;
  level: number;
  human: Side;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

// A fixed scatter of pebble spots inside a hole, so the stones do not jump about between redraws.
const SPOTS: [number, number][] = [];
for (let i = 0; i < 30; i++) SPOTS.push([((i % 4) - 1.5) * 0.36 + (Math.floor(i / 4) % 2) * 0.18 - 0.09, 1.25 - Math.floor(i / 4) * 0.34]);

export function renderToguz(root: HTMLElement): () => void {
  let game = new Toguz();
  let view = game.clone();
  let level = 1;
  let human: Side = 0;
  let started = false;
  let busy = false;
  let resigned: Side | null = null;
  let lastHole = -1;
  let note = '';
  let timers: number[] = [];

  root.innerHTML = `
    <section class="toguz">
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
            <h3>${esc(t('toguz.rulesTitle'))}</h3>
            <ul>${(['start', 'sow', 'take', 'tuzdyk', 'win'] as const).map((k) => `<li>${esc(t(`toguz.rule.${k}` as Key))}</li>`).join('')}</ul>
          </div>
        </aside>
      </div>
    </section>`;
  const $ = (k: string): HTMLElement => root.querySelector(`[data-el="${k}"]`)!;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tg-board', role: 'application', 'aria-label': t('a11y.board') });
  $('wrap').append(svg);

  const vsComputer = (): boolean => level >= 0;
  const bottom = (): Side => (vsComputer() ? human : 0);
  /** Hole centre: the near side runs left to right along the bottom, the far side right to left along the top. */
  function holeAt(h: number): { x: number; y: number; near: boolean } {
    const near = Toguz.owner(h) === bottom();
    const i = h % 9;
    return near ? { x: 1.9 + i * 2.02, y: 8.15, near } : { x: 1.9 + (8 - i) * 2.02, y: 3.25, near };
  }

  function draw(): void {
    svg.replaceChildren();
    svg.append(el('rect', { x: 0, y: 0, width: W, height: H, rx: 0.4, class: 'tg-frame' }));
    svg.append(el('rect', { x: 0.25, y: 0.25, width: W - 0.5, height: H - 0.5, rx: 0.3, class: 'tg-wood' }));
    const r = result();
    const mine = humanTurn();
    for (let h = 0; h < 18; h++) {
      const { x, y, near } = holeAt(h);
      const tuzOf = view.tuzdyk[0] === h ? 0 : view.tuzdyk[1] === h ? 1 : -1;
      const playable = mine && !r && Toguz.owner(h) === game.side && game.holes[h] > 0;
      const g = el('g', { class: `tg-hole ${playable ? 'tg-playable' : ''} ${h === lastHole ? 'tg-last' : ''}`, 'data-hole': h });
      g.append(el('rect', { x: x - 0.82, y: y - 1.75, width: 1.64, height: 3.5, rx: 0.8, class: 'tg-pit' }));
      const n = view.holes[h];
      if (tuzOf >= 0) {
        g.append(el('path', { d: star(x, y, 0.55, 0.24), class: `tg-tuz ${tuzOf === 0 ? 'tg-tuz-w' : 'tg-tuz-b'}` }));
      } else {
        for (let k = 0; k < Math.min(n, SPOTS.length); k++) {
          const [dx, dy] = SPOTS[k];
          g.append(el('circle', { cx: x + dx, cy: y + dy * (near ? 1 : 1), r: 0.15, class: `tg-stone tg-s${k % 3}` }));
        }
      }
      const label = el('text', { x, y: near ? y + 2.45 : y - 2.15, class: 'tg-count', 'text-anchor': 'middle' });
      label.textContent = tuzOf >= 0 ? '★' : String(n);
      const num = el('text', { x, y: near ? y + 3 : y - 2.7, class: 'tg-num', 'text-anchor': 'middle' });
      num.textContent = String((h % 9) + 1);
      g.append(label, num);
      svg.append(g);
    }
    // kazans: the far side's above the middle line, the near side's below it
    for (const side of [0, 1] as Side[]) {
      const near = side === bottom();
      const y = near ? 5.85 : 4.95;
      svg.append(el('rect', { x: 1.05, y: y - 0.38, width: 17.9, height: 0.76, rx: 0.38, class: `tg-kazan ${side === 0 ? 'tg-k-w' : 'tg-k-b'}` }));
      const n = view.kazan[side];
      const shown = Math.min(n, 80);
      for (let k = 0; k < shown; k++) svg.append(el('circle', { cx: 1.4 + (k % 40) * 0.44 + (Math.floor(k / 40) % 2) * 0.22, cy: y + (Math.floor(k / 40) ? 0.15 : -0.15), r: 0.115, class: `tg-stone tg-s${k % 3}` }));
      const tx = el('text', { x: 19.35, y: y + 0.17, class: `tg-kcount ${n > 81 ? 'tg-kwin' : ''}`, 'text-anchor': 'middle' });
      tx.textContent = String(n);
      svg.append(tx);
    }
  }

  function star(cx: number, cy: number, ro: number, ri: number): string {
    let d = '';
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI / 8) * i - Math.PI / 2;
      const rr = i % 2 ? ri : ro;
      d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(3)} ${(cy + rr * Math.sin(a)).toFixed(3)} `;
    }
    return d + 'Z';
  }

  const result = (): { winner: Side | null; final: [number, number]; resign?: boolean } | null =>
    resigned !== null ? { winner: (1 - resigned) as Side, final: [game.kazan[0], game.kazan[1]], resign: true } : started ? game.result() : null;
  const humanTurn = (): boolean => started && !busy && !result() && (!vsComputer() || game.side === human);
  const sideName = (s: Side): string => t(s === 0 ? 'setup.white' : 'setup.black');

  function persist(): void {
    try {
      if (started && !result()) {
        localStorage.setItem(STORE, JSON.stringify({ holes: Array.from(game.holes), kazan: game.kazan, tuzdyk: game.tuzdyk, side: game.side, level, human } satisfies Saved));
      } else localStorage.removeItem(STORE);
    } catch {
      /* private mode */
    }
  }

  function status(): void {
    const s = $('status');
    s.className = 'status';
    const r = result();
    if (!started) s.textContent = t('shatranj.pick');
    else if (r) {
      s.classList.add('over');
      s.textContent = r.winner === null ? t('result.draw') : vsComputer() ? t(r.winner === human ? 'result.win' : 'result.loss') : t(r.winner === 0 ? 'result.whiteWins' : 'result.blackWins');
    } else if (note) s.textContent = note;
    else if (busy && vsComputer() && game.side !== human) s.textContent = t('game.turn.thinking');
    else s.textContent = vsComputer() ? t('game.turn.you') : `${t('game.turn.now')}: ${sideName(game.side)}`;
  }

  function setupCard(): void {
    const box = $('setup');
    if (started) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const opp = [-1, 0, 1, 2].map((l) => `<button type="button" data-level="${l}" class="${l === level ? 'on' : ''}">${esc(l < 0 ? t('shatranj.friend') : t(LEVEL_NAMES[l]))}</button>`).join('');
    const side = (['w', 'b', 'r'] as const).map((c) => `<button type="button" data-side="${c}">${esc(t(c === 'w' ? 'toguz.first' : c === 'b' ? 'toguz.second' : 'setup.random'))}</button>`).join('');
    box.innerHTML = `<h3>${esc(t('setup.title'))}</h3>
      <p class="sh-label">${esc(t('setup.level'))}</p><div class="seg">${opp}</div>
      <p class="sh-label">${esc(level < 0 ? t('shatranj.startHint') : t('toguz.order'))}</p>
      <div class="seg">${level < 0 ? `<button type="button" data-side="w">${esc(t('setup.start'))}</button>` : side}</div>`;
  }

  function resultCard(): void {
    const box = $('result');
    const r = result();
    if (!r || busy) {
      box.hidden = true;
      return;
    }
    const won = r.winner === null ? 'draw' : vsComputer() ? (r.winner === human ? 'win' : 'loss') : 'win';
    const title = r.winner === null ? t('result.draw') : vsComputer() ? t(won === 'win' ? 'result.win' : 'result.loss') : t(r.winner === 0 ? 'result.whiteWins' : 'result.blackWins');
    box.className = `result-card ${won}`;
    box.innerHTML = `<h2>${esc(title)}</h2><p>${esc(r.resign ? t('shatranj.end.resign') : t('toguz.final', String(r.final[0]), String(r.final[1])))}</p>
      <div class="row"><button class="btn primary" data-act="again">${esc(t('game.rematch'))}</button><button class="btn" data-act="setup">${esc(t('game.new'))}</button></div>`;
    box.hidden = false;
  }

  function actions(): void {
    const a = $('actions');
    if (!started) {
      a.innerHTML = '';
      return;
    }
    a.innerHTML = result() ? `<button class="btn" data-act="setup">${esc(t('game.new'))}</button>` : `<button class="btn danger" data-act="resign">${esc(t('game.resign'))}</button>`;
  }

  function refresh(): void {
    draw();
    status();
    setupCard();
    resultCard();
    actions();
  }

  function later(f: () => void, ms: number): void {
    timers.push(window.setTimeout(f, ms));
  }

  /** Play a hole and show the stones falling one by one. */
  function sow(h: number): void {
    busy = true;
    const mover = game.side;
    const before = game.clone();
    const s = game.play(h);
    view = before.clone();
    view.holes[h] = 0;
    lastHole = -1;
    let i = 0;
    const tick = (): void => {
      if (i < s.path.length) {
        const p = s.path[i++];
        if (view.tuzdyk[0] === p) view.kazan[0]++;
        else if (view.tuzdyk[1] === p) view.kazan[1]++;
        else view.holes[p]++;
        lastHole = p;
        draw();
        later(tick, s.path.length > 20 ? 45 : 80);
        return;
      }
      // the capture, if any, after a short beat
      later(() => {
        if (s.captured) {
          playSound(s.tuzdyk ? 'promote' : 'capture');
          const who = vsComputer() ? t(mover === human ? 'game.you' : 'game.opponent') : sideName(mover);
          note = s.tuzdyk ? `${who}: ${t('toguz.madeTuzdyk')}` : `${who}: ${t('toguz.took', String(s.captured))}`;
        } else playSound('move');
        view = game.clone();
        busy = false;
        persist();
        if (result()) playSound('end');
        refresh();
        later(() => {
          note = '';
          status();
        }, 1400);
        maybeComputer();
      }, 220);
    };
    playSound('move');
    tick();
  }

  function maybeComputer(): void {
    if (!started || !vsComputer() || game.side === human || result()) return;
    busy = true;
    status();
    later(() => sow(chooseHole(game, TOGUZ_LEVELS[level])), 650);
  }

  function start(side: Side): void {
    timers.forEach(clearTimeout);
    timers = [];
    game = new Toguz();
    view = game.clone();
    human = side;
    resigned = null;
    lastHole = -1;
    note = '';
    busy = false;
    started = true;
    persist();
    refresh();
    maybeComputer();
  }

  svg.addEventListener('click', (e) => {
    if (!humanTurn()) return;
    const h = Number((e.target as Element).closest<SVGElement>('[data-hole]')?.dataset.hole ?? -1);
    if (h < 0 || Toguz.owner(h) !== game.side || !game.holes[h]) return;
    sow(h);
  });

  root.querySelector('.toguz')!.addEventListener('click', (e) => {
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
      case 'resign':
        if (!b.classList.contains('armed')) {
          b.classList.add('armed');
          b.textContent = t('game.resign.confirm');
          return;
        }
        timers.forEach(clearTimeout);
        timers = [];
        busy = false;
        view = game.clone();
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
        game = new Toguz();
        view = game.clone();
        persist();
        refresh();
        break;
    }
  });

  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Saved | null;
    if (s && Array.isArray(s.holes) && s.holes.length === 18) {
      game.holes = Int16Array.from(s.holes);
      game.kazan = s.kazan;
      game.tuzdyk = s.tuzdyk;
      game.side = s.side;
      level = s.level;
      human = s.human;
      view = game.clone();
      started = !game.result();
    }
  } catch {
    /* a damaged save: start afresh */
  }
  refresh();
  maybeComputer();

  return () => timers.forEach(clearTimeout);
}
