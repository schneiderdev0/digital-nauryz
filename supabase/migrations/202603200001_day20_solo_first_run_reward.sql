create unique index if not exists score_events_day20_solo_first_run_unique
on public.score_events (user_id, event_day, reason)
where event_day = 20 and reason = 'day20_solo_first_run';
