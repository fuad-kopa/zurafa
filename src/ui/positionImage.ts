// A 1200×630 picture of a position for social networks and chats: the board on the left, the verdict on the
// right, nothing fetched from the network. The board is drawn as a self-contained SVG (our vector pieces and the
// square colours of the current theme) and rasterised onto a canvas, where the text is set in the site's own fonts.

import { SQX, SQY, WHITE_CITADEL, BLACK_CITADEL, Side } from '../engine/geometry';
import { pieceMarkup } from './pieces';

export const IMAGE_W = 1200;
export const IMAGE_H = 630;

export interface ImageText {
  /** small line above the verdict, e.g. the game's full title */
  eyebrow: string;
  /** the verdict, large */
  title: string;
  /** reason, date and the like */
  lines: string[];
  /** bottom-right signature */
  site: string;
}

const PIECE_CSS =
  '.pc .body{stroke-width:3.6;stroke-linejoin:round}.pc .detail{fill:none;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}' +
  '.pc-w .body{fill:#fbf3e0;stroke:#2b1d0e}.pc-w .detail{stroke:#2b1d0e}.pc-w .fillc{fill:#2b1d0e;stroke:none}' +
  '.pc-b .body{fill:#1d3478;stroke:#081029}.pc-b .detail{stroke:#ecc96f}.pc-b .fillc{fill:#ecc96f;stroke:none}' +
  '.pc .ring{stroke:#c9962f;stroke-width:5.5}.pc-b .ring{stroke:#ecc96f}.pc .tusk{stroke-width:4.2}' +
  '.pc .emblem{stroke-width:3;stroke-linejoin:round}.pc-w .emblem{fill:#2b1d0e;stroke:#2b1d0e}.pc-b .emblem{fill:#ecc96f;stroke:#ecc96f}';

function cssVar(name: string, fallback: string): string {
  try {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
  } catch {
    return fallback;
  }
}

/** The board as a stand-alone SVG string, 13×10 cells, from the given side's point of view. */
export function boardSvg(board: ArrayLike<number>, orientation: Side, cell = 46): string {
  const light = cssVar('--sq-l', '#f1e6cb');
  const dark = cssVar('--sq-d', '#5dbab0');
  const col = (sq: number): number => (orientation === 0 ? SQX[sq] + 1 : 11 - SQX[sq]);
  const row = (sq: number): number => (orientation === 0 ? 9 - SQY[sq] : SQY[sq]);
  const w = 13 * cell;
  const h = 10 * cell;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 13 10"><style>${PIECE_CSS}</style>`;
  out += `<rect x="0.94" y="-0.06" width="11.12" height="10.12" rx="0.08" fill="#0a1226" stroke="#ddb55c" stroke-width="0.05"/>`;
  for (let sq = 0; sq < 110; sq++) {
    const shade = (SQX[sq] + SQY[sq]) % 2 === 0 ? dark : light;
    out += `<rect x="${col(sq)}" y="${row(sq)}" width="1" height="1" fill="${shade}"/>`;
  }
  for (const cit of [WHITE_CITADEL, BLACK_CITADEL]) {
    const c = col(cit);
    const d = c === 12
      ? 'M0 0.04 H0.5 Q0.94 0.04 0.94 0.5 Q0.94 0.96 0.5 0.96 H0 Z'
      : 'M1 0.04 H0.5 Q0.06 0.04 0.06 0.5 Q0.06 0.96 0.5 0.96 H1 Z';
    out += `<g transform="translate(${c} ${row(cit)})"><path d="${d}" fill="#1d2c52" stroke="#ddb55c" stroke-width="0.045"/>`;
    out += `<path d="M0.3 0.66 V0.4 H0.38 V0.47 H0.46 V0.4 H0.54 V0.47 H0.62 V0.4 H0.7 V0.66 Z" fill="rgba(217,180,91,.28)"/></g>`;
  }
  for (let sq = 0; sq < board.length; sq++) {
    const p = board[sq];
    if (!p) continue;
    const side = p > 0 ? 'w' : 'b';
    out += `<svg x="${col(sq) + 0.06}" y="${row(sq) + 0.05}" width="0.88" height="0.88" viewBox="0 0 100 100" class="pc pc-${side}">${pieceMarkup(Math.abs(p))}</svg>`;
  }
  return out + '</svg>';
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Word wrap for the canvas; a word wider than the column (or a script without spaces) breaks by characters. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  const push = (): void => {
    if (line) lines.push(line);
    line = '';
  };
  for (const word of text.split(' ')) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= width) {
      line = trial;
      continue;
    }
    push();
    if (ctx.measureText(word).width <= width) {
      line = word;
      continue;
    }
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > width) push();
      line += ch;
    }
  }
  push();
  return lines;
}

export async function positionImage(board: ArrayLike<number>, orientation: Side, text: ImageText): Promise<Blob> {
  const cell = 46;
  const img = await loadSvg(boardSvg(board, orientation, cell));
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts are a nicety */
  }
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_W;
  canvas.height = IMAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = cssVar('--navy', '#0e1719');
  ctx.fillRect(0, 0, IMAGE_W, IMAGE_H);
  const bw = 13 * cell;
  const bh = 10 * cell;
  const bx = 40;
  const by = Math.round((IMAGE_H - bh) / 2);
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.drawImage(img, bx, by, bw, bh);
  ctx.shadowColor = 'transparent';

  const x = bx + bw + 56;
  const width = IMAGE_W - x - 48;
  const gold = cssVar('--gold', '#ddb55c');
  const cream = cssVar('--cream', '#f2e9d7');
  const dim = cssVar('--dim', '#aeb8b2');
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = gold;
  ctx.font = "600 18px 'Ysabeau Office', system-ui, sans-serif";
  let y = by + 36;
  for (const l of wrap(ctx, text.eyebrow.toUpperCase(), width)) {
    ctx.fillText(l, x, y);
    y += 24;
  }

  y += 36;
  ctx.fillStyle = cream;
  let size = 60;
  let titleLines: string[];
  do {
    ctx.font = `600 ${size}px Piazzolla, Georgia, serif`;
    titleLines = wrap(ctx, text.title, width);
    size -= 4;
  } while (titleLines.length > 3 && size >= 36);
  const lead = Math.round((size + 4) * 1.1);
  for (const l of titleLines) {
    ctx.fillText(l, x, y);
    y += lead;
  }

  y += 10;
  ctx.fillStyle = dim;
  ctx.font = "400 24px 'Ysabeau Office', system-ui, sans-serif";
  for (const line of text.lines) {
    for (const l of wrap(ctx, line, width)) {
      ctx.fillText(l, x, y);
      y += 32;
    }
  }

  ctx.fillStyle = gold;
  ctx.font = "600 22px 'Ysabeau Office', system-ui, sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText(text.site, IMAGE_W - 48, by + bh - 6);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/png'));
}

/** Hand the picture to the browser's download machinery. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
