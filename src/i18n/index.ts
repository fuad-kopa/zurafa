import { ru, Key } from './ru';
import { en } from './en';
import { uz } from './uz';
import { tr } from './tr';
import { zh } from './zh';
import { hi } from './hi';
import * as P from '../engine/pieces';

export type Lang = 'ru' | 'en' | 'uz' | 'tr' | 'zh' | 'hi';
const DICTS: Record<Lang, Record<Key, string>> = { ru, en, uz, tr, zh, hi };
/** Languages offered in the switcher, with their own names. */
export const LANGS: [Lang, string][] = [['ru', 'Русский'], ['en', 'English'], ['uz', 'O‘zbek'], ['tr', 'Türkçe'], ['zh', '中文'], ['hi', 'हिन्दी']];
const isLang = (x: string | null): x is Lang => x !== null && (LANGS as [string, string][]).some(([l]) => l === x);

let lang: Lang = 'ru';
const listeners = new Set<() => void>();

export function initLang(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('lang');
  } catch {
    /* storage may be unavailable */
  }
  if (isLang(saved)) lang = saved;
  else {
    const wanted = (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase().split('-')[0]);
    lang = (wanted.find(isLang) as Lang | undefined) ?? 'en';
  }
  document.documentElement.lang = lang;
}

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang): void {
  lang = l;
  try {
    localStorage.setItem('lang', l);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}

export function onLangChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function t(key: Key, ...args: string[]): string {
  let s: string = DICTS[lang][key] ?? key;
  args.forEach((a, i) => (s = s.replace(`{${i}}`, a)));
  return s;
}

/** Display name of a piece type. */
export function pieceName(type: number): string {
  if (type === P.PAWN_PAWN) return t('piece.pawnPawn');
  if (type === P.PAWN_PAWN_1) return t('piece.pawnPawn.stage1');
  if (type === P.PAWN_PAWN_2) return t('piece.pawnPawn.stage2');
  if (P.isPawn(type)) return t('piece.pawnOf', t(`piece.gen.${P.TYPE_ID[P.pawnMaster(type)]}` as Key));
  return t(`piece.${P.TYPE_ID[type]}` as Key);
}

export function nativeName(type: number): string {
  if (P.isPawnOfPawns(type)) return t('native.pawnPawn');
  if (P.isPawn(type)) return t('native.pawn');
  return t(`native.${P.TYPE_ID[type]}` as Key);
}

export function pieceAbbr(type: number): string {
  if (P.isPawn(type)) return '';
  return t(`abbr.${P.TYPE_ID[type]}` as Key);
}

/** One-paragraph description of how a piece moves. onLastRank marks the waiting pawn of pawns. */
export function moveText(type: number, onLastRank = false): string {
  if (type === P.PAWN_PAWN && onLastRank) return t('move.dummy');
  if (P.isPawnOfPawns(type)) return t('move.pawnPawn');
  if (type === P.PAWN_KING) return t('move.pawnKing');
  if (P.isPawn(type)) return t('move.pawn', pieceName(P.PROMOTES_TO[type]).toLowerCase());
  return t(`move.${P.TYPE_ID[type]}` as Key);
}

export function likeText(type: number): string | null {
  const key = `like.${P.TYPE_ID[type]}` as Key;
  return key in ru ? t(key) : null;
}

export type { Key };
