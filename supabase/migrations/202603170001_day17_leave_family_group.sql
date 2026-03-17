create or replace function public.leave_family_group(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_group_id uuid;
  target_group public.family_groups;
  remaining_members_count integer;
  next_owner_id uuid;
begin
  select group_id
  into existing_group_id
  from public.family_group_members
  where user_id = p_user_id
  limit 1;

  if existing_group_id is null then
    raise exception 'DAY17_GROUP_NOT_FOUND';
  end if;

  select *
  into target_group
  from public.family_groups
  where id = existing_group_id
  for update;

  if target_group.id is null then
    raise exception 'DAY17_GROUP_NOT_FOUND';
  end if;

  if target_group.status <> 'forming' then
    raise exception 'DAY17_GROUP_COMPLETED';
  end if;

  delete from public.family_group_members
  where group_id = target_group.id
    and user_id = p_user_id;

  update public.event_participation
  set status = 'available'::public.event_progress_status,
      metadata = coalesce(metadata, '{}'::jsonb) - 'group_id',
      started_at = null,
      completed_at = null
  where user_id = p_user_id
    and event_day = 17
    and status <> 'completed'::public.event_progress_status;

  select count(*)
  into remaining_members_count
  from public.family_group_members
  where group_id = target_group.id;

  if remaining_members_count = 0 then
    delete from public.family_groups
    where id = target_group.id;

    return true;
  end if;

  if target_group.owner_id = p_user_id then
    select user_id
    into next_owner_id
    from public.family_group_members
    where group_id = target_group.id
    order by joined_at asc
    limit 1;

    update public.family_groups
    set owner_id = next_owner_id
    where id = target_group.id;
  end if;

  return true;
end;
$$;
