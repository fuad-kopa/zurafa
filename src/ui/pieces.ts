// Piece artwork: bold silhouettes in a 100x100 box, readable at 28px.
// Every piece stands on the same pedestal; pawns are miniatures of their master piece on a low mound.

import * as P from '../engine/pieces';

const PEDESTAL = '<path d="M24 92 Q24 84 32 83 L68 83 Q76 84 76 92 Z"/>';

/** Body shapes (filled with the side colour). `d` marks are detail strokes/fills in the contrast colour. */
interface Glyph {
  body: string;
  detail?: string;
}

const GLYPHS: Record<number, Glyph> = {
  [P.KING]: {
    body:
      '<path d="M31 83 L35 54 L65 54 L69 83 Z"/>' +
      '<path d="M26 54 L21 25 L37 38 L50 17 L63 38 L79 25 L74 54 Z"/>' +
      '<circle cx="50" cy="11" r="6"/><circle cx="21" cy="22" r="4"/><circle cx="79" cy="22" r="4"/>',
    detail: '<path d="M30 47 H70" /><circle cx="50" cy="66" r="4" class="fillc"/>',
  },
  [P.PRINCE]: {
    body:
      '<path d="M33 83 L37 58 L63 58 L67 83 Z"/>' +
      '<path d="M29 58 L27 36 L40 46 L50 28 L60 46 L73 36 L71 58 Z"/>' +
      '<path d="M50 28 Q46 14 56 8 Q54 18 50 28 Z"/>',
    detail: '<path d="M33 52 H67"/>',
  },
  [P.ADV_KING]: {
    body:
      '<path d="M33 83 L37 58 L63 58 L67 83 Z"/>' +
      '<path d="M28 58 L22 42 L32 49 Q35 30 50 26 Q65 30 68 49 L78 42 L72 58 Z"/>' +
      '<path d="M50 26 L45 17 L50 8 L55 17 Z"/>',
    detail: '<path d="M30 50 H70"/><path d="M50 30 V46"/>',
  },
  [P.GENERAL]: {
    // Spiked helmet with a neck guard
    body:
      '<path d="M34 83 L38 64 L62 64 L66 83 Z"/>' +
      '<path d="M28 64 Q26 34 50 24 Q74 34 72 64 Z"/>' +
      '<path d="M47 26 L50 6 L53 26 Z"/>',
    detail: '<path d="M29 56 H71"/><path d="M50 56 V40"/>',
  },
  [P.VIZIER]: {
    // Turban with a jewel
    body:
      '<path d="M35 83 L39 66 L61 66 L65 83 Z"/>' +
      '<ellipse cx="50" cy="48" rx="25" ry="19"/>' +
      '<ellipse cx="50" cy="27" rx="12" ry="9"/>',
    detail: '<path d="M27 44 Q50 60 73 40"/><path d="M29 54 Q50 66 71 50"/><circle cx="50" cy="27" r="3.5" class="fillc"/>',
  },
  [P.ROOK]: {
    body:
      '<path d="M30 83 L34 40 L66 40 L70 83 Z"/>' +
      '<path d="M26 40 V18 H36 V27 H45 V18 H55 V27 H64 V18 H74 V40 Z"/>',
    detail: '<path d="M33 48 H67"/><path d="M46 83 V66 Q50 60 54 66 V83" class="fillc"/>',
  },
  [P.KNIGHT]: {
    body:
      '<path d="M30 83 L33 66 Q35 52 45 44 L36 47 L27 41 L33 30 L44 18 L46 8 L55 17 Q74 24 75 52 L73 83 Z"/>',
    detail: '<circle cx="45" cy="29" r="3" class="fillc"/><path d="M60 24 Q68 40 66 60"/>',
  },
  [P.PICKET]: {
    // Scout's tent with a pennant
    body:
      '<path d="M50 20 L78 83 L22 83 Z"/>' +
      '<path d="M48.5 22 V4 H51.5 V22 Z"/>' +
      '<path d="M51 4 L70 10 L51 16 Z"/>',
    detail: '<path d="M50 83 L50 52" /><path d="M50 52 L42 83 M50 52 L58 83"/>',
  },
  [P.GIRAFFE]: {
    body:
      '<path d="M36 83 V62 L43 56 L41 24 L30 27 L27 20 L40 12 L42 3 L46 11 L50 4 L52 13 Q57 17 57 24 L59 54 L74 60 V83 H65 V71 H46 V83 Z"/>',
    detail: '<circle cx="49" cy="33" r="3" class="fillc"/><circle cx="51" cy="46" r="3.4" class="fillc"/><circle cx="58" cy="64" r="3.4" class="fillc"/><circle cx="41" cy="16" r="1.8" class="fillc"/>',
  },
  [P.ELEPHANT]: {
    // Front view: ears, head, trunk, tusks
    body:
      '<ellipse cx="25" cy="40" rx="17" ry="21"/><ellipse cx="75" cy="40" rx="17" ry="21"/>' +
      '<path d="M32 40 Q32 14 50 14 Q68 14 68 40 Q68 56 58 60 L57 78 Q57 84 50 84 Q43 84 43 78 L42 60 Q32 56 32 40 Z"/>',
    detail: '<circle cx="42" cy="38" r="2.6" class="fillc"/><circle cx="58" cy="38" r="2.6" class="fillc"/><path d="M38 58 Q34 70 30 72 M62 58 Q66 70 70 72" class="tusk"/><path d="M45 66 H55 M45 73 H55"/>',
  },
  [P.CAMEL]: {
    body:
      '<path d="M26 83 V60 Q24 52 31 49 L29 32 L17 33 L16 25 L30 17 L38 21 L41 46 Q52 22 62 45 Q75 47 77 60 V83 H68 V68 H36 V83 Z"/>',
    detail: '<circle cx="27" cy="25" r="2.2" class="fillc"/><path d="M46 50 Q52 38 58 50"/>',
  },
  [P.WAR_ENGINE]: {
    // Wheeled siege shed
    body:
      '<path d="M24 66 V30 H33 V22 H42 V30 H58 V22 H67 V30 H76 V66 Z"/>' +
      '<circle cx="36" cy="74" r="11"/><circle cx="64" cy="74" r="11"/>',
    detail: '<circle cx="36" cy="74" r="3.5" class="fillc"/><circle cx="64" cy="74" r="3.5" class="fillc"/><path d="M28 40 H72"/><path d="M44 60 V48 H56 V60" class="fillc"/>',
  },
};

const PAWN_BODY =
  '<circle cx="50" cy="30" r="15"/><path d="M38 46 H62 L58 52 Q70 66 70 83 H30 Q30 66 42 52 Z"/>';

const SHIELD = '<path d="M19 10 H81 V38 Q81 60 50 69 Q19 60 19 38 Z"/>';
const STEM = '<path d="M41 83 L44 66 L56 66 L59 83 Z"/>';

function inner(type: number): string {
  if (type >= P.PAWN_PAWN) {
    // Rings count the journeys already made: 0 on the first, 1 after the relocation, 2 on the third.
    const rings = type - P.PAWN_PAWN;
    let marks = '';
    for (let i = 0; i < rings; i++) marks += `<path d="M${36 - i * 1.5} ${60 + i * 8} H${64 + i * 1.5}" class="ring"/>`;
    return `<g class="body">${PAWN_BODY}${PEDESTAL}</g><g class="detail">${marks}</g>`;
  }
  if (P.isPawn(type)) {
    // One pawn body for all eleven; the master piece's silhouette sits on the shield in the contrast colour.
    const g = GLYPHS[P.pawnMaster(type)];
    return (
      `<g class="body">${PEDESTAL}${STEM}${SHIELD}</g>` +
      `<g transform="translate(24 8) scale(0.52)"><g class="emblem">${g.body}</g></g>` +
      `<g class="detail"><path d="M30 75 H70"/></g>`
    );
  }
  const g = GLYPHS[type];
  return `<g class="body">${g.body}${PEDESTAL}</g><g class="detail">${g.detail ?? ''}</g>`;
}

/** SVG <symbol> definitions for every piece type and both sides. */
export function pieceDefs(): string {
  let out = '';
  for (let t = 1; t < P.NUM_TYPES; t++) {
    for (const side of ['w', 'b']) {
      out += `<symbol id="pc-${side}-${t}" viewBox="0 0 100 100" class="pc pc-${side}">${inner(t)}</symbol>`;
    }
  }
  return out;
}

export function pieceHref(type: number, side: number): string {
  return `#pc-${side === 0 ? 'w' : 'b'}-${type}`;
}

/** Product photo of a piece (the carved set from the visual bible). */
export function piecePhoto(type: number): string {
  const id = P.isPawnOfPawns(type) ? 'pawnPawn' : P.isPawn(type) ? 'pawn' : P.TYPE_ID[type];
  return `./img/p-${id}.jpg`;
}

/** Stand-alone inline SVG of a piece, for panels and lists. */
export function pieceSvg(type: number, side: number, size = 40): string {
  return `<svg class="pc pc-${side === 0 ? 'w' : 'b'}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${inner(type)}</svg>`;
}
