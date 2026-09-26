// History as a film: the existing chapters of the text, each staged with a still or a short loop,
// a timeline rail, reveal-on-scroll and slow camera drift on the pictures.

import { historyHtml } from '../i18n/pages';
import { getLang } from '../i18n';

interface Media {
  /** poster / still, under public/img */
  img: string;
  /** optional loop under public/video */
  video?: string;
}

/** Visual per chapter: 0 is the opening, 1..6 follow the six headings, 7 closes. */
const MEDIA: Media[] = [
  { img: 'hist-hero.jpg', video: 'hist-hero.mp4' },
  { img: 'hist-scholars.jpg' },
  { img: 'hist-court.jpg', video: 'hist-court.mp4' },
  { img: 'h-blindfold.jpg' },
  { img: 'hist-armies.jpg', video: 'hist-armies.mp4' },
  { img: 'hist-board.jpg' },
  { img: 'hist-manuscript.jpg' },
  { img: 'hist-dawn.jpg', video: 'hist-dawn.mp4' },
];

function reducedMotion(): boolean {
  return document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function mediaHtml(m: Media, i: number, caption: string, eager = false): string {
  const still = reducedMotion();
  const video = m.video && !still
    ? `<video class="hs-video" muted loop playsinline preload="${eager ? 'auto' : 'metadata'}" poster="./img/${m.img}"><source src="./video/${m.video}" type="video/mp4"></video>`
    : '';
  return `<div class="hs-media ${i % 2 ? 'drift-b' : 'drift-a'}">
      <img src="./img/${m.img}" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async">${video}
      ${caption ? `<figcaption>${caption}</figcaption>` : ''}
    </div>`;
}

export function renderHistory(root: HTMLElement): void {
  const src = document.createElement('div');
  src.innerHTML = historyHtml(getLang());
  const nodes = [...src.children];
  // Split the article at its headings.
  const chapters: { title: string; body: Element[] }[] = [{ title: '', body: [] }];
  for (const n of nodes) {
    if (n.tagName === 'H2') chapters.push({ title: n.textContent ?? '', body: [] });
    else chapters[chapters.length - 1].body.push(n);
  }
  const intro = chapters[0];
  const h1 = intro.body.find((n) => n.tagName === 'H1')?.textContent ?? '';
  const quote = intro.body.filter((n) => n.tagName === 'P').map((n) => n.outerHTML).join('');
  const last = chapters[chapters.length - 1];
  // The closing warning of Ibn Arabshah becomes the last scene.
  const closing = last.body.length > 1 && last.body[last.body.length - 1].tagName === 'P' ? last.body.pop()! : null;

  const scenes = chapters.slice(1).map((ch, k) => {
    const i = k + 1;
    const fig = ch.body.find((n) => n.tagName === 'FIGURE');
    const caption = fig?.querySelector('figcaption')?.textContent ?? '';
    const text = ch.body.filter((n) => n !== fig).map((n) => n.outerHTML).join('');
    const m = MEDIA[i] ?? { img: fig?.querySelector('img')?.getAttribute('src')?.replace('./img/', '') ?? 'h-macro.jpg' };
    return `<section class="hs ${i % 2 ? 'left' : 'right'}" data-n="${i}">
        ${mediaHtml(m, i, caption)}
        <div class="hs-text">
          <span class="hs-num">${String(i).padStart(2, '0')}</span>
          <h2>${ch.title}</h2>
          ${text}
        </div>
      </section>`;
  });

  root.innerHTML = `
    <article class="history">
      <header class="hs-hero">
        ${mediaHtml(MEDIA[0], 0, '', true)}
        <div class="hs-hero-text">
          <h1>${h1}</h1>
          ${quote}
        </div>
      </header>
      <div class="hs-rail" aria-hidden="true"><span class="hs-line"></span></div>
      ${scenes.join('')}
      ${closing ? `<section class="hs-end">${mediaHtml(MEDIA[7], 7, '')}<div class="hs-end-text">${closing.outerHTML}</div></section>` : ''}
    </article>`;

  // Reveal on scroll; play loops only while visible.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) el.classList.add('in');
        const v = el.querySelector<HTMLVideoElement>('video.hs-video');
        if (v) {
          if (e.isIntersecting) void v.play().catch(() => undefined);
          else v.pause();
        }
      }
    },
    { threshold: 0.18 },
  );
  root.querySelectorAll('.hs, .hs-hero, .hs-end').forEach((s) => io.observe(s));
}
