create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique,
  status text not null default 'forming' check (status in ('forming', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.family_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  unique (group_id, user_id),
  unique (user_id)
);

create index if not exists family_group_members_group_id_idx
on public.family_group_members (group_id, joined_at asc);

create index if not exists family_groups_owner_id_idx
on public.family_groups (owner_id, created_at desc);

create unique index if not exists score_events_day17_family_completed_unique
on public.score_events (user_id, event_day, reason)
where event_day = 17 and reason = 'day17_family_completed';

create or replace function public.generate_family_invite_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (
      select 1
      from public.family_groups
      where invite_code = code
    );
  end loop;

  return code;
end;
$$;

create or replace function public.create_family_group(
  p_user_id uuid
)
returns public.family_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_group_id uuid;
  created_group public.family_groups;
begin
  select group_id
  into existing_group_id
  from public.family_group_members
  where user_id = p_user_id
  limit 1;

  if existing_group_id is not null then
    raise exception 'User already belongs to a family group';
  end if;

  insert into public.family_groups (owner_id, invite_code)
  values (p_user_id, public.generate_family_invite_code())
  returning *
  into created_group;

  insert into public.family_group_members (group_id, user_id)
  values (created_group.id, p_user_id);

  insert into public.event_participation (user_id, event_day, status, started_at, metadata)
  values (
    p_user_id,
    17,
    'in_progress'::public.event_progress_status,
    timezone('utc', now()),
    jsonb_build_object('group_id', created_group.id)
  )
  on conflict (user_id, event_day)
  do update set
    status = case
      when public.event_participation.status = 'completed'::public.event_progress_status
        then 'completed'::public.event_progress_status
      else 'in_progress'::public.event_progress_status
    end,
    started_at = coalesce(public.event_participation.started_at, excluded.started_at),
    metadata = coalesce(public.event_participation.metadata, '{}'::jsonb) || excluded.metadata;

  return created_group;
end;
$$;

create or replace function public.join_family_group(
  p_user_id uuid,
  p_invite_code text
)
returns public.family_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_group_id uuid;
  target_group public.family_groups;
  next_member_count integer;
  completed_at_value timestamptz;
begin
  select group_id
  into existing_group_id
  from public.family_group_members
  where user_id = p_user_id
  limit 1;

  if existing_group_id is not null then
    raise exception 'User already belongs to a family group';
  end if;

  select *
  into target_group
  from public.family_groups
  where invite_code = upper(trim(p_invite_code))
  for update;

  if target_group.id is null then
    raise exception 'Family group not found';
  end if;

  if target_group.status <> 'forming' then
    raise exception 'Family group is already completed';
  end if;

  select count(*) + 1
  into next_member_count
  from public.family_group_members
  where group_id = target_group.id;

  if next_member_count > 6 then
    raise exception 'Family group is full';
  end if;

  insert into public.family_group_members (group_id, user_id)
  values (target_group.id, p_user_id);

  insert into public.event_participation (user_id, event_day, status, started_at, metadata)
  values (
    p_user_id,
    17,
    'in_progress'::public.event_progress_status,
    timezone('utc', now()),
    jsonb_build_object('group_id', target_group.id)
  )
  on conflict (user_id, event_day)
  do update set
    status = case
      when public.event_participation.status = 'completed'::public.event_progress_status
        then 'completed'::public.event_progress_status
      else 'in_progress'::public.event_progress_status
    end,
    started_at = coalesce(public.event_participation.started_at, excluded.started_at),
    metadata = coalesce(public.event_participation.metadata, '{}'::jsonb) || excluded.metadata;

  if next_member_count = 6 then
    completed_at_value := timezone('utc', now());

    update public.family_groups
    set status = 'completed',
        completed_at = completed_at_value
    where id = target_group.id
    returning *
    into target_group;

    insert into public.event_participation (user_id, event_day, status, started_at, completed_at, metadata)
    select
      user_id,
      17,
      'completed'::public.event_progress_status,
      joined_at,
      completed_at_value,
      jsonb_build_object('group_id', target_group.id)
    from public.family_group_members
    where group_id = target_group.id
    on conflict (user_id, event_day)
    do update set
      status = 'completed'::public.event_progress_status,
      started_at = coalesce(public.event_participation.started_at, excluded.started_at),
      completed_at = excluded.completed_at,
      metadata = coalesce(public.event_participation.metadata, '{}'::jsonb) || excluded.metadata;

    insert into public.score_events (user_id, event_day, reason, points, metadata)
    select
      user_id,
      17,
      'day17_family_completed',
      40,
      jsonb_build_object('group_id', target_group.id)
    from public.family_group_members
    where group_id = target_group.id
    on conflict do nothing;
  end if;

  return target_group;
end;
$$;

alter table public.family_groups enable row level security;
alter table public.family_group_members enable row level security;

drop policy if exists "family_groups_select_member" on public.family_groups;
create policy "family_groups_select_member"
on public.family_groups
for select
to authenticated
using (
  exists (
    select 1
    from public.family_group_members fgm
    where fgm.group_id = id
      and fgm.user_id = auth.uid()
  )
);

drop policy if exists "family_group_members_select_member" on public.family_group_members;
create policy "family_group_members_select_member"
on public.family_group_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.family_group_members my_membership
    where my_membership.group_id = group_id
      and my_membership.user_id = auth.uid()
  )
);
