// Profile page: name, rating, statistics and the stored games with review links.

import { getProfile, setName, stats, outcome, deleteGame, GameRecord, START_RATING } from '../profile';
import { LEVELS } from '../ai/levels';
import { t, getLang, Key } from '../i18n';
import { pieceSvg } from './pieces';
import * as P from '../engine/pieces';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function opponent(g: GameRecord): string {
  if (g.mode === 'ai') {
    const lvl = LEVELS.find((l) => l.id === g.level);
    return lvl ? t(`level.${lvl.key}` as Key) : t('profile.computer');
  }
  return t(g.mode === 'online' ? 'profile.online' : 'profile.local');
}

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(getLang(), { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit' });
}

export function renderProfile(root: HTMLElement, go: (route: string) => void): void {
  const host = document.createElement('div');
  root.replaceChildren(host);
  const render = (): void => {
    const p = getProfile();
    const s = stats();
    const best = LEVELS.find((l) => l.id === s.bestLevel);
    const rows = p.games
      .map((g) => {
        const o = outcome(g);
        const res = o === 'none' ? t(g.winner === 0 ? 'result.whiteWins' : g.winner === 1 ? 'result.blackWins' : 'result.draw') : t(`result.${o}` as Key);
        const delta = g.ratingAfter !== undefined && g.ratingBefore !== undefined ? g.ratingAfter - g.ratingBefore : null;
        return `<li class="grow ${o}">
          <span class="gres">${esc(res)}</span>
          <span class="gwho"><b>${esc(opponent(g))}</b><small>${esc(when(g.at))} · ${esc(t('profile.moves', String(Math.ceil(g.plies / 2))))} · ${esc(t(g.reason === 'resign' && g.mySide !== null && g.winner !== g.mySide ? 'reason.resign.self' : (`reason.${g.reason}` as Key)))}</small></span>
          ${delta !== null ? `<span class="gdelta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}</span>` : '<span class="gdelta"></span>'}
          <button class="btn small" data-replay="${g.id}">${esc(t('profile.review'))}</button>
          <button class="link gdel" data-del="${g.id}" aria-label="${esc(t('profile.delete'))}" title="${esc(t('profile.delete'))}">×</button>
        </li>`;
      })
      .join('');
    host.innerHTML = `
      <section class="page profile">
        <div class="phead">
          <span class="pavatar" aria-hidden="true">${pieceSvg(P.KING, 0, 56)}</span>
          <div class="pname">
            <label for="pname">${esc(t('profile.name'))}</label>
            <input id="pname" type="text" maxlength="24" value="${esc(p.name)}" placeholder="${esc(t('profile.name.ph'))}" autocomplete="nickname">
          </div>
          <div class="prating"><b>${p.rating}</b><small>${esc(t('profile.rating'))}</small></div>
        </div>
        <p class="pnote">${esc(t('profile.rated', String(START_RATING)))}</p>
        <div class="pstats">
          <div><b>${s.played}</b><small>${esc(t('profile.games'))}</small></div>
          <div><b>${s.wins}</b><small>${esc(t('profile.wins'))}</small></div>
          <div><b>${s.draws}</b><small>${esc(t('profile.draws'))}</small></div>
          <div><b>${s.losses}</b><small>${esc(t('profile.losses'))}</small></div>
          <div><b>${best ? esc(t(`level.${best.key}` as Key)) : '—'}</b><small>${esc(t('profile.best'))}</small></div>
          <div><b>${s.puzzles}</b><small>${esc(t('profile.puzzles'))}</small></div>
          <div><b>${s.streak}</b><small>${esc(t('profile.streak'))}</small></div>
        </div>
        <h2>${esc(t('profile.history'))}</h2>
        ${rows ? `<ul class="games">${rows}</ul>` : `<p class="pempty">${esc(t('profile.empty'))}</p>`}
      </section>`;
  };
  render();
  host.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'pname') setName(el.value);
  });
  host.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const replay = target.closest<HTMLElement>('[data-replay]')?.dataset.replay;
    if (replay) return go(`#/replay/${replay}`);
    const del = target.closest<HTMLElement>('[data-del]')?.dataset.del;
    if (del) {
      deleteGame(del);
      render();
    }
  });
}
