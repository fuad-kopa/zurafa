// Battles: five scenarios of Timur's campaigns with a map preview, a story and a choice of army.

import { BATTLES, Battle, buildBattle, battleSideName } from '../battles';
import { BoardView } from './board';
import { GameConfig } from './gameScreen';
import { LEVELS } from '../ai/levels';
import { DEFAULT_RULES } from '../engine/position';
import { t, getLang, Key } from '../i18n';
import { Side } from '../engine/geometry';

type StartGame = (config: GameConfig) => void;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function renderBattles(root: HTMLElement, start: StartGame): void {
  const lang = getLang();
  let level = Number(localStorage.getItem('tc.level')) || 3;
  root.innerHTML = `
    <section class="page battles">
      <h1>${esc(t('battles.title'))}</h1>
      <p class="lead">${esc(t('battles.intro'))}</p>
      <div class="battle-rules">
        <span><i class="legend water"></i>${esc(t('battles.rule.water'))}</span>
        <span><i class="legend hill"></i>${esc(t('battles.rule.hills'))}</span>
      </div>
      <label class="battle-level">${esc(t('battles.level'))}
        <select data-el="level">${LEVELS.map((l) => `<option value="${l.id}"${l.id === level ? ' selected' : ''}>${esc(t(`level.${l.key}` as Key))}</option>`).join('')}</select>
      </label>
      <div class="battle-list">
        ${BATTLES.map((b) => {
          const x = b.text[lang];
          return `<article class="battle-card" data-id="${b.id}">
            <div class="battle-map" data-map="${b.id}"></div>
            <div class="battle-body">
              <h2>${esc(x.title)} <small>${b.year}</small></h2>
              <p class="battle-place">${esc(x.place)}</p>
              <p>${esc(x.story)}</p>
              <ul class="battle-sides">
                <li><b>${esc(battleSideName(b, 0, lang))}:</b> ${esc(x.timur)}</li>
                <li><b>${esc(x.enemyName)}:</b> ${esc(x.enemy)}</li>
              </ul>
              <p class="battle-tip">✦ ${esc(x.tip)}</p>
              <div class="row">
                <button class="btn primary" data-side="0">${esc(t('battles.playAs', battleSideName(b, 0, lang)))}</button>
                <button class="btn" data-side="1">${esc(t('battles.playAs', x.enemyName))}</button>
                <button class="btn ghost" data-side="local">${esc(t('battles.local'))}</button>
              </div>
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>`;
  // Map previews: a small, non-interactive board per battle.
  for (const b of BATTLES) {
    const host = root.querySelector<HTMLElement>(`[data-map="${b.id}"]`)!;
    const view = new BoardView(host, false);
    const g = buildBattle(b);
    view.setTerrain(g.pos.terrain);
    view.sync(g.pos.board);
  }
  root.querySelector<HTMLSelectElement>('[data-el=level]')!.addEventListener('change', (e) => {
    level = Number((e.target as HTMLSelectElement).value);
    localStorage.setItem('tc.level', String(level));
  });
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-side]');
    if (!btn) return;
    const id = btn.closest<HTMLElement>('.battle-card')!.dataset.id!;
    const battle: Battle = BATTLES.find((b) => b.id === id)!;
    if (btn.dataset.side === 'local') start({ mode: 'local', rules: DEFAULT_RULES, battle: battle.id });
    else start({ mode: 'ai', rules: DEFAULT_RULES, mySide: Number(btn.dataset.side) as Side, level, battle: battle.id });
  });
}
