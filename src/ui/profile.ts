// Profile page: portrait, name, rating with rank and graph, statistics, progress, record against each computer
// opponent, garden games, achievements, the game history with filters, and the player's data (copy, restore, reset).

import {
  getProfile, setName, setAvatar, stats, outcome, deleteGame, GameRecord, START_RATING, ratingSeries, records,
  GARDEN_GAMES, exportProgress, importProgress, resetProgress,
} from '../profile';
import { achievements, rankOf, courseProgress, battleProgress, puzzleProgress } from '../achievements';
import { LEVELS } from '../ai/levels';
import { t, getLang, Key, pieceName } from '../i18n';
import { pieceSvg } from './pieces';
import * as P from '../engine/pieces';
import type { Side } from '../engine/geometry';
import { findBattle } from '../battles';
import { cloudEnabled, currentAccount, onAccountChange, setNickname, signOut, deleteAccount } from '../cloud';
import { openLogin } from './login';
import { CHAMBERS, roomHtml, bindRoom } from './room';
import { downloadBlob } from './positionImage';
import { openDonate, HEART } from './donate';
import { donateEnabled } from '../donate-config';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const AVATARS = [P.KING, P.PRINCE, P.GENERAL, P.VIZIER, P.GIRAFFE, P.PICKET, P.KNIGHT, P.ROOK, P.ELEPHANT, P.CAMEL, P.WAR_ENGINE, P.PAWN_PAWN];
/** Garden game ids → the keys of their names. */
const GARDEN_NAME: Record<string, Key> = {
  shatranj: 'games.shatranj', oblong: 'games.oblong', tamma: 'games.tamma', husun: 'games.husun', nard: 'games.nard', toguz: 'games.mancala', asyk: 'games.ashyk',
};
type Filter = 'all' | 'ai' | 'online' | 'local' | 'battles';
const PAGE = 15;

function opponent(g: GameRecord): string {
  const b = findBattle(g.battle);
  const prefix = b ? `${b.text[getLang()].title} ${b.year} · ` : '';
  if (g.mode === 'ai') {
    const lvl = LEVELS.find((l) => l.id === g.level);
    return prefix + (lvl ? t(`level.${lvl.key}` as Key) : t('profile.computer'));
  }
  return prefix + t(g.mode === 'online' ? 'profile.online' : 'profile.local');
}

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(getLang(), { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit' });
}

/** A small line chart of the rating, gold, with the start line dashed. */
function ratingGraph(series: number[]): string {
  if (series.length < 2) return '';
  const w = 320;
  const h = 64;
  const lo = Math.min(...series, START_RATING) - 10;
  const hi = Math.max(...series, START_RATING) + 10;
  const x = (i: number): number => (i / (series.length - 1)) * w;
  const y = (v: number): number => h - ((v - lo) / (hi - lo)) * h;
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="pgraph" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(t('profile.graph'))}">
    <line x1="0" x2="${w}" y1="${y(START_RATING).toFixed(1)}" y2="${y(START_RATING).toFixed(1)}" class="pg-base"/>
    <polygon points="0,${h} ${pts} ${w},${h}" class="pg-fill"/>
    <polyline points="${pts}" class="pg-line"/>
    <circle cx="${x(series.length - 1).toFixed(1)}" cy="${y(series[series.length - 1]).toFixed(1)}" r="3.5" class="pg-dot"/>
  </svg>`;
}

function accountBlock(): string {
  if (!cloudEnabled()) return '';
  const a = currentAccount();
  if (!a)
    return `<div class="account card-soft">
      <div><b>${esc(t('account.save.title'))}</b><small>${esc(t('account.save.desc'))}</small></div>
      <button class="btn primary" data-acct="signin">${esc(t('account.signin'))}</button>
    </div>`;
  return `<div class="account card-soft signed">
    <div class="acc-who"><b>${esc(t('account.signedIn', a.nickname))}</b><small>${esc(a.email ?? '')} · ${esc(t('account.synced'))}</small></div>
    <label class="field acc-nick"><span>${esc(t('account.nick'))}</span><input id="anick" value="${esc(a.nickname)}" maxlength="20" autocomplete="nickname"><small class="anick-msg" aria-live="polite"></small></label>
    <div class="row"><button class="btn" data-acct="signout">${esc(t('account.signout'))}</button><button class="btn danger-ghost" data-acct="delete">${esc(t('account.delete'))}</button></div>
  </div>`;
}

const bar = (label: string, have: number, need: number, href: string): string => `
  <a class="pbar" href="${href}">
    <span class="pbar-top"><b>${esc(label)}</b><small>${have} / ${need}</small></span>
    <span class="pbar-track"><span class="pbar-fill" style="width:${need ? Math.round((have / need) * 100) : 0}%"></span></span>
  </a>`;

export function renderProfile(root: HTMLElement, go: (route: string) => void): void {
  const host = document.createElement('div');
  root.replaceChildren(host);
  let filter: Filter = 'all';
  let shown = PAGE;
  let picking = false;
  let pickSide: Side = getProfile().avatar?.side ?? 0;

  const render = (): void => {
    const p = getProfile();
    const s = stats();
    const best = LEVELS.find((l) => l.id === s.bestLevel);
    const series = ratingSeries();
    const trend = series.length > 1 ? series[series.length - 1] - series[Math.max(0, series.length - 11)] : 0;
    const avatar = p.avatar ?? { type: P.KING, side: 0 as Side };
    const winrate = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    const rec = records();
    const ach = achievements();
    const achDone = ach.filter((a) => a.have >= a.need).length;
    const course = courseProgress();
    const battles = battleProgress();
    const puzzles = puzzleProgress();

    const list = p.games.filter((g) => filter === 'all' || (filter === 'battles' ? !!g.battle : g.mode === filter && !g.battle));
    const rows = list
      .slice(0, shown)
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
    const filters: [Filter, Key][] = [['all', 'profile.filter.all'], ['ai', 'profile.computer'], ['online', 'profile.online'], ['local', 'profile.local'], ['battles', 'nav.battles']];

    const picker = picking
      ? `<div class="pavatar-pick" role="group" aria-label="${esc(t('profile.avatar.choose'))}">
          <div class="seg">${([0, 1] as Side[]).map((sd) => `<button type="button" data-aside="${sd}" class="${sd === pickSide ? 'on' : ''}">${esc(t(sd === 0 ? 'game.white' : 'game.black'))}</button>`).join('')}</div>
          <div class="pavatar-grid">${AVATARS.map((ty) => `<button type="button" class="pav ${ty === avatar.type && pickSide === avatar.side ? 'on' : ''}" data-avatar="${ty}" aria-label="${esc(pieceName(ty))}">${pieceSvg(ty, pickSide, 40)}</button>`).join('')}</div>
        </div>`
      : '';

    const opponents = LEVELS.map((l) => {
      const r = rec.levels[l.id] ?? { w: 0, d: 0, l: 0 };
      return `<li class="popp">
        <img class="av" src="./img/av-${l.id}.jpg" alt="" width="40" height="40" loading="lazy">
        <span class="popp-name"><b>${esc(t(`level.${l.key}` as Key))}</b><small>${esc(t(`level.${l.key}.desc` as Key))}</small></span>
        <span class="popp-score" title="${esc(t('profile.wdl'))}"><b class="w">${r.w}</b>·<b class="d">${r.d}</b>·<b class="l">${r.l}</b></span>
        <button class="btn small" data-play="${l.id}">${esc(t('games.play'))}</button>
      </li>`;
    }).join('');

    const garden = GARDEN_GAMES.map((id) => {
      const g = p.garden?.[id];
      return `<a class="pgarden ${g?.played ? '' : 'none'}" href="#/games/${id}"><b>${esc(t(GARDEN_NAME[id]))}</b><small>${esc(t('profile.garden.line', String(g?.played ?? 0), String(g?.wins ?? 0)))}</small></a>`;
    }).join('');

    const badges = ach.map((a) => {
      const done = a.have >= a.need;
      const pct = Math.round((Math.min(a.have, a.need) / a.need) * 100);
      return `<li class="ach ${done ? 'done' : ''}">
        <span class="ach-icon" aria-hidden="true">${pieceSvg(a.piece, done ? 0 : 1, 34)}</span>
        <span class="ach-text"><b>${esc(t(`ach.${a.id}` as Key))}</b><small>${esc(t(`ach.${a.id}.desc` as Key))}</small>
          ${a.need > 1 && !done ? `<span class="pbar-track"><span class="pbar-fill" style="width:${pct}%"></span></span><small class="ach-num">${a.need >= 100 ? a.have : `${a.have} / ${a.need}`}</small>` : ''}</span>
        ${done ? '<span class="ach-tick" aria-hidden="true">✓</span>' : ''}
      </li>`;
    }).join('');

    host.innerHTML = `
      <section class="page profile">
        ${roomHtml(CHAMBERS, `<h1>${esc(t('profile.title'))}</h1>`)}
        <div class="phead">
          <button type="button" class="pavatar" data-act="avatar" aria-expanded="${picking}" title="${esc(t('profile.avatar.choose'))}" aria-label="${esc(t('profile.avatar.choose'))}">${pieceSvg(avatar.type, avatar.side, 56)}</button>
          <div class="pname">
            <label for="pname">${esc(t('profile.name'))}</label>
            <input id="pname" type="text" maxlength="24" value="${esc(p.name)}" placeholder="${esc(t('profile.name.ph'))}" autocomplete="nickname">
            <small class="prank">${esc(t('profile.rank'))}: <b>${esc(t(`level.${rankOf(p.rating)}` as Key))}</b></small>
          </div>
          <div class="prating"><b>${p.rating}</b><small>${esc(t('profile.rating'))}</small>${trend ? `<span class="ptrend ${trend > 0 ? 'up' : 'down'}" title="${esc(t('profile.trend'))}">${trend > 0 ? '+' : ''}${trend}</span>` : ''}</div>
          ${picker}
          ${series.length > 1 ? `<div class="pgraph-wrap">${ratingGraph(series)}<small>${esc(t('profile.graph'))}</small></div>` : ''}
        </div>
        <p class="pnote">${esc(t('profile.rated', String(START_RATING)))}</p>
        ${accountBlock()}

        <div class="pstats">
          <div><b>${s.played}</b><small>${esc(t('profile.games'))}</small></div>
          <div><b>${s.wins}</b><small>${esc(t('profile.wins'))}</small></div>
          <div><b>${s.draws}</b><small>${esc(t('profile.draws'))}</small></div>
          <div><b>${s.losses}</b><small>${esc(t('profile.losses'))}</small></div>
          <div><b>${winrate}%</b><small>${esc(t('profile.winrate'))}</small></div>
          <div><b>${best ? esc(t(`level.${best.key}` as Key)) : '—'}</b><small>${esc(t('profile.best'))}</small></div>
          <div><b>${s.puzzles}</b><small>${esc(t('profile.puzzles'))}</small></div>
          <div><b>${s.streak}</b><small>${esc(t('profile.streak'))}</small></div>
        </div>

        <h2>${esc(t('profile.progress'))}</h2>
        <div class="pbars">
          ${bar(t('nav.learn'), course.done, course.total, '#/course')}
          ${bar(t('home.battles'), battles.won, battles.total, '#/battles')}
          ${bar(t('nav.puzzles'), puzzles.solved, puzzles.total, '#/puzzles')}
        </div>

        <h2>${esc(t('profile.opponents'))}</h2>
        <p class="pnote">${esc(t('profile.wdl'))} · ${esc(t('game.white'))}: ${rec.colours[0].w}·${rec.colours[0].d}·${rec.colours[0].l} · ${esc(t('game.black'))}: ${rec.colours[1].w}·${rec.colours[1].d}·${rec.colours[1].l}</p>
        <ul class="popps">${opponents}</ul>

        <h2>${esc(t('games.title'))}</h2>
        <div class="pgardens">${garden}</div>

        <h2>${esc(t('profile.achievements'))} <small class="h2-note">${esc(t('profile.achDone', String(achDone), String(ach.length)))}</small></h2>
        <ul class="achs">${badges}</ul>

        <h2>${esc(t('profile.history'))}</h2>
        <div class="seg pfilter" role="tablist">${filters.map(([f, k]) => `<button type="button" role="tab" aria-selected="${f === filter}" data-filter="${f}" class="${f === filter ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
        ${rows ? `<ul class="games">${rows}</ul>` : `<p class="pempty">${esc(t('profile.empty'))}</p>`}
        ${list.length > shown ? `<button class="btn pmore" data-act="more">${esc(t('profile.more'))}</button>` : ''}

        <h2>${esc(t('profile.data'))}</h2>
        <div class="pdata card-soft">
          <p>${esc(t('profile.data.desc'))}</p>
          <div class="row">
            <button class="btn" data-act="export">${esc(t('profile.data.export'))}</button>
            <label class="btn">${esc(t('profile.data.import'))}<input type="file" accept="application/json,.json" data-act="import" hidden></label>
            <button class="btn danger-ghost" data-act="reset">${esc(t('profile.data.reset'))}</button>
          </div>
          <small class="pdata-msg" aria-live="polite"></small>
        </div>
        ${donateEnabled() ? `<div class="pdonate card-soft">
          <span class="donate-heart" aria-hidden="true">${HEART}</span>
          <div><b>${esc(t('donate.card'))}</b><small>${esc(t('donate.lead'))}</small></div>
          <button class="btn primary" data-act="donate">${esc(t('donate.button'))}</button>
        </div>` : ''}
      </section>`;
    bindRoom(host);
  };
  render();
  const offAccount = onAccountChange(() => (host.isConnected ? render() : offAccount()));
  const msg = (text: string): void => {
    const el = host.querySelector('.pdata-msg');
    if (el) el.textContent = text;
  };

  host.addEventListener('change', async (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'pname') setName(el.value);
    if (el.id === 'anick') {
      const res = await setNickname(el.value.trim());
      const m = host.querySelector('.anick-msg');
      if (m) m.textContent = res === 'ok' ? t('account.nick.saved') : res === 'taken' ? t('account.nick.taken') : res === 'invalid' ? t('account.nick.invalid') : t('account.error');
    }
    if (el.dataset.act === 'import' && el.files?.[0]) {
      const ok = importProgress(await el.files[0].text());
      if (!ok) return msg(t('profile.data.bad'));
      msg(t('profile.data.imported'));
      // the lessons, puzzles and settings hold their own caches: start afresh with the restored copy
      setTimeout(() => location.reload(), 700);
    }
  });

  host.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const acct = target.closest<HTMLElement>('[data-acct]')?.dataset.acct;
    if (acct === 'signin') return openLogin();
    if (acct === 'signout') return void signOut();
    if (acct === 'delete') {
      const b = target.closest<HTMLButtonElement>('[data-acct]')!;
      if (!b.classList.contains('armed')) {
        b.classList.add('armed');
        b.textContent = t('account.delete.confirm');
        return;
      }
      void deleteAccount().then((ok) => {
        const m = host.querySelector('.anick-msg');
        if (m) m.textContent = ok ? t('account.deleted') : t('account.error');
      });
      return;
    }
    const aside = target.closest<HTMLElement>('[data-aside]')?.dataset.aside;
    if (aside !== undefined) {
      pickSide = Number(aside) as Side;
      return render();
    }
    const av = target.closest<HTMLElement>('[data-avatar]')?.dataset.avatar;
    if (av !== undefined) {
      setAvatar(Number(av), pickSide);
      picking = false;
      render();
      host.querySelector<HTMLElement>('.pavatar')?.focus();
      return;
    }
    const f = target.closest<HTMLElement>('[data-filter]')?.dataset.filter as Filter | undefined;
    if (f) {
      filter = f;
      shown = PAGE;
      return render();
    }
    const play = target.closest<HTMLElement>('[data-play]')?.dataset.play;
    if (play) {
      localStorage.setItem('tc.level', play);
      go('#/');
      window.dispatchEvent(new CustomEvent('zurafa:new-game', { detail: 'ai' }));
      return;
    }
    switch (target.closest<HTMLElement>('[data-act]')?.dataset.act) {
      case 'donate':
        return openDonate('profile');
      case 'avatar':
        picking = !picking;
        return render();
      case 'more':
        shown += PAGE;
        return render();
      case 'export': {
        const day = new Date().toISOString().slice(0, 10);
        downloadBlob(new Blob([exportProgress()], { type: 'application/json' }), `zurafa-${day}.json`);
        return msg(t('profile.data.exported'));
      }
      case 'reset': {
        const b = target.closest<HTMLButtonElement>('[data-act]')!;
        if (!b.classList.contains('armed')) {
          b.classList.add('armed');
          b.textContent = t('profile.data.resetConfirm');
          return;
        }
        resetProgress();
        location.reload();
        return;
      }
    }
    const replay = target.closest<HTMLElement>('[data-replay]')?.dataset.replay;
    if (replay) return go(`#/replay/${replay}`);
    const del = target.closest<HTMLElement>('[data-del]')?.dataset.del;
    if (del) {
      deleteGame(del);
      render();
    }
  });
}
