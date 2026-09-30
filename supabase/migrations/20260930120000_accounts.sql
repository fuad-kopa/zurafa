-- Zurafa accounts: profiles, stored games, solved puzzles. Every row belongs to one auth user and
-- row-level security keeps it that way; only nickname and rating are visible to others (leaderboard).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  rating integer not null default 1200 check (rating between 100 and 4000),
  games_count integer not null default 0,
  daily_last date,
  daily_streak integer not null default 0,
  lang text not null default 'ru' check (lang in ('ru', 'en', 'uz', 'tr', 'zh', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nickname_shape check (nickname ~ '^[[:alnum:]_.-]{3,20}$')
);
create unique index profiles_nickname_lower on public.profiles (lower(nickname));

create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- id of the record in the browser's local profile, so a merge never uploads a game twice
  client_id text not null,
  played_at timestamptz not null,
  mode text not null check (mode in ('ai', 'local', 'online')),
  level smallint,
  battle text,
  my_side smallint check (my_side in (0, 1)),
  winner smallint check (winner in (0, 1)),
  reason text not null,
  plies integer not null check (plies >= 0),
  moves text[] not null,
  rules jsonb not null,
  rating_before integer,
  rating_after integer,
  online_key text,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index games_user_played on public.games (user_id, played_at desc);

create table public.puzzles_solved (
  user_id uuid not null references auth.users (id) on delete cascade,
  puzzle_id text not null,
  solved_at timestamptz not null default now(),
  primary key (user_id, puzzle_id)
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.puzzles_solved enable row level security;

-- Profiles: anyone may read nickname and rating; only the owner writes.
create policy "profiles are public" on public.profiles for select using (true);
create policy "owner updates profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Games and puzzles: private to the owner.
create policy "owner reads games" on public.games for select using (auth.uid() = user_id);
create policy "owner adds games" on public.games for insert with check (auth.uid() = user_id);
create policy "owner deletes games" on public.games for delete using (auth.uid() = user_id);
create policy "owner reads puzzles" on public.puzzles_solved for select using (auth.uid() = user_id);
create policy "owner adds puzzles" on public.puzzles_solved for insert with check (auth.uid() = user_id);

-- A profile appears with the account: nickname from sign-up metadata when free, otherwise "player" + digits.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nickname', '')), '');
  nick text;
  tries integer := 0;
begin
  if wanted is not null and wanted ~ '^[[:alnum:]_.-]{3,20}$'
     and not exists (select 1 from profiles where lower(nickname) = lower(wanted)) then
    nick := wanted;
  end if;
  while nick is null and tries < 20 loop
    nick := 'player' || lpad((floor(random() * 1000000))::text, 6, '0');
    if exists (select 1 from profiles where lower(nickname) = lower(nick)) then nick := null; end if;
    tries := tries + 1;
  end loop;
  insert into profiles (id, nickname, lang)
  values (new.id, nick, coalesce(nullif(new.raw_user_meta_data ->> 'lang', ''), 'ru'));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Deleting the account removes the auth user; profiles, games and puzzles go with it (cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
