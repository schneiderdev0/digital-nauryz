with duplicated_rewards as (
  select
    id,
    row_number() over (
      partition by user_id, event_day, reason
      order by created_at asc, id asc
    ) as row_number
  from public.score_events
  where event_day = 19
    and reason = 'day19_tree_created'
)
delete from public.score_events
where id in (
  select id
  from duplicated_rewards
  where row_number > 1
);

create unique index if not exists score_events_day19_tree_created_unique
on public.score_events (user_id, event_day, reason)
where event_day = 19 and reason = 'day19_tree_created';

insert into public.score_events (user_id, event_day, reason, points, metadata)
select
  ep.user_id,
  19,
  'day19_tree_created',
  25,
  jsonb_build_object(
    'treeId',
    coalesce(nullif(ep.metadata ->> 'treeId', ''), 'spring'),
    'backfilled', true
  )
from public.event_participation ep
where ep.event_day = 19
  and ep.status = 'completed'::public.event_progress_status
  and ep.completed_at is not null
  and not exists (
    select 1
    from public.score_events se
    where se.user_id = ep.user_id
      and se.event_day = 19
      and se.reason = 'day19_tree_created'
  );
