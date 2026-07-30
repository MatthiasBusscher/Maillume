-- Separate user-created developer keys from automatically paired browser
-- credentials. Browser credentials have a one-year hard lifetime, a rolling
-- 90-day inactivity deadline, and a stable per-installation verifier hash so
-- reconnecting the same browser rotates rather than consumes another slot.

alter table public.api_keys
  drop constraint api_keys_expiry_window_check,
  add column credential_kind varchar(16) not null default 'developer',
  add column browser_connection_hash char(64),
  add column inactive_after timestamptz,
  add constraint api_keys_expiry_window_check
    check (expires_at > created_at and expires_at <= created_at + interval '1 year'),
  add constraint api_keys_credential_kind_check
    check (credential_kind in ('developer', 'browser')),
  add constraint api_keys_browser_metadata_check check (
    (
      credential_kind = 'developer'
      and browser_connection_hash is null
      and inactive_after is null
    )
    or (
      credential_kind = 'browser'
      and browser_connection_hash ~ '^[a-f0-9]{64}$'
      and inactive_after > created_at
      and inactive_after <= expires_at
    )
  );

create unique index api_keys_browser_connection_idx
  on public.api_keys(user_id, browser_connection_hash)
  where credential_kind = 'browser' and revoked_at is null;

grant select (credential_kind, inactive_after)
  on public.api_keys to authenticated;

alter table public.extension_pairings
  add column browser_connection_hash char(64)
    check (browser_connection_hash ~ '^[a-f0-9]{64}$'),
  drop constraint if exists extension_pairings_requested_lifetime_days_check,
  add constraint extension_pairings_requested_lifetime_days_check
    check (requested_lifetime_days in (30, 90, 180, 365));

comment on column public.api_keys.credential_kind is
  'Distinguishes account-created developer credentials from automatic browser connections.';
comment on column public.api_keys.browser_connection_hash is
  'One-way hash of the random installation identifier used only to rotate the same browser connection.';
comment on column public.api_keys.inactive_after is
  'Rolling inactivity deadline for browser credentials. It never applies to developer credentials.';
comment on column public.extension_pairings.browser_connection_hash is
  'One-way hash of the random browser installation identifier. The raw identifier is never stored.';

create or replace function public.create_hosted_api_key(
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
      where keys.user_id = p_user_id
        and keys.credential_kind = 'developer'
        and keys.revoked_at is null
        and keys.expires_at > clock_timestamp()) >= 5 then
    return query select 'active_limit'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  if (select count(*) from public.api_keys keys
      where keys.user_id = p_user_id and keys.created_at >= clock_timestamp() - interval '24 hours') >= 10 then
    return query select 'throttled'::text, null::uuid, null::varchar(50), null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;

  insert into public.api_keys(
    user_id,
    name,
    key_prefix,
    secret_hash,
    monthly_quota,
    expires_at,
    credential_kind
  )
  values (
    p_user_id,
    btrim(p_name),
    p_key_prefix,
    p_secret_hash,
    account_quota,
    p_expires_at,
    'developer'
  )
  returning * into inserted_key;

  return query select 'created'::text, inserted_key.id, inserted_key.name, inserted_key.key_prefix,
    account_quota, inserted_key.created_at, inserted_key.expires_at, inserted_key.rotated_from_id;
end;
$$;

create or replace function public.rotate_hosted_api_key(
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

  if not found or previous_key.credential_kind <> 'developer' then
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

  insert into public.api_keys(
    user_id,
    name,
    key_prefix,
    secret_hash,
    monthly_quota,
    expires_at,
    rotated_from_id,
    credential_kind
  )
  values (
    p_user_id,
    previous_key.name,
    p_key_prefix,
    p_secret_hash,
    account_quota,
    p_expires_at,
    previous_key.id,
    'developer'
  )
  returning * into inserted_key;

  update public.api_keys as keys
  set revoked_at = clock_timestamp()
  where keys.id = previous_key.id;

  return query select 'rotated'::text, inserted_key.id, inserted_key.name, inserted_key.key_prefix,
    account_quota, inserted_key.created_at, inserted_key.expires_at, inserted_key.rotated_from_id;
end;
$$;

create or replace function public.reserve_account_api_quota(p_secret_hash text)
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
  used_at timestamptz := clock_timestamp();
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
  if selected_key.expires_at <= used_at
    or (
      selected_key.credential_kind = 'browser'
      and selected_key.inactive_after <= used_at
    ) then
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
  set last_used_at = used_at,
      inactive_after = case
        when keys.credential_kind = 'browser'
          then least(keys.expires_at, used_at + interval '90 days')
        else keys.inactive_after
      end
  where keys.id = selected_key.id;

  return query select 'reserved'::text, next_reservation_id, selected_key.id,
    selected_key.user_id, next_count, selected_quota;
end;
$$;

create function public.create_extension_pairing_v2(
  p_device_code_hash text,
  p_user_code text,
  p_requested_name text,
  p_requested_lifetime_days integer,
  p_extension_id text,
  p_extension_version text,
  p_locale text,
  p_browser_connection_hash text
)
returns table (
  operation_status text,
  id uuid,
  user_code char(9),
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_pairing public.extension_pairings%rowtype;
  pairing_created_at timestamptz := clock_timestamp();
begin
  if p_device_code_hash is null
    or p_device_code_hash !~ '^[a-f0-9]{64}$'
    or p_user_code is null
    or p_user_code !~ '^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'
    or p_requested_name is null
    or length(btrim(p_requested_name)) not between 1 and 50
    or p_requested_lifetime_days is null
    or p_requested_lifetime_days not in (30, 90, 180, 365)
    or p_extension_id is null
    or p_extension_id !~ '^[a-p]{32}$'
    or p_extension_version is null
    or p_extension_version !~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$'
    or p_locale is null
    or p_locale not in ('en', 'nl')
    or p_browser_connection_hash is null
    or p_browser_connection_hash !~ '^[a-f0-9]{64}$' then
    return query select 'invalid'::text, null::uuid, null::char(9), null::timestamptz;
    return;
  end if;

  begin
    insert into public.extension_pairings(
      device_code_hash,
      user_code,
      requested_name,
      requested_lifetime_days,
      extension_id,
      extension_version,
      locale,
      browser_connection_hash,
      created_at,
      expires_at
    )
    values (
      p_device_code_hash,
      p_user_code,
      btrim(p_requested_name),
      p_requested_lifetime_days,
      p_extension_id,
      p_extension_version,
      p_locale,
      p_browser_connection_hash,
      pairing_created_at,
      pairing_created_at + interval '10 minutes'
    )
    returning * into inserted_pairing;
  exception
    when unique_violation then
      return query select 'conflict'::text, null::uuid, null::char(9), null::timestamptz;
      return;
  end;

  return query select 'created'::text, inserted_pairing.id, inserted_pairing.user_code, inserted_pairing.expires_at;
end;
$$;

create function public.redeem_extension_pairing_v2(
  p_pairing_id uuid,
  p_device_code_hash text,
  p_key_prefix text,
  p_secret_hash text
)
returns table (
  operation_status text,
  id uuid,
  name varchar(50),
  key_prefix varchar(16),
  monthly_quota integer,
  created_at timestamptz,
  expires_at timestamptz,
  inactive_after timestamptz,
  credential_kind varchar(16),
  rotated_from_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_pairing public.extension_pairings%rowtype;
  previous_key public.api_keys%rowtype;
  inserted_key public.api_keys%rowtype;
  account_quota integer;
  connection_hash char(64);
  key_created_at timestamptz := clock_timestamp();
begin
  if p_key_prefix !~ '^mlm_[A-Za-z0-9_-]{8}$'
    or p_secret_hash !~ '^[a-f0-9]{64}$' then
    return query select 'invalid'::text, null::uuid, null::varchar(50), null::varchar(16), null::integer, null::timestamptz, null::timestamptz, null::timestamptz, null::varchar(16), null::uuid;
    return;
  end if;

  select * into selected_pairing
  from public.extension_pairings pairings
  where pairings.id = p_pairing_id
    and pairings.device_code_hash = p_device_code_hash
  for update;

  if not found then
    return query select 'invalid'::text, null::uuid, null::varchar(50), null::varchar(16), null::integer, null::timestamptz, null::timestamptz, null::timestamptz, null::varchar(16), null::uuid;
    return;
  end if;
  if selected_pairing.expires_at <= key_created_at then
    return query select 'expired'::text, null::uuid, selected_pairing.requested_name, null::varchar(16), null::integer, null::timestamptz, selected_pairing.expires_at, null::timestamptz, null::varchar(16), null::uuid;
    return;
  end if;
  if selected_pairing.status <> 'approved' then
    return query select selected_pairing.status::text, null::uuid, selected_pairing.requested_name, null::varchar(16), null::integer, null::timestamptz, selected_pairing.expires_at, null::timestamptz, null::varchar(16), null::uuid;
    return;
  end if;

  connection_hash := coalesce(selected_pairing.browser_connection_hash, selected_pairing.device_code_hash);

  insert into public.api_account_limits(user_id)
  values (selected_pairing.user_id)
  on conflict (user_id) do nothing;
  select limits.monthly_quota into account_quota
  from public.api_account_limits limits
  where limits.user_id = selected_pairing.user_id
  for update;

  select * into previous_key
  from public.api_keys keys
  where keys.user_id = selected_pairing.user_id
    and keys.credential_kind = 'browser'
    and keys.browser_connection_hash = connection_hash
    and keys.revoked_at is null
  order by keys.created_at desc
  limit 1
  for update;

  if not found and (
    select count(*) from public.api_keys keys
    where keys.user_id = selected_pairing.user_id
      and keys.credential_kind = 'browser'
      and keys.revoked_at is null
      and keys.expires_at > key_created_at
      and keys.inactive_after > key_created_at
  ) >= 5 then
    return query select 'active_limit'::text, null::uuid, selected_pairing.requested_name, null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::timestamptz, 'browser'::varchar(16), null::uuid;
    return;
  end if;

  if (
    select count(*) from public.api_keys keys
    where keys.user_id = selected_pairing.user_id
      and keys.created_at >= key_created_at - interval '24 hours'
  ) >= 10 then
    return query select 'throttled'::text, null::uuid, selected_pairing.requested_name, null::varchar(16), account_quota, null::timestamptz, null::timestamptz, null::timestamptz, 'browser'::varchar(16), null::uuid;
    return;
  end if;

  if previous_key.id is not null then
    update public.api_keys keys
    set revoked_at = key_created_at
    where keys.id = previous_key.id;
  end if;

  insert into public.api_keys(
    user_id,
    name,
    key_prefix,
    secret_hash,
    monthly_quota,
    created_at,
    expires_at,
    inactive_after,
    credential_kind,
    browser_connection_hash,
    rotated_from_id
  )
  values (
    selected_pairing.user_id,
    selected_pairing.requested_name,
    p_key_prefix,
    p_secret_hash,
    account_quota,
    key_created_at,
    key_created_at + make_interval(days => selected_pairing.requested_lifetime_days),
    least(
      key_created_at + make_interval(days => selected_pairing.requested_lifetime_days),
      key_created_at + interval '90 days'
    ),
    'browser',
    connection_hash,
    previous_key.id
  )
  returning * into inserted_key;

  update public.extension_pairings pairings
  set status = 'redeemed',
      redeemed_at = key_created_at
  where pairings.id = selected_pairing.id;

  return query select 'created'::text, inserted_key.id, inserted_key.name,
    inserted_key.key_prefix, account_quota, inserted_key.created_at,
    inserted_key.expires_at, inserted_key.inactive_after,
    inserted_key.credential_kind, inserted_key.rotated_from_id;
end;
$$;

alter function public.create_extension_pairing_v2(text, text, text, integer, text, text, text, text) owner to postgres;
alter function public.redeem_extension_pairing_v2(uuid, text, text, text) owner to postgres;

revoke all on function public.create_extension_pairing_v2(text, text, text, integer, text, text, text, text) from public, anon, authenticated;
revoke all on function public.redeem_extension_pairing_v2(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_extension_pairing_v2(text, text, text, integer, text, text, text, text) to service_role;
grant execute on function public.redeem_extension_pairing_v2(uuid, text, text, text) to service_role;
