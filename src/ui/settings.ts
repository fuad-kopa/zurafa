// Settings sheet: a side panel on desktop, a bottom sheet on the phone. Changes apply at once.

import { t, getLang, setLang, LANGS, Lang } from '../i18n';
import { getPrefs, setPref, Prefs } from './prefs';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function openSettings(): void {
  document.querySelector('dialog.settings')?.remove();
  const dlg = document.createElement('dialog');
  dlg.className = 'settings';
  const render = (): void => {
    const p = getPrefs();
    const toggle = (key: keyof Prefs, title: string, desc: string): string => `
      <label class="srow">
        <span><b>${esc(title)}</b><small>${esc(desc)}</small></span>
        <input type="checkbox" role="switch" data-pref="${key}" ${p[key] ? 'checked' : ''}>
      </label>`;
    const seg = (key: keyof Prefs, title: string, desc: string, opts: [string, string][]): string => `
      <div class="srow">
        <span><b>${esc(title)}</b><small>${esc(desc)}</small></span>
        <div class="seg small-seg" data-pref="${key}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(p[key]) === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
      </div>`;
    dlg.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="shead"><h2>${esc(t('settings.title'))}</h2><button class="notice-close" data-act="close" aria-label="${esc(t('settings.close'))}">×</button></div>
      ${toggle('sound', t('settings.sound'), t('settings.sound.desc'))}
      ${seg('plain', t('settings.board'), t('settings.board.desc'), [['false', t('settings.board.chequered')], ['true', t('settings.board.plain')]])}
      ${seg('pieces', t('settings.pieces'), t('settings.pieces.desc'), [['icons', t('settings.pieces.icons')], ['carved', t('settings.pieces.carved')]])}
      ${toggle('coords', t('settings.coords'), t('settings.coords.desc'))}
      ${toggle('hints', t('settings.hints'), t('settings.hints.desc'))}
      ${toggle('coach', t('settings.coach'), t('settings.coach.desc'))}
      ${seg('motion', t('settings.motion'), t('settings.motion.desc'), [['system', t('settings.motion.system')], ['off', t('settings.motion.off')]])}
      <div class="srow">
        <span><b>${esc(t('game.lang'))}</b></span>
        <select class="tool lang-select" data-lang aria-label="${esc(t('game.lang'))}">${LANGS.map(([c, n]) => `<option value="${c}" ${c === getLang() ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>`;
  };
  render();
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === dlg || target.closest('[data-act="close"]')) return dlg.close();
    const opt = target.closest<HTMLElement>('.seg button');
    if (opt) {
      const key = (opt.parentElement as HTMLElement).dataset.pref as keyof Prefs;
      const v = opt.dataset.v!;
      setPref(key, (key === 'plain' ? v === 'true' : v) as never);
      render();
    }
  });
  dlg.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el instanceof HTMLInputElement && el.dataset.pref) setPref(el.dataset.pref as keyof Prefs, el.checked as never);
    if (el instanceof HTMLSelectElement && 'lang' in el.dataset) {
      setLang(el.value as Lang);
      render();
    }
  });
}
