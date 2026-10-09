// A room: one illustrated scene of Timur's palace whose objects are entrances to sections of the game.
// Desktop and phone get their own compositions; spots are rectangles in percent of each frame.

import { t, getLang, Key } from '../i18n';

/** Rectangle in percent of the frame: left, top, width, height. */
export type Rect = [number, number, number, number];

export interface Spot {
  id: string;
  label: Key;
  /** Hash route or a data-act value handled by the page. */
  href?: string;
  act?: string;
  desk: Rect;
  /** Omitted: the spot is not in the phone composition and lives only in the list under the room. */
  phone?: Rect;
}

export interface RoomDef {
  id: string;
  name: Key;
  /** Base path without size suffix, e.g. './rooms/aiwan'. Files: <base>-d-day-1600.webp, -2400, <base>-m-day-1080.webp. */
  base: string;
  desk: [number, number];
  phone: [number, number];
  /** Night frames drawn as edits of the day frames (same geometry): <base>-d-night-1600/2400.webp, <base>-m-night-1080.webp. */
  night?: { desk: boolean; phone: boolean };
  spots: Spot[];
}

export const AIWAN: RoomDef = {
  id: 'aiwan',
  name: 'room.aiwan',
  base: './rooms/aiwan',
  desk: [2400, 1018],
  phone: [1080, 1620],
  night: { desk: true, phone: false },
  spots: [
    { id: 'play', label: 'home.ai', act: 'ai', desk: [40, 74, 20, 19], phone: [30, 70, 40, 15] },
    { id: 'garden', label: 'room.spot.garden', href: '#/history', desk: [43, 22, 14, 48], phone: [39, 38, 22, 30] },
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

function spotHtml(s: Spot, rect: Rect, cls: string): string {
  const attrs = s.href ? `href="${s.href}"` : `href="#" data-act="${s.act}"`;
  const [x, y, w, h] = rect;
  return `<a class="spot ${cls}" ${attrs} style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" data-spot="${s.id}">
    <span class="spot-dot" aria-hidden="true"></span><span class="spot-label">${esc(t(s.label))}</span></a>`;
}

/** Markup of a room with its title block; `title` is trusted HTML from the page. */
export function roomHtml(room: RoomDef, title: string): string {
  const [dw, dh] = room.desk;
  const [pw, ph] = room.phone;
  return `
    <section class="room" data-room="${room.id}" style="--ar-d:${dw}/${dh};--ar-p:${pw}/${ph}">
      <picture class="room-img">
        <source media="(max-width: 700px)" srcset="${room.base}-m-day-1080.webp" width="${pw}" height="${ph}">
        <img src="${room.base}-d-day-1600.webp" srcset="${room.base}-d-day-1600.webp 1600w, ${room.base}-d-day-2400.webp 2400w"
          sizes="(max-width: 1240px) 100vw, 1240px" alt="" width="${dw}" height="${dh}" fetchpriority="high">
      </picture>
      ${room.night ? `<picture class="room-img room-night ${room.night.phone ? '' : 'desk-only'}" aria-hidden="true">
        ${room.night.phone ? `<source media="(max-width: 700px)" data-srcset="${room.base}-m-night-1080.webp">` : ''}
        <img data-src="${room.base}-d-night-1600.webp" data-srcset="${room.base}-d-night-1600.webp 1600w, ${room.base}-d-night-2400.webp 2400w"
          sizes="(max-width: 1240px) 100vw, 1240px" alt="" width="${dw}" height="${dh}">
      </picture>` : ''}
      <div class="room-shade" aria-hidden="true"></div>
      <div class="room-title">
        <p class="kicker">${esc(t(room.name))} · ${esc(t('room.samarkand'))} <time data-el="clock">${samarkandTime()}</time></p>
        ${title}
      </div>
      <nav class="room-spots" aria-label="${esc(t(room.name))}">
        ${room.spots.map((s) => spotHtml(s, s.desk, 'on-desk')).join('')}
        ${room.spots.filter((s) => s.phone).map((s) => spotHtml(s, s.phone!, 'on-phone')).join('')}
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

/** Keeps the Samarkand clock and the light current until the room leaves the page. */
export function bindRoom(root: HTMLElement): void {
  const room = root.querySelector<HTMLElement>('.room');
  const clock = root.querySelector<HTMLElement>('[data-el="clock"]');
  if (!room || !clock) return;
  applyLight(room);
  const timer = setInterval(() => {
    if (!clock.isConnected) return clearInterval(timer);
    clock.textContent = samarkandTime();
    applyLight(room);
  }, 20000);
}
