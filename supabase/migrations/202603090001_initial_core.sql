create extension if not exists "pgcrypto";

create type public.event_progress_status as enum (
  'locked',
  'available',
  'in_progress',
  'completed'
);

create type public.meeting_pair_status as enum (
  'pending',
  'matched',
  'confirmed',
  'expired',
  'reassigned'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  telegram_user_id bigint unique,
  telegram_username text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_day smallint,
  reason text not null,
  points integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_participation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_day smallint not null check (event_day between 14 and 20),
  status public.event_progress_status not null default 'locked',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, event_day)
);

create table if not exists public.meeting_pairs (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles (id) on delete cascade,
  user_b_id uuid not null references public.profiles (id) on delete cascade,
  pair_code text not null unique,
  status public.meeting_pair_status not null default 'pending',
  assigned_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint meeting_pairs_distinct_users check (user_a_id <> user_b_id)
);

create table if not exists public.meeting_confirmations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.meeting_pairs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  confirmed_at timestamptz not null default timezone('utc', now()),
  unique (pair_id, user_id)
);

create or replace function public.handle_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_profile_updated_at();

create or replace function public.get_current_score(profile_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(points), 0)::integer
  from public.score_events
  where user_id = profile_id;
$$;

create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.telegram_username,
  coalesce(sum(se.points), 0)::integer as score
from public.profiles p
left join public.score_events se on se.user_id = p.id
group by p.id, p.display_name, p.telegram_username
order by score desc, p.display_name asc;

alter table public.profiles enable row level security;
alter table public.score_events enable row level security;
alter table public.event_participation enable row level security;
alter table public.meeting_pairs enable row level security;
alter table public.meeting_confirmations enable row level security;

create policy "profiles_select_own_or_public"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "score_events_select_own"
on public.score_events
for select
to authenticated
using (auth.uid() = user_id);

create policy "event_participation_select_own"
on public.event_participation
for select
to authenticated
using (auth.uid() = user_id);

create policy "event_participation_upsert_own"
on public.event_participation
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meeting_pairs_select_member"
on public.meeting_pairs
for select
to authenticated
using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "meeting_confirmations_select_member"
on public.meeting_confirmations
for select
to authenticated
using (
  exists (
    select 1
    from public.meeting_pairs mp
    where mp.id = pair_id
      and (mp.user_a_id = auth.uid() or mp.user_b_id = auth.uid())
  )
);

grant select on public.leaderboard to authenticated;
