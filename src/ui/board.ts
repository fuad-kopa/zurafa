// SVG board: 11x10 squares plus the two citadels, tap-to-move and drag, keyboard navigation.

import { NSQ, SQX, SQY, sqAt, sqName, WHITE_CITADEL, BLACK_CITADEL, Side } from '../engine/geometry';
import { pieceDefs, pieceHref } from './pieces';
import { pieceName, t } from '../i18n';

const NS = 'http://www.w3.org/2000/svg';
const COLS = 13;
const ROWS = 10;

export type MarkKind = 'move' | 'capture' | 'swap' | 'reloc' | 'ghost' | 'ghostCapture';
export interface Mark {
  sq: number;
  kind: MarkKind;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

export class BoardView {
  readonly svg: SVGSVGElement;
  onSquareClick: (sq: number) => void = () => {};
  /** Return true if the drop was accepted as a move. */
  onDrop: (from: number, to: number) => boolean = () => false;
  canDrag: (sq: number) => boolean = () => false;

  private orientation: Side = 0;
  private board = new Int8Array(NSQ);
  private pieces = new Map<number, SVGGElement>();
  private gSquares = el('g');
  private gHighlights = el('g');
  private gPieces = el('g');
  private gMarks = el('g', { class: 'marks' });
  private gArrow = el('g');
  private gDrag = el('g');
  private cursor = -1;
  private lastMove: number[] = [];
  private checkSq = -1;
  private selected = -1;
  private drag: { sq: number; x: number; y: number; active: boolean; node: SVGGElement | null } | null = null;

  constructor(container: HTMLElement, interactive = true) {
    this.svg = el('svg', { viewBox: `0 0 ${COLS} ${ROWS}`, class: 'board', role: 'application', tabindex: interactive ? 0 : -1 });
    this.svg.setAttribute('aria-label', t('a11y.board'));
    const defs = el('defs');
    defs.innerHTML =
      pieceDefs() +
      '<marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" class="arrow-head"/></marker>';
    this.svg.append(defs, this.gSquares, this.gHighlights, this.gPieces, this.gMarks, this.gArrow, this.gDrag);
    container.append(this.svg);
    this.drawSquares();
    if (interactive) this.bindInput();
  }

  // --- geometry -------------------------------------------------------------------------------

  private col(sq: number): number {
    return this.orientation === 0 ? SQX[sq] + 1 : 11 - SQX[sq];
  }
  private row(sq: number): number {
    return this.orientation === 0 ? 9 - SQY[sq] : SQY[sq];
  }
  private sqFromCell(col: number, row: number): number {
    const x = this.orientation === 0 ? col - 1 : 11 - col;
    const y = this.orientation === 0 ? 9 - row : row;
    return sqAt(x, y);
  }
  private sqFromPoint(clientX: number, clientY: number): number {
    const r = this.svg.getBoundingClientRect();
    const col = Math.floor(((clientX - r.left) / r.width) * COLS);
    const row = Math.floor(((clientY - r.top) / r.height) * ROWS);
    return this.sqFromCell(col, row);
  }

  // --- drawing --------------------------------------------------------------------------------

  private drawSquares(): void {
    this.gSquares.replaceChildren();
    const frame = el('rect', { x: 0.94, y: -0.06, width: 11.12, height: 10.12, rx: 0.08, class: 'board-frame' });
    this.gSquares.append(frame);
    for (let sq = 0; sq < 110; sq++) {
      const c = this.col(sq);
      const r = this.row(sq);
      const dark = (SQX[sq] + SQY[sq]) % 2 === 0;
      this.gSquares.append(el('rect', { x: c, y: r, width: 1, height: 1, class: dark ? 'sq sq-d' : 'sq sq-l' }));
    }
    for (const cit of [WHITE_CITADEL, BLACK_CITADEL]) {
      const c = this.col(cit);
      const r = this.row(cit);
      const onRight = c === 12;
      const g = el('g', { class: 'citadel', transform: `translate(${c} ${r})` });
      // An iwan-like niche opening towards the board.
      const d = onRight
        ? 'M0 0.04 H0.5 Q0.94 0.04 0.94 0.5 Q0.94 0.96 0.5 0.96 H0 Z'
        : 'M1 0.04 H0.5 Q0.06 0.04 0.06 0.5 Q0.06 0.96 0.5 0.96 H1 Z';
      g.append(el('path', { d, class: 'citadel-bg' }));
      g.append(el('path', { d: 'M0.3 0.66 V0.4 H0.38 V0.47 H0.46 V0.4 H0.54 V0.47 H0.62 V0.4 H0.7 V0.66 Z', class: 'citadel-icon' }));
      this.gSquares.append(g);
    }
    // Coordinates inside the edge squares.
    for (let x = 0; x < 11; x++) {
      const sq = sqAt(x, this.orientation === 0 ? 0 : 9);
      const tx = el('text', { x: this.col(sq) + 0.93, y: this.row(sq) + 0.95, class: `coord ${(SQX[sq] + SQY[sq]) % 2 === 0 ? 'coord-d' : 'coord-l'}`, 'text-anchor': 'end' });
      tx.textContent = 'abcdefghijk'[x];
      this.gSquares.append(tx);
    }
    for (let y = 0; y < 10; y++) {
      const sq = sqAt(this.orientation === 0 ? 0 : 10, y);
      const tx = el('text', { x: this.col(sq) + 0.06, y: this.row(sq) + 0.24, class: `coord ${(SQX[sq] + SQY[sq]) % 2 === 0 ? 'coord-d' : 'coord-l'}` });
      tx.textContent = String(y + 1);
      this.gSquares.append(tx);
    }
  }

  setOrientation(side: Side): void {
    if (side === this.orientation) return;
    this.orientation = side;
    this.drawSquares();
    for (const [sq, node] of this.pieces) this.place(node, sq);
    this.drawHighlights();
    this.setMarks(this.currentMarks);
    this.setHint(this.hint[0], this.hint[1]);
  }
  getOrientation(): Side {
    return this.orientation;
  }

  private place(node: SVGGElement, sq: number): void {
    node.style.transform = `translate(${this.col(sq)}px, ${this.row(sq)}px)`;
  }

  private makePiece(piece: number, sq: number): SVGGElement {
    const g = el('g', { class: 'piece' });
    const use = el('use', { href: pieceHref(Math.abs(piece), piece > 0 ? 0 : 1), x: 0.06, y: 0.05, width: 0.88, height: 0.88 });
    g.append(use);
    g.dataset.piece = String(piece);
    this.place(g, sq);
    return g;
  }

  /**
   * Bring the view in line with a board. `slides` are [from, to] pairs to animate first
   * (a swap passes two pairs); everything else is patched in place.
   */
  sync(board: Int8Array, slides: [number, number][] = []): void {
    const moving: [SVGGElement, number][] = [];
    for (const [from, to] of slides) {
      const node = this.pieces.get(from);
      if (node) {
        this.pieces.delete(from);
        moving.push([node, to]);
      }
    }
    for (const [node, to] of moving) {
      const victim = this.pieces.get(to);
      if (victim) {
        victim.classList.add('captured');
        setTimeout(() => victim.remove(), 200);
      }
      this.pieces.set(to, node);
      this.gPieces.append(node); // on top while sliding
      this.place(node, to);
    }
    for (let sq = 0; sq < NSQ; sq++) {
      const want = board[sq];
      const node = this.pieces.get(sq);
      if (node && Number(node.dataset.piece) === want) continue;
      if (node) {
        if (want !== 0 && moving.some(([n]) => n === node)) {
          // Promotion: keep the sliding node, swap the artwork when it lands.
          node.dataset.piece = String(want);
          const use = node.firstElementChild as SVGUseElement;
          setTimeout(() => {
            use.setAttribute('href', pieceHref(Math.abs(want), want > 0 ? 0 : 1));
            node.classList.add('promoted');
          }, 170);
          continue;
        }
        node.remove();
        this.pieces.delete(sq);
      }
      if (want !== 0) {
        const fresh = this.makePiece(want, sq);
        if (slides.length) fresh.classList.add('appear');
        this.pieces.set(sq, fresh);
        this.gPieces.append(fresh);
      }
    }
    this.board.set(board);
  }

  private currentMarks: Mark[] = [];
  setMarks(marks: Mark[]): void {
    this.currentMarks = marks;
    this.gMarks.replaceChildren();
    for (const m of marks) {
      const cx = this.col(m.sq) + 0.5;
      const cy = this.row(m.sq) + 0.5;
      switch (m.kind) {
        case 'move':
        case 'ghost':
          this.gMarks.append(el('circle', { cx, cy, r: 0.15, class: `mark mark-${m.kind}` }));
          break;
        case 'capture':
        case 'ghostCapture':
          this.gMarks.append(el('circle', { cx, cy, r: 0.42, class: `mark mark-${m.kind}` }));
          break;
        case 'swap':
          this.gMarks.append(el('circle', { cx, cy, r: 0.44, class: 'mark mark-swap' }));
          break;
        case 'reloc':
          this.gMarks.append(el('path', { d: `M${cx} ${cy - 0.3} L${cx + 0.3} ${cy} L${cx} ${cy + 0.3} L${cx - 0.3} ${cy} Z`, class: 'mark mark-reloc' }));
          break;
      }
    }
  }

  setSelected(sq: number): void {
    this.selected = sq;
    this.drawHighlights();
  }
  setLastMove(squares: number[]): void {
    this.lastMove = squares;
    this.drawHighlights();
  }
  setCheck(sq: number): void {
    this.checkSq = sq;
    this.drawHighlights();
  }

  private hint: [number, number] = [-1, -1];
  setHint(from: number, to: number): void {
    this.hint = [from, to];
    this.gArrow.replaceChildren();
    if (from < 0) return;
    const x1 = this.col(from) + 0.5;
    const y1 = this.row(from) + 0.5;
    const x2 = this.col(to) + 0.5;
    const y2 = this.row(to) + 0.5;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const k = (len - 0.3) / len;
    this.gArrow.append(el('line', { x1, y1, x2: x1 + (x2 - x1) * k, y2: y1 + (y2 - y1) * k, class: 'arrow', 'marker-end': 'url(#arrowhead)' }));
  }

  private drawHighlights(): void {
    this.gHighlights.replaceChildren();
    const add = (sq: number, cls: string): void => {
      if (sq < 0) return;
      this.gHighlights.append(el('rect', { x: this.col(sq), y: this.row(sq), width: 1, height: 1, class: `hl ${cls}` }));
    };
    for (const sq of this.lastMove) add(sq, 'hl-last');
    add(this.checkSq, 'hl-check');
    add(this.selected, 'hl-selected');
    if (this.cursor >= 0 && document.activeElement === this.svg) add(this.cursor, 'hl-cursor');
  }

  // --- input ----------------------------------------------------------------------------------

  private bindInput(): void {
    const svg = this.svg;
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const sq = this.sqFromPoint(e.clientX, e.clientY);
      if (sq < 0) return;
      svg.setPointerCapture(e.pointerId);
      this.drag = { sq, x: e.clientX, y: e.clientY, active: false, node: null };
    });
    svg.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d) return;
      if (!d.active) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5 || !this.canDrag(d.sq)) return;
        d.active = true;
        d.node = this.pieces.get(d.sq) ?? null;
        if (d.node) {
          d.node.classList.add('dragging');
          this.gDrag.append(d.node);
        }
        this.onSquareClick(d.sq); // selects the piece and shows its targets
      }
      if (d.node) {
        const r = svg.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * COLS - 0.5;
        const y = ((e.clientY - r.top) / r.height) * ROWS - (e.pointerType === 'touch' ? 1.3 : 0.5);
        d.node.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
    const finish = (e: PointerEvent, cancelled: boolean): void => {
      const d = this.drag;
      this.drag = null;
      if (!d) return;
      if (!d.active) {
        if (!cancelled) this.onSquareClick(d.sq);
        return;
      }
      const node = d.node;
      if (node) {
        node.classList.remove('dragging');
        this.gPieces.append(node);
      }
      const to = cancelled ? -1 : this.sqFromPoint(e.clientX, e.clientY);
      const accepted = to >= 0 && to !== d.sq && this.onDrop(d.sq, to);
      if (!accepted && node && this.pieces.get(d.sq) === node) this.place(node, d.sq);
    };
    svg.addEventListener('pointerup', (e) => finish(e, false));
    svg.addEventListener('pointercancel', (e) => finish(e, true));

    svg.addEventListener('keydown', (e) => {
      if (this.cursor < 0) this.cursor = sqAt(5, this.orientation === 0 ? 1 : 8);
      let col = this.col(this.cursor);
      let row = this.row(this.cursor);
      switch (e.key) {
        case 'ArrowLeft': col--; break;
        case 'ArrowRight': col++; break;
        case 'ArrowUp': row--; break;
        case 'ArrowDown': row++; break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.onSquareClick(this.cursor);
          return;
        default:
          return;
      }
      e.preventDefault();
      const next = this.sqFromCell(col, row);
      if (next >= 0) {
        this.cursor = next;
        const p = this.board[next];
        svg.setAttribute('aria-label', `${sqName(next)}, ${p ? `${t(p > 0 ? 'game.white' : 'game.black')} ${pieceName(Math.abs(p))}` : t('a11y.empty')}`);
        this.drawHighlights();
      }
    });
    svg.addEventListener('focus', () => this.drawHighlights());
    svg.addEventListener('blur', () => this.drawHighlights());
  }
}
