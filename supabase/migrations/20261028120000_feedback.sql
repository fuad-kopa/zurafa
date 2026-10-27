-- "Write to us": notes from players (guests too). Anyone may add a note; nobody but the owner, through the
-- Supabase dashboard (Table Editor → feedback), can read them. Run once in Supabase → SQL Editor.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 3 and 2000),
  contact text check (contact is null or char_length(contact) <= 120),
  lang text check (lang is null or char_length(lang) <= 5),
  route text check (route is null or char_length(route) <= 120),
  agent text check (agent is null or char_length(agent) <= 300),
  version text check (version is null or char_length(version) <= 40),
  user_id uuid references auth.users (id) on delete set null,
  done boolean not null default false
);

alter table public.feedback enable row level security;

-- Insert only. A signed-in player may attach only their own id; a guest attaches none.
create policy "anyone adds feedback" on public.feedback
  for insert to anon, authenticated
  with check (done = false and (user_id is null or user_id = auth.uid()));

revoke all on public.feedback from anon, authenticated;
grant insert (kind, message, contact, lang, route, agent, version, user_id) on public.feedback to anon, authenticated;

-- A flood guard: at most 300 notes an hour from everyone together, so a script cannot fill the table.
create or replace function public.feedback_flood_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'feedback: too many notes this hour';
  end if;
  return new;
end $$;

drop trigger if exists feedback_flood_guard on public.feedback;
create trigger feedback_flood_guard before insert on public.feedback
  for each row execute function public.feedback_flood_guard();
