import { PUZZLES, solvedIds } from '../puzzles';
import { getLang, t } from '../i18n';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function renderPuzzles(root: HTMLElement): void {
  const solved = solvedIds();
  const lang = getLang();
  const firstOpen = PUZZLES.find((p) => !solved.includes(p.id));
  root.innerHTML = `
    <section class="learn">
      <h1>${esc(t('puzzles.title'))} <span class="count">${solved.filter((id) => PUZZLES.some((p) => p.id === id)).length}/${PUZZLES.length}</span></h1>
      <p class="lead">${esc(t('puzzles.intro'))}</p>
      <div class="puzzle-grid">
        ${PUZZLES.map((p, i) => `
          <a class="puzzle-card ${solved.includes(p.id) ? 'done' : ''} ${p === firstOpen ? 'next' : ''}" href="#/puzzle/${p.id}">
            <span class="num">${solved.includes(p.id) ? '✓' : i + 1}</span>
            <span><b>${esc(p.text[lang].title)}</b><small>${esc(p.text[lang].task)}</small></span>
          </a>`).join('')}
      </div>
    </section>`;
}
