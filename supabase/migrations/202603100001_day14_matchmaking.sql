create table if not exists public.meeting_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now())
);

create or replace function public.generate_meeting_pair_code()
returns text
language plpgsql
as $$
declare
  generated_code text;
begin
  loop
    generated_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));

    exit when not exists (
      select 1
      from public.meeting_pairs
      where pair_code = generated_code
    );
  end loop;

  return generated_code;
end;
$$;

create or replace function public.find_or_create_meeting_pair(p_user_id uuid)
returns public.meeting_pairs
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_pair public.meeting_pairs;
  waiting_user_id uuid;
  matched_pair public.meeting_pairs;
begin
  perform pg_advisory_xact_lock(hashtext('day14_meeting_pairing'));

  select mp.*
  into existing_pair
  from public.meeting_pairs mp
  where (mp.user_a_id = p_user_id or mp.user_b_id = p_user_id)
    and mp.status in ('matched', 'confirmed')
  order by mp.assigned_at desc
  limit 1;

  if found then
    return existing_pair;
  end if;

  select mq.user_id
  into waiting_user_id
  from public.meeting_queue mq
  where mq.user_id <> p_user_id
  order by mq.joined_at asc
  for update skip locked
  limit 1;

  if waiting_user_id is null then
    insert into public.meeting_queue (user_id, joined_at)
    values (p_user_id, timezone('utc', now()))
    on conflict (user_id)
    do update set joined_at = excluded.joined_at;

    insert into public.event_participation (user_id, event_day, status, started_at, metadata)
    values (p_user_id, 14, 'in_progress', timezone('utc', now()), '{"reassignments":0}'::jsonb)
    on conflict (user_id, event_day)
    do update set
      status = 'in_progress',
      started_at = coalesce(public.event_participation.started_at, excluded.started_at),
      metadata = jsonb_set(
        coalesce(public.event_participation.metadata, '{}'::jsonb),
        '{reassignments}',
        coalesce(public.event_participation.metadata -> 'reassignments', '0'::jsonb),
        true
      );

    return null;
  end if;

  insert into public.meeting_pairs (user_a_id, user_b_id, pair_code, status)
  values (waiting_user_id, p_user_id, public.generate_meeting_pair_code(), 'matched')
  returning *
  into matched_pair;

  delete from public.meeting_queue
  where user_id in (waiting_user_id, p_user_id);

  insert into public.event_participation (user_id, event_day, status, started_at, metadata)
  values
    (waiting_user_id, 14, 'in_progress', timezone('utc', now()), '{"reassignments":0}'::jsonb),
    (p_user_id, 14, 'in_progress', timezone('utc', now()), '{"reassignments":0}'::jsonb)
  on conflict (user_id, event_day)
  do update set
    status = 'in_progress',
    started_at = coalesce(public.event_participation.started_at, excluded.started_at),
    metadata = jsonb_set(
      coalesce(public.event_participation.metadata, '{}'::jsonb),
      '{reassignments}',
      coalesce(public.event_participation.metadata -> 'reassignments', '0'::jsonb),
      true
    );

  return matched_pair;
end;
$$;

create or replace function public.reassign_meeting_pair(p_user_id uuid)
returns public.meeting_pairs
language plpgsql
security definer
set search_path = public
as $$
declare
  current_pair public.meeting_pairs;
  partner_user_id uuid;
  waiting_user_id uuid;
  next_pair public.meeting_pairs;
begin
  perform pg_advisory_xact_lock(hashtext('day14_meeting_pairing'));

  select mp.*
  into current_pair
  from public.meeting_pairs mp
  where (mp.user_a_id = p_user_id or mp.user_b_id = p_user_id)
    and mp.status = 'matched'
  order by mp.assigned_at desc
  limit 1
  for update;

  if found then
    partner_user_id := case
      when current_pair.user_a_id = p_user_id then current_pair.user_b_id
      else current_pair.user_a_id
    end;

    update public.meeting_pairs
    set status = 'reassigned',
        completed_at = timezone('utc', now())
    where id = current_pair.id;

    delete from public.meeting_confirmations
    where pair_id = current_pair.id;

    insert into public.meeting_queue (user_id, joined_at)
    values
      (p_user_id, timezone('utc', now())),
      (partner_user_id, timezone('utc', now()))
    on conflict (user_id)
    do update set joined_at = excluded.joined_at;
  else
    insert into public.meeting_queue (user_id, joined_at)
    values (p_user_id, timezone('utc', now()))
    on conflict (user_id)
    do update set joined_at = excluded.joined_at;

    partner_user_id := null;
  end if;

  insert into public.event_participation (user_id, event_day, status, started_at, metadata)
  values (p_user_id, 14, 'in_progress', timezone('utc', now()), '{"reassignments":1}'::jsonb)
  on conflict (user_id, event_day)
  do update set
    status = 'in_progress',
    metadata = jsonb_set(
      coalesce(public.event_participation.metadata, '{}'::jsonb),
      '{reassignments}',
      to_jsonb(coalesce((public.event_participation.metadata ->> 'reassignments')::integer, 0) + 1),
      true
    );

  select mq.user_id
  into waiting_user_id
  from public.meeting_queue mq
  where mq.user_id <> p_user_id
    and (partner_user_id is null or mq.user_id <> partner_user_id)
  order by mq.joined_at asc
  for update skip locked
  limit 1;

  if waiting_user_id is null then
    return null;
  end if;

  insert into public.meeting_pairs (user_a_id, user_b_id, pair_code, status)
  values (waiting_user_id, p_user_id, public.generate_meeting_pair_code(), 'matched')
  returning *
  into next_pair;

  delete from public.meeting_queue
  where user_id in (waiting_user_id, p_user_id);

  return next_pair;
end;
$$;

create unique index if not exists score_events_day14_completed_unique
on public.score_events (user_id, event_day, reason)
where event_day = 14 and reason = 'day14_meeting_completed';

create or replace function public.confirm_meeting_pair(p_pair_id uuid, p_user_id uuid)
returns public.meeting_pairs
language plpgsql
security definer
set search_path = public
as $$
declare
  current_pair public.meeting_pairs;
  confirmation_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('day14_meeting_confirmation'));

  select mp.*
  into current_pair
  from public.meeting_pairs mp
  where mp.id = p_pair_id
    and (mp.user_a_id = p_user_id or mp.user_b_id = p_user_id)
  limit 1
  for update;

  if not found then
    raise exception 'Meeting pair not found for current user';
  end if;

  insert into public.meeting_confirmations (pair_id, user_id)
  values (p_pair_id, p_user_id)
  on conflict (pair_id, user_id) do nothing;

  select count(*)
  into confirmation_count
  from public.meeting_confirmations
  where pair_id = p_pair_id;

  if confirmation_count >= 2 and current_pair.status <> 'confirmed' then
    update public.meeting_pairs
    set status = 'confirmed',
        completed_at = timezone('utc', now())
    where id = p_pair_id
    returning *
    into current_pair;

    insert into public.score_events (user_id, event_day, reason, points, metadata)
    values
      (current_pair.user_a_id, 14, 'day14_meeting_completed', 50, jsonb_build_object('pair_id', current_pair.id)),
      (current_pair.user_b_id, 14, 'day14_meeting_completed', 50, jsonb_build_object('pair_id', current_pair.id))
    on conflict do nothing;

    update public.event_participation
    set status = 'completed',
        completed_at = coalesce(completed_at, timezone('utc', now()))
    where user_id in (current_pair.user_a_id, current_pair.user_b_id)
      and event_day = 14;
  end if;

  select mp.*
  into current_pair
  from public.meeting_pairs mp
  where mp.id = p_pair_id;

  return current_pair;
end;
$$;

alter table public.meeting_queue enable row level security;

create policy "meeting_queue_select_own"
on public.meeting_queue
for select
to authenticated
using (auth.uid() = user_id);
