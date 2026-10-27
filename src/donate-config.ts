// Where players can support Zurafa. The owner fills these in; while both lists are empty the "Support" button
// stays hidden everywhere. Links open the payment service in a new tab: no payment data ever passes through us.

export type DonateService = 'boosty' | 'kofi' | 'bmc' | 'patreon' | 'paypal' | 'tribute' | 'other';

export interface DonateLink {
  service: DonateService;
  url: string;
  /** shown instead of the service's own name, e.g. a local bank or a Telegram channel */
  label?: string;
}

export interface DonateCrypto {
  /** e.g. 'USDT' */
  coin: string;
  /** e.g. 'TRC-20' — say it, a transfer on the wrong network is lost */
  network: string;
  address: string;
}

export const DONATE_LINKS: DonateLink[] = [];
export const DONATE_CRYPTO: DonateCrypto[] = [];

/** Sample entries for looking at the dialog on a dev server: localStorage 'zurafa.donatePreview' = '1'. */
const PREVIEW: { links: DonateLink[]; crypto: DonateCrypto[] } = {
  links: [{ service: 'boosty', url: 'https://boosty.to/' }, { service: 'kofi', url: 'https://ko-fi.com/' }],
  crypto: [{ coin: 'USDT', network: 'TRC-20', address: 'T000000000000000000000000000000000' }],
};

function preview(): boolean {
  try {
    return import.meta.env.DEV && localStorage.getItem('zurafa.donatePreview') === '1';
  } catch {
    return false;
  }
}

export function donateLinks(): DonateLink[] {
  return preview() ? PREVIEW.links : DONATE_LINKS;
}
export function donateCrypto(): DonateCrypto[] {
  return preview() ? PREVIEW.crypto : DONATE_CRYPTO;
}
export function donateEnabled(): boolean {
  return donateLinks().length + donateCrypto().length > 0;
}
