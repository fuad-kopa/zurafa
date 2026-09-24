// First launch: three slides, skipped in one tap, shown once.

import { t } from '../i18n';

const FLAG = 'zurafa.onboarded';
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
  let i = 0;
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
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'next') {
      i++;
      render();
    } else if (act === 'skip' || act === 'play' || act === 'learn') finish(act);
  });
}
