create table if not exists public.meeting_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.meeting_pairs (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists meeting_messages_pair_created_at_idx
on public.meeting_messages (pair_id, created_at asc);

alter table public.meeting_messages enable row level security;

drop policy if exists "meeting_messages_select_member" on public.meeting_messages;
create policy "meeting_messages_select_member"
on public.meeting_messages
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

drop policy if exists "meeting_messages_insert_member" on public.meeting_messages;
create policy "meeting_messages_insert_member"
on public.meeting_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.meeting_pairs mp
    where mp.id = pair_id
      and (mp.user_a_id = auth.uid() or mp.user_b_id = auth.uid())
  )
);

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

  if confirmation_count >= 1 and current_pair.status <> 'confirmed' then
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
