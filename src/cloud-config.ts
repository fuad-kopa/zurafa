// Public Supabase settings. The publishable (anon) key is meant to be in the page: row-level security
// in supabase/migrations decides what it may read and write. Leave empty to hide accounts entirely.
export const SUPABASE_URL = '';
export const SUPABASE_KEY = '';
/** Sign-in providers switched on in the Supabase dashboard. */
export const PROVIDERS = { email: true, google: false, telegram: false };
