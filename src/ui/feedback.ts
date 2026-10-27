// "Write to us": a short form for bugs, ideas and questions. The note goes to our feedback table together with
// the language, the page and the browser, so a bug can be reproduced; a contact is optional.

import { t, getLang, Key } from '../i18n';
import { sendFeedback, cloudEnabled } from '../cloud';
import { trackEvent } from '../analytics';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const LAST = 'zurafa.feedbackAt';
const DRAFT = 'zurafa.feedbackDraft';

export function openFeedback(kind: 'bug' | 'idea' | 'other' = 'bug'): void {
  trackEvent('feedback/open');
  const route = location.hash || '#/';
  let draft = '';
  try {
    draft = localStorage.getItem(DRAFT) ?? '';
  } catch {
    /* ignore */
  }
  const dlg = document.createElement('dialog');
  dlg.className = 'feedback';
  dlg.innerHTML = `
    <form>
      <button type="button" class="notice-close" data-act="close" aria-label="×">×</button>
      <h2>${esc(t('feedback.title'))}</h2>
      <p class="dim">${esc(t('feedback.lead'))}</p>
      <div class="seg" role="radiogroup" aria-label="${esc(t('feedback.kind'))}">${(['bug', 'idea', 'other'] as const).map((k) => `<button type="button" role="radio" aria-checked="${k === kind}" data-kind="${k}" class="${k === kind ? 'on' : ''}">${esc(t(`feedback.kind.${k}` as Key))}</button>`).join('')}</div>
      <label class="field"><span>${esc(t('feedback.message'))}</span><textarea name="message" rows="6" maxlength="2000" required minlength="3" placeholder="${esc(t(`feedback.ph.${kind}` as Key))}">${esc(draft)}</textarea></label>
      <label class="field"><span>${esc(t('feedback.contact'))}</span><input name="contact" maxlength="120" autocomplete="email" placeholder="${esc(t('feedback.contact.ph'))}"></label>
      <label class="fb-trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
      <p class="dim small">${esc(t('feedback.note'))} <a href="#/privacy" data-act="privacy">${esc(t('legal.privacy'))}</a></p>
      <div class="row end"><button type="submit" class="btn primary">${esc(t('feedback.send'))}</button></div>
      <p class="fb-msg" aria-live="polite"></p>
    </form>`;
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('close', () => dlg.remove());
  const form = dlg.querySelector('form')!;
  const area = form.elements.namedItem('message') as HTMLTextAreaElement;
  const msg = dlg.querySelector<HTMLElement>('.fb-msg')!;
  area.addEventListener('input', () => {
    try {
      localStorage.setItem(DRAFT, area.value);
    } catch {
      /* ignore */
    }
  });

  dlg.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === dlg) return dlg.close();
    const act = target.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'close' || act === 'privacy') return dlg.close();
    const k = target.closest<HTMLElement>('[data-kind]')?.dataset.kind as typeof kind | undefined;
    if (k) {
      kind = k;
      dlg.querySelectorAll<HTMLElement>('[data-kind]').forEach((b) => {
        b.classList.toggle('on', b.dataset.kind === k);
        b.setAttribute('aria-checked', String(b.dataset.kind === k));
      });
      area.placeholder = t(`feedback.ph.${k}` as Key);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = area.value.trim();
    if (text.length < 3) return void (msg.textContent = t('feedback.short'));
    // a field people never see: only scripts fill it in
    if ((form.elements.namedItem('website') as HTMLInputElement).value) return dlg.close();
    let last = 0;
    try {
      last = Number(localStorage.getItem(LAST)) || 0;
    } catch {
      /* ignore */
    }
    if (Date.now() - last < 60_000) return void (msg.textContent = t('feedback.wait'));
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    button.disabled = true;
    msg.textContent = '';
    const ok = cloudEnabled() && (await sendFeedback({
      kind,
      message: text,
      contact: (form.elements.namedItem('contact') as HTMLInputElement).value.trim() || null,
      lang: getLang(),
      route: route.slice(0, 120),
      agent: navigator.userAgent.slice(0, 300),
      version: __BUILD__,
    }));
    button.disabled = false;
    if (!ok) {
      trackEvent('feedback/failed');
      return void (msg.textContent = t('feedback.failed'));
    }
    trackEvent(`feedback/sent/${kind}`);
    try {
      localStorage.setItem(LAST, String(Date.now()));
      localStorage.removeItem(DRAFT);
    } catch {
      /* ignore */
    }
    form.innerHTML = `<button type="button" class="notice-close" data-act="close" aria-label="×">×</button><h2>${esc(t('feedback.thanks'))}</h2><p class="dim">${esc(t('feedback.thanks.text'))}</p><div class="row end"><button type="button" class="btn primary" data-act="close">${esc(t('feedback.close'))}</button></div>`;
  });
}
