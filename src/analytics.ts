// Privacy-friendly counting with GoatCounter: no cookies, no personal data, no consent banner needed.
// Page views are the hash routes (room and game ids removed); events are named like "game-start/ai-3".
// Only counts on the production domain, and not when the browser asks not to be tracked.

const ENDPOINT = 'https://zurafa.goatcounter.com/count';
let first = true;

function enabled(): boolean {
  return import.meta.env.PROD && location.hostname === 'zurafa.app' && navigator.doNotTrack !== '1';
}

function send(params: Record<string, string>): void {
  if (!enabled()) return;
  const q = new URLSearchParams({ ...params, s: `${screen.width},${screen.height},${Math.round(devicePixelRatio)}`, rnd: Math.random().toString(36).slice(2) });
  if (first && document.referrer && !document.referrer.includes(location.hostname)) q.set('r', document.referrer);
  first = false;
  void fetch(`${ENDPOINT}?${q}`, { mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(() => undefined);
}

/** A screen view. Room links and stored-game ids are collapsed so no identifiers are counted. */
export function trackView(hash: string): void {
  const path = '/' + (hash.replace(/^#\/?/, '') || '')
    .replace(/^g\/[a-z0-9]+$/, 'g')
    .replace(/^replay\/[a-z0-9]+$/, 'replay');
  send({ p: path, t: document.title });
}

export function trackEvent(name: string): void {
  send({ p: name, t: name, e: 'true' });
}

// --- errors ---------------------------------------------------------------------------------------
// Until our own server collects stack traces, uncaught errors are counted as GoatCounter events, so a
// breakage on some phone shows up as a rising "error/..." line. Messages are trimmed and stripped of
// anything that could identify a person (urls, long numbers); at most five reports per page load.

let reported = 0;
const seenErrors = new Set<string>();

function errorName(message: string, where: string): string {
  const msg = message
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<id>')
    .replace(/\d{4,}/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return `error/${where}/${msg}`;
}

export function reportError(message: string, where: string): void {
  const name = errorName(message, where);
  if (reported >= 5 || seenErrors.has(name)) return;
  seenErrors.add(name);
  reported++;
  trackEvent(name);
}

/** Catch what nobody else catches. Call once at start-up. */
export function watchErrors(): void {
  window.addEventListener('error', (e) => {
    const file = (e.filename || '').split('/').pop()?.replace(/-[A-Za-z0-9_]{8}\.js$/, '.js') ?? '';
    reportError(e.message || 'error', `${file}:${e.lineno || 0}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | string | undefined;
    reportError(typeof r === 'string' ? r : r?.message ?? 'rejection', 'promise');
  });
}
