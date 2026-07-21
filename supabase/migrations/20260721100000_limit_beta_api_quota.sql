-- Limit the free public-beta integration allowance to 25 requests per UTC month.
-- Paid/custom quotas do not exist yet, so existing beta limits are capped as well.

alter table public.api_account_limits
  alter column monthly_quota set default 25;

update public.api_account_limits
set monthly_quota = least(monthly_quota, 25),
    updated_at = now()
where monthly_quota > 25;

alter table public.api_keys
  alter column monthly_quota set default 25;

update public.api_keys
set monthly_quota = least(monthly_quota, 25)
where monthly_quota > 25;
