-- Forward-only cutover from per-key quota to account quota and expiring keys.
-- Deploy the RPC-only app first, then apply this migration immediately during a
-- short hosted-integration maintenance window.

alter table public.api_keys
  add column expires_at timestamptz,
  add column rotated_from_id uuid;

update public.api_keys
set expires_at = created_at + interval '90 days'
where expires_at is null;

alter table public.api_keys
  alter column expires_at set default (now() + interval '90 days'),
  alter column expires_at set not null,
  add constraint api_keys_expiry_window_check
    check (expires_at > created_at and expires_at <= created_at + interval '180 days'),
  add constraint api_keys_user_id_id_unique unique (user_id, id),
  add constraint api_keys_rotation_same_account_fk
    foreign key (user_id, rotated_from_id)
    references public.api_keys(user_id, id)
    on delete cascade;

create unique index api_keys_rotated_from_unique
  on public.api_keys(rotated_from_id)
  where rotated_from_id is not null;

create index api_keys_active_user_idx
  on public.api_keys(user_id, expires_at)
  where revoked_at is null;

create table public.api_account_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_quota integer not null default 100 check (monthly_quota between 1 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.api_account_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  request_count bigint not null default 0 check (request_count >= 0),
  primary key (user_id, period_start),
  constraint api_account_usage_period_start_check
    check (period_start = date_trunc('month', period_start)::date)
);

create table public.api_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key_id uuid not null,
  period_start date not null,
  reserved_at timestamptz not null default now(),
  refunded_at timestamptz,
  finalized_at timestamptz,
  constraint api_quota_reservation_key_fk
    foreign key (user_id, api_key_id)
    references public.api_keys(user_id, id)
    on delete cascade,
  constraint api_quota_reservation_period_start_check
    check (period_start = date_trunc('month', period_start)::date),
  constraint api_quota_reservation_refund_check
    check (refunded_at is null or refunded_at >= reserved_at),
  constraint api_quota_reservation_finalize_check
    check (finalized_at is null or finalized_at >= reserved_at),
  constraint api_quota_reservation_single_outcome_check
    check (refunded_at is null or finalized_at is null)
);

create index api_quota_reservations_retention_idx
  on public.api_quota_reservations(period_start);

comment on table public.api_account_limits is
  'Account-level hosted API allowance. It contains no scan content or results.';
comment on table public.api_account_usage_monthly is
  'Account-level aggregate request counts only. It contains no scan content or results.';
comment on table public.api_quota_reservations is
  'Non-content quota reservations used to make finalization and refunds idempotent. Rows become purgeable after 10 minutes.';

insert into public.api_account_limits(user_id, monthly_quota)
select user_id, max(monthly_quota)
from public.api_keys
group by user_id
on conflict (user_id) do nothing;

insert into public.api_account_usage_monthly(user_id, period_start, request_count)
select keys.user_id, usage.period_start, sum(usage.request_count)::bigint
from public.api_usage_monthly usage
join public.api_keys keys on keys.id = usage.api_key_id
group by keys.user_id, usage.period_start
on conflict (user_id, period_start) do update
  set request_count = excluded.request_count;

alter table public.api_account_limits enable row level security;
alter table public.api_account_usage_monthly enable row level security;
alter table public.api_quota_reservations enable row level security;

revoke all on table public.api_account_limits from public, anon, authenticated, service_role;
revoke all on table public.api_account_usage_monthly from public, anon, authenticated, service_role;
revoke all on table public.api_quota_reservations from public, anon, authenticated, service_role;

grant select (user_id, monthly_quota, created_at, updated_at)
  on public.api_account_limits to authenticated;
grant select (user_id, period_start, request_count)
  on public.api_account_usage_monthly to authenticated;

create policy "Users can view their API account limit"
  on public.api_account_limits for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their account API usage"
  on public.api_account_usage_monthly for select to authenticated
  using ((select auth.uid()) = user_id);

-- Authenticated clients may read key metadata, never the credential verifier.
revoke all on table public.api_keys from authenticated, service_role;
grant select (
  id,
  user_id,
  name,
  key_prefix,
  monthly_quota,
  created_at,
  last_used_at,
  revoked_at,
  expires_at,
  rotated_from_id
) on public.api_keys to authenticated;

-- The legacy usage table is retained for audit/rollback investigation only.
revoke all on table public.api_usage_monthly from service_role;

drop function public.consume_api_quota(text);
drop function public.refund_api_quota(uuid);

create function public.reserve_account_api_quota(p_secret_hash text)
returns table (
  operation_status text,
  reservation_id uuid,
  api_key_id uuid,
  owner_id uuid,
  request_count bigint,
  monthly_quota integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  located_key_id uuid;
  located_user_id uuid;
  located_quota integer;
  selected_key public.api_keys%rowtype;
  selected_quota integer;
  current_period date := date_trunc('month', timezone('utc', clock_timestamp()))::date;
  next_count bigint;
  next_reservation_id uuid;
begin
  select keys.id, keys.user_id, keys.monthly_quota
  into located_key_id, located_user_id, located_quota
  from public.api_keys keys
  where keys.secret_hash = p_secret_hash;

  if not found then
    return query select 'invalid'::text, null::uuid, null::uuid, null::uuid, null::bigint, null::integer;
    return;
  end if;
  insert into public.api_account_limits(user_id, monthly_quota)
  values (located_user_id, located_quota)
  on conflict (user_id) do nothing;

  select limits.monthly_quota into selected_quota
  from public.api_account_limits limits
  where limits.user_id = located_user_id
  for update;

  select * into selected_key
  from public.api_keys keys
  where keys.id = located_key_id
    and keys.user_id = located_user_id
    and keys.secret_hash = p_secret_hash
  for update;

  if not found then
    return query select 'invalid'::text, null::uuid, null::uuid, null::uuid, null::bigint, null::integer;
    return;
  end if;
  if selected_key.revoked_at is not null then
    return query select 'revoked'::text, null::uuid, null::uuid, null::uuid, null::bigint, null::integer;
    return;
  end if;
  if selected_key.expires_at <= clock_timestamp() then
    return query select 'expired'::text, null::uuid, null::uuid, null::uuid, null::bigint, null::integer;
    return;
  end if;

  insert into public.api_account_usage_monthly as usage (user_id, period_start, request_count)
  values (selected_key.user_id, current_period, 1)
  on conflict on constraint api_account_usage_monthly_pkey do update
    set request_count = usage.request_count + 1
    where usage.request_count < selected_quota
  returning usage.request_count into next_count;

  if next_count is null or next_count > selected_quota then
    return query select 'exhausted'::text, null::uuid, null::uuid, null::uuid,
      coalesce((select usage.request_count from public.api_account_usage_monthly usage
        where usage.user_id = selected_key.user_id and usage.period_start = current_period), 0),
      selected_quota;
    return;
  end if;

  insert into public.api_quota_reservations as reservations(user_id, api_key_id, period_start)
  values (selected_key.user_id, selected_key.id, current_period)
  returning reservations.id into next_reservation_id;

  update public.api_keys as keys
  set last_used_at = clock_timestamp()
  where keys.id = selected_key.id;

  return query select 'reserved'::text, next_reservation_id, selected_key.id,
    selected_key.user_id, next_count, selected_quota;
end;
$$;

create function public.refund_account_api_quota(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_reservation public.api_quota_reservations%rowtype;
begin
  select * into selected_reservation
  from public.api_quota_reservations reservations
  where reservations.id = p_reservation_id
  for update;

  if not found then
    return false;
  end if;
  if selected_reservation.finalized_at is not null then
    return false;
  end if;
  if selected_reservation.refunded_at is not null then
    return true;
  end if;

  update public.api_account_usage_monthly
  set request_count = greatest(0, request_count - 1)
  where user_id = selected_reservation.user_id
    and period_start = selected_reservation.period_start
    and request_count > 0;

  if not found then
    return false;
  end if;

  update public.api_quota_reservations as reservations
  set refunded_at = clock_timestamp()
  where reservations.id = selected_reservation.id;
  return true;
end;
$$;

create function public.finalize_account_api_quota(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_reservation public.api_quota_reservations%rowtype;
begin
  select * into selected_reservation
  from public.api_quota_reservations reservations
  where reservations.id = p_reservation_id
  for update;

  if not found or selected_reservation.refunded_at is not null then
    return false;
  end if;
  if selected_reservation.finalized_at is not null then
    return true;
  end if;

  update public.api_quota_reservations as reservations
  set finalized_at = clock_timestamp()
  where reservations.id = selected_reservation.id;
  return true;
end;
$$;

create function public.create_hosted_api_key(
  p_user_id uuid,
  p_name text,
  p_key_prefix text,
  p_secret_hash text,
  p_expires_at timestamptz
)
returns table (
  operation_status text,
  id uuid,
  name varchar(50),
  key_prefix varchar(16),
  monthly_quota integer,
  created_at timestamptz,
  expires_at timestamptz,
  rotated_from_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_key public.api_keys%rowtype;
  account_quota integer;
begin
  if p_name is null or length(btrim(p_name)) not between 1 and 50
    or p_key_prefix !~ '^mlm_[A-Za-z0-9_-]{8}$'
    or p_secret_hash !~ '^[a-f0-9]{64}$'
    or p_expires_at <= clock_timestamp()
    or p_expires_at > clock_timestamp() + interval '180 days' then
    return query select 'invalid'::text, null::uuid, null::varchar(50), null::varchar(16), null::integer, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  insert into public.api_account_limits(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select limits.monthly_quota into account_quota
  from public.api_account_limits limits
  where limits.user_id = p_user_id
  for update;

  if (select count(*) from public.api_keys keys
      where keys.user_id = p_user_id and keys.revoked_at is null and keys.expires_at > clock_timestamp()) >= 5 then
    return query select 'active_limit'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  if (select count(*) from public.api_keys keys
      where keys.user_id = p_user_id and keys.created_at >= clock_timestamp() - interval '24 hours') >= 10 then
    return query select 'throttled'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  insert into public.api_keys(user_id, name, key_prefix, secret_hash, monthly_quota, expires_at)
  values (p_user_id, btrim(p_name), p_key_prefix, p_secret_hash, account_quota, p_expires_at)
  returning * into inserted_key;

  return query select 'created'::text, inserted_key.id, inserted_key.name, inserted_key.key_prefix,
    account_quota, inserted_key.created_at, inserted_key.expires_at, inserted_key.rotated_from_id;
end;
$$;

create function public.rotate_hosted_api_key(
  p_user_id uuid,
  p_api_key_id uuid,
  p_key_prefix text,
  p_secret_hash text,
  p_expires_at timestamptz
)
returns table (
  operation_status text,
  id uuid,
  name varchar(50),
  key_prefix varchar(16),
  monthly_quota integer,
  created_at timestamptz,
  expires_at timestamptz,
  rotated_from_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_key public.api_keys%rowtype;
  inserted_key public.api_keys%rowtype;
  account_quota integer;
begin
  if p_key_prefix !~ '^mlm_[A-Za-z0-9_-]{8}$'
    or p_secret_hash !~ '^[a-f0-9]{64}$'
    or p_expires_at <= clock_timestamp()
    or p_expires_at > clock_timestamp() + interval '180 days' then
    return query select 'invalid'::text, null::uuid, null::varchar(50), null::varchar(16), null::integer, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  insert into public.api_account_limits(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select limits.monthly_quota into account_quota
  from public.api_account_limits limits
  where limits.user_id = p_user_id
  for update;

  select * into previous_key
  from public.api_keys keys
  where keys.id = p_api_key_id and keys.user_id = p_user_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;
  if previous_key.revoked_at is not null then
    return query select 'revoked'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;
  if previous_key.expires_at <= clock_timestamp() then
    return query select 'expired'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;
  if exists (select 1 from public.api_keys keys where keys.rotated_from_id = previous_key.id) then
    return query select 'already_rotated'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, previous_key.id;
    return;
  end if;
  if (select count(*) from public.api_keys keys
      where keys.user_id = p_user_id and keys.created_at >= clock_timestamp() - interval '24 hours') >= 10 then
    return query select 'throttled'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, previous_key.id;
    return;
  end if;

  insert into public.api_keys(user_id, name, key_prefix, secret_hash, monthly_quota, expires_at, rotated_from_id)
  values (p_user_id, previous_key.name, p_key_prefix, p_secret_hash, account_quota, p_expires_at, previous_key.id)
  returning * into inserted_key;

  update public.api_keys as keys
  set revoked_at = clock_timestamp()
  where keys.id = previous_key.id;

  return query select 'rotated'::text, inserted_key.id, inserted_key.name, inserted_key.key_prefix,
    account_quota, inserted_key.created_at, inserted_key.expires_at, inserted_key.rotated_from_id;
end;
$$;

create function public.revoke_hosted_api_key(p_user_id uuid, p_api_key_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.api_account_limits(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  perform limits.user_id
  from public.api_account_limits limits
  where limits.user_id = p_user_id
  for update;

  update public.api_keys as keys
  set revoked_at = clock_timestamp()
  where keys.id = p_api_key_id and keys.user_id = p_user_id and keys.revoked_at is null;

  if found then
    return 'revoked';
  end if;
  if exists (select 1 from public.api_keys keys where keys.id = p_api_key_id and keys.user_id = p_user_id) then
    return 'already_inactive';
  end if;
  return 'not_found';
end;
$$;

create or replace function public.purge_expired_api_usage()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint := 0;
  step_count bigint;
begin
  delete from public.api_account_usage_monthly
  where period_start < (date_trunc('month', timezone('utc', clock_timestamp())) - interval '13 months')::date;
  get diagnostics step_count = row_count;
  deleted_count := deleted_count + step_count;

  delete from public.api_usage_monthly
  where period_start < (date_trunc('month', timezone('utc', clock_timestamp())) - interval '13 months')::date;
  get diagnostics step_count = row_count;
  return deleted_count + step_count;
end;
$$;

create function public.purge_stale_api_quota_reservations()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.api_quota_reservations
  where reserved_at < clock_timestamp() - interval '10 minutes';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter function public.reserve_account_api_quota(text) owner to postgres;
alter function public.refund_account_api_quota(uuid) owner to postgres;
alter function public.finalize_account_api_quota(uuid) owner to postgres;
alter function public.create_hosted_api_key(uuid, text, text, text, timestamptz) owner to postgres;
alter function public.rotate_hosted_api_key(uuid, uuid, text, text, timestamptz) owner to postgres;
alter function public.revoke_hosted_api_key(uuid, uuid) owner to postgres;
alter function public.purge_expired_api_usage() owner to postgres;
alter function public.purge_stale_api_quota_reservations() owner to postgres;

revoke all on function public.reserve_account_api_quota(text) from public, anon, authenticated;
revoke all on function public.refund_account_api_quota(uuid) from public, anon, authenticated;
revoke all on function public.finalize_account_api_quota(uuid) from public, anon, authenticated;
revoke all on function public.create_hosted_api_key(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.rotate_hosted_api_key(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_hosted_api_key(uuid, uuid) from public, anon, authenticated;
revoke all on function public.purge_expired_api_usage() from public, anon, authenticated;
revoke all on function public.purge_stale_api_quota_reservations() from public, anon, authenticated;

grant execute on function public.reserve_account_api_quota(text) to service_role;
grant execute on function public.refund_account_api_quota(uuid) to service_role;
grant execute on function public.finalize_account_api_quota(uuid) to service_role;
grant execute on function public.create_hosted_api_key(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.rotate_hosted_api_key(uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.revoke_hosted_api_key(uuid, uuid) to service_role;
grant execute on function public.purge_expired_api_usage() to service_role;
grant execute on function public.purge_stale_api_quota_reservations() to service_role;

select cron.schedule(
  'purge-stale-api-quota-reservations',
  '*/5 * * * *',
  $$select public.purge_stale_api_quota_reservations();$$
);
