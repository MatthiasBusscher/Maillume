# Privacy-Safe Detection Feedback

Maillume can optionally collect result labels without collecting the email that was scanned. Feedback is a separate user action and is disabled unless a storage mode is configured.

## Stored Fields

The strict API allowlist contains only:

- helpful: yes or no;
- expected classification: phishing, spam, legitimate, or unsure;
- feedback kind: accurate, false positive, false negative, or unsure;
- UI language;
- input mode;
- analyzer version;
- returned score band;
- selected high-level categories: urgency, impersonation, credential request, payment request, or suspicious link.

The schema has no columns for message text, sender, subject, links, attachments, screenshots, `.eml` files, prompts, free text, account IDs, or IP addresses. Unknown API fields are rejected instead of ignored.

Each record receives a random UUID and timestamps rounded down to the hour. No stable user or browser identifier is stored.

## Storage Modes

Feedback is off by default:

```text
FEEDBACK_STORAGE=disabled
```

Local development and Playwright can use process-memory storage:

```text
FEEDBACK_STORAGE=memory
```

Memory mode is rejected when `NODE_ENV=production`.

Production uses server-only Supabase REST access:

```text
FEEDBACK_STORAGE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-server-only-secret-key
```

Hosted Supabase projects should use the current `SUPABASE_SECRET_KEY`. Legacy and self-hosted projects can instead set `SUPABASE_SERVICE_ROLE_KEY`; the adapter sends the correct authorization headers for either key type. Never prefix either key with `NEXT_PUBLIC_`. The browser submits the allowlisted labels to `/api/feedback`; only the server route can access Supabase.

## Database Setup

Apply both feedback migrations with the Supabase CLI or your normal migration workflow:

- `supabase/migrations/20260710150000_create_detection_feedback.sql`
- `supabase/migrations/20260728110000_create_feedback_summary.sql`

The migrations:

- creates `public.detection_feedback` with constrained enum-like fields;
- enables Row Level Security without browser-facing policies;
- permits server-side service-role inserts only;
- sets expiry to 89 days after creation;
- enables Supabase Cron through `pg_cron`;
- runs an hourly deletion function so records are removed before the 90-day limit.
- add a server-only aggregate function that cannot return raw feedback rows.
- remove any legacy feedback row whose analyzer label is not a canonical `analysis-vN`
  value, then enforce that narrower database constraint.

Verify the Cron job named `purge-expired-detection-feedback` in the Supabase Dashboard after deployment. Self-hosted Postgres installations must provide `pg_cron` or schedule `public.purge_expired_detection_feedback()` through an equivalent trusted scheduler.

## Abuse And Logging

`/api/feedback` accepts at most 4 KB and applies a best-effort limit of five requests per ten minutes. The limiter hashes the client network address with a random process-local salt and never writes that identifier to the database. Public deployments should also configure an edge rate limit because process memory is not shared across serverless instances.

The process-local limiter retains at most 10,000 active buckets. At capacity it removes expired
buckets and rejects new client identities while all retained buckets remain active.

The route uses `Cache-Control: no-store` and does not log request bodies. Operational logs and analytics must not add feedback payloads or scan content later.

## Maintainer Aggregate Report

The report command calls only the thresholded Supabase RPC; it never selects
`detection_feedback` rows directly:

```bash
FEEDBACK_STORAGE=supabase \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SECRET_KEY=your-server-only-secret-key \
npm run report:feedback -- --days 30 --min-samples 10
```

Use `--format json` for machine-readable output and `--output path.json` to write it to a
local file. The default privacy controls are:

- a 30-day window, with an allowed range of 1–89 days;
- a minimum of 10 samples per published cell; values below 5 are rejected by both the
  command and database;
- a cap of 20 identical feedback signatures per hour before aggregation;
- exclusion of analyzer versions that look like tests, local development, or dev builds;
- acceptance of canonical `analysis-vN` version labels only, preventing a version field from
  becoming an arbitrary-text channel;
- no raw feedback rows, timestamps, UUIDs, account data, network identifiers, or message
  fields in the RPC result.

Rows are grouped by analyzer version and feedback kind, then independently broken down by
source, locale, score band, expected classification, and coarse signal category. Each
returned cell has independently met the minimum sample threshold. The function does not
return a total that could be combined with omitted cells to infer a small count.

These counts are voluntary feedback trends, not accuracy rates. They can be biased by who
chooses to respond, repeated users, misunderstanding, or distributed abuse. The hourly
signature cap limits obvious duplicate bursts without introducing a stable user identifier,
but it cannot prove that every response comes from a different person. Do not publish the
report or use it to make unsupported accuracy claims.

## Calibration Workflow

1. Run the aggregate report with the default 30-day window and minimum sample size.
2. Ignore cells that are absent, unstable across windows, or plausibly caused by abuse.
3. Use recurring false-positive or false-negative categories only to prioritize a topic.
4. Identify the abstract missed pattern without retrieving the scanned message.
5. Author a new synthetic email using invented identities and reserved domains.
6. Keep development, validation, and locked cases separate; do not relabel a tuned case as
   holdout evidence.
7. Add English and Dutch fixtures where the pattern applies.
8. Run the complete analysis, security, integration, and browser suites.

Feedback records are never copied directly into tests, GitHub issues, model prompts, or a training dataset.

## Separate Redacted-Example Contribution Route

The current feedback endpoint is not an email-submission endpoint and must never gain a
subject, body, sender, link, attachment, screenshot, `.eml`, or free-text field.

A future redacted-example contribution flow, if approved, must be a separate opt-in route,
table, disclosure, and security/privacy review. It should:

- require the contributor to manually remove names, addresses, account numbers, message IDs,
  tracking parameters, signatures, and other personal or confidential information;
- show the exact redacted text that would be submitted and require explicit confirmation;
- avoid linking the example to feedback UUIDs, accounts, network identifiers, or scan
  history;
- use a separately documented purpose, access policy, retention period, deletion route, and
  manual maintainer review;
- never update production rules or weights automatically;
- move only a newly written, synthetic abstraction into the repository test corpus.

This route is deliberately not implemented in the current phase. Until a separate issue
approves it, contributors should use public advisories or create invented examples with
reserved domains rather than sending private email to Maillume.
