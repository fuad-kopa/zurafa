// "Support Zurafa": a quiet dialog that says what the money is for and links to the payment services the owner
// chose. No amounts, no nagging, no payment data here; the game stays free whether or not anyone gives.

import { t, Key } from '../i18n';
import { donateLinks, donateCrypto, DonateService } from '../donate-config';
import { trackEvent } from '../analytics';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const SERVICE_NAME: Record<DonateService, string> = {
  boosty: 'Boosty', kofi: 'Ko-fi', bmc: 'Buy Me a Coffee', patreon: 'Patreon', paypal: 'PayPal', tribute: 'Tribute (Telegram)', other: '',
};

/** The heart used on the button and in the dialog. */
export const HEART = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';

export function openDonate(from: string): void {
  trackEvent(`donate/open/${from}`);
  const dlg = document.createElement('dialog');
  dlg.className = 'donate';
  const links = donateLinks();
  const crypto = donateCrypto();
  dlg.innerHTML = `
    <form method="dialog">
      <button class="notice-close" value="close" aria-label="×">×</button>
      <span class="donate-heart" aria-hidden="true">${HEART}</span>
      <h2>${esc(t('donate.title'))}</h2>
      <p>${esc(t('donate.lead'))}</p>
      <ul class="donate-goes">${(['server', 'art', 'langs'] as const).map((k) => `<li>${esc(t(`donate.for.${k}` as Key))}</li>`).join('')}</ul>
      ${links.length ? `<div class="donate-links">${links.map((l, i) => `<a class="btn ${i === 0 ? 'primary' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" data-service="${l.service}">${esc(l.label || SERVICE_NAME[l.service])}</a>`).join('')}</div>` : ''}
      ${crypto.length ? `<div class="donate-crypto"><h3>${esc(t('donate.crypto'))}</h3>${crypto.map((c) => `
        <div class="donate-addr"><span><b>${esc(c.coin)}</b> · ${esc(c.network)}</span><code>${esc(c.address)}</code><button type="button" class="btn small" data-copy="${esc(c.address)}">${esc(t('donate.copy'))}</button></div>`).join('')}
        <p class="dim small">${esc(t('donate.network'))}</p></div>` : ''}
      <p class="dim small">${esc(t('donate.free'))}</p>
    </form>`;
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === dlg) return dlg.close();
    const link = target.closest<HTMLAnchorElement>('[data-service]');
    if (link) trackEvent(`donate/go/${link.dataset.service}`);
    const copy = target.closest<HTMLButtonElement>('[data-copy]');
    if (copy) {
      void navigator.clipboard?.writeText(copy.dataset.copy!).then(() => (copy.textContent = t('donate.copied')));
    }
  });
}
