import type { SearchLimits } from './search';

export interface Level {
  id: number;
  /** i18n key suffix */
  key: string;
  limits: SearchLimits;
}

// Strength is set mostly by depth and node budget (the same on every device); time is only a safety cap.
export const LEVELS: Level[] = [
  { id: 1, key: 'recruit', limits: { maxDepth: 1, maxNodes: 50_000, maxTimeMs: 1500, noise: 180 } },
  { id: 2, key: 'archer', limits: { maxDepth: 2, maxNodes: 150_000, maxTimeMs: 2000, noise: 100 } },
  { id: 3, key: 'rider', limits: { maxDepth: 3, maxNodes: 600_000, maxTimeMs: 3000, noise: 45 } },
  { id: 4, key: 'commander', limits: { maxDepth: 5, maxNodes: 1_500_000, maxTimeMs: 3000, noise: 0 } },
  { id: 5, key: 'emir', limits: { maxDepth: 30, maxNodes: 5_000_000, maxTimeMs: 4000, noise: 0 } },
  { id: 6, key: 'timur', limits: { maxDepth: 30, maxNodes: 30_000_000, maxTimeMs: 10000, noise: 0 } },
];

export const HINT_LIMITS: SearchLimits = { maxDepth: 30, maxNodes: 3_000_000, maxTimeMs: 1500, noise: 0 };

/** Per-position budget for post-game analysis: about a third of a second each. */
export const ANALYSIS_LIMITS: SearchLimits = { maxDepth: 30, maxNodes: 200_000, maxTimeMs: 350, noise: 0 };
