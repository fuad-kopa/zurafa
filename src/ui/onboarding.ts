// First launch: three slides, skipped in one tap, shown once.

import { t, LANGS, getLang, setLang, Lang } from '../i18n';

const FLAG = 'zurafa.onboarded';
const BRAND = `<svg viewBox="0 0 100 100"><path d="M17 93 V47 C17 28 33 16 50 7 C67 16 83 28 83 47 V93" fill="none" stroke="#d9b45b" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 93 H91" stroke="#d9b45b" stroke-width="8" stroke-linecap="round"/><g transform="translate(9 26) scale(0.82)"><path d="M36 83 V62 L43 56 L41 24 L30 27 L27 20 L40 12 L42 3 L46 11 L50 4 L52 13 Q57 17 57 24 L59 54 L74 60 V83 H65 V71 H46 V83 Z" fill="#d9b45b"/></g></svg>`;
const SLIDES = [
  { img: './img/h-madrasa.jpg', k: 'onb.s1.kicker', title: 'onb.s1.title', text: 'onb.s1.text' },
  { img: './img/h-macro.jpg', k: 'onb.s2.kicker', title: 'onb.s2.title', text: 'onb.s2.text' },
  { img: './img/h-scribe.jpg', k: 'onb.s3.kicker', title: 'onb.s3.title', text: 'onb.s3.text' },
] as const;

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

export function showOnboarding(onDone: (action: 'play' | 'learn' | 'skip') => void): void {
  const dlg = document.createElement('dialog');
  dlg.className = 'onboarding';
  // Step 0 is the language choice; the three slides follow in the chosen language.
  let i = -1;
  const finish = (action: 'play' | 'learn' | 'skip'): void => {
    try {
      localStorage.setItem(FLAG, '1');
    } catch {
      /* ignore */
    }
    dlg.close();
    onDone(action);
  };
  const render = (): void => {
    if (i < 0) {
      dlg.innerHTML = `
        <div class="onb-body onb-lang">
          <div class="brand-mark big" aria-hidden="true">${BRAND}</div>
          <h2>Зурафа · Zurafa</h2>
          <p class="dim">Choose your language · Выберите язык</p>
          <div class="lang-grid">${LANGS.map(([code, name]) => `<button type="button" class="btn ${code === getLang() ? 'primary' : ''}" data-lang="${code}" lang="${code}">${name}</button>`).join('')}</div>
        </div>`;
      return;
    }
    const s = SLIDES[i];
    const last = i === SLIDES.length - 1;
    dlg.innerHTML = `
      <img class="onb-img" src="${s.img}" alt="">
      <div class="onb-body">
        <div class="onb-top"><span class="kicker">${i + 1} / ${SLIDES.length} · ${esc(t(s.k))}</span><button class="link" data-act="skip">${esc(t('onb.skip'))}</button></div>
        <h2>${esc(t(s.title))}</h2>
        <p>${esc(t(s.text))}</p>
        <div class="dots">${SLIDES.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="row">${last
          ? `<button class="btn primary" data-act="play">${esc(t('onb.play'))}</button><button class="btn" data-act="learn">${esc(t('onb.learn'))}</button>`
          : `<button class="btn primary" data-act="next">${esc(t('onb.next'))}</button>`}</div>
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
      i = 0;
      render();
      return;
    }
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'next') {
      i++;
      render();
    } else if (act === 'skip' || act === 'play' || act === 'learn') finish(act);
  });
}
