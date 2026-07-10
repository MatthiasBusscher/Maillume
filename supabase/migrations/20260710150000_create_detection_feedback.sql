create extension if not exists pg_cron;

create table public.detection_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default date_trunc('hour', now()),
  expires_at timestamptz not null default date_trunc('hour', now()) + interval '89 days',
  helpful boolean not null,
  expected_classification text not null
    check (expected_classification in ('phishing', 'spam', 'legitimate', 'unsure')),
  feedback_kind text not null
    check (feedback_kind in ('accurate', 'false_positive', 'false_negative', 'unsure')),
  ui_locale text not null check (ui_locale in ('en', 'nl')),
  input_mode text not null check (input_mode in ('paste', 'screenshot', 'eml')),
  analyzer_version varchar(64) not null
    check (analyzer_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  score_band text not null check (score_band in ('low', 'medium', 'high')),
  signal_categories text[] not null default '{}'
    check (
      cardinality(signal_categories) <= 5
      and signal_categories <@ array[
        'urgency',
        'impersonation',
        'credential_request',
        'payment_request',
        'suspicious_link'
      ]::text[]
    ),
  check (
    (helpful and feedback_kind = 'accurate')
    or (not helpful and feedback_kind <> 'accurate')
  )
);

comment on table public.detection_feedback is
  'Optional non-content assessment feedback. Email text and identifiers are intentionally excluded.';

alter table public.detection_feedback enable row level security;

revoke all on table public.detection_feedback from anon, authenticated, service_role;
grant insert on table public.detection_feedback to service_role;

create or replace function public.purge_expired_detection_feedback()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count bigint;
begin
  delete from public.detection_feedback where expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_detection_feedback() from public, anon, authenticated;
grant execute on function public.purge_expired_detection_feedback() to service_role;

select cron.schedule(
  'purge-expired-detection-feedback',
  '17 * * * *',
  $$select public.purge_expired_detection_feedback();$$
);
