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
  spots: Spot[];
}

export const AIWAN: RoomDef = {
  id: 'aiwan',
  name: 'room.aiwan',
  base: './rooms/aiwan',
  desk: [2400, 1018],
  phone: [1080, 1620],
  spots: [
    { id: 'play', label: 'home.ai', act: 'ai', desk: [40, 74, 20, 19], phone: [30, 70, 40, 15] },
    { id: 'garden', label: 'room.spot.garden', href: '#/history', desk: [43, 22, 14, 48], phone: [39, 38, 22, 30] },
  ],
};

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Local time in Samarkand (UTC+5, no daylight saving). */
export function samarkandTime(now = new Date()): string {
  const d = new Date(now.getTime() + (now.getTimezoneOffset() + 300) * 60000);
  return d.toLocaleTimeString(getLang() === 'en' ? 'en-GB' : getLang(), { hour: '2-digit', minute: '2-digit' });
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

/** Keeps the Samarkand clock current until the room leaves the page. */
export function bindRoom(root: HTMLElement): void {
  const clock = root.querySelector<HTMLElement>('[data-el="clock"]');
  if (!clock) return;
  const timer = setInterval(() => {
    if (!clock.isConnected) clearInterval(timer);
    else clock.textContent = samarkandTime();
  }, 20000);
}
