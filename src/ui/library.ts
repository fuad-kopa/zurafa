// The library (encyclopedia): the library room, shelves of articles, a chronicle, and article pages with sources.

import { t, getLang, Key } from '../i18n';
import { ARTICLES, CHRONICLE, Article, ArticleText, Shelf } from '../library/articles';
import { LIBRARY, roomHtml, bindRoom } from './room';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const SHELVES: Shelf[] = ['game', 'people', 'sources', 'places'];

/** Articles exist in Russian and English; other languages read the English text. */
function textOf(a: Article): ArticleText {
  return getLang() === 'ru' ? a.text.ru : a.text.en;
}

function card(a: Article): string {
  const x = textOf(a);
  return `<a class="lib-card" href="#/library/${a.id}">
    ${a.image ? `<img src="${a.image}" alt="" loading="lazy" decoding="async">` : ''}
    <span class="lib-card-text"><b>${esc(x.title)}</b><small>${esc(x.lead)}</small></span>
  </a>`;
}

function fallbackNote(): string {
  const lang = getLang();
  return lang === 'ru' || lang === 'en' ? '' : `<p class="lib-note">${esc(t('library.fallback'))}</p>`;
}

export function renderLibrary(root: HTMLElement): void {
  const lang = getLang();
  root.innerHTML = `
    <section class="page library">
      ${roomHtml({ ...LIBRARY, title: 'top' }, `<h1>${esc(t('library.title'))}</h1>`)}
      <p class="lead">${esc(t('library.lead'))}</p>
      ${fallbackNote()}
      <nav class="lib-quick">
        <a class="btn" href="#/rules">${esc(t('library.rules'))}</a>
        <a class="btn" href="#/learn">${esc(t('home.learn'))}</a>
        <a class="btn" href="#/history">${esc(t('library.story'))}</a>
      </nav>
      ${SHELVES.map((s) => {
        const items = ARTICLES.filter((a) => a.shelf === s);
        // rows without a lonely last card: 2 or 4 go in pairs, 5 open with a wide card, the rest in threes
        const layout = items.length === 2 || items.length === 4 ? 'pairs' : items.length === 5 ? 'lead-wide' : 'threes';
        return `
        <section class="lib-shelf" id="shelf-${s}">
          <h2>${esc(t(`library.shelf.${s}` as Key))}</h2>
          <div class="lib-grid ${layout}">${items.map(card).join('')}</div>
        </section>`;
      }).join('')}
      <section class="lib-shelf" id="shelf-chronicle">
        <h2>${esc(t('library.shelf.chronicle'))}</h2>
        <ol class="lib-chronicle">${CHRONICLE.map((r) => `<li><b>${esc(r.year)}</b><span>${esc(lang === 'ru' ? r.ru : r.en)}</span></li>`).join('')}</ol>
      </section>
    </section>`;
  bindRoom(root);
}

export function renderArticle(root: HTMLElement, id: string): boolean {
  const a = ARTICLES.find((x) => x.id === id);
  if (!a) return false;
  const x = textOf(a);
  const shelf = ARTICLES.filter((y) => y.shelf === a.shelf);
  const next = shelf[shelf.indexOf(a) + 1] ?? ARTICLES[(ARTICLES.indexOf(a) + 1) % ARTICLES.length];
  const body = x.body.map((p) => (p.startsWith('## ') ? `<h2>${esc(p.slice(3))}</h2>` : `<p>${esc(p)}</p>`)).join('');
  root.innerHTML = `
    <article class="page lib-article">
      <a class="link lib-back" href="#/library">← ${esc(t('library.title'))}</a>
      <p class="kicker">${esc(t(`library.shelf.${a.shelf}` as Key))}</p>
      <h1>${esc(x.title)}</h1>
      <p class="lead">${esc(x.lead)}</p>
      ${fallbackNote()}
      ${a.image ? `<figure class="lib-figure"><img src="${a.image}" alt="" decoding="async"><figcaption>${esc(t('library.illustration'))}</figcaption></figure>` : ''}
      ${body}
      <section class="lib-sources">
        <h2>${esc(t('library.sources'))}</h2>
        <ul>${a.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</li>`).join('')}</ul>
      </section>
      <a class="lib-next" href="#/library/${next.id}"><small>${esc(t('library.next'))}</small><b>${esc(textOf(next).title)}</b></a>
    </article>`;
  window.scrollTo(0, 0);
  return true;
}
