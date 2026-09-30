// Course progress: best stars per lesson on this device (synced to the account as solved items).

const KEY = 'zurafa.course';
let cache: Record<string, number> | null = null;

function load(): Record<string, number> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
  } catch {
    cache = {};
  }
  return cache;
}

export function starsOf(id: string): number {
  return load()[id] ?? 0;
}

export function recordStars(id: string, stars: number): void {
  const p = load();
  if ((p[id] ?? 0) >= stars) return;
  p[id] = stars;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function totals(ids: string[]): { done: number; stars: number } {
  const p = load();
  let done = 0;
  let stars = 0;
  for (const id of ids) if (p[id]) { done++; stars += p[id]; }
  return { done, stars };
}
