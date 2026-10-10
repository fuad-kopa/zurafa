// Crawlable pages written at build time. The game itself lives behind hash routes, which search engines read as one
// page; these plain HTML pages carry the encyclopedia (ru, en) and the rules (all six languages) with their own
// titles, descriptions, canonical URLs and language alternates, and each one leads into the game.

import { ARTICLES, Article, ArticleText } from '../src/library/articles';
import { rulesHtml } from '../src/i18n/pages';
import { ru } from '../src/i18n/ru';
import { en } from '../src/i18n/en';
import { uz } from '../src/i18n/uz';
import { tr } from '../src/i18n/tr';
import { zh } from '../src/i18n/zh';
import { hi } from '../src/i18n/hi';

type Lang = 'ru' | 'en' | 'uz' | 'tr' | 'zh' | 'hi';
const DICT = { ru, en, uz, tr, zh, hi };
const SITE = 'https://zurafa.app/';
const RULE_LANGS: Lang[] = ['ru', 'en', 'uz', 'tr', 'zh', 'hi'];
const ARTICLE_LANGS: ('ru' | 'en')[] = ['ru', 'en'];

export interface StaticPage {
  path: string;
  html: string;
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const strip = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const depthPrefix = (path: string): string => '../'.repeat(path.split('/').length - 1);

interface Frame {
  lang: Lang;
  path: string;
  title: string;
  description: string;
  alternates: Partial<Record<Lang, string>>;
  body: string;
  jsonld: object;
  fonts: { serif: string; serifItalic: string; sans: string };
}

function frame(f: Frame): string {
  const up = depthPrefix(f.path);
  const t = DICT[f.lang];
  const canonical = SITE + f.path.replace(/index\.html$/, '');
  const alt = Object.entries(f.alternates)
    .map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${p!.replace(/index\.html$/, '')}">`)
    .join('\n    ');
  return `<!doctype html>
<html lang="${f.lang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0e1719">
    <title>${esc(f.title)}</title>
    <meta name="description" content="${esc(f.description)}">
    <link rel="canonical" href="${canonical}">
    ${alt}
    <link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
    <meta property="og:title" content="${esc(f.title)}">
    <meta property="og:description" content="${esc(f.description)}">
    <meta property="og:image" content="${SITE}img/og.jpg">
    <meta property="og:url" content="${canonical}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">${JSON.stringify(f.jsonld).replace(/</g, '\\u003c')}</script>
    <style>
      @font-face { font-family: 'Piazzolla'; src: url('${up}${f.fonts.serif}') format('woff2'); font-weight: 400 700; font-display: swap; }
      @font-face { font-family: 'Piazzolla'; src: url('${up}${f.fonts.serifItalic}') format('woff2'); font-weight: 400 700; font-style: italic; font-display: swap; }
      @font-face { font-family: 'Ysabeau Office'; src: url('${up}${f.fonts.sans}') format('woff2'); font-weight: 400 700; font-display: swap; }
      :root { color-scheme: dark; }
      body { margin: 0; background: #0e1719; color: #f2e9d7; font: 18px/1.65 'Piazzolla', Georgia, serif; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #2f4547; font-family: 'Ysabeau Office', system-ui, sans-serif; }
      header a { color: #e9cb85; text-decoration: none; font-weight: 600; }
      main { max-width: 760px; margin: 0 auto; padding: 24px 20px 64px; }
      h1 { font-size: clamp(32px, 6vw, 48px); line-height: 1.15; color: #e9cb85; margin: 8px 0 12px; }
      h2 { font-size: 26px; color: #e9cb85; margin: 32px 0 8px; }
      .lead { font-style: italic; font-size: 21px; border-left: 3px solid #ddb55c; padding-left: 16px; }
      img { max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #2f4547; display: block; }
      figure { margin: 18px 0; } figcaption { font: 14px 'Ysabeau Office', sans-serif; color: #aeb8b2; margin-top: 6px; }
      a { color: #3cb8aa; }
      .kicker { font: 600 15px 'Ysabeau Office', sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #ddb55c; margin: 0; }
      .cta { display: flex; flex-wrap: wrap; gap: 12px; margin: 36px 0 0; font-family: 'Ysabeau Office', sans-serif; }
      .cta a { padding: 12px 20px; border-radius: 10px; border: 1.5px solid #ddb55c; color: #e9cb85; text-decoration: none; font-weight: 600; }
      .cta a.primary { background: #ddb55c; color: #0e1719; }
      .sources { margin-top: 32px; padding-top: 12px; border-top: 1px solid rgba(221, 181, 92, .25); font: 15px/1.5 'Ysabeau Office', sans-serif; }
      ul.index { list-style: none; padding: 0; display: grid; gap: 14px; }
      ul.index a { display: block; padding: 14px 16px; border: 1px solid #2f4547; border-radius: 12px; background: #172427; color: inherit; text-decoration: none; }
      ul.index b { display: block; color: #f2e9d7; font-size: 20px; } ul.index span { color: #aeb8b2; font-size: 15px; }
      nav.langs { display: flex; gap: 10px; font-size: 14px; }
    </style>
  </head>
  <body>
    <header><a href="${up}">${esc(t['app.fullTitle'])}</a><nav class="langs">${Object.entries(f.alternates)
      .filter(([l]) => l !== f.lang)
      .map(([l, p]) => `<a href="${up}${p!.replace(/index\.html$/, '')}" hreflang="${l}">${l.toUpperCase()}</a>`)
      .join('')}</nav></header>
    <main>${f.body}</main>
  </body>
</html>
`;
}

function articleBody(a: Article, x: ArticleText, lang: 'ru' | 'en', up: string, next: Article): string {
  const t = DICT[lang];
  const body = x.body.map((p) => (p.startsWith('## ') ? `<h2>${esc(p.slice(3))}</h2>` : `<p>${esc(p)}</p>`)).join('\n');
  const img = a.image ? `<figure><img src="${up}${a.image.replace(/^\.\//, '')}" alt="${esc(x.title)}" loading="lazy"><figcaption>${esc(t['library.illustration'])}</figcaption></figure>` : '';
  const sources = a.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</li>`).join('');
  return `<p class="kicker"><a href="../">${esc(t['library.title'])}</a></p>
    <h1>${esc(x.title)}</h1>
    <p class="lead">${esc(x.lead)}</p>
    ${img}
    ${body}
    <section class="sources"><h2>${esc(t['library.sources'])}</h2><ul>${sources}</ul></section>
    <div class="cta"><a class="primary" href="${up}#/">${esc(t['nav.play'])}</a><a href="../${next.id}/">${esc(t['library.next'])}: ${esc(next.text[lang].title)}</a></div>`;
}

/** The landing page of one language: what the game is, what there is to do, and the way in. */
function landing(lang: Lang, fonts: Frame['fonts']): StaticPage {
  const t = DICT[lang];
  const path = `${lang}/index.html`;
  const up = depthPrefix(path);
  const entry = (title: string, desc: string, href: string): string => `<li><a href="${href}"><b>${esc(title)}</b><span>${esc(desc)}</span></a></li>`;
  const play = `${up}?lang=${lang}#/`;
  const doings = [
    entry(t['home.ai'], t['home.ai.desc'], play),
    entry(t['home.friend'], t['home.friend.desc'], play),
    entry(t['home.local'], t['home.local.desc'], play),
    entry(t['home.learn'], t['home.learn.desc'], `${up}?lang=${lang}#/learn`),
    entry(t['home.battles'], t['home.battles.desc'], `${up}?lang=${lang}#/battles`),
    entry(t['home.puzzles'], t['home.puzzles.desc'], `${up}?lang=${lang}#/puzzles`),
  ].join('');
  const games = (['shatranj', 'nard', 'mancala', 'ashyk'] as const)
    .map((g) => entry(t[`games.${g}`], t[`games.${g}.desc`], `${up}?lang=${lang}#/games`))
    .join('');
  const library = lang === 'ru' || lang === 'en' ? `<a href="library/">${esc(t['library.title'])}</a>` : '';
  const body = `<p class="kicker">${esc(t['home.kicker'])}</p>
    <h1>${esc(t['app.subtitle'])}</h1>
    <p class="lead">${esc(t['home.lead'])}</p>
    <figure><img src="${up}rooms/aiwan-d-day-1600.webp" alt="${esc(t['app.fullTitle'])}" width="1600" height="700"></figure>
    <p>${esc(t['app.tagline'])}</p>
    <div class="cta"><a class="primary" href="${play}">${esc(t['home.play'])}</a><a href="rules/">${esc(t['nav.rules'])}</a>${library}</div>
    <h2>${esc(t['app.title'])}</h2>
    <ul class="index">${doings}</ul>
    <h2>${esc(t['games.title'])}</h2>
    <p>${esc(t['games.lead'])}</p>
    <ul class="index">${games}</ul>
    <div class="cta"><a class="primary" href="${play}">${esc(t['home.play'])}</a></div>`;
  return {
    path,
    html: frame({
      lang, path, fonts,
      title: `${t['app.subtitle']} · ${t['app.title']}`,
      description: t['app.tagline'],
      alternates: Object.fromEntries(RULE_LANGS.map((l) => [l, `${l}/index.html`])),
      body,
      jsonld: {
        '@context': 'https://schema.org', '@type': 'WebPage', name: `${t['app.subtitle']} · ${t['app.title']}`, description: t['app.tagline'],
        inLanguage: lang, url: `${SITE}${lang}/`, isPartOf: { '@type': 'WebSite', name: 'Zurafa', url: SITE },
      },
    }),
  };
}

export function staticPages(fonts: Frame['fonts']): StaticPage[] {
  const pages: StaticPage[] = RULE_LANGS.map((l) => landing(l, fonts));
  // the encyclopedia: an index and an article page per language
  for (const lang of ARTICLE_LANGS) {
    const t = DICT[lang];
    const idx = `${lang}/library/index.html`;
    const items = ARTICLES.map((a) => `<li><a href="${a.id}/"><b>${esc(a.text[lang].title)}</b><span>${esc(a.text[lang].lead)}</span></a></li>`).join('');
    pages.push({
      path: idx,
      html: frame({
        lang, path: idx, fonts,
        title: `${t['library.title']} — ${t['app.fullTitle']}`,
        description: t['library.lead'],
        alternates: Object.fromEntries(ARTICLE_LANGS.map((l) => [l, `${l}/library/index.html`])),
        body: `<h1>${esc(t['library.title'])}</h1><p class="lead">${esc(t['library.lead'])}</p><ul class="index">${items}</ul>
          <div class="cta"><a class="primary" href="../../#/">${esc(t['nav.play'])}</a><a href="../rules/">${esc(t['nav.rules'])}</a></div>`,
        jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: t['library.title'], inLanguage: lang, url: `${SITE}${lang}/library/` },
      }),
    });
    ARTICLES.forEach((a, i) => {
      const path = `${lang}/library/${a.id}/index.html`;
      const x = a.text[lang];
      const next = ARTICLES[(i + 1) % ARTICLES.length];
      pages.push({
        path,
        html: frame({
          lang, path, fonts,
          title: `${x.title} — ${t['app.fullTitle']}`,
          description: x.lead,
          alternates: Object.fromEntries(ARTICLE_LANGS.map((l) => [l, `${l}/library/${a.id}/index.html`])),
          body: articleBody(a, x, lang, depthPrefix(path), next),
          jsonld: {
            '@context': 'https://schema.org', '@type': 'Article', headline: x.title, description: x.lead, inLanguage: lang,
            url: `${SITE}${lang}/library/${a.id}/`, image: a.image ? SITE + a.image.replace(/^\.\//, '') : `${SITE}img/og.jpg`,
            publisher: { '@type': 'Organization', name: 'Zurafa', url: SITE },
            citation: a.sources.map((s) => s.title),
          },
        }),
      });
    });
  }
  // the rules, in every language the game speaks
  for (const lang of RULE_LANGS) {
    const t = DICT[lang];
    const path = `${lang}/rules/index.html`;
    const up = depthPrefix(path);
    const html = rulesHtml(lang).replace(/src="\.\//g, `src="${up}`);
    const lead = strip(/<p class="lead">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '').slice(0, 300);
    pages.push({
      path,
      html: frame({
        lang, path, fonts,
        title: `${t['nav.rules']} — ${t['app.fullTitle']}`,
        description: lead || t['app.fullTitle'],
        alternates: Object.fromEntries(RULE_LANGS.map((l) => [l, `${l}/rules/index.html`])),
        body: `${html}<div class="cta"><a class="primary" href="${up}#/">${esc(t['nav.play'])}</a>${lang === 'ru' || lang === 'en' ? `<a href="../library/">${esc(t['library.title'])}</a>` : ''}</div>`,
        jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: `${t['nav.rules']} — ${t['app.fullTitle']}`, inLanguage: lang, url: `${SITE}${lang}/rules/` },
      }),
    });
  }
  return pages;
}

export function sitemap(pages: StaticPage[], date: string): string {
  const urls = ['', ...pages.map((p) => p.path.replace(/index\.html$/, ''))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${date}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export const ROBOTS = `User-agent: *
Allow: /
Sitemap: ${SITE}sitemap.xml
`;
