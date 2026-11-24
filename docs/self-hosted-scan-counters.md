# Self-hosted scan counters

Maillume can count completed scans per UTC day and input mode in a Postgres database you run yourself, instead of Supabase. The official deployment uses this setup. A row is one integer for one day and one input mode; nothing about the message, the result or the visitor is stored.

```text
maillume  --HTTP POST /rpc/record_scan-->  PostgREST  -->  Postgres (scan_counters)
                                            (private Docker network, no key)
reporting (e.g. n8n)  --read-only role-->  Postgres
```

## Application settings

```dotenv
SCAN_COUNTERS=postgrest
SCAN_COUNTER_POSTGREST_URL=http://maillume-counts:3000
```

The URL must be an origin without credentials, path or query. Plain HTTP is accepted only for loopback and single-label hostnames such as a Docker service name, which resolve on a private network; any other host must use HTTPS. An unusable value disables counting instead of failing scans.

PostgREST must not be reachable from the internet. The application only ever calls `record_scan`, which can increment today's count for a known input mode by one and nothing else.

## Database

Run once as the database owner. Replace the two passwords.

```sql
create table public.scan_counters (
  period_start date not null,
  input_mode text not null check (input_mode in ('paste', 'screenshot', 'eml', 'chrome')),
  scan_count bigint not null default 0 check (scan_count >= 0),
  primary key (period_start, input_mode)
);

create or replace function public.record_scan(p_input_mode text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_input_mode is null or p_input_mode not in ('paste', 'screenshot', 'eml', 'chrome') then
    raise exception 'unsupported input mode';
  end if;

  insert into public.scan_counters as counters (period_start, input_mode, scan_count)
  values ((now() at time zone 'utc')::date, p_input_mode, 1)
  on conflict (period_start, input_mode)
  do update set scan_count = counters.scan_count + 1;
end;
$$;

revoke all on table public.scan_counters from public;
revoke all on function public.record_scan(text) from public;

-- PostgREST connects as `counter_api` and serves anonymous requests as `counter_web`,
-- which may only call record_scan.
create role counter_web nologin;
grant usage on schema public to counter_web;
grant execute on function public.record_scan(text) to counter_web;
create role counter_api login noinherit password 'CHANGE-ME-API';
grant counter_web to counter_api;

-- Optional: read-only access for reporting.
create role counter_reader login password 'CHANGE-ME-READER';
grant usage on schema public to counter_reader;
grant select on public.scan_counters to counter_reader;
```

## PostgREST

```yaml
maillume-counts:
  image: postgrest/postgrest:<pinned version>
  environment:
    PGRST_DB_URI: postgres://counter_api:CHANGE-ME-API@<postgres-host>:5432/<database>
    PGRST_DB_SCHEMAS: public
    PGRST_DB_ANON_ROLE: counter_web
    PGRST_OPENAPI_MODE: disabled
```

Put PostgREST on the same private network as the Maillume container and keep Postgres off the application's network if you can.

## Monthly totals

```sql
select input_mode, sum(scan_count) as scans
from public.scan_counters
where period_start >= date_trunc('month', current_date - interval '1 month')
  and period_start < date_trunc('month', current_date)
group by input_mode
order by input_mode;
```
