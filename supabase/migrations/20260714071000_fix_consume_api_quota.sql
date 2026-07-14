create or replace function public.consume_api_quota(p_secret_hash text)
returns table (
  api_key_id uuid,
  owner_id uuid,
  request_count integer,
  monthly_quota integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_key public.api_keys%rowtype;
  current_period date := date_trunc('month', timezone('utc', now()))::date;
  next_count integer;
begin
  select * into selected_key
  from public.api_keys
  where secret_hash = p_secret_hash and revoked_at is null
  for update;

  if not found then
    return;
  end if;

  insert into public.api_usage_monthly as usage (api_key_id, period_start, request_count)
  values (selected_key.id, current_period, 1)
  on conflict on constraint api_usage_monthly_pkey do update
    set request_count = usage.request_count + 1
    where usage.request_count < selected_key.monthly_quota
  returning usage.request_count into next_count;

  if next_count is null or next_count > selected_key.monthly_quota then
    return;
  end if;

  update public.api_keys set last_used_at = now() where id = selected_key.id;

  return query select selected_key.id, selected_key.user_id, next_count, selected_key.monthly_quota;
end;
$$;

revoke all on function public.consume_api_quota(text) from public, anon, authenticated;
grant execute on function public.consume_api_quota(text) to service_role;
