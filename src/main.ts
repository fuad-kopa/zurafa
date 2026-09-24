import './styles.css';
import { initLang, getLang, setLang, onLangChange, t, LANGS, Lang } from './i18n';
import { rulesHtml, historyHtml } from './i18n/pages';
import { renderHome, openSetup } from './ui/home';
import { renderLearn } from './ui/learn';
import { renderPuzzles } from './ui/puzzleList';
import { GameScreen, GameConfig, loadSavedConfig } from './ui/gameScreen';
import { setSoundEnabled } from './ui/sound';

initLang();

// A pointed-arch niche with a crescent finial: the citadel, not a Staunton rook.
// The "Iwan" mark from the brand kit: a pointed arch and the giraffe, the piece no other chess has.
const BRAND_MARK = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M17 93 V47 C17 28 33 16 50 7 C67 16 83 28 83 47 V93" fill="none" stroke="#d9b45b" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 93 H91" stroke="#d9b45b" stroke-width="8" stroke-linecap="round"/><g transform="translate(9 26) scale(0.82)"><path d="M36 83 V62 L43 56 L41 24 L30 27 L27 20 L40 12 L42 3 L46 11 L50 4 L52 13 Q57 17 57 24 L59 54 L74 60 V83 H65 V71 H46 V83 Z" fill="#d9b45b"/></g></svg>`;

const app = document.getElementById('app')!;
let screen: GameScreen | null = null;
let pendingConfig: GameConfig | null = null;

let soundOn = localStorage.getItem('tc.sound') !== '0';
let plainBoard = localStorage.getItem('tc.plain') === '1';
setSoundEnabled(soundOn);
document.body.classList.toggle('plain-board', plainBoard);

function renderChrome(): void {
  const route = location.hash || '#/';
  const link = (href: string, label: string): string =>
    `<a href="${href}" class="${route === href || (href === '#/puzzles' && route.startsWith('#/puzzle/')) ? 'on' : ''}">${label}</a>`;
  document.getElementById('nav')!.innerHTML = `
    <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">${BRAND_MARK}</span><span class="brand-text">${t('app.title')}<small>${t('app.subtitle')}</small></span></a>
    <nav>${link('#/', t('nav.play'))}${link('#/learn', t('nav.learn'))}${link('#/puzzles', t('nav.puzzles'))}${link('#/rules', t('nav.rules'))}${link('#/history', t('nav.history'))}</nav>
    <div class="tools">
      <button class="tool" data-tool="plain" title="${t('game.plain')}" aria-pressed="${plainBoard}">▦</button>
      <button class="tool" data-tool="sound" title="${t('game.sound')}" aria-pressed="${soundOn}">${soundOn ? '♪' : '♪̸'}</button>
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
  const puzzle = /^#\/puzzle\/([a-z]+)$/.exec(hash);
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
      break;
    case '#/puzzles':
      renderPuzzles(app);
      break;
    case '#/rules':
      app.innerHTML = `<article class="page">${rulesHtml(getLang())}</article>`;
      break;
    case '#/history':
      app.innerHTML = `<article class="page">${historyHtml(getLang())}</article>`;
      break;
    default:
      renderHome(app, startGame, (r) => (location.hash = r));
  }
}

document.getElementById('nav')!.addEventListener('click', (e) => {
  const tool = (e.target as HTMLElement).closest<HTMLElement>('[data-tool]')?.dataset.tool;
  if (!tool) return;
  if (tool === 'sound') {
    soundOn = !soundOn;
    localStorage.setItem('tc.sound', soundOn ? '1' : '0');
    setSoundEnabled(soundOn);
    renderChrome();
  }
  if (tool === 'plain') {
    plainBoard = !plainBoard;
    localStorage.setItem('tc.plain', plainBoard ? '1' : '0');
    document.body.classList.toggle('plain-board', plainBoard);
    renderChrome();
  }
});

document.getElementById('nav')!.addEventListener('change', (e) => {
  const sel = e.target as HTMLSelectElement;
  if (sel.dataset.tool === 'lang') setLang(sel.value as Lang);
});
onLangChange(route);
window.addEventListener('hashchange', route);
route();
