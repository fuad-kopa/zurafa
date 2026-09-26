import './styles.css';
import { initLang, getLang, setLang, onLangChange, t, LANGS, Lang } from './i18n';
import { rulesHtml, historyHtml } from './i18n/pages';
import { renderHome, openSetup } from './ui/home';
import { renderLearn } from './ui/learn';
import { renderPuzzles } from './ui/puzzleList';
import { GameScreen, GameConfig, loadSavedConfig } from './ui/gameScreen';
import { dailyPuzzle } from './puzzles';
import { renderProfile } from './ui/profile';
import { playTrack } from './ui/music';
import { renderBattles } from './ui/battles';
import { getGame, getProfile } from './profile';
import { loadPrefs } from './ui/prefs';
import { openSettings } from './ui/settings';
import { shouldOnboard, showOnboarding } from './ui/onboarding';

initLang();

// A pointed-arch niche with a crescent finial: the citadel, not a Staunton rook.
// The "Iwan" mark from the brand kit: a pointed arch and the giraffe, the piece no other chess has.
const BRAND_MARK = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M17 93 V47 C17 28 33 16 50 7 C67 16 83 28 83 47 V93" fill="none" stroke="#d9b45b" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 93 H91" stroke="#d9b45b" stroke-width="8" stroke-linecap="round"/><g transform="translate(9 26) scale(0.82)"><path d="M36 83 V62 L43 56 L41 24 L30 27 L27 20 L40 12 L42 3 L46 11 L50 4 L52 13 Q57 17 57 24 L59 54 L74 60 V83 H65 V71 H46 V83 Z" fill="#d9b45b"/></g></svg>`;

const app = document.getElementById('app')!;
let screen: GameScreen | null = null;
let pendingConfig: GameConfig | null = null;

loadPrefs();

function renderChrome(): void {
  const route = location.hash || '#/';
  const link = (href: string, label: string): string =>
    `<a href="${href}" class="${route === href || (href === '#/puzzles' && route.startsWith('#/puzzle/')) ? 'on' : ''}">${label}</a>`;
  document.getElementById('nav')!.innerHTML = `
    <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">${BRAND_MARK}</span><span class="brand-text">${t('app.title')}<small>${t('app.subtitle')}</small></span></a>
    <nav>${link('#/', t('nav.play'))}${link('#/learn', t('nav.learn'))}${link('#/puzzles', t('nav.puzzles'))}${link('#/battles', t('nav.battles'))}${link('#/rules', t('nav.rules'))}${link('#/history', t('nav.history'))}</nav>
    <div class="tools">
      <a class="tool profile-tool ${route === '#/profile' ? 'on' : ''}" href="#/profile" title="${t('profile.title')}" aria-label="${t('profile.title')}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg><span class="prating-chip">${getProfile().rating}</span></a>
      <button class="tool" data-tool="settings" title="${t('settings.title')}" aria-label="${t('settings.title')}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg></button>
      <select class="tool lang-select" data-tool="lang" aria-label="${t('game.lang')}" title="${t('game.lang')}">${LANGS.map(([code, name]) => `<option value="${code}"${code === getLang() ? ' selected' : ''}>${name}</option>`).join('')}</select>
    </div>`;
  document.title = t('app.fullTitle');
}

function startGame(config: GameConfig, roomId?: string): void {
  pendingConfig = config;
  const target = roomId ? `#/g/${roomId}` : '#/play';
  if (location.hash === target) route();
  else location.hash = target;
}

function route(): void {
  screen?.dispose();
  screen = null;
  const hash = location.hash || '#/';
  renderChrome();
  app.className = '';
  window.scrollTo(0, 0);

  const room = /^#\/g\/([a-z0-9]{4,16})$/.exec(hash);
  if (room) {
    const cfg: GameConfig = pendingConfig?.mode === 'online' && pendingConfig.roomId === room[1] ? pendingConfig : { mode: 'online', roomId: room[1] };
    pendingConfig = null;
    screen = new GameScreen(app, cfg, () => (location.hash = '#/'), () => openSetup('friend', startGame));
    return;
  }
  if (hash === '#/daily') {
    screen = new GameScreen(app, { mode: 'puzzle', id: dailyPuzzle().id, daily: true }, () => (location.hash = '#/'), () => (location.hash = '#/puzzles'));
    return;
  }
  const replay = /^#\/replay\/([a-z0-9]+)$/.exec(hash);
  if (replay) {
    const g = getGame(replay[1]);
    if (g) {
      const cfg: GameConfig =
        g.mode === 'ai' && g.mySide !== null
          ? { mode: 'ai', rules: g.rules, mySide: g.mySide, level: g.level ?? 3, moves: g.moves, replay: true, ended: { winner: g.winner, reason: g.reason }, battle: g.battle }
          : { mode: 'local', rules: g.rules, moves: g.moves, replay: true, ended: { winner: g.winner, reason: g.reason }, battle: g.battle };
      try {
        screen = new GameScreen(app, cfg, () => (location.hash = '#/profile'), () => (location.hash = '#/profile'));
        return;
      } catch {
        screen = null; // a record the current rules can no longer replay
      }
    }
    location.hash = '#/profile';
    return;
  }
  const puzzle = /^#\/puzzle\/([a-zA-Z]+)$/.exec(hash);
  if (puzzle) {
    screen = new GameScreen(app, { mode: 'puzzle', id: puzzle[1] }, () => (location.hash = '#/'), () => (location.hash = '#/puzzles'));
    return;
  }
  switch (hash) {
    case '#/play': {
      const cfg = pendingConfig ?? loadSavedConfig();
      pendingConfig = null;
      if (!cfg || cfg.mode === 'online') {
        location.hash = '#/';
        return;
      }
      screen = new GameScreen(app, cfg, () => (location.hash = '#/'), () => openSetup(cfg.mode === 'ai' ? 'ai' : 'local', startGame));
      break;
    }
    case '#/learn':
      renderLearn(app);
      playTrack('learn');
      break;
    case '#/battles':
      renderBattles(app, startGame);
      playTrack('menu');
      break;
    case '#/profile':
      playTrack('menu');
      renderProfile(app, (r) => (location.hash = r));
      break;
    case '#/puzzles':
      renderPuzzles(app);
      playTrack('learn');
      break;
    case '#/rules':
      app.innerHTML = `<article class="page">${rulesHtml(getLang())}</article>`;
      playTrack('menu');
      break;
    case '#/history':
      app.innerHTML = `<article class="page">${historyHtml(getLang())}</article>`;
      playTrack('menu');
      break;
    default:
      renderHome(app, startGame, (r) => (location.hash = r));
      playTrack('menu');
      if (shouldOnboard() && !document.querySelector('dialog.onboarding')) {
        showOnboarding((action) => {
          if (action === 'play') openSetup('ai', startGame);
          else if (action === 'learn') location.hash = '#/learn';
        });
      }
  }
}

document.getElementById('nav')!.addEventListener('click', (e) => {
  const tool = (e.target as HTMLElement).closest<HTMLElement>('[data-tool]')?.dataset.tool;
  if (tool === 'settings') openSettings();
});

document.getElementById('nav')!.addEventListener('change', (e) => {
  const sel = e.target as HTMLSelectElement;
  if (sel.dataset.tool === 'lang') setLang(sel.value as Lang);
});
onLangChange(route);
window.addEventListener('hashchange', route);
route();
