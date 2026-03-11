create table if not exists public.race_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'racing', 'finished')),
  duration_seconds integer not null default 10 check (duration_seconds between 5 and 60),
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  finished_at timestamptz,
  winner_id uuid references public.profiles (id) on delete set null
);

create table if not exists public.race_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.race_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tap_count integer not null default 0 check (tap_count >= 0),
  joined_at timestamptz not null default timezone('utc', now()),
  unique (room_id, user_id)
);

create index if not exists race_rooms_owner_id_idx
on public.race_rooms (owner_id, created_at desc);

create index if not exists race_room_members_room_id_idx
on public.race_room_members (room_id, joined_at asc);

create index if not exists race_room_members_user_id_idx
on public.race_room_members (user_id, joined_at desc);

create or replace function public.register_pvp_race_taps(
  p_room_id uuid,
  p_user_id uuid,
  p_tap_count integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  room_status text;
  next_count integer;
begin
  if p_tap_count is null or p_tap_count <= 0 then
    return 0;
  end if;

  select status
  into room_status
  from public.race_rooms
  where id = p_room_id;

  if room_status <> 'racing' then
    return 0;
  end if;

  update public.race_room_members
  set tap_count = tap_count + p_tap_count
  where room_id = p_room_id
    and user_id = p_user_id
  returning tap_count
  into next_count;

  return coalesce(next_count, 0);
end;
$$;

alter table public.race_rooms enable row level security;
alter table public.race_room_members enable row level security;

drop policy if exists "race_rooms_select_member" on public.race_rooms;
create policy "race_rooms_select_member"
on public.race_rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.race_room_members rrm
    where rrm.room_id = id
      and rrm.user_id = auth.uid()
  )
);

drop policy if exists "race_room_members_select_member" on public.race_room_members;
create policy "race_room_members_select_member"
on public.race_room_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.race_room_members my_membership
    where my_membership.room_id = room_id
      and my_membership.user_id = auth.uid()
  )
);
