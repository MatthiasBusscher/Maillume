create or replace function public.refund_api_quota(p_api_key_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_period date := date_trunc('month', timezone('utc', now()))::date;
begin
  update public.api_usage_monthly
  set request_count = greatest(0, request_count - 1)
  where api_key_id = p_api_key_id
    and period_start = current_period
    and request_count > 0;
end;
$$;

revoke all on function public.refund_api_quota(uuid) from public, anon, authenticated;
grant execute on function public.refund_api_quota(uuid) to service_role;
