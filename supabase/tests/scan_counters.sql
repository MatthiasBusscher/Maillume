begin;

-- Linked pgTAP runs authenticate through Supabase's temporary CLI role. Assume
-- the project owner inside this rollback-only test so extension functions and
-- privilege assertions match local CI and the deployed schema.
set role postgres;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

-- The counter table must never become a place where a scan can be identified.
select columns_are(
  'public',
  'scan_counters',
  array['period_start', 'input_mode', 'scan_count'],
  'scan_counters holds only a day, an input mode, and a count'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'scan_counters'
      and column_name in (
        'user_id', 'account_id', 'session_id', 'ip_address', 'client_ip',
        'request_id', 'api_key_id', 'subject', 'sender', 'body', 'links',
        'result', 'risk_score', 'created_at', 'inserted_at'
      )
  ),
  'scan_counters has no identifying, content, result, or sub-day timestamp column'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.scan_counters'::regclass),
  'row level security is enabled on scan_counters'
);

select ok(not has_table_privilege('anon', 'public.scan_counters', 'SELECT'), 'anonymous clients cannot read counts');
select ok(not has_table_privilege('authenticated', 'public.scan_counters', 'SELECT'), 'authenticated clients cannot read counts');
select ok(not has_table_privilege('service_role', 'public.scan_counters', 'INSERT'), 'the service role cannot write counts directly');
select ok(not has_table_privilege('service_role', 'public.scan_counters', 'DELETE'), 'the service role cannot delete counts');
select ok(has_function_privilege('service_role', 'public.record_scan(text)', 'EXECUTE'), 'the service role counts through the function');
select ok(not has_function_privilege('anon', 'public.record_scan(text)', 'EXECUTE'), 'anonymous clients cannot count');
select ok(not has_function_privilege('authenticated', 'public.record_scan(text)', 'EXECUTE'), 'authenticated clients cannot count');

select public.record_scan('paste');
select is(
  (select scan_count from public.scan_counters
   where period_start = (now() at time zone 'utc')::date and input_mode = 'paste'),
  1::bigint,
  'the first scan of the day creates the row'
);

select public.record_scan('paste');
select public.record_scan('paste');
select is(
  (select scan_count from public.scan_counters
   where period_start = (now() at time zone 'utc')::date and input_mode = 'paste'),
  3::bigint,
  'repeat scans increment the same day and mode'
);

select public.record_scan('eml');
select is(
  (select scan_count from public.scan_counters
   where period_start = (now() at time zone 'utc')::date and input_mode = 'eml'),
  1::bigint,
  'each input mode counts separately'
);

select is(
  (select count(*) from public.scan_counters where period_start = (now() at time zone 'utc')::date),
  2::bigint,
  'one row per input mode per day'
);

-- The four-argument form is used throughout because throws_ok(text, text, text) is
-- ambiguous in pgTAP and would read the second argument as a SQLSTATE.
select throws_ok(
  $$select public.record_scan('mailbox_sync')$$,
  'P0001',
  'unsupported input mode',
  'an unknown input mode is rejected'
);

select throws_ok(
  $$select public.record_scan(null)$$,
  'P0001',
  'unsupported input mode',
  'a null input mode is rejected'
);

select throws_ok(
  $$insert into public.scan_counters (period_start, input_mode, scan_count) values (current_date, 'paste', -1)$$,
  '23514',
  null,
  'a negative count is rejected'
);

select * from finish();

rollback;
