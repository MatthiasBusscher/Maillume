alter table public.detection_feedback
  drop constraint detection_feedback_analyzer_version_check;

delete from public.detection_feedback
where analyzer_version !~ '^analysis-v[1-9][0-9]{0,2}$';

alter table public.detection_feedback
  add constraint detection_feedback_analyzer_version_check
  check (analyzer_version ~ '^analysis-v[1-9][0-9]{0,2}$');

create or replace function public.detection_feedback_summary(
  p_days integer default 30,
  p_min_samples integer default 10,
  p_hourly_signature_cap integer default 20
)
returns table (
  analyzer_version text,
  feedback_kind text,
  dimension text,
  dimension_value text,
  sample_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_days < 1 or p_days > 89 then
    raise exception 'feedback report days must be between 1 and 89';
  end if;
  if p_min_samples < 5 or p_min_samples > 1000 then
    raise exception 'feedback report minimum samples must be between 5 and 1000';
  end if;
  if p_hourly_signature_cap < 1 or p_hourly_signature_cap > 100 then
    raise exception 'feedback report hourly signature cap must be between 1 and 100';
  end if;

  return query
  with normalized as (
    select
      date_trunc('hour', feedback.created_at) as hour_bucket,
      feedback.analyzer_version::text as version,
      feedback.expected_classification,
      feedback.feedback_kind as kind,
      feedback.ui_locale,
      feedback.input_mode,
      feedback.score_band,
      array(
        select distinct category
        from unnest(feedback.signal_categories) as category
        order by category
      ) as categories
    from public.detection_feedback as feedback
    where feedback.created_at >= clock_timestamp() - make_interval(days => p_days)
      and feedback.expires_at > clock_timestamp()
      and feedback.analyzer_version !~* '(test|development|local|(^|[-_.:])dev($|[-_.:]))'
  ),
  hourly_signatures as (
    select
      normalized.hour_bucket,
      normalized.version,
      normalized.expected_classification,
      normalized.kind,
      normalized.ui_locale,
      normalized.input_mode,
      normalized.score_band,
      normalized.categories,
      least(count(*), p_hourly_signature_cap::bigint) as bounded_count
    from normalized
    group by
      normalized.hour_bucket,
      normalized.version,
      normalized.expected_classification,
      normalized.kind,
      normalized.ui_locale,
      normalized.input_mode,
      normalized.score_band,
      normalized.categories
  ),
  dimensions as (
    select
      version,
      kind,
      'source'::text as name,
      input_mode::text as value,
      bounded_count
    from hourly_signatures
    union all
    select version, kind, 'locale', ui_locale, bounded_count
    from hourly_signatures
    union all
    select version, kind, 'score_band', score_band, bounded_count
    from hourly_signatures
    union all
    select version, kind, 'expected_classification', expected_classification, bounded_count
    from hourly_signatures
    union all
    select signatures.version, signatures.kind, 'signal_category', category, signatures.bounded_count
    from hourly_signatures as signatures
    cross join lateral unnest(signatures.categories) as category
  )
  select
    dimensions.version,
    dimensions.kind,
    dimensions.name,
    dimensions.value,
    sum(dimensions.bounded_count)::bigint
  from dimensions
  group by
    dimensions.version,
    dimensions.kind,
    dimensions.name,
    dimensions.value
  having sum(dimensions.bounded_count) >= p_min_samples
  order by
    dimensions.version,
    dimensions.kind,
    dimensions.name,
    dimensions.value;
end;
$$;

comment on function public.detection_feedback_summary(integer, integer, integer) is
  'Returns thresholded content-free feedback aggregates. Raw feedback rows and small cells are never returned.';

revoke all on function public.detection_feedback_summary(integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.detection_feedback_summary(integer, integer, integer)
  to service_role;
