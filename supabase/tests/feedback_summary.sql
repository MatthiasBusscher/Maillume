begin;

set role postgres;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

select ok(
  has_function_privilege(
    'service_role',
    'public.detection_feedback_summary(integer,integer,integer)',
    'EXECUTE'
  ),
  'the service role can request thresholded feedback aggregates'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.detection_feedback_summary(integer,integer,integer)',
    'EXECUTE'
  ),
  'anonymous clients cannot request feedback aggregates'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.detection_feedback_summary(integer,integer,integer)',
    'EXECUTE'
  ),
  'authenticated clients cannot request feedback aggregates'
);
select ok(
  not has_table_privilege('service_role', 'public.detection_feedback', 'SELECT'),
  'the service role still cannot select raw feedback rows'
);

insert into public.detection_feedback (
  helpful,
  expected_classification,
  feedback_kind,
  ui_locale,
  input_mode,
  analyzer_version,
  score_band,
  signal_categories
)
select
  false,
  'legitimate',
  'false_positive',
  'en',
  'paste',
  'analysis-v10',
  'high',
  array['urgency']
from generate_series(1, 12);

insert into public.detection_feedback (
  helpful,
  expected_classification,
  feedback_kind,
  ui_locale,
  input_mode,
  analyzer_version,
  score_band,
  signal_categories
)
select
  false,
  'phishing',
  'false_negative',
  'nl',
  'screenshot',
  'analysis-v10',
  'low',
  array['suspicious_link']
from generate_series(1, 9);

select results_eq(
  $$select sample_count
    from public.detection_feedback_summary(30, 10, 20)
    where analyzer_version = 'analysis-v10'
      and feedback_kind = 'false_positive'
      and dimension = 'source'
      and dimension_value = 'paste'$$,
  array[12::bigint],
  'source aggregates are returned'
);
select results_eq(
  $$select sample_count
    from public.detection_feedback_summary(30, 10, 20)
    where analyzer_version = 'analysis-v10'
      and feedback_kind = 'false_positive'
      and dimension = 'locale'
      and dimension_value = 'en'$$,
  array[12::bigint],
  'locale aggregates are returned'
);
select results_eq(
  $$select sample_count
    from public.detection_feedback_summary(30, 10, 20)
    where analyzer_version = 'analysis-v10'
      and feedback_kind = 'false_positive'
      and dimension = 'score_band'
      and dimension_value = 'high'$$,
  array[12::bigint],
  'score-band aggregates are returned'
);
select results_eq(
  $$select sample_count
    from public.detection_feedback_summary(30, 10, 20)
    where analyzer_version = 'analysis-v10'
      and feedback_kind = 'false_positive'
      and dimension = 'expected_classification'
      and dimension_value = 'legitimate'$$,
  array[12::bigint],
  'expected-classification aggregates are returned'
);
select results_eq(
  $$select sample_count
    from public.detection_feedback_summary(30, 10, 20)
    where analyzer_version = 'analysis-v10'
      and feedback_kind = 'false_positive'
      and dimension = 'signal_category'
      and dimension_value = 'urgency'$$,
  array[12::bigint],
  'coarse signal-category aggregates are returned'
);
select is(
  (
    select count(*)
    from public.detection_feedback_summary(30, 10, 20)
    where feedback_kind = 'false_negative'
  ),
  0::bigint,
  'cells below the minimum sample threshold are suppressed'
);
select throws_ok(
  $$insert into public.detection_feedback (
      helpful,
      expected_classification,
      feedback_kind,
      ui_locale,
      input_mode,
      analyzer_version,
      score_band,
      signal_categories
    ) values (
      false,
      'legitimate',
      'false_positive',
      'en',
      'paste',
      'analysis-test-v10',
      'high',
      array['urgency']
    )$$,
  '23514',
  null,
  'test-like analyzer versions cannot enter feedback storage'
);

insert into public.detection_feedback (
  helpful,
  expected_classification,
  feedback_kind,
  ui_locale,
  input_mode,
  analyzer_version,
  score_band,
  signal_categories
)
select
  false,
  'phishing',
  'false_negative',
  'en',
  'paste',
  'analysis-v11',
  'low',
  array['credential_request']
from generate_series(1, 30);

select results_eq(
  $$select sample_count
    from public.detection_feedback_summary(30, 10, 20)
    where analyzer_version = 'analysis-v11'
      and feedback_kind = 'false_negative'
      and dimension = 'source'
      and dimension_value = 'paste'$$,
  array[20::bigint],
  'identical feedback signatures are capped per hour before aggregation'
);

select throws_ok(
  $$select * from public.detection_feedback_summary(0, 10, 20)$$,
  'P0001',
  'feedback report days must be between 1 and 89',
  'invalid report windows are rejected'
);
select throws_ok(
  $$select * from public.detection_feedback_summary(30, 4, 20)$$,
  'P0001',
  'feedback report minimum samples must be between 5 and 1000',
  'unsafe minimum sample sizes are rejected'
);
select throws_ok(
  $$select * from public.detection_feedback_summary(30, 10, 101)$$,
  'P0001',
  'feedback report hourly signature cap must be between 1 and 100',
  'invalid hourly signature caps are rejected'
);

select * from finish();

rollback;
