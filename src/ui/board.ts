// SVG board: 11x10 squares plus the two citadels, tap-to-move and drag, keyboard navigation.

import { NSQ, SQX, SQY, sqAt, sqName, WHITE_CITADEL, BLACK_CITADEL, Side } from '../engine/geometry';
import { pieceDefs, pieceHref } from './pieces';
import * as P from '../engine/pieces';
import { getPrefs, is3dBoard } from './prefs';
import { pieceName, t } from '../i18n';

const NS = 'http://www.w3.org/2000/svg';
const COLS = 13;
const ROWS = 10;
/** Carved boards get a frame band above and below the squares. */
const PAD_3D = 0.42;

function defs3d(): string {
  return (
    '<linearGradient id="bfStone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="bfs-a"/><stop offset=".55" class="bfs-b"/><stop offset="1" class="bfs-c"/></linearGradient>' +
    '<linearGradient id="bfGrout" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="bfg-a"/><stop offset="1" class="bfg-b"/></linearGradient>' +
    '<linearGradient id="bfGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a3"/><stop offset=".5" stop-color="#cfa84e"/><stop offset="1" stop-color="#8a6420"/></linearGradient>' +
    '<linearGradient id="bfShine" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>' +
    '<pattern id="bfGirih" width="1" height="1" patternUnits="userSpaceOnUse">' +
    '<path class="girih" d="M.5 .04 L.62 .38 L.96 .5 L.62 .62 L.5 .96 L.38 .62 L.04 .5 L.38 .38 Z"/>' +
    '<path class="girih" d="M.5 .2 L.71 .29 L.8 .5 L.71 .71 L.5 .8 L.29 .71 L.2 .5 L.29 .29 Z"/>' +
    '<path class="girih" d="M0 0 L.14 .14 M1 0 L.86 .14 M0 1 L.14 .86 M1 1 L.86 .86"/>' +
    '</pattern>' +
    '<filter id="bfTex" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="16" numOctaves="2" seed="3" result="n"/>' +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .95 0 0 0 0 .82 0 0 0 0 .45 0 0 0 .4 -.1" result="g"/>' +
    '<feComposite in="g" in2="SourceGraphic" operator="in" result="s"/><feBlend in="SourceGraphic" in2="s" mode="overlay"/></filter>' +
    '<filter id="bfWood" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".05 7" numOctaves="3" seed="5" result="n"/>' +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .75 0 0 0 0 .5 0 0 0 0 .28 0 0 0 .7 -.25" result="g"/>' +
    '<feComposite in="g" in2="SourceGraphic" operator="in" result="s"/><feBlend in="SourceGraphic" in2="s" mode="overlay"/></filter>' +
    '<filter id="bfCrackle" x="0" y="0" width="1" height="1"><feTurbulence type="turbulence" baseFrequency="3.2" numOctaves="3" seed="11" result="n"/>' +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 .12 0 0 0 0 .09 0 0 0 0 .05 0 0 0 -22 1.25"/></filter>'
  );
}

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
  private pad = 0;
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
      defs3d() +
      '<marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" class="arrow-head"/></marker>';
    this.svg.append(defs, this.gSquares, this.gHighlights, this.gPieces, this.gMarks, this.gArrow, this.gDrag);
    container.append(this.svg);
    this.applyTheme();
    this.drawSquares();
    if (interactive) this.bindInput();
  }

  // --- geometry -------------------------------------------------------------------------------

  private col(sq: number): number {
    return this.orientation === 0 ? SQX[sq] + 1 : 11 - SQX[sq];
  }
  private row(sq: number): number {
    return (this.orientation === 0 ? 9 - SQY[sq] : SQY[sq]) + this.pad;
  }
  private viewRows(): number {
    return ROWS + 2 * this.pad;
  }
  private sqFromCell(col: number, row: number): number {
    const x = this.orientation === 0 ? col - 1 : 11 - col;
    const y = this.orientation === 0 ? 9 - (row - this.pad) : row - this.pad;
    return sqAt(x, y);
  }
  private sqFromPoint(clientX: number, clientY: number): number {
    const r = this.svg.getBoundingClientRect();
    const col = Math.floor(((clientX - r.left) / r.width) * COLS);
    const row = Math.floor(((clientY - r.top) / r.height) * this.viewRows() - this.pad) + this.pad;
    return this.sqFromCell(col, row);
  }

  // --- drawing --------------------------------------------------------------------------------

  /** Frame band for the current theme; the viewBox follows. */
  private applyTheme(): void {
    this.pad = is3dBoard() ? PAD_3D : 0;
    this.svg.setAttribute('viewBox', `0 0 ${COLS} ${this.viewRows()}`);
  }

  private drawSquares(): void {
    this.gSquares.replaceChildren();
    const solid = is3dBoard();
    const H = this.viewRows();
    if (solid) {
      // A stone slab with a gold girih band, and a recessed gold-grouted bed for the glazed tiles.
      this.gSquares.append(
        el('rect', { x: 0, y: 0, width: COLS, height: H, rx: 0.2, class: 'bf-slab' }),
        el('rect', { x: 0, y: 0, width: COLS, height: H, rx: 0.2, class: 'bf-ornament' }),
        el('rect', { x: 0.14, y: 0.14, width: COLS - 0.28, height: H - 0.28, rx: 0.14, class: 'bf-line' }),
        el('rect', { x: 0.88, y: this.pad - 0.12, width: 11.24, height: 10.24, rx: 0.1, class: 'bf-bed' }),
        el('rect', { x: 0.93, y: this.pad - 0.07, width: 11.14, height: 10.14, rx: 0.08, class: 'bf-bed-in' }),
      );
    } else {
      this.gSquares.append(el('rect', { x: 0.94, y: -0.06, width: 11.12, height: 10.12, rx: 0.08, class: 'board-frame' }));
    }
    for (let sq = 0; sq < 110; sq++) {
      const c = this.col(sq);
      const r = this.row(sq);
      const dark = (SQX[sq] + SQY[sq]) % 2 === 0;
      const cls = dark ? 'sq sq-d' : 'sq sq-l';
      if (solid) {
        this.gSquares.append(
          el('rect', { x: c + 0.035, y: r + 0.035, width: 0.93, height: 0.93, rx: 0.05, class: `${cls} tile` }),
          el('rect', { x: c + 0.035, y: r + 0.035, width: 0.93, height: 0.93, rx: 0.05, class: 'tile-shine' }),
        );
      } else this.gSquares.append(el('rect', { x: c, y: r, width: 1, height: 1, class: cls }));
    }
    if (solid) this.gSquares.append(el('rect', { x: 0.94, y: this.pad - 0.06, width: 11.12, height: 10.12, rx: 0.08, class: 'bf-crackle' }));
    for (const cit of [WHITE_CITADEL, BLACK_CITADEL]) {
      const c = this.col(cit);
      const r = this.row(cit);
      const onRight = c === 12;
      const g = el('g', { class: 'citadel', transform: `translate(${c} ${r})` });
      if (solid) {
        // A gilded pointed-arch niche cut into the frame, like the iwans of the visual bible.
        g.append(el('path', { d: 'M0.13 0.94 V0.42 Q0.13 0.14 0.5 0.05 Q0.87 0.14 0.87 0.42 V0.94 Z', class: 'cit-arch' }));
        g.append(el('path', { d: 'M0.22 0.9 V0.46 Q0.22 0.25 0.5 0.16 Q0.78 0.25 0.78 0.46 V0.9 Z', class: 'cit-inner' }));
        g.append(el('path', { d: 'M0.33 0.78 V0.56 Q0.33 0.44 0.5 0.4 Q0.67 0.44 0.67 0.56 V0.78 Z', class: 'cit-glow' }));
      } else {
        // An iwan-like niche opening towards the board.
        const d = onRight
          ? 'M0 0.04 H0.5 Q0.94 0.04 0.94 0.5 Q0.94 0.96 0.5 0.96 H0 Z'
          : 'M1 0.04 H0.5 Q0.06 0.04 0.06 0.5 Q0.06 0.96 0.5 0.96 H1 Z';
        g.append(el('path', { d, class: 'citadel-bg' }));
        g.append(el('path', { d: 'M0.3 0.66 V0.4 H0.38 V0.47 H0.46 V0.4 H0.54 V0.47 H0.62 V0.4 H0.7 V0.66 Z', class: 'citadel-icon' }));
      }
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
    this.redraw();
  }

  /** Rebuild squares and re-place everything, e.g. after the orientation or the board theme changed. */
  private redraw(): void {
    this.applyTheme();
    this.drawSquares();
    for (const [sq, node] of this.pieces) this.place(node, sq);
    this.restack();
    this.drawHighlights();
    this.setMarks(this.currentMarks);
    this.setHint(this.hint[0], this.hint[1]);
  }

  /** Apply the board theme from settings (frame band, tiles) and rebuild the pieces. */
  refreshTheme(): void {
    this.redraw();
    this.refreshPieces();
  }
  getOrientation(): Side {
    return this.orientation;
  }

  private place(node: SVGGElement, sq: number): void {
    node.style.transform = `translate(${this.col(sq)}px, ${this.row(sq)}px)`;
  }

  /** Cut-out sprite for the carved set, or null when glyphs are on. Every pawn shares one body per side. */
  private carvedHref(piece: number): string | null {
    if (getPrefs().pieces !== 'carved') return null;
    const type = Math.abs(piece);
    return `./carved/${piece > 0 ? 'w' : 'b'}-${P.isPawn(type) ? 'pawn' : P.TYPE_ID[type]}.png`;
  }

  private fillPiece(g: SVGGElement, piece: number): void {
    g.replaceChildren();
    const carved = this.carvedHref(piece);
    if (carved) {
      // Sheet 06: height 0.92 of the cell, anchored 0.04 above the bottom edge, a soft shadow under the base.
      g.append(el('ellipse', { cx: 0.5, cy: 0.93, rx: 0.3, ry: 0.075, class: 'carved-shadow' }));
      g.append(el('image', { href: carved, x: 0.04, y: 0.04, width: 0.92, height: 0.92, preserveAspectRatio: 'xMidYMax meet' }));
      const type = Math.abs(piece);
      if (P.isPawn(type)) {
        // The master's emblem inlaid on the pawn's belly (the ivory pawn is a globe, the lapis one a classic pawn).
        const cy = piece > 0 ? 0.47 : 0.58;
        g.append(el('use', { href: `#bg-${type}`, x: 0.5 - 0.15, y: cy - 0.15, width: 0.3, height: 0.3, class: 'badge' }));
      }
      g.classList.add('carved');
    } else {
      g.classList.remove('carved');
      g.append(el('use', { href: pieceHref(Math.abs(piece), piece > 0 ? 0 : 1), x: 0.06, y: 0.05, width: 0.88, height: 0.88 }));
    }
  }

  private makePiece(piece: number, sq: number): SVGGElement {
    const g = el('g', { class: 'piece' });
    this.fillPiece(g, piece);
    g.dataset.piece = String(piece);
    this.place(g, sq);
    return g;
  }

  /** Tall carved pieces overlap the cell above, so lower rows must be painted later. */
  private restack(): void {
    if (getPrefs().pieces !== 'carved') return;
    const ordered = [...this.pieces.entries()].sort((a, b) => this.row(a[0]) - this.row(b[0]));
    for (const [, node] of ordered) if (node.parentNode === this.gPieces) this.gPieces.append(node);
  }

  /** Rebuild every piece node, e.g. after the piece set changed in settings. */
  refreshPieces(): void {
    for (const [, node] of this.pieces) node.remove();
    this.pieces.clear();
    this.sync(this.board);
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
          setTimeout(() => {
            this.fillPiece(node, want);
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
    if (slides.length) setTimeout(() => this.restack(), 220);
    else this.restack();
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
        const y = ((e.clientY - r.top) / r.height) * this.viewRows() - (e.pointerType === 'touch' ? 1.3 : 0.5);
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
