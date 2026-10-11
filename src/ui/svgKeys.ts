// Keyboard play for the garden boards that are drawn from scratch on every change (toguz, nard): the clickable
// parts become buttons for screen readers and Tab, Enter or Space presses them, the arrow keys step between
// them, and focus comes back to the same part after the board is redrawn.

export interface KeyTargets {
  /** call at the end of every redraw */
  mark(): void;
}

/**
 * @param selector clickable parts inside the svg, each with a data attribute named `keyAttr`
 * @param label    what a screen reader says for the part
 */
export function keyTargets(svg: SVGSVGElement, selector: string, keyAttr: string, label: (el: SVGElement) => string): KeyTargets {
  let focused: string | null = null;

  svg.addEventListener('focusin', (e) => {
    const el = (e.target as Element).closest<SVGElement>(selector);
    focused = el?.getAttribute(keyAttr) ?? null;
  });
  svg.addEventListener('focusout', (e) => {
    if (!svg.contains(e.relatedTarget as Node | null)) focused = null;
  });
  svg.addEventListener('keydown', (e) => {
    const el = (document.activeElement as Element | null)?.closest<SVGElement>(selector);
    if (!el || !svg.contains(el)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const all = [...svg.querySelectorAll<SVGElement>(selector)];
    const next = all[(all.indexOf(el) + step + all.length) % all.length];
    next?.focus();
  });

  return {
    mark(): void {
      let again: SVGElement | null = null;
      svg.querySelectorAll<SVGElement>(selector).forEach((el) => {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', label(el));
        el.classList.add('key-target');
        if (focused !== null && el.getAttribute(keyAttr) === focused) again = el;
      });
      // the board was rebuilt under the player's focus: put it back where it was
      if (again) (again as SVGElement).focus({ preventScroll: true });
    },
  };
}
