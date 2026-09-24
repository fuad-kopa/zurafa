// Piece types. On the board a piece is stored as +type (White) or -type (Black).

export const NONE = 0;
export const KING = 1;
export const PRINCE = 2;
export const ADV_KING = 3;
export const GENERAL = 4; // ferz
export const VIZIER = 5; // wazir
export const ROOK = 6;
export const KNIGHT = 7;
export const PICKET = 8; // tali'a
export const GIRAFFE = 9;
export const ELEPHANT = 10;
export const CAMEL = 11;
export const WAR_ENGINE = 12; // dabbaba
export const PAWN_KING = 13;
export const PAWN_GENERAL = 14;
export const PAWN_VIZIER = 15;
export const PAWN_ROOK = 16;
export const PAWN_KNIGHT = 17;
export const PAWN_PICKET = 18;
export const PAWN_GIRAFFE = 19;
export const PAWN_ELEPHANT = 20;
export const PAWN_CAMEL = 21;
export const PAWN_ENGINE = 22;
/** Pawn of pawns before its first arrival. On its last rank it is the immobile, immune "dummy". */
export const PAWN_PAWN = 23;
/** Pawn of pawns after its relocation; its next arrival sends it to the king's pawn square. */
export const PAWN_PAWN_1 = 24;
/** Pawn of pawns on its third journey; promotes to the adventitious king. */
export const PAWN_PAWN_2 = 25;

export const NUM_TYPES = 26;

export function isRoyal(type: number): boolean {
  return type >= KING && type <= ADV_KING;
}
export function isPawn(type: number): boolean {
  return type >= PAWN_KING;
}
export function isPawnOfPawns(type: number): boolean {
  return type >= PAWN_PAWN;
}

/** What a pawn becomes on the last rank. The pawn of pawns' first two arrivals are handled separately. */
export const PROMOTES_TO = new Int8Array(NUM_TYPES);
PROMOTES_TO[PAWN_KING] = PRINCE;
PROMOTES_TO[PAWN_GENERAL] = GENERAL;
PROMOTES_TO[PAWN_VIZIER] = VIZIER;
PROMOTES_TO[PAWN_ROOK] = ROOK;
PROMOTES_TO[PAWN_KNIGHT] = KNIGHT;
PROMOTES_TO[PAWN_PICKET] = PICKET;
PROMOTES_TO[PAWN_GIRAFFE] = GIRAFFE;
PROMOTES_TO[PAWN_ELEPHANT] = ELEPHANT;
PROMOTES_TO[PAWN_CAMEL] = CAMEL;
PROMOTES_TO[PAWN_ENGINE] = WAR_ENGINE;
PROMOTES_TO[PAWN_PAWN] = PAWN_PAWN;
PROMOTES_TO[PAWN_PAWN_1] = PAWN_PAWN_2;
PROMOTES_TO[PAWN_PAWN_2] = ADV_KING;

/** The piece a pawn "belongs to" (used for icons and names). */
export function pawnMaster(type: number): number {
  switch (type) {
    case PAWN_KING: return KING;
    case PAWN_GENERAL: return GENERAL;
    case PAWN_VIZIER: return VIZIER;
    case PAWN_ROOK: return ROOK;
    case PAWN_KNIGHT: return KNIGHT;
    case PAWN_PICKET: return PICKET;
    case PAWN_GIRAFFE: return GIRAFFE;
    case PAWN_ELEPHANT: return ELEPHANT;
    case PAWN_CAMEL: return CAMEL;
    case PAWN_ENGINE: return WAR_ENGINE;
    default: return NONE;
  }
}

/** Stable string ids, used for i18n keys, icons and serialisation. */
export const TYPE_ID: string[] = [
  'none', 'king', 'prince', 'advKing', 'general', 'vizier', 'rook', 'knight', 'picket', 'giraffe',
  'elephant', 'camel', 'engine',
  'pawnKing', 'pawnGeneral', 'pawnVizier', 'pawnRook', 'pawnKnight', 'pawnPicket', 'pawnGiraffe',
  'pawnElephant', 'pawnCamel', 'pawnEngine', 'pawnPawn', 'pawnPawn1', 'pawnPawn2',
];
