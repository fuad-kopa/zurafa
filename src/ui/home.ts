// Home screen and the new-game dialog.

import type { Side } from '../engine/geometry';
import * as P from '../engine/pieces';
import { DEFAULT_RULES, RuleOptions, ArrayName } from '../engine/position';
import { LEVELS } from '../ai/levels';
import { newRoomId } from '../net/online';
import { t, Key } from '../i18n';
import { pieceSvg } from './pieces';
import { GameConfig, loadSavedConfig } from './gameScreen';
import { dailyState, dailyPuzzle } from '../puzzles';
import { getLang } from '../i18n';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export type StartGame = (config: GameConfig, roomId?: string) => void;

function dailyCard(): string {
  const st = dailyState();
  const p = dailyPuzzle();
  const sub = st.solvedToday ? t('daily.solved') : p.text[getLang()].title;
  const streak = st.streak > 0 ? ` · ${t('daily.streak', String(st.streak))}` : '';
  return `<button class="mode-card daily ${st.solvedToday ? 'done' : ''}" data-act="daily">
      <span class="mode-icon">${pieceSvg(P.GIRAFFE, 1, 44)}</span>
      <span class="mode-text"><b>${esc(t('daily.title'))}</b><small>${esc(sub + streak)}</small></span>
      <span class="mode-arrow" aria-hidden="true">${st.solvedToday ? '✓' : '→'}</span>
    </button>`;
}

export function renderHome(root: HTMLElement, start: StartGame, go: (route: string) => void): void {
  const saved = loadSavedConfig();
  const card = (act: string, icon: number, side: Side, title: Key, desc: Key, cls = ''): string => `
    <button class="mode-card ${cls}" data-act="${act}">
      <span class="mode-icon">${pieceSvg(icon, side, 44)}</span>
      <span class="mode-text"><b>${esc(t(title))}</b><small>${esc(t(desc))}</small></span>
      <span class="mode-arrow" aria-hidden="true">→</span>
    </button>`;
  let resume = '';
  if (saved && saved.mode !== 'online' && saved.mode !== 'puzzle') {
    const moveNo = Math.floor((saved.moves?.length ?? 0) / 2) + 1;
    const sub = saved.mode === 'ai'
      ? t('home.resume.vs', t(`level.${LEVELS.find((l) => l.id === saved.level)?.key ?? 'rider'}` as Key), String(moveNo))
      : t('home.resume.local', String(moveNo));
    resume = `<button class="mode-card resume" data-act="resume">
      <span class="mode-icon">${pieceSvg(P.KING, saved.mode === 'ai' ? saved.mySide : 0, 44)}</span>
      <span class="mode-text"><b>${esc(t('home.resume'))}</b><small>${esc(sub)}</small></span>
      <span class="mode-arrow" aria-hidden="true">→</span></button>`;
  }
  root.innerHTML = `
    <section class="home">
      <header class="hero">
        <picture class="cover">
          <source media="(max-width: 700px)" srcset="./img/hero-m.jpg">
          <img src="./img/hero.jpg" alt="" width="1800" height="1006" fetchpriority="high">
        </picture>
        <div class="cover cover-video" data-el="video"></div>
        <div class="hero-text">
          <p class="kicker">${esc(t('home.kicker'))}</p>
          <h1>${esc(t('home.headline'))}</h1>
          <p class="lead">${esc(t('home.lead'))}</p>
          <div class="row"><button class="btn primary" data-act="ai">${esc(t('home.play'))}</button><a class="btn" href="#/learn">${esc(t('home.learn'))}</a></div>
        </div>
      </header>
      <ul class="stats" aria-label="facts">
        <li><b>11×10</b><span>${esc(t('home.stat.board'))}</span></li>
        <li><b>2</b><span>${esc(t('home.stat.citadels'))}</span></li>
        <li><b>28</b><span>${esc(t('home.stat.pieces'))}</span></li>
        <li><b>6</b><span>${esc(t('home.stat.langs'))}</span></li>
      </ul>
      <div class="modes">
        ${resume}
        ${card('ai', P.KING, 1, 'home.ai', 'home.ai.desc', 'primary')}
        ${card('friend', P.KNIGHT, 0, 'home.friend', 'home.friend.desc')}
        ${card('local', P.VIZIER, 1, 'home.local', 'home.local.desc')}
        ${card('learn', P.GIRAFFE, 0, 'home.learn', 'home.learn.desc')}
        ${card('puzzles', P.PAWN_PAWN, 1, 'home.puzzles', 'home.puzzles.desc')}
        ${dailyCard()}
        ${card('battles', P.ELEPHANT, 0, 'home.battles', 'home.battles.desc')}
      </div>
    </section>`;
  // The looping clip is a desktop treat: phones, slow links and reduced-motion users keep the still.
  const wantsVideo = matchMedia('(min-width: 700px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches
    && !(navigator as { connection?: { saveData?: boolean } }).connection?.saveData && document.documentElement.dataset.motion !== 'off';
  if (wantsVideo) {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = 'metadata';
    v.setAttribute('aria-hidden', 'true');
    v.innerHTML = '<source src="./video/hero.webm" type="video/webm"><source src="./video/hero.mp4" type="video/mp4">';
    v.addEventListener('playing', () => root.querySelector('.hero')?.classList.add('has-video'), { once: true });
    root.querySelector('[data-el="video"]')!.append(v);
    v.play().catch(() => {});
  }
  root.querySelector('.home')!.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'learn') go('#/learn');
    else if (act === 'daily') go('#/daily');
    else if (act === 'battles') go('#/battles');
    else if (act === 'puzzles') go('#/puzzles');
    else if (act === 'resume' && saved) start(saved);
    else if (act === 'ai' || act === 'friend' || act === 'local') openSetup(act, start);
  });
}

export function openSetup(mode: 'ai' | 'friend' | 'local', start: StartGame): void {
  const rules: RuleOptions = { ...DEFAULT_RULES };
  let level = Number(localStorage.getItem('tc.level')) || 3;
  let color: 'white' | 'black' | 'random' = 'white';
  let tcKey = 'none';
  const TCS: Record<string, { base: number; inc: number } | null> = { none: null, '10+5': { base: 10, inc: 5 }, '20+10': { base: 20, inc: 10 }, '40+20': { base: 40, inc: 20 } };

  const dlg = document.createElement('dialog');
  dlg.className = 'setup';
  const seg = (name: string, options: [string, string][], value: string): string =>
    `<div class="seg" data-name="${name}">${options.map(([v, label]) => `<button type="button" data-v="${v}" class="${v === value ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;
  const check = (name: keyof RuleOptions, label: Key): string =>
    `<label class="check"><input type="checkbox" name="${name}" ${rules[name] ? 'checked' : ''}><span>${esc(t(label))}</span></label>`;

  dlg.innerHTML = `
    <form method="dialog">
      <h2>${esc(t(mode === 'friend' ? 'online.title' : 'setup.title'))}</h2>
      ${mode === 'ai' ? `
        <h3>${esc(t('setup.level'))}</h3>
        <div class="levels">${LEVELS.map((l) => `
          <button type="button" class="level ${l.id === level ? 'on' : ''}" data-level="${l.id}">
            <img class="av" src="./img/av-${l.id}.jpg" alt="" width="44" height="44">
            <span><b>${esc(t(`level.${l.key}` as Key))}</b><small>${esc(t(`level.${l.key}.desc` as Key))}</small></span>
          </button>`).join('')}</div>` : ''}
      ${mode !== 'local' ? `
        <h3>${esc(t('setup.color'))}</h3>
        ${seg('color', [['white', t('setup.white')], ['black', t('setup.black')], ['random', t('setup.random')]], color)}` : ''}
      <h3>${esc(t('setup.clock'))}</h3>
      ${seg('tc', [['none', t('setup.clock.none')], ['10+5', '10 + 5'], ['20+10', '20 + 10'], ['40+20', '40 + 20']], tcKey)}
      <p class="dim small">${esc(t('setup.clock.hint'))}</p>
      <details>
        <summary>${esc(t('setup.rules'))}</summary>
        <p class="dim">${esc(t('setup.rules.hint'))}</p>
        <h3>${esc(t('setup.array'))}</h3>
        ${seg('array', [['masculine', t('setup.array.masculine')], ['feminine', t('setup.array.feminine')], ['third', t('setup.array.third')]], rules.array)}
        <h3>${esc(t('setup.swapWhen'))}</h3>
        ${seg('swapWhen', [['checkOrStalemate', t('setup.swapWhen.checkOrStalemate')], ['check', t('setup.swapWhen.check')]], rules.swapWhen)}
        ${check('modernDraws', 'setup.modernDraws')}
        ${check('popMayTargetKing', 'setup.popMayTargetKing')}
        ${check('picketOneStep', 'setup.picketOneStep')}
        ${check('bareKingWins', 'setup.bareKingWins')}
      </details>
      <div class="row end">
        <button type="button" class="btn" data-act="cancel">${esc(t('setup.cancel'))}</button>
        <button type="button" class="btn primary" data-act="go">${esc(t(mode === 'friend' ? 'setup.create' : 'setup.start'))}</button>
      </div>
    </form>`;
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('close', () => dlg.remove());

  dlg.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === dlg) return dlg.close();
    const lv = target.closest<HTMLElement>('[data-level]');
    if (lv) {
      level = Number(lv.dataset.level);
      dlg.querySelectorAll('.level').forEach((b) => b.classList.toggle('on', b === lv));
      return;
    }
    const opt = target.closest<HTMLElement>('.seg button');
    if (opt) {
      const group = opt.parentElement as HTMLElement;
      group.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === opt));
      const v = opt.dataset.v!;
      if (group.dataset.name === 'color') color = v as typeof color;
      else if (group.dataset.name === 'tc') tcKey = v;
      else if (group.dataset.name === 'array') rules.array = v as ArrayName;
      else if (group.dataset.name === 'swapWhen') rules.swapWhen = v as RuleOptions['swapWhen'];
      return;
    }
    const act = target.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'cancel') dlg.close();
    if (act === 'go') {
      dlg.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((c) => {
        (rules as unknown as Record<string, boolean>)[c.name] = c.checked;
      });
      const side: Side = color === 'random' ? (Math.random() < 0.5 ? 0 : 1) : color === 'white' ? 0 : 1;
      dlg.close();
      if (mode === 'ai') {
        localStorage.setItem('tc.level', String(level));
        start({ mode: 'ai', rules, mySide: side, level, tc: TCS[tcKey] });
      } else if (mode === 'local') start({ mode: 'local', rules, tc: TCS[tcKey] });
      else {
        const roomId = newRoomId();
        start({ mode: 'online', roomId, create: { rules, hostSide: side, tc: TCS[tcKey] } }, roomId);
      }
    }
  });
}
