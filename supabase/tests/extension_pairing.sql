begin;

set role postgres;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(28);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'pairing@example.test', '', now(), now(), now());

select ok(has_function_privilege('service_role', 'public.create_extension_pairing(text,text,text,integer,text,text,text)', 'EXECUTE'), 'service role can create pairings');
select ok(has_function_privilege('service_role', 'public.inspect_extension_pairing(uuid,text)', 'EXECUTE'), 'service role can inspect pairings');
select ok(has_function_privilege('service_role', 'public.resolve_extension_pairing(uuid,text,uuid,boolean)', 'EXECUTE'), 'service role can resolve pairings');
select ok(has_function_privilege('service_role', 'public.redeem_extension_pairing(uuid,text,text,text)', 'EXECUTE'), 'service role can redeem pairings');
select ok(has_function_privilege('service_role', 'public.purge_expired_extension_pairings()', 'EXECUTE'), 'service role can purge expired pairings');
select ok(not has_function_privilege('anon', 'public.create_extension_pairing(text,text,text,integer,text,text,text)', 'EXECUTE'), 'anonymous clients cannot create pairings');
select ok(not has_function_privilege('authenticated', 'public.resolve_extension_pairing(uuid,text,uuid,boolean)', 'EXECUTE'), 'authenticated clients cannot resolve pairings directly');
select ok(not has_table_privilege('service_role', 'public.extension_pairings', 'SELECT'), 'service role cannot select pairing rows directly');
select ok(not has_table_privilege('authenticated', 'public.extension_pairings', 'SELECT'), 'authenticated clients cannot select pairing rows directly');
select ok(not has_table_privilege('anon', 'public.extension_pairings', 'SELECT'), 'anonymous clients cannot select pairing rows directly');
select is(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'extension_pairings' and column_name in ('api_key', 'plaintext', 'message', 'result', 'session')),
  0::bigint,
  'pairing rows contain no plaintext key, session, message, or result columns'
);

select results_eq(
  $$select operation_status from public.create_extension_pairing(
    repeat('a', 64), '2345-6789', 'Chrome extension · macOS', 90,
    'bjiiailjalkfjimkjdikoockjlnjolle', '0.3.9', 'en'
  )$$,
  array['created'::text],
  'a bounded pending pairing is created'
);
select results_eq(
  $$select operation_status from public.inspect_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    '2345-6789'
  )$$,
  array['pending'::text],
  'the approval page can inspect the pending request'
);
select is(
  public.resolve_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    '2345-6789',
    '30000000-0000-4000-8000-000000000003',
    true
  ),
  'approved'::text,
  'the signed-in account can approve the pending request through the server RPC'
);
select results_eq(
  $$select operation_status from public.redeem_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    repeat('b', 64), 'mlm_pairbad1', repeat('c', 64)
  )$$,
  array['invalid'::text],
  'a wrong device verifier cannot redeem an approved request'
);
select results_eq(
  $$select operation_status from public.redeem_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    repeat('a', 64), 'mlm_pairing1', repeat('d', 64)
  )$$,
  array['created'::text],
  'the matching device verifier atomically creates the dedicated API key'
);
select is(
  (select count(*) from public.api_keys where user_id = '30000000-0000-4000-8000-000000000003' and secret_hash = repeat('d', 64)),
  1::bigint,
  'one hashed API credential is owned by the approving account'
);
select is(
  (select name::text from public.api_keys where secret_hash = repeat('d', 64)),
  'Chrome extension · macOS'::text,
  'the requested browser key name is preserved'
);
select ok(
  (select expires_at between clock_timestamp() + interval '89 days' and clock_timestamp() + interval '91 days' from public.api_keys where secret_hash = repeat('d', 64)),
  'the approved 90-day lifetime is applied by the database'
);
select results_eq(
  $$select operation_status from public.inspect_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    '2345-6789'
  )$$,
  array['redeemed'::text],
  'the pairing is marked redeemed after key creation'
);
select results_eq(
  $$select operation_status from public.redeem_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('a', 64)),
    repeat('a', 64), 'mlm_repeat01', repeat('e', 64)
  )$$,
  array['redeemed'::text],
  'a pairing cannot be redeemed twice'
);

select results_eq(
  $$select operation_status from public.create_extension_pairing(
    repeat('f', 64), 'ABCD-EFGH', 'Denied browser', 30,
    'bjiiailjalkfjimkjdikoockjlnjolle', '0.3.9', 'nl'
  )$$,
  array['created'::text],
  'a second pairing is created for denial coverage'
);
select is(
  public.resolve_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('f', 64)),
    'ABCD-EFGH',
    '30000000-0000-4000-8000-000000000003',
    false
  ),
  'denied'::text,
  'the account can deny the browser request'
);
select results_eq(
  $$select operation_status from public.redeem_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('f', 64)),
    repeat('f', 64), 'mlm_denied01', repeat('1', 64)
  )$$,
  array['denied'::text],
  'a denied request cannot create a key'
);

select results_eq(
  $$select operation_status from public.create_extension_pairing(
    repeat('2', 64), 'JKLM-NPQR', 'Expired browser', 30,
    'bjiiailjalkfjimkjdikoockjlnjolle', '0.3.9', 'en'
  )$$,
  array['created'::text],
  'a third pairing is created for expiry coverage'
);
update public.extension_pairings
set created_at = created_at - interval '11 minutes',
    expires_at = expires_at - interval '11 minutes'
where device_code_hash = repeat('2', 64);
select results_eq(
  $$select operation_status from public.inspect_extension_pairing(
    (select id from public.extension_pairings where device_code_hash = repeat('2', 64)),
    'JKLM-NPQR'
  )$$,
  array['expired'::text],
  'expired requests cannot be approved'
);
select is(public.purge_expired_extension_pairings(), 1::bigint, 'expired pairing metadata is purged');
select is(
  (select count(*) from public.extension_pairings where device_code_hash = repeat('2', 64)),
  0::bigint,
  'purging removes only the expired pairing row'
);

select * from finish();
rollback;
