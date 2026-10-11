// Achievements are worked out from what the device already keeps: games, puzzles, lessons and the daily
// streak. Nothing extra is stored, so they appear at once for old players too and survive a restored copy.

import { getProfile, outcome, GARDEN_GAMES } from './profile';
import { solvedIds, dailyState, PUZZLES } from './puzzles';
import { totals } from './course/progress';
import COURSE from './course/lessons.json';
import { BATTLES } from './battles';
import * as P from './engine/pieces';

export interface Achievement {
  id: string;
  /** piece shown on the badge */
  piece: number;
  /** progress towards the goal */
  have: number;
  need: number;
}

const LESSON_IDS: string[] = (COURSE as unknown as { units: { lessons: { id: string }[] }[] }).units.flatMap((u) => u.lessons.map((l) => l.id));

export function courseProgress(): { done: number; total: number } {
  return { done: totals(LESSON_IDS).done, total: LESSON_IDS.length };
}

export function battleProgress(): { won: number; total: number } {
  const won = new Set(getProfile().games.filter((g) => g.battle && outcome(g) === 'win').map((g) => g.battle));
  return { won: won.size, total: BATTLES.length };
}

export function puzzleProgress(): { solved: number; total: number } {
  const own = new Set(PUZZLES.map((p) => p.id));
  return { solved: solvedIds().filter((id) => own.has(id)).length, total: PUZZLES.length };
}

export function achievements(): Achievement[] {
  const p = getProfile();
  const games = p.games.filter((g) => g.mySide !== null);
  const wins = games.filter((g) => outcome(g) === 'win');
  const beaten = new Set(wins.filter((g) => g.mode === 'ai').map((g) => g.level));
  const garden = p.garden ?? {};
  const gardenPlayed = GARDEN_GAMES.filter((id) => (garden[id]?.played ?? 0) > 0).length;
  const course = courseProgress();
  const battles = battleProgress();
  const puzzles = puzzleProgress();
  const streak = Math.max(dailyState().streak, 0);
  const has = (cond: boolean): number => (cond ? 1 : 0);
  return [
    { id: 'first-game', piece: P.PAWN_GENERAL, have: has(games.length > 0), need: 1 },
    { id: 'first-win', piece: P.KNIGHT, have: has(wins.length > 0), need: 1 },
    { id: 'all-levels', piece: P.GIRAFFE, have: beaten.size, need: 6 },
    { id: 'beat-timur', piece: P.KING, have: has(beaten.has(6)), need: 1 },
    { id: 'win-stalemate', piece: P.VIZIER, have: has(wins.some((g) => g.reason === 'stalemate')), need: 1 },
    { id: 'win-bare', piece: P.ELEPHANT, have: has(wins.some((g) => g.reason === 'bareKing')), need: 1 },
    { id: 'citadel', piece: P.ADV_KING, have: has(games.some((g) => g.reason === 'citadel')), need: 1 },
    { id: 'quick-win', piece: P.PICKET, have: has(wins.some((g) => g.plies <= 60 && g.reason === 'checkmate')), need: 1 },
    { id: 'long-game', piece: P.CAMEL, have: has(games.some((g) => g.plies >= 200)), need: 1 },
    { id: 'online-win', piece: P.PRINCE, have: has(wins.some((g) => g.mode === 'online')), need: 1 },
    { id: 'battles', piece: P.WAR_ENGINE, have: battles.won, need: battles.total },
    { id: 'course', piece: P.GENERAL, have: course.done, need: course.total },
    { id: 'puzzles', piece: P.PAWN_PAWN, have: puzzles.solved, need: puzzles.total },
    { id: 'streak', piece: P.PAWN_GIRAFFE, have: Math.min(streak, 7), need: 7 },
    { id: 'garden', piece: P.ROOK, have: gardenPlayed, need: GARDEN_GAMES.length },
    { id: 'rating-1500', piece: P.PAWN_KING, have: Math.min(p.rating, 1500), need: 1500 },
  ];
}

/** The level name a rating corresponds to: the strongest computer level at or below it. */
export const RANKS: [number, string][] = [[0, 'recruit'], [950, 'archer'], [1200, 'rider'], [1450, 'commander'], [1700, 'emir'], [1950, 'timur']];
export function rankOf(rating: number): string {
  let r = RANKS[0][1];
  for (const [min, key] of RANKS) if (rating >= min) r = key;
  return r;
}
