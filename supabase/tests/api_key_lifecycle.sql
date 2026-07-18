begin;

-- Linked pgTAP runs authenticate through Supabase's temporary CLI role. Assume
-- the project owner inside this rollback-only test so extension functions and
-- privilege assertions match local CI and the deployed schema.
set role postgres;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(51);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'api-a@example.test', '', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'api-b@example.test', '', now(), now(), now());

select ok(has_function_privilege('service_role', 'public.reserve_account_api_quota(text)', 'EXECUTE'), 'service role can reserve quota');
select ok(has_function_privilege('service_role', 'public.refund_account_api_quota(uuid)', 'EXECUTE'), 'service role can refund a reservation');
select ok(has_function_privilege('service_role', 'public.finalize_account_api_quota(uuid)', 'EXECUTE'), 'service role can finalize a reservation');
select ok(has_function_privilege('service_role', 'public.create_hosted_api_key(uuid,text,text,text,timestamp with time zone)', 'EXECUTE'), 'service role can create keys through the RPC');
select ok(has_function_privilege('service_role', 'public.rotate_hosted_api_key(uuid,uuid,text,text,timestamp with time zone)', 'EXECUTE'), 'service role can rotate keys through the RPC');
select ok(has_function_privilege('service_role', 'public.revoke_hosted_api_key(uuid,uuid)', 'EXECUTE'), 'service role can revoke keys through the RPC');
select ok(not has_function_privilege('anon', 'public.reserve_account_api_quota(text)', 'EXECUTE'), 'anonymous clients cannot reserve quota');
select ok(not has_function_privilege('authenticated', 'public.reserve_account_api_quota(text)', 'EXECUTE'), 'authenticated clients cannot reserve quota directly');

select ok(not has_table_privilege('service_role', 'public.api_keys', 'SELECT'), 'service role cannot select key rows directly');
select ok(not has_table_privilege('service_role', 'public.api_keys', 'INSERT'), 'service role cannot insert key rows directly');
select ok(not has_table_privilege('service_role', 'public.api_keys', 'UPDATE'), 'service role cannot update key rows directly');
select ok(not has_table_privilege('service_role', 'public.api_keys', 'DELETE'), 'service role cannot delete key rows directly');
select ok(not has_table_privilege('service_role', 'public.api_account_limits', 'SELECT'), 'service role cannot select limits directly');
select ok(not has_table_privilege('service_role', 'public.api_account_usage_monthly', 'SELECT'), 'service role cannot select usage directly');
select ok(not has_table_privilege('service_role', 'public.api_quota_reservations', 'SELECT'), 'service role cannot select reservations directly');
select ok(has_column_privilege('authenticated', 'public.api_keys', 'id', 'SELECT'), 'authenticated clients can read safe key metadata');
select ok(not has_column_privilege('authenticated', 'public.api_keys', 'secret_hash', 'SELECT'), 'authenticated clients cannot read credential verifiers');

select results_eq(
  $$select operation_status from public.create_hosted_api_key(
    '10000000-0000-4000-8000-000000000001', 'Primary', 'mlm_test0001', repeat('a', 64), clock_timestamp() + interval '30 days'
  )$$,
  array['created'::text],
  'first account key is created'
);
select results_eq(
  $$select operation_status from public.create_hosted_api_key(
    '10000000-0000-4000-8000-000000000001', 'Secondary', 'mlm_test0002', repeat('b', 64), clock_timestamp() + interval '30 days'
  )$$,
  array['created'::text],
  'second account key is created'
);

update public.api_account_limits
set monthly_quota = 2
where user_id = '10000000-0000-4000-8000-000000000001';

select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('a', 64))$$,
  array['reserved'::text],
  'first key reserves account quota'
);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('b', 64))$$,
  array['reserved'::text],
  'second key reserves the same account quota'
);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('a', 64))$$,
  array['exhausted'::text],
  'account quota cannot be bypassed with another key'
);
select is(
  (select request_count from public.api_account_usage_monthly where user_id = '10000000-0000-4000-8000-000000000001'),
  2::bigint,
  'two successful reservations produce one shared count'
);
select is(
  (select count(*) from public.api_quota_reservations where user_id = '10000000-0000-4000-8000-000000000001'),
  2::bigint,
  'only successful requests create reservations'
);
select ok(
  public.refund_account_api_quota((
    select reservations.id
    from public.api_quota_reservations reservations
    join public.api_keys keys on keys.id = reservations.api_key_id
    where keys.secret_hash = repeat('a', 64)
    limit 1
  )),
  'the original reservation can be refunded'
);
select ok(
  public.refund_account_api_quota((
    select reservations.id
    from public.api_quota_reservations reservations
    join public.api_keys keys on keys.id = reservations.api_key_id
    where keys.secret_hash = repeat('a', 64)
    limit 1
  )),
  'a duplicate refund is idempotently accepted'
);
select is(
  (select request_count from public.api_account_usage_monthly where user_id = '10000000-0000-4000-8000-000000000001'),
  1::bigint,
  'duplicate refund attempts decrement usage only once'
);

select results_eq(
  $$select operation_status from public.rotate_hosted_api_key(
    '10000000-0000-4000-8000-000000000001',
    (select id from public.api_keys where secret_hash = repeat('a', 64)),
    'mlm_test0003', repeat('c', 64), clock_timestamp() + interval '30 days'
  )$$,
  array['rotated'::text],
  'rotation creates one replacement transactionally'
);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('a', 64))$$,
  array['revoked'::text],
  'the rotated credential is rejected'
);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('c', 64))$$,
  array['reserved'::text],
  'the replacement credential works'
);
select ok(
  public.finalize_account_api_quota((
    select reservations.id
    from public.api_quota_reservations reservations
    join public.api_keys keys on keys.id = reservations.api_key_id
    where keys.secret_hash = repeat('c', 64)
    limit 1
  )),
  'a successful request finalizes its reservation'
);
select ok(
  public.finalize_account_api_quota((
    select reservations.id
    from public.api_quota_reservations reservations
    join public.api_keys keys on keys.id = reservations.api_key_id
    where keys.secret_hash = repeat('c', 64)
    limit 1
  )),
  'duplicate finalization is idempotently accepted'
);
select is(
  (select count(*) from public.api_quota_reservations where finalized_at is not null),
  1::bigint,
  'successful reservations are marked finalized without storing scan data'
);
select is(
  (select request_count from public.api_account_usage_monthly where user_id = '10000000-0000-4000-8000-000000000001'),
  2::bigint,
  'rotation does not reset account usage'
);

update public.api_keys
set created_at = clock_timestamp() - interval '31 days',
    expires_at = clock_timestamp() - interval '1 day'
where secret_hash = repeat('c', 64);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('c', 64))$$,
  array['expired'::text],
  'expired credentials are rejected'
);
select is(
  public.revoke_hosted_api_key(
    '10000000-0000-4000-8000-000000000001',
    (select id from public.api_keys where secret_hash = repeat('b', 64))
  ),
  'revoked'::text,
  'an account can revoke its key'
);
select results_eq(
  $$select operation_status from public.reserve_account_api_quota(repeat('b', 64))$$,
  array['revoked'::text],
  'revoked credentials are rejected'
);

update public.api_quota_reservations as reservations
set reserved_at = clock_timestamp() - interval '11 minutes'
from public.api_keys keys
where keys.id = reservations.api_key_id
  and keys.secret_hash = repeat('a', 64);
select is(public.purge_stale_api_quota_reservations(), 1::bigint, 'stale reservation metadata is purged after 10 minutes');
select is(
  (select count(*) from public.api_quota_reservations reservations join public.api_keys keys on keys.id = reservations.api_key_id where keys.secret_hash = repeat('a', 64)),
  0::bigint,
  'the stale refunded reservation no longer exists'
);

do $$
declare
  index_value integer;
begin
  for index_value in 1..5 loop
    perform public.create_hosted_api_key(
      '20000000-0000-4000-8000-000000000002',
      'Key ' || index_value,
      'mlm_limit00' || index_value,
      lpad(to_hex(index_value), 64, '0'),
      clock_timestamp() + interval '30 days'
    );
  end loop;
end;
$$;
select is(
  (select count(*) from public.api_keys where user_id = '20000000-0000-4000-8000-000000000002' and revoked_at is null),
  5::bigint,
  'an account can hold five active keys'
);
select results_eq(
  $$select operation_status from public.create_hosted_api_key(
    '20000000-0000-4000-8000-000000000002', 'Key 6', 'mlm_limit006', repeat('f', 64), clock_timestamp() + interval '30 days'
  )$$,
  array['active_limit'::text],
  'a sixth active key is rejected'
);
select results_eq(
  $$select operation_status from public.rotate_hosted_api_key(
    '20000000-0000-4000-8000-000000000002',
    (select id from public.api_keys where user_id = '10000000-0000-4000-8000-000000000001' limit 1),
    'mlm_cross001', repeat('9', 64), clock_timestamp() + interval '30 days'
  )$$,
  array['not_found'::text],
  'rotation cannot cross account boundaries'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","aal":"aal1"}', true);
select is((select count(id) from public.api_keys), 0::bigint, 'AAL1 cannot read API key metadata');
select is((select count(user_id) from public.api_account_limits), 0::bigint, 'AAL1 cannot read the API account limit');
select is((select count(user_id) from public.api_account_usage_monthly), 0::bigint, 'AAL1 cannot read API usage');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","aal":"aal2"}', true);
select is((select count(id) from public.api_keys), 3::bigint, 'RLS exposes only the signed-in account keys');
select is((select count(user_id) from public.api_account_limits), 1::bigint, 'RLS exposes only the signed-in account limit');
select is((select count(user_id) from public.api_account_usage_monthly), 1::bigint, 'RLS exposes only the signed-in account usage');
reset role;
set role postgres;

delete from auth.users where id = '20000000-0000-4000-8000-000000000002';
select is((select count(*) from auth.users where id = '20000000-0000-4000-8000-000000000002'), 0::bigint, 'the test account is deleted');
select is((select count(*) from public.api_keys where user_id = '20000000-0000-4000-8000-000000000002'), 0::bigint, 'account deletion cascades to keys');
select is((select count(*) from public.api_account_limits where user_id = '20000000-0000-4000-8000-000000000002'), 0::bigint, 'account deletion cascades to limits');

select * from finish();
rollback;
