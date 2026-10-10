// A finished game packed into a link: rules, moves and result travel in the hash, so no server is needed.
// #/view/<base64url(JSON)>; anyone who opens it watches the game as a replay.

import type { RuleOptions } from './engine/position';
import type { GameResult } from './engine/game';
import type { Side } from './engine/geometry';

export interface SharedGame {
  v: 1;
  rules: RuleOptions;
  moves: string[];
  ended?: GameResult;
  battle?: string;
  /** the side of the player who shared, for the board's orientation */
  side?: Side;
}

function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(g: SharedGame): string {
  return toB64Url(JSON.stringify(g));
}

export function decodeShare(data: string): SharedGame | null {
  try {
    const g = JSON.parse(fromB64Url(data)) as SharedGame;
    if (g?.v !== 1 || !Array.isArray(g.moves) || typeof g.rules !== 'object') return null;
    if (g.moves.some((m) => typeof m !== 'string' || m.length > 12)) return null;
    return g;
  } catch {
    return null;
  }
}

export function shareUrl(g: SharedGame): string {
  return `${location.origin}${location.pathname}#/view/${encodeShare(g)}`;
}
