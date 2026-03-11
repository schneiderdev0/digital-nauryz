create table if not exists public.kindness_cards (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  template_id text not null,
  message text not null check (char_length(message) between 1 and 280),
  created_at timestamptz not null default timezone('utc', now()),
  constraint kindness_cards_distinct_users check (sender_id <> recipient_id)
);

create index if not exists kindness_cards_sender_created_at_idx
on public.kindness_cards (sender_id, created_at desc);

create index if not exists kindness_cards_recipient_created_at_idx
on public.kindness_cards (recipient_id, created_at desc);

create unique index if not exists score_events_day15_first_card_unique
on public.score_events (user_id, event_day, reason)
where event_day = 15 and reason = 'day15_first_card';

create or replace function public.send_kindness_card(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_template_id text,
  p_message text
)
returns public.kindness_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  sent_count integer;
  created_card public.kindness_cards;
begin
  if p_sender_id = p_recipient_id then
    raise exception 'Cannot send a card to yourself';
  end if;

  select count(*)
  into sent_count
  from public.kindness_cards
  where sender_id = p_sender_id;

  if sent_count >= 10 then
    raise exception 'Daily kindness card limit reached';
  end if;

  insert into public.kindness_cards (sender_id, recipient_id, template_id, message)
  values (p_sender_id, p_recipient_id, p_template_id, trim(p_message))
  returning *
  into created_card;

  insert into public.event_participation (user_id, event_day, status, started_at, metadata)
  values (
    p_sender_id,
    15,
    'in_progress'::public.event_progress_status,
    timezone('utc', now()),
    '{}'::jsonb
  )
  on conflict (user_id, event_day)
  do update set
    status = case
      when public.event_participation.status = 'completed'::public.event_progress_status
        then 'completed'::public.event_progress_status
      else 'in_progress'::public.event_progress_status
    end,
    started_at = coalesce(public.event_participation.started_at, excluded.started_at);

  if sent_count = 0 then
    insert into public.score_events (user_id, event_day, reason, points, metadata)
    values (
      p_sender_id,
      15,
      'day15_first_card',
      20,
      jsonb_build_object('card_id', created_card.id)
    )
    on conflict do nothing;
  end if;

  return created_card;
end;
$$;

create or replace view public.kindness_live_stats as
select
  count(*)::integer as total_cards_sent,
  count(distinct sender_id)::integer as active_senders
from public.kindness_cards;

alter table public.kindness_cards enable row level security;

drop policy if exists "kindness_cards_select_sender_or_recipient"
on public.kindness_cards;

create policy "kindness_cards_select_sender_or_recipient"
on public.kindness_cards
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

grant select on public.kindness_live_stats to authenticated;
