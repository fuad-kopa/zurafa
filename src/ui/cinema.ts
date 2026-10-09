// The storyteller's hall (cinema): our own films, and films by others embedded from YouTube.
// Others' films are never re-hosted: they play from youtube-nocookie.com and load only when a viewer presses play.

import { t, getLang, Key } from '../i18n';
import { STORYTELLER, roomHtml, bindRoom } from './room';

type Shelf = 'ours' | 'rules' | 'history';

interface Film {
  id: string;
  shelf: Shelf;
  /** Our file in public/video, or a YouTube id. */
  file?: string;
  youtube?: string;
  title: { ru: string; en: string };
  by: string;
  length: string;
  lang: string;
  note?: { ru: string; en: string };
}

const FILMS: Film[] = [
  { id: 'trailer', shelf: 'ours', file: 'trailer', title: { ru: 'Зурафа — трейлер', en: 'Zurafa — trailer' }, by: 'Zurafa', length: '0:29', lang: '' },
  { id: 'piece-giraffe', shelf: 'ours', file: 'piece-giraffe', title: { ru: 'Жираф', en: 'The giraffe' }, by: 'Zurafa', length: '0:05', lang: '' },
  { id: 'hist-court', shelf: 'ours', file: 'hist-court', title: { ru: 'Партия при дворе', en: 'A game at court' }, by: 'Zurafa', length: '0:05', lang: '' },
  { id: 'battle-ankara', shelf: 'ours', file: 'battle-ankara', title: { ru: 'Анкара, 1402', en: 'Ankara, 1402' }, by: 'Zurafa', length: '0:05', lang: '' },
  { id: 'tcc-1', shelf: 'rules', youtube: 'eekErvVYZLg', title: { ru: 'Шахматы Тамерлана. Часть 1: история, доска, ходы', en: 'Tamerlane Chess, Part One: history, board, moves' }, by: 'Tamerlane Chess Club', length: '11:29', lang: 'EN' },
  { id: 'tcc-2', shelf: 'rules', youtube: 'SMUbX4vJseg', title: { ru: 'Шахматы Тамерлана. Часть 2', en: 'Tamerlane Chess, Part Two' }, by: 'Tamerlane Chess Club', length: '12:08', lang: 'EN' },
  { id: 'tcc-3', shelf: 'rules', youtube: 'WRdUfTVKJBA', title: { ru: 'Шахматы Тамерлана. Часть 3: остальные правила', en: 'Tamerlane Chess, Part Three: the remaining rules' }, by: 'Tamerlane Chess Club', length: '11:29', lang: 'EN' },
  { id: 'tcc-values', shelf: 'rules', youtube: 'WA-p3OO-bRs', title: { ru: 'Ценность фигур, тактика, уточнения', en: 'Piece values, tactics and clarifications' }, by: 'Tamerlane Chess Club', length: '26:01', lang: 'EN' },
  { id: 'kg-toqtamish', shelf: 'history', youtube: 'y95sYUkQJuA', title: { ru: 'Возвышение Тимура: война с Тохтамышем', en: 'Rise of Timur: the war against Toqtamish' }, by: 'Kings and Generals', length: '18:08', lang: 'EN',
    note: { ru: 'Битвы на Кондурче и Тереке — в нашей игре это сценарии «Битв».', en: 'Kondurcha and the Terek, both scenarios in our Battles.' } },
  { id: 'kg-delhi', shelf: 'history', youtube: 'issEot6c0d0', title: { ru: 'Разграбление Дели, 1398', en: 'The sack of Delhi, 1398' }, by: 'Kings and Generals', length: '13:22', lang: 'EN' },
  { id: 'kg-ankara', shelf: 'history', youtube: 'sHH3lQ_O-xA', title: { ru: 'Битва при Анкаре, 1402', en: 'The Battle of Ankara, 1402' }, by: 'Kings and Generals', length: '22:41', lang: 'EN' },
  { id: 'ulugh-beg', shelf: 'history', youtube: '0oWdzHz8qJ8', title: { ru: 'Улугбек. Человек, открывший Вселенную', en: 'Ulugh Beg: The Man Who Unlocked the Universe' }, by: 'Karimov Foundation', length: '', lang: 'UZ',
    note: { ru: 'Документально-игровой фильм о внуке Тимура; премия Kineo в Венеции, 2017.', en: 'A documentary drama about Timur’s grandson; Kineo prize, Venice 2017.' } },
];

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pick = (x: { ru: string; en: string }): string => (getLang() === 'ru' ? x.ru : x.en);

function thumb(f: Film): string {
  if (f.youtube) return `./cinema/${f.youtube}.jpg`;
  if (f.id === 'trailer') return `./cinema/trailer-${getLang() === 'ru' ? 'ru' : 'en'}.jpg`;
  return `./img/${f.file === 'piece-giraffe' ? 'p-giraffe' : f.file}.jpg`;
}

function card(f: Film): string {
  const meta = [f.by, f.length, f.lang].filter(Boolean).join(' · ');
  return `<button type="button" class="film" data-film="${f.id}">
    <span class="film-thumb"><img src="${thumb(f)}" alt="" loading="lazy" decoding="async"><span class="film-play" aria-hidden="true"></span>${f.youtube ? '<span class="film-yt">YouTube</span>' : ''}</span>
    <span class="film-text"><b>${esc(pick(f.title))}</b><small>${esc(meta)}</small>${f.note ? `<small class="film-note">${esc(pick(f.note))}</small>` : ''}</span>
  </button>`;
}

function stage(f: Film): string {
  if (f.youtube) {
    return `<iframe src="https://www.youtube-nocookie.com/embed/${f.youtube}?autoplay=1&rel=0&hl=${getLang()}" title="${esc(pick(f.title))}"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }
  const src = f.id === 'trailer' ? `./video/trailer-${getLang() === 'ru' ? 'ru' : 'en'}.mp4` : `./video/${f.file}.mp4`;
  return `<video src="${src}" controls autoplay playsinline ${f.id === 'trailer' ? '' : 'loop muted'}></video>`;
}

function openFilm(f: Film): void {
  const dlg = document.createElement('dialog');
  dlg.className = 'film-dialog';
  dlg.innerHTML = `
    <div class="film-stage">${stage(f)}</div>
    <div class="film-bar">
      <div><b>${esc(pick(f.title))}</b><small>${esc([f.by, f.lang].filter(Boolean).join(' · '))}</small></div>
      ${f.youtube ? `<a class="link" href="https://www.youtube.com/watch?v=${f.youtube}" target="_blank" rel="noopener">${esc(t('cinema.onYoutube'))}</a>` : ''}
      <button type="button" class="btn" data-close>${esc(t('cinema.close'))}</button>
    </div>`;
  document.body.append(dlg);
  dlg.showModal();
  const close = (): void => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg || (e.target as HTMLElement).closest('[data-close]')) close(); });
  dlg.addEventListener('close', () => dlg.remove());
}

export function renderCinema(root: HTMLElement): void {
  const shelves: Shelf[] = ['ours', 'rules', 'history'];
  root.innerHTML = `
    <section class="page cinema">
      ${roomHtml(STORYTELLER, `<h1>${esc(t('cinema.title'))}</h1>`)}
      <p class="lead">${esc(t('cinema.lead'))}</p>
      ${shelves.map((s) => `
        <section class="lib-shelf" id="films-${s}">
          <h2>${esc(t(`cinema.shelf.${s}` as Key))}</h2>
          <div class="film-grid">${FILMS.filter((f) => f.shelf === s).map(card).join('')}</div>
        </section>`).join('')}
      <p class="cinema-note">${esc(t('cinema.note'))}</p>
    </section>`;
  bindRoom(root);
  root.querySelector('.cinema')!.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-film]')?.dataset.film;
    const f = FILMS.find((x) => x.id === id);
    if (f) openFilm(f);
  });
  // the curtain plays the trailer
  root.querySelector('[data-spot="curtain"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    openFilm(FILMS[0]);
  });
}
