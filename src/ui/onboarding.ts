// First launch in two taps: the language, then "how do we start?" — play at once, take the first
// lesson, or go to the home screen. The history and the rules live in their own sections.

import { t, LANGS, getLang, setLang, Lang } from '../i18n';
import { pieceSvg } from './pieces';
import * as P from '../engine/pieces';

const FLAG = 'zurafa.onboarded';
const BRAND = `<svg viewBox="0 0 100 100"><path d="M17 93 V47 C17 28 33 16 50 7 C67 16 83 28 83 47 V93" fill="none" stroke="#d9b45b" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 93 H91" stroke="#d9b45b" stroke-width="8" stroke-linecap="round"/><g transform="translate(9 26) scale(0.82)"><path d="M36 83 V62 L43 56 L41 24 L30 27 L27 20 L40 12 L42 3 L46 11 L50 4 L52 13 Q57 17 57 24 L59 54 L74 60 V83 H65 V71 H46 V83 Z" fill="#d9b45b"/></g></svg>`;

export type OnboardingAction = 'play' | 'learn' | 'skip';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function shouldOnboard(): boolean {
  try {
    return !localStorage.getItem(FLAG);
  } catch {
    return false;
  }
}

/** The browser's language if the game speaks it, so the right button is already lit. */
function guessLang(): Lang {
  const codes = LANGS.map(([c]) => c);
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split('-')[0] as Lang;
    if (codes.includes(base)) return base;
  }
  return getLang();
}

export function showOnboarding(onDone: (action: OnboardingAction) => void): void {
  const dlg = document.createElement('dialog');
  dlg.className = 'onboarding onb2';
  let step: 'lang' | 'start' = 'lang';
  const guessed = guessLang();
  const finish = (action: OnboardingAction): void => {
    try {
      localStorage.setItem(FLAG, '1');
    } catch {
      /* ignore */
    }
    dlg.close();
    onDone(action);
  };
  const choice = (act: OnboardingAction, piece: number, side: number, title: string, desc: string, primary = false): string => `
    <button type="button" class="onb-choice ${primary ? 'primary' : ''}" data-act="${act}">
      <span class="oc-icon">${pieceSvg(piece, side, 40)}</span>
      <span class="oc-text"><b>${esc(title)}</b><small>${esc(desc)}</small></span>
      <span class="oc-arrow" aria-hidden="true">→</span>
    </button>`;
  const render = (): void => {
    if (step === 'lang') {
      // the first screen is the palace gate at dusk; picking a language walks you in
      dlg.classList.add('at-gate');
      dlg.innerHTML = `
        <picture class="onb-gate" aria-hidden="true">
          <source media="(max-width: 700px)" srcset="./rooms/portal-m-1080.webp">
          <img src="./rooms/portal-d-1600.webp" srcset="./rooms/portal-d-1600.webp 1600w, ./rooms/portal-d-2400.webp 2400w" sizes="100vw" alt="" fetchpriority="high">
        </picture>
        <div class="onb-gate-shade" aria-hidden="true"></div>
        <div class="onb-gate-title">
          <div class="brand-mark big" aria-hidden="true">${BRAND}</div>
          <h2>Зурафа · Zurafa</h2>
          <p><span>Choose your language</span><span class="sep" aria-hidden="true"> · </span><span>Выберите язык</span></p>
        </div>
        <div class="lang-grid onb-gate-langs">${LANGS.map(([code, name]) => `<button type="button" class="btn ${code === guessed ? 'primary' : ''}" data-lang="${code}" lang="${code}">${name}</button>`).join('')}</div>`;
      return;
    }
    dlg.classList.remove('at-gate');
    dlg.innerHTML = `
      <div class="onb-hero"><img src="./rooms/aiwan-d-day-1600.webp" alt=""></div>
      <div class="onb-body onb-start">
        <h2>${esc(t('onb.start.title'))}</h2>
        <p class="dim">${esc(t('onb.start.lead'))}</p>
        <div class="onb-choices">
          ${choice('play', P.GIRAFFE, 0, t('onb.start.play'), t('onb.start.play.desc'), true)}
          ${choice('learn', P.ROOK, 0, t('onb.start.learn'), t('onb.start.learn.desc'))}
          ${choice('skip', P.KING, 1, t('onb.start.home'), t('onb.start.home.desc'))}
        </div>
      </div>`;
  };
  render();
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    finish('skip');
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => {
    const langBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-lang]');
    if (langBtn) {
      setLang(langBtn.dataset.lang as Lang);
      step = 'start';
      render();
      return;
    }
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act as OnboardingAction | undefined;
    if (act) finish(act);
  });
}
