// Asyk atu screen: pull back from the saka to aim, let go to shoot; bones knocked out of the ring are yours.

import { t, Key } from '../i18n';
import { Body, setupRow, makeSaka, step, planShot, ASYK_LEVELS, FIELD_W, FIELD_H, RING, BASELINE, MAX_SPEED } from '../games/asyk';
import { playSound } from './sound';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const LEVEL_NAMES: Key[] = ['level.recruit', 'level.rider', 'level.emir'];
const BONES = 10;
/** How far (in field units) a full pull reaches. */
const PULL = 34;

type Side = 0 | 1;

/** The outline of a knucklebone seen from above: a waisted oval with two knuckles at each end. */
function bonePath(r: number): Path2D {
  const w = r * 1.45;
  const h = r;
  const p = new Path2D();
  p.moveTo(-w, -h * 0.55);
  p.bezierCurveTo(-w, -h * 1.15, -w * 0.35, -h * 1.05, -w * 0.2, -h * 0.7);
  p.bezierCurveTo(-w * 0.05, -h * 0.5, w * 0.05, -h * 0.5, w * 0.2, -h * 0.75);
  p.bezierCurveTo(w * 0.35, -h * 1.1, w, -h * 1.1, w, -h * 0.5);
  p.bezierCurveTo(w * 1.08, 0, w * 1.08, 0, w, h * 0.5);
  p.bezierCurveTo(w, h * 1.1, w * 0.35, h * 1.1, w * 0.2, h * 0.75);
  p.bezierCurveTo(w * 0.05, h * 0.5, -w * 0.05, h * 0.5, -w * 0.2, h * 0.7);
  p.bezierCurveTo(-w * 0.35, h * 1.05, -w, h * 1.15, -w, h * 0.55);
  p.bezierCurveTo(-w * 1.08, 0, -w * 1.08, 0, -w, -h * 0.55);
  p.closePath();
  return p;
}

export function renderAsyk(root: HTMLElement): () => void {
  let level = 1;
  let human: Side = 0;
  let started = false;
  let turn: Side = 0;
  let bones: Body[] = [];
  let saka: Body = makeSaka(RING.x);
  let won: [number, number] = [0, 0];
  let flying = false;
  let resigned: Side | null = null;
  let note = '';
  let aim: { x0: number; y0: number; x: number; y: number } | null = null;
  let raf = 0;
  let timers: number[] = [];
  let hitThisShot = false;

  root.innerHTML = `
    <section class="asyk">
      <a class="link lib-back" href="#/games">← ${esc(t('games.title'))}</a>
      <div class="game">
        <div class="board-col">
          <div class="status" data-el="status" aria-live="polite"></div>
          <div class="board-wrap"><canvas class="ak-field" data-el="field" width="600" height="900" aria-label="${esc(t('a11y.board'))}"></canvas></div>
          <div class="actions" data-el="actions"></div>
        </div>
        <aside class="side">
          <div class="result-card" data-el="result" hidden></div>
          <div class="info-card" data-el="setup"></div>
          <div class="info-card nd-score" data-el="score"></div>
          <div class="info-card sh-rules">
            <h3>${esc(t('asyk.rulesTitle'))}</h3>
            <ul>${(['kon', 'shot', 'take', 'win'] as const).map((k) => `<li>${esc(t(`asyk.rule.${k}` as Key))}</li>`).join('')}</ul>
            <a class="link" href="#/library/ashyk">${esc(t('shatranj.more'))}</a>
          </div>
        </aside>
      </div>
    </section>`;
  const $ = (k: string): HTMLElement => root.querySelector(`[data-el="${k}"]`)!;
  const canvas = $('field') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const BONE = bonePath(1);

  const vsComputer = (): boolean => level >= 0;
  const left = (): number => bones.filter((b) => !b.out).length;
  const over = (): boolean => started && (resigned !== null || left() === 0);
  const winner = (): Side | null => (resigned !== null ? ((1 - resigned) as Side) : won[0] > won[1] ? 0 : won[1] > won[0] ? 1 : null);
  const myTurn = (): boolean => started && !flying && !over() && (!vsComputer() || turn === human);
  const playerName = (s: Side): string => (vsComputer() ? t(s === human ? 'game.you' : 'game.opponent') : t(s === 0 ? 'asyk.p1' : 'asyk.p2'));

  // --- drawing --------------------------------------------------------------------------------
  function resize(): void {
    const w = canvas.clientWidth || 400;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(((w * FIELD_H) / FIELD_W) * dpr);
  }

  function draw(): void {
    const k = canvas.width / FIELD_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    // packed earth
    const g = ctx.createRadialGradient(RING.x, RING.y, 4, RING.x, RING.y + 30, 110);
    g.addColorStop(0, '#8a6a46');
    g.addColorStop(0.6, '#6e5236');
    g.addColorStop(1, '#4a3622');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    // the ring scratched into the earth, and the shooting line
    ctx.strokeStyle = 'rgba(245, 228, 190, .55)';
    ctx.lineWidth = 0.45;
    ctx.setLineDash([1.6, 1.1]);
    ctx.beginPath();
    ctx.arc(RING.x, RING.y, RING.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(245, 228, 190, .4)';
    ctx.beginPath();
    ctx.moveTo(6, BASELINE + SAKA_GAP);
    ctx.lineTo(FIELD_W - 6, BASELINE + SAKA_GAP);
    ctx.stroke();
    // aim guide
    if (aim && myTurn()) {
      const v = shotFromAim(aim);
      const sp = Math.hypot(v.vx, v.vy);
      const len = Math.min(60, (sp / MAX_SPEED) * 60);
      ctx.strokeStyle = 'rgba(255, 216, 112, .85)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1.2, 1]);
      ctx.beginPath();
      ctx.moveTo(saka.x, saka.y);
      ctx.lineTo(saka.x + (v.vx / (sp || 1)) * len, saka.y + (v.vy / (sp || 1)) * len);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 216, 112, .25)';
      ctx.beginPath();
      ctx.arc(saka.x, saka.y, 3.4 + (sp / MAX_SPEED) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of [...bones, saka]) {
      if (b.out && !flying) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.scale(b.r, b.r);
      ctx.fillStyle = 'rgba(0, 0, 0, .28)';
      ctx.translate(0.18, 0.25);
      ctx.fill(BONE);
      ctx.translate(-0.18, -0.25);
      const fill = ctx.createLinearGradient(-1, -1, 1, 1);
      if (b.saka) {
        fill.addColorStop(0, '#c8473e');
        fill.addColorStop(1, '#6e1c22');
      } else {
        fill.addColorStop(0, b.out ? '#fff3cf' : '#f6ecd6');
        fill.addColorStop(1, '#c9b48a');
      }
      ctx.fillStyle = fill;
      ctx.fill(BONE);
      ctx.lineWidth = 0.09;
      ctx.strokeStyle = b.saka ? '#e2c26e' : 'rgba(70, 50, 25, .6)';
      ctx.stroke(BONE);
      ctx.restore();
    }
  }
  const SAKA_GAP = 4;

  function shotFromAim(a: { x0: number; y0: number; x: number; y: number }): { vx: number; vy: number } {
    const dx = a.x0 - a.x;
    const dy = a.y0 - a.y;
    const d = Math.hypot(dx, dy);
    const sp = Math.min(1, d / PULL) * MAX_SPEED;
    return d < 0.5 ? { vx: 0, vy: 0 } : { vx: (dx / d) * sp, vy: (dy / d) * sp };
  }

  // --- panels ---------------------------------------------------------------------------------
  function status(): void {
    const s = $('status');
    s.className = 'status';
    if (!started) s.textContent = t('shatranj.pick');
    else if (over()) {
      s.classList.add('over');
      const w = winner();
      s.textContent = w === null ? t('result.draw') : vsComputer() ? t(w === human ? 'result.win' : 'result.loss') : `${playerName(w)}: ${t('result.win')}`;
    } else if (note) s.textContent = note;
    else if (flying) s.textContent = '…';
    else if (vsComputer() && turn !== human) s.textContent = t('game.turn.thinking');
    else s.textContent = vsComputer() ? t('asyk.hint') : `${playerName(turn)} — ${t('asyk.hint')}`;
  }

  function score(): void {
    const b = $('score');
    if (!started) {
      b.hidden = true;
      return;
    }
    b.hidden = false;
    b.innerHTML = `<h3>${esc(t('asyk.score'))}</h3>
      <p class="nd-pips">${esc(playerName(0))} <b>${won[0]}</b></p>
      <p class="nd-pips">${esc(playerName(1))} <b>${won[1]}</b></p>
      <p class="nd-pips">${esc(t('asyk.left', String(left())))}</p>`;
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
      <p class="sh-label">${esc(level < 0 ? t('asyk.p1') : t('toguz.order'))}</p>
      <div class="seg">${level < 0 ? `<button type="button" data-side="w">${esc(t('setup.start'))}</button>` : side}</div>`;
  }

  function resultCard(): void {
    const box = $('result');
    if (!over() || flying) {
      box.hidden = true;
      return;
    }
    const w = winner();
    const res = w === null ? 'draw' : vsComputer() ? (w === human ? 'win' : 'loss') : 'win';
    const title = w === null ? t('result.draw') : vsComputer() ? t(res === 'win' ? 'result.win' : 'result.loss') : `${playerName(w)}: ${t('result.win')}`;
    box.className = `result-card ${res}`;
    box.innerHTML = `<h2>${esc(title)}</h2><p>${esc(resigned !== null ? t('shatranj.end.resign') : t('toguz.final', String(won[0]), String(won[1])))}</p>
      <div class="row"><button class="btn primary" data-act="again">${esc(t('game.rematch'))}</button><button class="btn" data-act="setup">${esc(t('game.new'))}</button></div>`;
    box.hidden = false;
  }

  function actions(): void {
    const a = $('actions');
    a.innerHTML = !started ? '' : over() ? `<button class="btn" data-act="setup">${esc(t('game.new'))}</button>` : `<button class="btn danger" data-act="resign">${esc(t('game.resign'))}</button>`;
  }

  function refresh(): void {
    draw();
    status();
    score();
    setupCard();
    resultCard();
    actions();
  }

  const later = (f: () => void, ms: number): void => {
    timers.push(window.setTimeout(f, ms));
  };

  // --- play -----------------------------------------------------------------------------------
  function shoot(vx: number, vy: number): void {
    if (Math.hypot(vx, vy) < 8) return;
    flying = true;
    hitThisShot = false;
    note = '';
    saka.vx = vx;
    saka.vy = vy;
    saka.spin = (Math.random() - 0.5) * 6;
    playSound('move');
    let last = performance.now();
    const frame = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false;
      const sub = 4;
      for (let i = 0; i < sub; i++) moving = step([...bones, saka], dt / sub) || moving;
      const knocks = bones.some((b) => b.vx || b.vy);
      if (knocks && !hitThisShot) {
        hitThisShot = true;
        playSound('capture');
      }
      draw();
      if (moving) {
        raf = requestAnimationFrame(frame);
        return;
      }
      flying = false;
      const gained = bones.filter((b) => b.out).length;
      bones = bones.filter((b) => !b.out);
      won[turn] += gained;
      // the saka goes back behind the line for the next shot
      saka = makeSaka(RING.x);
      if (gained) {
        note = `${playerName(turn)}: +${gained}`;
        playSound(left() ? 'promote' : 'end');
      } else {
        note = `${playerName(turn)}: ${t('asyk.miss')}`;
        turn = (1 - turn) as Side;
      }
      refresh();
      later(() => {
        note = '';
        status();
      }, 1500);
      maybeComputer();
    };
    raf = requestAnimationFrame(frame);
  }

  function maybeComputer(): void {
    if (!started || over() || !vsComputer() || turn === human) return;
    later(() => {
      const shot = planShot(bones, ASYK_LEVELS[level]);
      saka.x = shot.x;
      draw();
      later(() => shoot(shot.vx, shot.vy), 600);
    }, 900);
  }

  function start(first: Side): void {
    timers.forEach(clearTimeout);
    timers = [];
    cancelAnimationFrame(raf);
    human = vsComputer() ? first : 0;
    turn = 0;
    bones = setupRow(BONES);
    saka = makeSaka(RING.x);
    won = [0, 0];
    resigned = null;
    flying = false;
    note = '';
    started = true;
    refresh();
    maybeComputer();
  }

  // --- input ----------------------------------------------------------------------------------
  const toField = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * FIELD_W, y: ((e.clientY - r.top) / r.height) * FIELD_H };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!myTurn()) return;
    const p = toField(e);
    // a tap behind the line moves the saka along it
    if (p.y > BASELINE - 2 && Math.abs(p.x - saka.x) > 4) {
      saka.x = Math.max(6, Math.min(FIELD_W - 6, p.x));
      draw();
      return;
    }
    aim = { x0: p.x, y0: p.y, x: p.x, y: p.y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!aim) return;
    const p = toField(e);
    aim.x = p.x;
    aim.y = p.y;
    draw();
  });
  const release = (): void => {
    if (!aim) return;
    const v = shotFromAim(aim);
    aim = null;
    draw();
    if (myTurn()) shoot(v.vx, v.vy);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => {
    aim = null;
    draw();
  });

  root.querySelector('.asyk')!.addEventListener('click', (e) => {
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
        cancelAnimationFrame(raf);
        flying = false;
        resigned = vsComputer() ? human : turn;
        playSound('end');
        refresh();
        break;
      case 'again':
        start(vsComputer() ? ((1 - human) as Side) : 0);
        break;
      case 'setup':
        timers.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        started = false;
        flying = false;
        resigned = null;
        bones = setupRow(BONES);
        saka = makeSaka(RING.x);
          refresh();
        break;
    }
  });

  const onResize = (): void => {
    resize();
    draw();
  };
  window.addEventListener('resize', onResize);
  bones = setupRow(BONES);
  resize();
  refresh();

  return () => {
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
  };
}
