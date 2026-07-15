-- API credentials are sensitive account controls. Require an AAL2 JWT at the
-- database boundary as well as in the Next.js route so direct PostgREST access
-- cannot bypass the application's MFA check.

drop policy if exists "Users can view their API keys" on public.api_keys;
create policy "Users can view their API keys with MFA"
  on public.api_keys for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'aal') = 'aal2'
  );

drop policy if exists "Users can view their API account limit" on public.api_account_limits;
create policy "Users can view their API account limit with MFA"
  on public.api_account_limits for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'aal') = 'aal2'
  );

drop policy if exists "Users can view their account API usage" on public.api_account_usage_monthly;
create policy "Users can view their account API usage with MFA"
  on public.api_account_usage_monthly for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'aal') = 'aal2'
  );
