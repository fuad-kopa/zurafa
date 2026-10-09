// The course: units in teaching order, each a row of short lessons with the stars earned.

import COURSE from '../course/lessons.json';
import type { Unit, Lesson } from '../course/core';
import { starsOf, totals } from '../course/progress';
import { pieceSvg } from './pieces';
import { t, pieceName, moveText, Key } from '../i18n';
import { MADRASA, roomHtml, bindRoom } from './room';

export const UNITS = (COURSE as unknown as { units: Unit[] }).units;
export const ALL: Lesson[] = UNITS.flatMap((u) => u.lessons);

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const SPECIAL = new Set(['pawns', 'royals', 'citadel', 'terrain', 'mate']);

export function unitTitle(u: Unit): string {
  return SPECIAL.has(u.id) ? t(`unit.${u.id}` as Key) : pieceName(u.piece);
}

export function unitDesc(u: Unit): string {
  return SPECIAL.has(u.id) ? t(`unit.${u.id}.desc` as Key) : moveText(u.piece, false);
}

/** The first lesson without stars, in course order. */
export function nextLesson(): Lesson {
  return ALL.find((l) => starsOf(l.id) === 0) ?? ALL[ALL.length - 1];
}

export function renderCourse(root: HTMLElement): void {
  const { done, stars } = totals(ALL.map((l) => l.id));
  const next = nextLesson();
  const pct = Math.round((done / ALL.length) * 100);
  root.innerHTML = `
    <section class="page course">
      ${roomHtml(MADRASA, `<h1>${esc(t('course.title'))}</h1>`, { lesson: { href: `#/lesson/${next.id}`, label: done ? 'course.continue' : 'course.start' } })}
      <p class="lead">${esc(t('course.lead', String(ALL.length)))}</p>
      <div class="course-top card-soft">
        <div class="ct-progress">
          <b>${esc(t('course.progress', String(done), String(ALL.length)))}</b>
          <small>★ ${stars} / ${ALL.length * 3}</small>
          <span class="bar"><i style="width:${pct}%"></i></span>
        </div>
        <a class="btn primary" href="#/lesson/${next.id}">${esc(t(done ? 'course.continue' : 'course.start'))}</a>
      </div>
      <div class="units">
        ${UNITS.map((u, ui) => {
          const got = totals(u.lessons.map((l) => l.id));
          return `<article class="unit card-soft ${got.done === u.lessons.length ? 'complete' : ''}">
            <header>
              <span class="u-icon">${pieceSvg(u.piece, 0, 40)}</span>
              <div class="u-text"><span class="u-num">${ui + 1}</span><h2>${esc(unitTitle(u))}</h2><p>${esc(unitDesc(u))}</p></div>
              <span class="u-count">${got.done}/${u.lessons.length}</span>
            </header>
            <div class="chips">${u.lessons.map((l, i) => {
              const s = starsOf(l.id);
              return `<a class="chip s${s} ${l.id === next.id ? 'next' : ''}" href="#/lesson/${l.id}" aria-label="${esc(t('lesson.of', String(i + 1), String(u.lessons.length)))}"><b>${i + 1}</b><span>${s ? '★'.repeat(s) : ''}</span></a>`;
            }).join('')}</div>
          </article>`;
        }).join('')}
      </div>
      <p class="course-foot"><a href="#/learn">${esc(t('course.sandbox'))}</a></p>
    </section>`;
  bindRoom(root);
}
