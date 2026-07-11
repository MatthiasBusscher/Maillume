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

Apply `supabase/migrations/20260710150000_create_detection_feedback.sql` with the Supabase CLI or your normal migration workflow. The migration:

- creates `public.detection_feedback` with constrained enum-like fields;
- enables Row Level Security without browser-facing policies;
- permits server-side service-role inserts only;
- sets expiry to 89 days after creation;
- enables Supabase Cron through `pg_cron`;
- runs an hourly deletion function so records are removed before the 90-day limit.

Verify the Cron job named `purge-expired-detection-feedback` in the Supabase Dashboard after deployment. Self-hosted Postgres installations must provide `pg_cron` or schedule `public.purge_expired_detection_feedback()` through an equivalent trusted scheduler.

## Abuse And Logging

`/api/feedback` accepts at most 4 KB and applies a best-effort limit of five requests per ten minutes. The limiter hashes the client network address with a random process-local salt and never writes that identifier to the database. Public deployments should also configure an edge rate limit because process memory is not shared across serverless instances.

The route uses `Cache-Control: no-store` and does not log request bodies. Operational logs and analytics must not add feedback payloads or scan content later.

## Calibration Workflow

1. Review aggregate label and category trends.
2. Identify a missed pattern without retrieving the scanned message.
3. Author a new synthetic email using invented identities and reserved domains.
4. Add English and Dutch fixtures where the pattern applies.
5. Run the complete analysis and security suites.

Feedback records are never copied directly into tests, GitHub issues, model prompts, or a training dataset.
