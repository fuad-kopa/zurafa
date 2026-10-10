// The garden pavilion: games played in Timur's time besides the great chess. Shatranj is playable; the rest are on the way.

import { t, Key } from '../i18n';
import { GARDEN, roomHtml, bindRoom } from './room';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface GameCard {
  id: string;
  /** route when playable */
  href?: string;
  /** encyclopedia article */
  article?: string;
}

const CARDS: GameCard[] = [
  { id: 'shatranj', href: '#/games/shatranj', article: 'shatranj' },
  { id: 'nard', href: '#/games/nard', article: 'nard' },
  { id: 'mancala' },
  { id: 'ashyk' },
];

export function renderGames(root: HTMLElement): void {
  root.innerHTML = `
    <section class="page games">
      ${roomHtml(GARDEN, `<h1>${esc(t('games.title'))}</h1>`)}
      <p class="lead">${esc(t('games.lead'))}</p>
      <div class="games-grid">
        ${CARDS.map((c) => {
          const name = t(`games.${c.id}` as Key);
          const desc = t(`games.${c.id}.desc` as Key);
          const tag = c.href ? '' : `<span class="games-soon">${esc(t('games.soon'))}</span>`;
          const img = `<img src="./rooms/garden-card-${c.id}.webp" alt="" loading="lazy" decoding="async" width="800" height="400">`;
          const body = `<b>${esc(name)}</b>${tag}<small>${esc(desc)}</small>`;
          return c.href
            ? `<article class="games-card ready" id="game-${c.id}"><a href="${c.href}" tabindex="-1" aria-hidden="true">${img}</a><a class="games-main" href="${c.href}">${body}</a>
                <span class="games-links"><a class="btn primary small" href="${c.href}">${esc(t('games.play'))}</a>${c.article ? `<a class="link" href="#/library/${c.article}">${esc(t('games.read'))}</a>` : ''}</span></article>`
            : `<article class="games-card" id="game-${c.id}">${img}<div class="games-main">${body}</div></article>`;
        }).join('')}
      </div>
    </section>`;
  bindRoom(root);
}
