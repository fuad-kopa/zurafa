// Background music: one looping track per screen state, crossfaded on change.
// Files live in public/music/*.m4a (AAC); playback starts after the first user gesture.

export type Track = 'menu' | 'game' | 'endgame' | 'waiting' | 'learn' | 'victory' | 'defeat';

const FILES: Record<Track, string[]> = {
  menu: ['menu-a', 'menu-b'],
  game: ['game-a', 'game-b'],
  endgame: ['endgame'],
  waiting: ['waiting'],
  learn: ['learn'],
  victory: ['victory'],
  defeat: ['defeat'],
};
/** Stingers play once and hand over to another track. */
const ONCE: Partial<Record<Track, Track>> = { victory: 'menu', defeat: 'menu' };
const VOLUME: Partial<Record<Track, number>> = { victory: 0.7, defeat: 0.6 };
const BASE_VOLUME = 0.5;
const FADE_MS = 900;

let enabled = true;
let unlocked = false;
let current: { track: Track; el: HTMLAudioElement } | null = null;
let wanted: Track | null = null;
let pick = Math.floor(Math.random() * 97);

const fadingOut = new Set<HTMLAudioElement>();

// Timer-driven so the fade completes in a hidden tab too.
function fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void): void {
  const from = el.volume;
  const t0 = Date.now();
  const timer = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / ms);
    el.volume = from + (to - from) * k;
    if (k >= 1) {
      clearInterval(timer);
      done?.();
    }
  }, 40);
}

function release(el: HTMLAudioElement): void {
  el.pause();
  el.removeAttribute('src');
  el.load();
  fadingOut.delete(el);
}

function stop(entry: { el: HTMLAudioElement }, ms = FADE_MS): void {
  const el = entry.el;
  fadingOut.add(el);
  fade(el, 0, ms, () => release(el));
}

function start(track: Track): void {
  const names = FILES[track];
  const name = names[pick++ % names.length];
  const el = new Audio(`./music/${name}.m4a`);
  el.preload = 'auto';
  el.loop = !(track in ONCE);
  el.volume = 0;
  const next = ONCE[track];
  if (next) el.addEventListener('ended', () => current?.el === el && playTrack(next, true));
  const prev = current;
  current = { track, el };
  el.play()
    .then(() => {
      unlocked = true;
      if (!enabled || current?.el !== el) return release(el); // superseded or switched off while starting
      fade(el, VOLUME[track] ?? BASE_VOLUME, prev ? FADE_MS : FADE_MS / 2);
      if (prev) stop(prev);
    })
    .catch(() => {
      // Autoplay blocked (or paused while starting): fall back to what played before and retry on the next gesture.
      if (current?.el === el) current = prev;
    });
}

/** Switch to a track (no-op if it is already playing, unless `restart` is set). */
export function playTrack(track: Track, restart = false): void {
  wanted = track;
  if (!enabled) return;
  if (current?.track === track && !restart) return;
  start(track);
}

export function stopMusic(): void {
  wanted = null;
  if (current) {
    stop(current);
    current = null;
  }
}

export function setMusicEnabled(on: boolean): void {
  enabled = on;
  if (!on && current) {
    const w = wanted;
    stopMusic();
    wanted = w;
  } else if (on && wanted && !current && unlocked) start(wanted);
}

export function currentTrack(): Track | null {
  return current?.track ?? null;
}

// First gesture anywhere unlocks playback; hidden tabs go quiet.
if (typeof document !== 'undefined') {
  const unlock = (): void => {
    unlocked = true;
    if (enabled && wanted && !current) start(wanted);
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      current?.el.pause();
      for (const el of fadingOut) el.pause();
    } else if (current) void current.el.play().catch(() => undefined);
  });
}
