begin;

set role postgres;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(29);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('40000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'browsers@example.test', '', now(), now(), now());

select ok(
  has_function_privilege('service_role', 'public.create_extension_pairing_v2(text,text,text,integer,text,text,text,text)', 'EXECUTE'),
  'service role can create browser-aware pairings'
);
select ok(
  has_function_privilege('service_role', 'public.redeem_extension_pairing_v2(uuid,text,text,text)', 'EXECUTE'),
  'service role can redeem browser-aware pairings'
);
select ok(
  not has_function_privilege('anon', 'public.create_extension_pairing_v2(text,text,text,integer,text,text,text,text)', 'EXECUTE'),
  'anonymous clients cannot create browser-aware pairings'
);
select ok(
  not has_function_privilege('authenticated', 'public.redeem_extension_pairing_v2(uuid,text,text,text)', 'EXECUTE'),
  'authenticated clients cannot redeem browser-aware pairings'
);
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'api_keys'
      and column_name in ('credential_kind', 'browser_connection_hash', 'inactive_after')
  ),
  3::bigint,
  'browser credential metadata is present'
);

select results_eq(
  $$select operation_status from public.create_extension_pairing_v2(
    repeat('a', 64), '2345-6789', 'Chrome extension · macOS', 365,
    'bjiiailjalkfjimkjdikoockjlnjolle', '0.4.0', 'en', repeat('3', 64)
  )$$,
  array['created'::text],
  'a browser-aware pairing is created'
);
select results_eq(
  $$select operation_status from public.inspect_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    '2345-6789'
  )$$,
  array['pending'::text],
  'the browser-aware pairing remains compatible with the approval page'
);
select is(
  public.resolve_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    '2345-6789',
    '40000000-0000-4000-8000-000000000004',
    true
  ),
  'approved'::text,
  'the account approves the first browser connection'
);
select results_eq(
  $$select operation_status from public.redeem_extension_pairing_v2(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    repeat('a', 64), 'mlm_browse01', repeat('c', 64)
  )$$,
  array['created'::text],
  'redeeming creates the first browser credential'
);
select is(
  (select credential_kind::text from public.api_keys where secret_hash = repeat('c', 64)),
  'browser'::text,
  'paired credentials are classified as browser connections'
);
select is(
  (select browser_connection_hash::text from public.api_keys where secret_hash = repeat('c', 64)),
  repeat('3', 64)::text,
  'only the stable browser identifier hash is retained'
);
select ok(
  (
    select expires_at between clock_timestamp() + interval '364 days' and clock_timestamp() + interval '366 days'
    from public.api_keys
    where secret_hash = repeat('c', 64)
  ),
  'browser credentials have a one-year hard lifetime'
);
select ok(
  (
    select inactive_after between clock_timestamp() + interval '89 days' and clock_timestamp() + interval '91 days'
    from public.api_keys
    where secret_hash = repeat('c', 64)
  ),
  'browser credentials begin with a 90-day inactivity deadline'
);

select results_eq(
  $$select operation_status from public.create_extension_pairing_v2(
    repeat('b', 64), 'CDEF-2345', 'Chrome extension · macOS', 365,
    'bjiiailjalkfjimkjdikoockjlnjolle', '0.4.0', 'en', repeat('3', 64)
  )$$,
  array['created'::text],
  'the same browser can start a replacement pairing'
);
select is(
  public.resolve_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('b', 64)),
    'CDEF-2345',
    '40000000-0000-4000-8000-000000000004',
    true
  ),
  'approved'::text,
  'the replacement pairing can be approved'
);
select results_eq(
  $$select operation_status from public.redeem_extension_pairing_v2(
    (select id from public.extension_pairings where device_code_hash = repeat('b', 64)),
    repeat('b', 64), 'mlm_browse02', repeat('d', 64)
  )$$,
  array['created'::text],
  'reconnecting rotates the same browser credential'
);
select ok(
  (select revoked_at is not null from public.api_keys where secret_hash = repeat('c', 64)),
  'the previous browser credential is revoked atomically'
);
select is(
  (
    select count(*)
    from public.api_keys
    where user_id = '40000000-0000-4000-8000-000000000004'
      and browser_connection_hash = repeat('3', 64)
      and revoked_at is null
  ),
  1::bigint,
  'reconnecting the same browser consumes one active slot'
);
select is(
  (
    select rotated_from_id
    from public.api_keys
    where secret_hash = repeat('d', 64)
  ),
  (
    select id
    from public.api_keys
    where secret_hash = repeat('c', 64)
  ),
  'the replacement records its rotation source'
);

update public.api_keys
set inactive_after = clock_timestamp() + interval '1 day'
where secret_hash = repeat('d', 64);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('d', 64))$$,
  array['reserved'::text],
  'successful browser use reserves quota'
);
select ok(
  (
    select inactive_after between clock_timestamp() + interval '89 days' and clock_timestamp() + interval '91 days'
    from public.api_keys
    where secret_hash = repeat('d', 64)
  ),
  'successful browser use rolls the inactivity deadline forward'
);

update public.api_keys
set created_at = clock_timestamp() - interval '100 days',
    expires_at = clock_timestamp() + interval '264 days',
    inactive_after = clock_timestamp() - interval '1 hour'
where secret_hash = repeat('d', 64);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('d', 64))$$,
  array['expired'::text],
  'an inactive browser credential cannot reserve quota'
);

insert into public.api_keys(
  user_id,
  name,
  key_prefix,
  secret_hash,
  monthly_quota,
  expires_at,
  inactive_after,
  credential_kind,
  browser_connection_hash
)
select
  '40000000-0000-4000-8000-000000000004',
  'Test browser ' || number,
  'mlm_extra00' || number,
  repeat(number::text, 64),
  25,
  clock_timestamp() + interval '364 days',
  clock_timestamp() + interval '89 days',
  'browser',
  repeat(number::text, 64)
from generate_series(4, 8) as number;

select is(
  (
    select count(*)
    from public.api_keys
    where user_id = '40000000-0000-4000-8000-000000000004'
      and credential_kind = 'browser'
      and revoked_at is null
      and expires_at > clock_timestamp()
      and inactive_after > clock_timestamp()
  ),
  5::bigint,
  'five active browser slots are available independently'
);
select results_eq(
  $$select operation_status from public.create_hosted_api_key(
    '40000000-0000-4000-8000-000000000004',
    'Developer integration',
    'mlm_develop1',
    repeat('e', 64),
    clock_timestamp() + interval '90 days'
  )$$,
  array['created'::text],
  'developer keys have a separate five-key limit'
);
select is(
  (select credential_kind::text from public.api_keys where secret_hash = repeat('e', 64)),
  'developer'::text,
  'account-created keys remain developer credentials'
);

select results_eq(
  $$select operation_status from public.create_extension_pairing_v2(
    repeat('9', 64), 'WXYZ-2345', 'Sixth browser', 365,
    'bjiiailjalkfjimkjdikoockjlnjolle', '0.4.0', 'en', repeat('a', 64)
  )$$,
  array['created'::text],
  'a sixth distinct browser can request approval without creating a key'
);
select is(
  public.resolve_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('9', 64)),
    'WXYZ-2345',
    '40000000-0000-4000-8000-000000000004',
    true
  ),
  'approved'::text,
  'the sixth browser request can be approved before the atomic limit check'
);
select results_eq(
  $$select operation_status from public.redeem_extension_pairing_v2(
    (select id from public.extension_pairings where device_code_hash = repeat('9', 64)),
    repeat('9', 64), 'mlm_sixth001', repeat('f', 64)
  )$$,
  array['active_limit'::text],
  'a sixth distinct browser cannot create another active credential'
);
select is(
  (
    select count(*)
    from public.api_keys
    where user_id = '40000000-0000-4000-8000-000000000004'
      and credential_kind = 'browser'
      and revoked_at is null
      and expires_at > clock_timestamp()
      and inactive_after > clock_timestamp()
  ),
  5::bigint,
  'the browser limit failure creates no extra credential'
);

select * from finish();
rollback;
