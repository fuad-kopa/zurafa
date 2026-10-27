// The Privacy and About pages inside the app (the same texts are also built as plain crawlable pages).

import { t, getLang } from '../i18n';
import { PRIVACY, ABOUT, LegalDoc } from '../legal';
import { openFeedback } from './feedback';
import { openDonate } from './donate';
import { donateEnabled } from '../donate-config';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function body(doc: LegalDoc): string {
  return doc.sections.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
}

export function renderLegal(root: HTMLElement, which: 'privacy' | 'about'): void {
  const doc = (which === 'privacy' ? PRIVACY : ABOUT)[getLang()];
  root.innerHTML = `
    <article class="page legal">
      <h1>${esc(doc.title)}</h1>
      <p class="lead">${esc(doc.lead)}</p>
      ${body(doc)}
      ${which === 'about' ? `<div class="row legal-actions"><button class="btn primary" data-act="feedback">${esc(t('feedback.title'))}</button>${donateEnabled() ? `<button class="btn" data-act="donate">${esc(t('donate.button'))}</button>` : ''}<a class="btn ghost" href="#/privacy">${esc(t('legal.privacy'))}</a></div>` : ''}
      ${doc.updated ? `<p class="legal-updated">${esc(doc.updated)}</p>` : ''}
    </article>`;
  root.querySelector('.legal')!.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'feedback') openFeedback('idea');
    if (act === 'donate') openDonate('about');
  });
  window.scrollTo(0, 0);
}
