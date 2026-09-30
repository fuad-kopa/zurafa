// Accounts and sync on Supabase. The client library is loaded only when needed: when a session is
// stored on this device or the player opens the sign-in dialog, so the game itself starts as fast as before.

import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './cloud-config';
import { getProfile, mergeGames, onGameRecorded, setRating, GameRecord } from './profile';
import { solvedIds, markSolved, dailyState, mergeDaily } from './puzzles';
import { getLang } from './i18n';

export interface Account {
  id: string;
  email: string | null;
  nickname: string;
  rating: number;
}

let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient> | null = null;
let account: Account | null = null;
const listeners = new Set<() => void>();

export function cloudEnabled(): boolean {
  return SUPABASE_URL !== '' && SUPABASE_KEY !== '';
}

export function currentAccount(): Account | null {
  return account;
}

export function onAccountChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

function notify(): void {
  listeners.forEach((f) => f());
}

async function sb(): Promise<SupabaseClient> {
  if (client) return client;
  loading ??= import('@supabase/supabase-js').then(({ createClient }) => {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'zurafa.auth' },
    });
    client.auth.onAuthStateChange((_event, session) => void adopt(session));
    return client;
  });
  return loading;
}

/** At start-up: wake the client only if this device has signed in before, or an OAuth return is in the URL. */
export function initCloud(): void {
  if (!cloudEnabled()) return;
  let stored = false;
  try { stored = localStorage.getItem('zurafa.auth') !== null; } catch { /* ignore */ }
  const oauthReturn = new URLSearchParams(location.search).has('code');
  if (stored || oauthReturn) void sb().then((c) => c.auth.getSession()).then(({ data }) => adopt(data.session));
  onGameRecorded((g) => void uploadGames([g]));
}

async function adopt(session: Session | null): Promise<void> {
  if (!session) {
    if (account) {
      account = null;
      notify();
    }
    return;
  }
  if (account?.id === session.user.id) return;
  // Clean the OAuth code out of the address bar, keep the hash route.
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
  const c = await sb();
  const { data } = await c.from('profiles').select('nickname, rating, games_count, daily_last, daily_streak').eq('id', session.user.id).single();
  account = { id: session.user.id, email: session.user.email ?? null, nickname: data?.nickname ?? '', rating: data?.rating ?? getProfile().rating };
  notify();
  await syncAll(data?.games_count === 0, data?.daily_last ?? null, data?.daily_streak ?? 0);
}

export async function sendCode(email: string): Promise<string | null> {
  const c = await sb();
  const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname, data: { lang: getLang(), nickname: getProfile().name || undefined } } });
  return error ? error.message : null;
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  const c = await sb();
  const { error } = await c.auth.verifyOtp({ email, token, type: 'email' });
  return error ? error.message : null;
}

export async function signInWithGoogle(): Promise<void> {
  const c = await sb();
  await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
}

export async function signOut(): Promise<void> {
  const c = await sb();
  await c.auth.signOut();
  account = null;
  notify();
}

export async function setNickname(nick: string): Promise<'ok' | 'taken' | 'invalid' | 'error'> {
  if (!account) return 'error';
  if (!/^[\p{L}\p{N}_.-]{3,20}$/u.test(nick)) return 'invalid';
  const c = await sb();
  const { error } = await c.from('profiles').update({ nickname: nick }).eq('id', account.id);
  if (error) return error.code === '23505' ? 'taken' : error.code === '23514' ? 'invalid' : 'error';
  account = { ...account, nickname: nick };
  notify();
  return 'ok';
}

export async function deleteAccount(): Promise<boolean> {
  const c = await sb();
  const { error } = await c.rpc('delete_my_account');
  if (error) return false;
  await c.auth.signOut();
  account = null;
  notify();
  return true;
}

/** A puzzle solved while signed in goes up at once (the daily streak with it). */
export async function syncPuzzle(id: string): Promise<void> {
  if (!account) return;
  const c = await sb();
  await c.from('puzzles_solved').upsert({ user_id: account.id, puzzle_id: id }, { onConflict: 'user_id,puzzle_id', ignoreDuplicates: true });
  const d = dailyState();
  if (d.last) await c.from('profiles').update({ daily_last: d.last, daily_streak: d.streak }).eq('id', account.id);
}

// --- sync -------------------------------------------------------------------------------------

function toRow(g: GameRecord, userId: string) {
  return {
    user_id: userId, client_id: g.id, played_at: g.at, mode: g.mode, level: g.level ?? null, battle: g.battle ?? null,
    my_side: g.mySide, winner: g.winner, reason: g.reason, plies: g.plies, moves: g.moves, rules: g.rules,
    rating_before: g.ratingBefore ?? null, rating_after: g.ratingAfter ?? null, online_key: g.key ?? null,
  };
}

function fromRow(r: Record<string, unknown>): GameRecord {
  return {
    id: r.client_id as string, at: r.played_at as string, mode: r.mode as GameRecord['mode'],
    level: (r.level as number | null) ?? undefined, battle: (r.battle as string | null) ?? undefined,
    mySide: r.my_side as GameRecord['mySide'], winner: r.winner as GameRecord['winner'], reason: r.reason as GameRecord['reason'],
    plies: r.plies as number, moves: r.moves as string[], rules: r.rules as GameRecord['rules'],
    ratingBefore: (r.rating_before as number | null) ?? undefined, ratingAfter: (r.rating_after as number | null) ?? undefined,
    key: (r.online_key as string | null) ?? undefined,
  };
}

async function uploadGames(games: GameRecord[]): Promise<void> {
  if (!account || !games.length) return;
  const c = await sb();
  await c.from('games').upsert(games.map((g) => toRow(g, account!.id)), { onConflict: 'user_id,client_id', ignoreDuplicates: true });
  const rating = getProfile().rating;
  await c.from('profiles').update({ rating }).eq('id', account.id);
  const { count } = await c.from('games').select('id', { count: 'exact', head: true }).eq('user_id', account.id);
  await c.from('profiles').update({ games_count: count ?? 0 }).eq('id', account.id);
  account = { ...account, rating };
  notify();
}

/** Two-way merge after sign-in: this device's history goes up, other devices' history comes down. */
async function syncAll(freshAccount: boolean, dailyLast: string | null, dailyStreak: number): Promise<void> {
  if (!account) return;
  const c = await sb();
  const local = getProfile();
  if (!freshAccount && account.rating !== local.rating) setRating(account.rating);
  await uploadGames(local.games);
  const { data: rows } = await c.from('games').select('*').eq('user_id', account.id).order('played_at', { ascending: false }).limit(60);
  if (rows) mergeGames(rows.map(fromRow));
  const solved = solvedIds();
  if (solved.length) await c.from('puzzles_solved').upsert(solved.map((puzzle_id) => ({ user_id: account!.id, puzzle_id })), { onConflict: 'user_id,puzzle_id', ignoreDuplicates: true });
  const { data: remote } = await c.from('puzzles_solved').select('puzzle_id').eq('user_id', account.id);
  remote?.forEach((r) => markSolved(r.puzzle_id as string));
  mergeDaily(dailyLast, dailyStreak);
  const d = dailyState();
  if (d.last && (d.last > (dailyLast ?? '') || d.streak > dailyStreak)) await c.from('profiles').update({ daily_last: d.last, daily_streak: d.streak }).eq('id', account.id);
  notify();
}
