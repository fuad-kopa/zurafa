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
