create table public.extension_pairings (
  id uuid primary key default gen_random_uuid(),
  device_code_hash char(64) not null unique
    check (device_code_hash ~ '^[a-f0-9]{64}$'),
  user_code char(9) not null unique
    check (user_code ~ '^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'),
  requested_name varchar(50) not null
    check (length(btrim(requested_name)) between 1 and 50),
  requested_lifetime_days smallint not null
    check (requested_lifetime_days in (30, 90, 180)),
  extension_id varchar(32) not null
    check (extension_id ~ '^[a-p]{32}$'),
  extension_version varchar(20) not null
    check (extension_version ~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$'),
  locale varchar(2) not null
    check (locale in ('en', 'nl')),
  status varchar(16) not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'redeemed')),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  resolved_at timestamptz,
  redeemed_at timestamptz,
  constraint extension_pairings_lifetime_check
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint extension_pairings_state_check check (
    (status = 'pending' and user_id is null and resolved_at is null and redeemed_at is null)
    or (status in ('approved', 'denied') and user_id is not null and resolved_at is not null and redeemed_at is null)
    or (status = 'redeemed' and user_id is not null and resolved_at is not null and redeemed_at is not null)
  )
);

create index extension_pairings_expiry_idx
  on public.extension_pairings(expires_at);

alter table public.extension_pairings enable row level security;
revoke all on table public.extension_pairings from public, anon, authenticated, service_role;

comment on table public.extension_pairings is
  'Short-lived browser connection approvals. Contains no API key plaintext, account session, scan content, result, link, IP address, or mailbox data.';

create function public.create_extension_pairing(
  p_device_code_hash text,
  p_user_code text,
  p_requested_name text,
  p_requested_lifetime_days integer,
  p_extension_id text,
  p_extension_version text,
  p_locale text
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
    or p_requested_lifetime_days not in (30, 90, 180)
    or p_extension_id is null
    or p_extension_id !~ '^[a-p]{32}$'
    or p_extension_version is null
    or p_extension_version !~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$'
    or p_locale is null
    or p_locale not in ('en', 'nl') then
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

create function public.inspect_extension_pairing(
  p_pairing_id uuid,
  p_user_code text
)
returns table (
  operation_status text,
  requested_name varchar(50),
  requested_lifetime_days smallint,
  extension_id varchar(32),
  extension_version varchar(20),
  locale varchar(2),
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_pairing public.extension_pairings%rowtype;
begin
  select * into selected_pairing
  from public.extension_pairings pairings
  where pairings.id = p_pairing_id
    and pairings.user_code = p_user_code;

  if not found then
    return query select 'invalid'::text, null::varchar(50), null::smallint, null::varchar(32), null::varchar(20), null::varchar(2), null::timestamptz;
    return;
  end if;
  if selected_pairing.expires_at <= clock_timestamp() then
    return query select 'expired'::text, selected_pairing.requested_name, selected_pairing.requested_lifetime_days,
      selected_pairing.extension_id, selected_pairing.extension_version, selected_pairing.locale, selected_pairing.expires_at;
    return;
  end if;

  return query select selected_pairing.status::text, selected_pairing.requested_name,
    selected_pairing.requested_lifetime_days, selected_pairing.extension_id,
    selected_pairing.extension_version, selected_pairing.locale, selected_pairing.expires_at;
end;
$$;

create function public.resolve_extension_pairing(
  p_pairing_id uuid,
  p_user_code text,
  p_user_id uuid,
  p_approved boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_pairing public.extension_pairings%rowtype;
begin
  if p_user_id is null then return 'invalid'; end if;

  select * into selected_pairing
  from public.extension_pairings pairings
  where pairings.id = p_pairing_id
    and pairings.user_code = p_user_code
  for update;

  if not found then return 'invalid'; end if;
  if selected_pairing.expires_at <= clock_timestamp() then return 'expired'; end if;
  if selected_pairing.status <> 'pending' then
    if selected_pairing.user_id = p_user_id then return selected_pairing.status; end if;
    return 'unavailable';
  end if;

  update public.extension_pairings pairings
  set status = case when p_approved then 'approved' else 'denied' end,
      user_id = p_user_id,
      resolved_at = clock_timestamp()
  where pairings.id = selected_pairing.id;

  return case when p_approved then 'approved' else 'denied' end;
end;
$$;

create function public.redeem_extension_pairing(
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
  rotated_from_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_pairing public.extension_pairings%rowtype;
  created_key record;
begin
  select * into selected_pairing
  from public.extension_pairings pairings
  where pairings.id = p_pairing_id
    and pairings.device_code_hash = p_device_code_hash
  for update;

  if not found then
    return query select 'invalid'::text, null::uuid, null::varchar(50), null::varchar(16), null::integer, null::timestamptz, null::timestamptz, null::uuid;
    return;
  end if;
  if selected_pairing.expires_at <= clock_timestamp() then
    return query select 'expired'::text, null::uuid, selected_pairing.requested_name, null::varchar(16), null::integer, null::timestamptz, selected_pairing.expires_at, null::uuid;
    return;
  end if;
  if selected_pairing.status <> 'approved' then
    return query select selected_pairing.status::text, null::uuid, selected_pairing.requested_name, null::varchar(16), null::integer, null::timestamptz, selected_pairing.expires_at, null::uuid;
    return;
  end if;

  select * into created_key
  from public.create_hosted_api_key(
    selected_pairing.user_id,
    selected_pairing.requested_name,
    p_key_prefix,
    p_secret_hash,
    clock_timestamp() + make_interval(days => selected_pairing.requested_lifetime_days)
  );

  if created_key.operation_status = 'created' then
    update public.extension_pairings pairings
    set status = 'redeemed',
        redeemed_at = clock_timestamp()
    where pairings.id = selected_pairing.id;
  end if;

  return query select created_key.operation_status::text, created_key.id, created_key.name,
    created_key.key_prefix, created_key.monthly_quota, created_key.created_at,
    created_key.expires_at, created_key.rotated_from_id;
end;
$$;

create function public.purge_expired_extension_pairings()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.extension_pairings
  where expires_at <= clock_timestamp();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter function public.create_extension_pairing(text, text, text, integer, text, text, text) owner to postgres;
alter function public.inspect_extension_pairing(uuid, text) owner to postgres;
alter function public.resolve_extension_pairing(uuid, text, uuid, boolean) owner to postgres;
alter function public.redeem_extension_pairing(uuid, text, text, text) owner to postgres;
alter function public.purge_expired_extension_pairings() owner to postgres;

revoke all on function public.create_extension_pairing(text, text, text, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.inspect_extension_pairing(uuid, text) from public, anon, authenticated;
revoke all on function public.resolve_extension_pairing(uuid, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.redeem_extension_pairing(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.purge_expired_extension_pairings() from public, anon, authenticated;

grant execute on function public.create_extension_pairing(text, text, text, integer, text, text, text) to service_role;
grant execute on function public.inspect_extension_pairing(uuid, text) to service_role;
grant execute on function public.resolve_extension_pairing(uuid, text, uuid, boolean) to service_role;
grant execute on function public.redeem_extension_pairing(uuid, text, text, text) to service_role;
grant execute on function public.purge_expired_extension_pairings() to service_role;

select cron.schedule(
  'purge-expired-extension-pairings',
  '*/5 * * * *',
  $$select public.purge_expired_extension_pairings();$$
);
