create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(50) not null,
  key_prefix varchar(16) not null,
  secret_hash char(64) not null unique,
  monthly_quota integer not null default 100 check (monthly_quota between 1 and 100000),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

comment on table public.api_keys is
  'Hashed API credentials and non-content quota metadata. Plaintext keys are never stored.';

create index api_keys_user_id_idx on public.api_keys(user_id);

create table public.api_usage_monthly (
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  period_start date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (api_key_id, period_start)
);

comment on table public.api_usage_monthly is
  'Aggregate request counts only. Scan content, results, IP addresses, and message identifiers are excluded.';

alter table public.api_keys enable row level security;
alter table public.api_usage_monthly enable row level security;

revoke all on table public.api_keys from anon, authenticated;
revoke all on table public.api_usage_monthly from anon, authenticated;
grant select on table public.api_keys to authenticated;
grant select on table public.api_usage_monthly to authenticated;

create policy "Users can view their API keys"
  on public.api_keys for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their aggregate API usage"
  on public.api_usage_monthly for select to authenticated
  using (
    exists (
      select 1 from public.api_keys
      where api_keys.id = api_usage_monthly.api_key_id
        and api_keys.user_id = (select auth.uid())
    )
  );

create or replace function public.consume_api_quota(p_secret_hash text)
returns table (
  api_key_id uuid,
  owner_id uuid,
  request_count integer,
  monthly_quota integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_key public.api_keys%rowtype;
  current_period date := date_trunc('month', timezone('utc', now()))::date;
  next_count integer;
begin
  select * into selected_key
  from public.api_keys
  where secret_hash = p_secret_hash and revoked_at is null
  for update;

  if not found then
    return;
  end if;

  insert into public.api_usage_monthly(api_key_id, period_start, request_count)
  values (selected_key.id, current_period, 1)
  on conflict (api_key_id, period_start) do update
    set request_count = api_usage_monthly.request_count + 1
    where api_usage_monthly.request_count < selected_key.monthly_quota
  returning api_usage_monthly.request_count into next_count;

  if next_count is null or next_count > selected_key.monthly_quota then
    return;
  end if;

  update public.api_keys set last_used_at = now() where id = selected_key.id;

  return query select selected_key.id, selected_key.user_id, next_count, selected_key.monthly_quota;
end;
$$;

revoke all on function public.consume_api_quota(text) from public, anon, authenticated;
grant execute on function public.consume_api_quota(text) to service_role;

create or replace function public.purge_expired_api_usage()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count bigint;
begin
  delete from public.api_usage_monthly
  where period_start < (date_trunc('month', timezone('utc', now())) - interval '13 months')::date;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_api_usage() from public, anon, authenticated;
grant execute on function public.purge_expired_api_usage() to service_role;

select cron.schedule(
  'purge-expired-api-usage',
  '31 3 2 * *',
  $$select public.purge_expired_api_usage();$$
);
