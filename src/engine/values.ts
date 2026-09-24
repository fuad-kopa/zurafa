// Material and piece-square values (centipawns), from White's point of view.
// No authoritative table exists for this game; these blend Forbes' ranking with modern engine estimates.

import { NSQ, SQX, SQY, rotate } from './geometry';
import * as P from './pieces';

export const VALUE = new Int16Array(P.NUM_TYPES);
VALUE[P.KING] = 400;
VALUE[P.PRINCE] = 400;
VALUE[P.ADV_KING] = 400;
VALUE[P.GENERAL] = 150;
VALUE[P.VIZIER] = 150;
VALUE[P.ROOK] = 520;
VALUE[P.KNIGHT] = 320;
VALUE[P.PICKET] = 300;
VALUE[P.GIRAFFE] = 310;
VALUE[P.ELEPHANT] = 110;
VALUE[P.CAMEL] = 190;
VALUE[P.WAR_ENGINE] = 130;
VALUE[P.PAWN_KING] = 135;
VALUE[P.PAWN_GENERAL] = 100;
VALUE[P.PAWN_VIZIER] = 100;
VALUE[P.PAWN_ROOK] = 125;
VALUE[P.PAWN_KNIGHT] = 112;
VALUE[P.PAWN_PICKET] = 110;
VALUE[P.PAWN_GIRAFFE] = 112;
VALUE[P.PAWN_ELEPHANT] = 92;
VALUE[P.PAWN_CAMEL] = 100;
VALUE[P.PAWN_ENGINE] = 95;
VALUE[P.PAWN_PAWN] = 130;
VALUE[P.PAWN_PAWN_1] = 150;
VALUE[P.PAWN_PAWN_2] = 180;

const PROMO_WORTH = new Int16Array(P.NUM_TYPES);
for (let t = P.PAWN_KING; t <= P.PAWN_ENGINE; t++) PROMO_WORTH[t] = VALUE[P.PROMOTES_TO[t]];
PROMO_WORTH[P.PAWN_PAWN] = 260;
PROMO_WORTH[P.PAWN_PAWN_1] = 250;
PROMO_WORTH[P.PAWN_PAWN_2] = 400;

const ADVANCE_CURVE = [0, 0, 0, 0.01, 0.03, 0.07, 0.14, 0.26, 0.45, 1];
const CENTRE_WEIGHT = new Int8Array(P.NUM_TYPES);
CENTRE_WEIGHT[P.KNIGHT] = 6;
CENTRE_WEIGHT[P.CAMEL] = 4;
CENTRE_WEIGHT[P.PICKET] = 3;
CENTRE_WEIGHT[P.GIRAFFE] = 2;
CENTRE_WEIGHT[P.ROOK] = 1;
CENTRE_WEIGHT[P.ELEPHANT] = 3;
CENTRE_WEIGHT[P.WAR_ENGINE] = 3;
CENTRE_WEIGHT[P.GENERAL] = 3;
CENTRE_WEIGHT[P.VIZIER] = 3;

function whiteValue(type: number, sq: number): number {
  let v = VALUE[type];
  if (sq >= 110) return v;
  const x = SQX[sq];
  const y = SQY[sq];
  if (P.isPawn(type)) {
    v += Math.round((PROMO_WORTH[type] - VALUE[type]) * ADVANCE_CURVE[y]);
  } else if (P.isRoyal(type)) {
    v -= y * 5;
  } else {
    const centre = 5 - Math.max(Math.abs(x - 5), Math.abs(y - 4.5));
    v += Math.round(centre * CENTRE_WEIGHT[type]);
  }
  return v;
}

/** PSQ[(piece + 25) * NSQ + sq]: signed, White-relative contribution of a piece standing on sq. */
export const PSQ = new Int16Array(51 * NSQ);
for (let t = 1; t < P.NUM_TYPES; t++) {
  for (let sq = 0; sq < NSQ; sq++) {
    PSQ[(t + 25) * NSQ + sq] = whiteValue(t, sq);
    PSQ[(-t + 25) * NSQ + sq] = -whiteValue(t, rotate(sq));
  }
}
