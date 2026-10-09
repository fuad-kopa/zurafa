// A room: one illustrated scene of Timur's palace whose objects are entrances to sections of the game.
// The scene runs edge to edge. Desktop and phone get their own compositions where we have them;
// spots are rectangles in percent of each frame and stay glued to the picture when it is cropped.

import { t, getLang, Key } from '../i18n';

/** Rectangle in percent of the frame: left, top, width, height. */
export type Rect = [number, number, number, number];

export interface Spot {
  id: string;
  label: Key;
  /** One of: a hash route, a data-act handled by the page, a selector to scroll to, a selector to click. */
  href?: string;
  act?: string;
  scroll?: string;
  click?: string;
  desk: Rect;
  /** Omitted: not in the phone composition (the page lists it below the room anyway). */
  phone?: Rect;
}

export interface RoomDef {
  id: string;
  name: Key;
  /** Base path: <base>-d-day-1600/2400.webp, <base>-m-day-1080.webp; nights as -night-. */
  base: string;
  desk: [number, number];
  /** No phone frame: phones see the middle of the desktop frame. */
  phone?: [number, number];
  /** Night frames painted as edits of the day frames, same geometry. */
  night?: { desk: boolean; phone: boolean };
  /** 'none' when the picture's top holds something to click (the observatory's sky); the page then shows its own heading. */
  title?: 'top' | 'none';
  spots: Spot[];
}

export const AIWAN: RoomDef = {
  id: 'aiwan', name: 'room.aiwan', base: './rooms/aiwan', desk: [2400, 1018], phone: [1080, 1620],
  night: { desk: true, phone: true },
  spots: [
    { id: 'play', label: 'home.ai', act: 'ai', desk: [40, 74, 20, 19], phone: [30, 70, 40, 15] },
    { id: 'garden', label: 'room.spot.garden', href: '#/history', desk: [43, 22, 14, 48], phone: [39, 38, 22, 30] },
  ],
};

export const TENT: RoomDef = {
  id: 'tent', name: 'room.tent', base: './rooms/tent', desk: [2400, 1018], phone: [1080, 1620],
  spots: [
    { id: 'map', label: 'room.spot.map', scroll: '.battle-list', desk: [31, 68, 40, 18], phone: [6, 60, 88, 12] },
    { id: 'howto', label: 'room.spot.howto', scroll: '.battle-rules', desk: [9, 32, 15, 32], phone: [2, 38, 20, 22] },
  ],
};

export const LIBRARY: RoomDef = {
  id: 'library', name: 'room.library', base: './rooms/library', desk: [2400, 1029], phone: [1080, 1610],
  night: { desk: true, phone: false }, title: 'none',
  spots: [
    { id: 'rules', label: 'nav.rules', scroll: '.page h1', desk: [39, 50, 21, 38], phone: [30, 72, 40, 14] },
    { id: 'pieces', label: 'home.learn', href: '#/learn', desk: [81, 14, 17, 40], phone: [1, 48, 17, 30] },
    { id: 'scrolls', label: 'nav.history', href: '#/history', desk: [4, 56, 16, 36], phone: [85, 53, 14, 20] },
  ],
};

export const MADRASA: RoomDef = {
  id: 'madrasa', name: 'room.madrasa', base: './rooms/madrasa', desk: [2400, 1029],
  
  spots: [
    { id: 'lesson', label: 'course.continue', href: '#/course', desk: [42, 52, 16, 36] },
    { id: 'sandbox', label: 'room.spot.sandbox', href: '#/learn', desk: [7, 50, 19, 22] },
    { id: 'manuscript', label: 'nav.rules', href: '#/rules', desk: [74, 46, 15, 26] },
  ],
};

export const OBSERVATORY: RoomDef = {
  id: 'observatory', name: 'room.observatory', base: './rooms/observatory', desk: [2400, 1018], phone: [1080, 1620],
  title: 'none',
  spots: [
    { id: 'daily', label: 'daily.title', href: '#/daily', desk: [50, 4, 18, 22], phone: [42, 6, 20, 12] },
    { id: 'astrolabe', label: 'home.puzzles', scroll: '.puzzle-grid', desk: [1, 38, 15, 34], phone: [6, 63, 34, 14] },
    { id: 'charts', label: 'room.spot.mate2', href: '#/puzzles', desk: [68, 68, 28, 26], phone: [50, 66, 48, 14] },
  ],
};

export const CHAMBERS: RoomDef = {
  id: 'chambers', name: 'room.chambers', base: './rooms/chambers', desk: [2400, 1018],
  
  spots: [
    { id: 'chest', label: 'profile.history', scroll: '.profile h2', desk: [41, 64, 17, 28] },
    { id: 'medallion', label: 'profile.rating', scroll: '.pstats', desk: [27, 28, 7, 28] },
    { id: 'key', label: 'room.spot.account', scroll: '.account', desk: [66, 25, 6, 28] },
    { id: 'lamp', label: 'settings.title', click: '[data-tool="settings"]', desk: [68, 70, 8, 22] },
  ],
};

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const samarkand = (now: Date): Date => new Date(now.getTime() + (now.getTimezoneOffset() + 300) * 60000);

/** Local time in Samarkand (UTC+5, no daylight saving). */
export function samarkandTime(now = new Date()): string {
  return samarkand(now).toLocaleTimeString(getLang() === 'en' ? 'en-GB' : getLang(), { hour: '2-digit', minute: '2-digit' });
}

/** How much of the night frame shows, 0..1: full day 7:30–18:00, dusk until 20:30, night until 5:30, dawn until 7:30. */
export function nightLevel(now = new Date()): number {
  const d = samarkand(now);
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 7.5 && h < 18) return 0;
  if (h >= 18 && h < 20.5) return (h - 18) / 2.5;
  if (h >= 5.5 && h < 7.5) return (7.5 - h) / 2;
  return 1;
}

/** Labels of spots near a side hang inward instead of centred, so they never run off the screen. */
function edgeClass([x, , w]: Rect): string {
  const cx = x + w / 2;
  return cx < 22 ? ' edge-l' : cx > 78 ? ' edge-r' : '';
}

/** Phones without their own frame see the middle of the desktop one (4:3); spots outside that view are hidden there. */
function offPhone(room: RoomDef, [x, , w]: Rect): string {
  const [dw, dh] = room.desk;
  const half = Math.min(1, (4 / 3) / (dw / dh)) * 50;
  const cx = x + w / 2;
  return cx < 50 - half + 3 || cx > 50 + half - 3 ? ' off-phone' : '';
}

function spotHtml(s: Spot, rect: Rect, cls: string): string {
  const attrs = s.href ? `href="${s.href}"`
    : s.act ? `href="#" data-act="${s.act}"`
    : s.scroll ? `href="#" data-scroll="${esc(s.scroll)}"`
    : `href="#" data-click="${esc(s.click ?? '')}"`;
  const [x, y, w, h] = rect;
  return `<a class="spot ${cls}${edgeClass(rect)}" ${attrs} style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" data-spot="${s.id}">
    <span class="spot-dot" aria-hidden="true"></span><span class="spot-label">${esc(t(s.label))}</span></a>`;
}

/** Markup of a room. `title` is trusted HTML from the page (ignored when the room has title 'none');
 *  `tune` overrides a spot's link or label for this render, e.g. the next lesson. */
export function roomHtml(room: RoomDef, title = '', tune: Record<string, Partial<Spot>> = {}): string {
  const [dw, dh] = room.desk;
  const [pw, ph] = room.phone ?? [4, 3];
  const spots = room.spots.map((s) => ({ ...s, ...tune[s.id] }));
  const hasPhone = !!room.phone;
  const phoneSrc = hasPhone ? `${room.base}-m-day-1080.webp` : `${room.base}-d-day-1600.webp`;
  const nightPhone = room.night?.phone && hasPhone;
  return `
    <section class="room ${hasPhone ? 'has-phone' : 'no-phone'}" data-room="${room.id}"
      style="--ar-d:${dw}/${dh};--ard:${(dw / dh).toFixed(4)};--ar-p:${pw}/${ph};--arp:${(pw / ph).toFixed(4)}">
      <picture class="room-img">
        <source media="(max-width: 700px)" srcset="${phoneSrc}">
        <img src="${room.base}-d-day-1600.webp" srcset="${room.base}-d-day-1600.webp 1600w, ${room.base}-d-day-2400.webp 2400w"
          sizes="100vw" alt="" width="${dw}" height="${dh}" fetchpriority="high">
      </picture>
      ${room.night ? `<picture class="room-img room-night ${nightPhone ? '' : 'desk-only'}" aria-hidden="true">
        ${nightPhone ? `<source media="(max-width: 700px)" data-srcset="${room.base}-m-night-1080.webp">` : ''}
        <img data-src="${room.base}-d-night-1600.webp" data-srcset="${room.base}-d-night-1600.webp 1600w, ${room.base}-d-night-2400.webp 2400w"
          sizes="100vw" alt="" width="${dw}" height="${dh}">
      </picture>` : ''}
      <div class="room-shade ${room.title === 'none' ? 'quiet' : ''}" aria-hidden="true"></div>
      ${room.title === 'none' ? '' : `<div class="room-title">
        <p class="kicker">${esc(t(room.name))} · ${esc(t('room.samarkand'))} <time data-el="clock">${samarkandTime()}</time></p>
        ${title}
      </div>`}
      <nav class="room-spots" aria-label="${esc(t(room.name))}">
        ${spots.map((s) => spotHtml(s, s.desk, hasPhone ? 'on-desk' : 'on-both' + offPhone(room, s.desk))).join('')}
        ${hasPhone ? spots.filter((s) => s.phone).map((s) => spotHtml(s, s.phone!, 'on-phone')).join('') : ''}
      </nav>
    </section>`;
}

/** Night frames load only once evening comes, so daytime visitors never download them. */
function applyLight(room: HTMLElement): void {
  const level = nightLevel();
  room.style.setProperty('--night', level.toFixed(3));
  if (level <= 0) return;
  // a desk-only night layer is hidden on phones; do not fetch it there
  if (room.querySelector('.room-night.desk-only') && matchMedia('(max-width: 700px)').matches) return;
  for (const el of room.querySelectorAll<HTMLImageElement | HTMLSourceElement>('.room-night [data-srcset]')) {
    el.srcset = el.dataset.srcset!;
    if (el instanceof HTMLImageElement) el.src = el.dataset.src!;
    el.removeAttribute('data-srcset');
  }
}

/** Wires spots that scroll or click, and keeps the clock and the light current until the room leaves the page. */
export function bindRoom(root: HTMLElement): void {
  const room = root.querySelector<HTMLElement>('.room');
  if (!room) return;
  room.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-scroll], [data-click]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.scroll) document.querySelector(a.dataset.scroll)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    else if (a.dataset.click) document.querySelector<HTMLElement>(a.dataset.click)?.click();
  });
  const clock = room.querySelector<HTMLElement>('[data-el="clock"]');
  applyLight(room);
  const timer = setInterval(() => {
    if (!room.isConnected) return clearInterval(timer);
    if (clock) clock.textContent = samarkandTime();
    applyLight(room);
  }, 20000);
}
