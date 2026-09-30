// Sign-in dialog: an email code (no passwords), plus Google and Telegram when they are switched on.

import { t } from '../i18n';
import { sendCode, verifyCode, signInWithGoogle } from '../cloud';
import { PROVIDERS } from '../cloud-config';
import { trackEvent } from '../analytics';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function openLogin(): void {
  document.querySelector('dialog.login')?.remove();
  const dlg = document.createElement('dialog');
  dlg.className = 'login';
  let email = '';
  let resendAt = 0;
  let timer = 0;

  const emailStep = (err = ''): void => {
    dlg.innerHTML = `
      <form method="dialog" class="login-form" data-step="email">
        <button type="button" class="notice-close" data-act="close" aria-label="×">×</button>
        <h2>${esc(t('account.title'))}</h2>
        <p class="dim">${esc(t('account.save.desc'))}</p>
        <label class="field"><span>${esc(t('account.email'))}</span>
          <input name="email" type="email" required autocomplete="email" inputmode="email" placeholder="${esc(t('account.email.ph'))}" value="${esc(email)}"></label>
        <p class="err" role="alert">${esc(err)}</p>
        <button class="btn primary wide" type="submit">${esc(t('account.sendCode'))}</button>
        ${PROVIDERS.google || PROVIDERS.telegram ? `<div class="or"><span>${esc(t('account.or'))}</span></div>` : ''}
        ${PROVIDERS.google ? `<button type="button" class="btn wide" data-act="google">${esc(t('account.google'))}</button>` : ''}
        ${PROVIDERS.telegram ? `<button type="button" class="btn wide" data-act="telegram">${esc(t('account.telegram'))}</button>` : ''}
        <p class="fine">${esc(t('account.privacy'))}</p>
      </form>`;
    dlg.querySelector<HTMLInputElement>('input[name=email]')!.focus();
  };

  const codeStep = (err = ''): void => {
    dlg.innerHTML = `
      <form method="dialog" class="login-form" data-step="code">
        <button type="button" class="notice-close" data-act="close" aria-label="×">×</button>
        <h2>${esc(t('account.title'))}</h2>
        <p class="dim">${esc(t('account.codeSent', email))}</p>
        <label class="field"><span>${esc(t('account.code'))}</span>
          <input name="code" required autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6,8}" maxlength="8" class="code-input"></label>
        <p class="err" role="alert">${esc(err)}</p>
        <button class="btn primary wide" type="submit">${esc(t('account.verify'))}</button>
        <div class="row login-links">
          <button type="button" class="link" data-act="resend" disabled></button>
          <button type="button" class="link" data-act="other">${esc(t('account.otherEmail'))}</button>
        </div>
      </form>`;
    dlg.querySelector<HTMLInputElement>('input[name=code]')!.focus();
    tickResend();
  };

  const tickResend = (): void => {
    const b = dlg.querySelector<HTMLButtonElement>('[data-act=resend]');
    if (!b) return;
    const left = Math.ceil((resendAt - Date.now()) / 1000);
    b.disabled = left > 0;
    b.textContent = left > 0 ? t('account.resendIn', String(left)) : t('account.resend');
  };

  const busy = (on: boolean): void => {
    dlg.querySelectorAll<HTMLButtonElement>('button[type=submit]').forEach((b) => (b.disabled = on));
  };

  dlg.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    busy(true);
    if (form.dataset.step === 'email') {
      email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return emailStep(t('account.badEmail'));
      const err = await sendCode(email);
      if (err) return emailStep(t('account.error'));
      resendAt = Date.now() + 60_000;
      codeStep();
    } else {
      const code = (form.elements.namedItem('code') as HTMLInputElement).value.trim();
      const err = await verifyCode(email, code);
      if (err) return codeStep(t('account.badCode'));
      trackEvent('login/email');
      dlg.close();
    }
  });

  dlg.addEventListener('click', async (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if ((e.target as HTMLElement) === dlg || act === 'close') return dlg.close();
    if (act === 'other') return emailStep();
    if (act === 'resend') {
      const err = await sendCode(email);
      resendAt = Date.now() + 60_000;
      return codeStep(err ? t('account.error') : '');
    }
    if (act === 'google') {
      trackEvent('login/google');
      await signInWithGoogle();
    }
  });

  dlg.addEventListener('close', () => {
    clearInterval(timer);
    dlg.remove();
  });
  timer = window.setInterval(tickResend, 1000);
  emailStep();
  document.body.append(dlg);
  dlg.showModal();
}
