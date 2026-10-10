import './styles.css';
import { initLang, getLang, setLang, onLangChange, t, LANGS, Lang } from './i18n';
import { rulesHtml } from './i18n/pages';
import { renderHome, openSetup } from './ui/home';
import { renderLearn } from './ui/learn';
import { renderPuzzles } from './ui/puzzleList';
import { GameScreen, GameConfig, loadSavedConfig } from './ui/gameScreen';
import { dailyPuzzle } from './puzzles';
import { DEFAULT_RULES } from './engine/position';
import { renderProfile } from './ui/profile';
import { playTrack, stopMusic } from './ui/music';
import { renderBattles } from './ui/battles';
import { renderHistory } from './ui/history';
import { registerServiceWorker } from './ui/install';
import { trackView } from './analytics';
import { initCloud } from './cloud';
import { decodeShare } from './share';
import { getGame, getProfile } from './profile';
import { loadPrefs } from './ui/prefs';
import { openSettings } from './ui/settings';
import { shouldOnboard, showOnboarding } from './ui/onboarding';

initLang();

// A pointed-arch niche with a crescent finial: the citadel, not a Staunton rook.
// The "Iwan" mark from the brand kit: a pointed arch and the giraffe, the piece no other chess has.
const BRAND_MARK = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M17 93 V47 C17 28 33 16 50 7 C67 16 83 28 83 47 V93" fill="none" stroke="#d9b45b" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 93 H91" stroke="#d9b45b" stroke-width="8" stroke-linecap="round"/><g transform="translate(9 26) scale(0.82)"><path d="M36 83 V62 L43 56 L41 24 L30 27 L27 20 L40 12 L42 3 L46 11 L50 4 L52 13 Q57 17 57 24 L59 54 L74 60 V83 H65 V71 H46 V83 Z" fill="#d9b45b"/></g></svg>`;

/** Line icons for the bottom bar on phones (24 x 24, stroked in the text colour). */
const NAV_ICONS = {
  play: '<path d="M8 21h8M9 17h6M10 17l-.6-5h5.2L14 17M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M12 3v1"/>',
  learn: '<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5Z"/><path d="M12 6v13.5"/>',
  puzzles: '<path d="M12 3l2.2 3.8 4.3-.9-.9 4.3L21 12l-3.4 1.8.9 4.3-4.3-.9L12 21l-2.2-3.8-4.3.9.9-4.3L3 12l3.4-1.8-.9-4.3 4.3.9Z"/>',
  battles: '<path d="M6 21V4"/><path d="M6 4c4-2 7 2 12 0v8c-5 2-8-2-12 0"/>',
  games: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
  library: '<path d="M5 4h4v16H5zM10 4h4v16h-4z"/><path d="M15.5 5.2l3.8-1 3.2 15.4-3.8 1Z"/>',
  cinema: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.2v5.6l4.8-2.8Z"/>',
};

const app = document.getElementById('app')!;
let screen: GameScreen | null = null;
let pendingConfig: GameConfig | null = null;
let disposeCourse: (() => void) | null = null;
let courseToken = 0;

loadPrefs();

function renderChrome(): void {
  const route = location.hash || '#/';
  const link = (href: string, label: string, short = '', icon = ''): string =>
    `<a href="${href}" class="${route === href || (href === '#/puzzles' && route.startsWith('#/puzzle/')) || (href === '#/course' && (route.startsWith('#/lesson/') || route === '#/learn')) || (href === '#/games' && route.startsWith('#/games')) || (href === '#/library' && (route.startsWith('#/library') || route === '#/rules' || route === '#/history')) ? 'on' : ''}">${icon ? `<svg class="nav-ic" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>` : ''}<span class="nav-l">${label}</span>${short ? `<span class="nav-s" aria-hidden="true">${short}</span>` : ''}</a>`;
  document.getElementById('nav')!.innerHTML = `
    <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">${BRAND_MARK}</span><span class="brand-text">${t('app.title')}<small>${t('app.subtitle')}</small></span></a>
    <nav>${link('#/', t('nav.play'), t('nav.s.play'), NAV_ICONS.play)}${link('#/course', t('nav.learn'), t('nav.s.learn'), NAV_ICONS.learn)}${link('#/puzzles', t('nav.puzzles'), t('nav.s.puzzles'), NAV_ICONS.puzzles)}${link('#/battles', t('nav.battles'), t('nav.s.battles'), NAV_ICONS.battles)}${link('#/games', t('nav.games'), t('nav.s.games'), NAV_ICONS.games)}${link('#/library', t('nav.library'), t('nav.s.library'), NAV_ICONS.library)}${link('#/cinema', t('nav.cinema'), t('nav.s.cinema'), NAV_ICONS.cinema)}</nav>
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

registerServiceWorker();
initCloud();

function route(): void {
  screen?.dispose();
  screen = null;
  disposeCourse?.();
  disposeCourse = null;
  courseToken++;
  const hash = location.hash || '#/';
  renderChrome();
  trackView(hash);
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
  const view = /^#\/view\/([A-Za-z0-9_-]+)$/.exec(hash);
  if (view) {
    const g = decodeShare(view[1]);
    if (g) {
      try {
        screen = new GameScreen(app, { mode: 'local', rules: { ...DEFAULT_RULES, ...g.rules }, moves: g.moves, replay: true, ended: g.ended, battle: g.battle }, () => (location.hash = '#/'), () => openSetup('ai', startGame));
        return;
      } catch {
        screen = null; // a link from a different version of the rules
      }
    }
    location.hash = '#/';
    return;
  }
  const replay = /^#\/replay\/([a-z0-9]+)$/.exec(hash);
  if (replay) {
    const g = getGame(replay[1]);
    if (g) {
      const cfg: GameConfig =
        g.mode === 'ai' && g.mySide !== null
          ? { mode: 'ai', rules: g.rules, mySide: g.mySide, level: g.level ?? 3, moves: g.moves, replay: true, ended: { winner: g.winner, reason: g.reason }, battle: g.battle }
          : { mode: 'local', rules: g.rules, moves: g.moves, replay: true, ended: { winner: g.winner, reason: g.reason }, battle: g.battle, mySide: g.mySide ?? undefined };
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
  const lessonRoute = /^#\/lesson\/([a-z]+-\d+)$/.exec(hash);
  if (lessonRoute || hash === '#/course') {
    const token = ++courseToken;
    void import('./ui/lesson').then(({ renderLesson }) => import('./ui/course').then(({ renderCourse }) => {
      if (token !== courseToken) return;
      if (lessonRoute) disposeCourse = renderLesson(app, lessonRoute[1], (r) => (location.hash = r));
      else renderCourse(app);
    }));
    playTrack('learn');
    return;
  }
  const shelf = /^#\/library(?:\/([a-z0-9-]+))?$/.exec(hash);
  if (shelf) {
    void import('./ui/library').then(({ renderLibrary, renderArticle }) => {
      if (location.hash !== hash) return;
      if (!shelf[1]) renderLibrary(app);
      else if (!renderArticle(app, shelf[1])) location.hash = '#/library';
    });
    playTrack('menu');
    return;
  }
  if (hash === '#/games' || hash === '#/games/shatranj' || hash === '#/games/nard' || hash === '#/games/toguz' || hash === '#/games/asyk') {
    const token = ++courseToken;
    if (hash === '#/games') void import('./ui/games').then(({ renderGames }) => { if (token === courseToken) renderGames(app); });
    else if (hash === '#/games/asyk') void import('./ui/asyk').then(({ renderAsyk }) => { if (token === courseToken) disposeCourse = renderAsyk(app); });
    else if (hash === '#/games/toguz') void import('./ui/toguz').then(({ renderToguz }) => { if (token === courseToken) disposeCourse = renderToguz(app); });
    else if (hash === '#/games/nard') void import('./ui/nard').then(({ renderNard }) => { if (token === courseToken) disposeCourse = renderNard(app); });
    else void import('./ui/shatranj').then(({ renderShatranj }) => { if (token === courseToken) disposeCourse = renderShatranj(app); });
    playTrack('menu');
    return;
  }
  if (hash === '#/cinema') {
    void import('./ui/cinema').then(({ renderCinema }) => { if (location.hash === hash) renderCinema(app); });
    stopMusic();
    return;
  }
  const puzzle = /^#\/puzzle\/([a-zA-Z0-9]+)$/.exec(hash);
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
      app.innerHTML = `<article class="page"><a class="link lib-back" href="#/library">← ${t('library.title')}</a>${rulesHtml(getLang())}</article>`;
      playTrack('menu');
      break;
    case '#/history':
      renderHistory(app);
      playTrack('menu');
      break;
    default:
      renderHome(app, startGame, (r) => (location.hash = r));
      playTrack('menu');
      if (shouldOnboard() && !document.querySelector('dialog.onboarding')) {
        showOnboarding((action) => {
          // Straight into a game against the gentlest opponent, with the coach on.
          if (action === 'play') startGame({ mode: 'ai', rules: { ...DEFAULT_RULES }, mySide: 0, level: 1 });
          else if (action === 'learn') location.hash = '#/course';
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
onLangChange(() => {
  // Rebuild the game screen in place instead of bouncing to the home page.
  if (screen && location.hash === '#/play') pendingConfig = screen.snapshot() ?? pendingConfig;
  route();
});
window.addEventListener('hashchange', route);
route();
