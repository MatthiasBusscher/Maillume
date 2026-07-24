-- Daily completed-scan totals per input mode.
--
-- The public beta can observe whether the scanner is used at all without collecting
-- anything about the people using it. A row is a single integer for one UTC day and one
-- input mode. There is no account, session, IP address, request identifier, result,
-- score, or sub-day timestamp, so no row can be attributed to a person or a scan.

create table public.scan_counters (
  period_start date not null,
  input_mode text not null check (input_mode in ('paste', 'screenshot', 'eml', 'chrome')),
  scan_count bigint not null default 0 check (scan_count >= 0),
  primary key (period_start, input_mode)
);

comment on table public.scan_counters is
  'Aggregate completed-scan counts per UTC day and input mode. Message content, results, scores, accounts, sessions, IP addresses, and sub-day timestamps are intentionally excluded so a row cannot be attributed to a person.';

alter table public.scan_counters enable row level security;

revoke all on table public.scan_counters from anon, authenticated, service_role;

-- Counting goes through this function rather than a table grant so the application can
-- only ever increment by one, for a validated input mode, on the current UTC day. It
-- cannot read, decrement, backdate, or delete counts.
create or replace function public.record_scan(p_input_mode text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_input_mode is null or p_input_mode not in ('paste', 'screenshot', 'eml', 'chrome') then
    raise exception 'unsupported input mode';
  end if;

  insert into public.scan_counters as counters (period_start, input_mode, scan_count)
  values ((now() at time zone 'utc')::date, p_input_mode, 1)
  on conflict (period_start, input_mode)
  do update set scan_count = counters.scan_count + 1;
end;
$$;

revoke all on function public.record_scan(text) from public, anon, authenticated;
grant execute on function public.record_scan(text) to service_role;
