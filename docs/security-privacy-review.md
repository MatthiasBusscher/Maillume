# Security and Privacy Review

Review date: 2026-07-09

## Scope

This review covers the launch data flow for pasted text, screenshot OCR, `.eml` parsing, `/api/analyze`, optional non-content `/api/feedback`, heuristic analysis, and optional self-hosted AI mode.

## Data Flow

- Paste mode sends subject, sender email, and body text to `/api/analyze`.
- Screenshot mode runs OCR in the browser, then sends extracted text to `/api/analyze`.
- `.eml` mode parses headers, body text, links, and attachment metadata in the browser, then sends normalized text to `/api/analyze`.
- Raw screenshot files and raw `.eml` files are not uploaded as files.
- `/api/analyze` returns only the structured assessment envelope and does not include the original input fields.

## Upload Handling

- Screenshot files are limited to PNG, JPEG, WebP, or GIF MIME types.
- Screenshot files are limited to 5 MB.
- `.eml` files are accepted by `.eml` extension or `message/rfc822` MIME type.
- `.eml` files are limited to 2 MB.
- Empty files are rejected.
- Upload limit constants live in `src/lib/scan-limits.ts` and are covered by `npm run test:analysis`.

## Temporary File Handling

The app does not write uploads to disk. Browser `File` objects are read in memory for OCR or parsing, and the file input value is cleared after selection. The server receives normalized text only and does not write raw scan content, prompts, provider responses, or assessment results to a database.

## Logging

Production source files must not call `console.log`, `console.warn`, `console.error`, `console.info`, or `console.debug`. This prevents accidental logging of pasted email content, OCR text, `.eml` content, prompts, or provider responses. The guardrail is checked by `npm run test:security`.

## Secret Exposure

AI provider keys are read only from server-side config. Client components must not read `process.env` or reference server secret names such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_API_KEY`, or service-role keys. The public/demo deployment should keep `ANALYSIS_MODE=heuristic` and leave provider keys unset.

## Security Headers

`next.config.ts` applies conservative headers across the app:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` disabling camera, microphone, geolocation, and payment APIs
- `Cross-Origin-Opener-Policy: same-origin`

CSP should be added only after testing OCR workers and any future hosted assets, because a too-strict CSP can break browser-side OCR.

## AI Provider Payload Strategy

Different AI providers expect different request payloads, auth headers, response formats, and structured-output settings. The app should keep one internal contract:

- Input: `EmailAnalysisInput`
- Output: `EmailAnalysisResult`

Provider-specific payloads should stay behind provider adapters in `src/lib/analysis/providers.ts`. The UI and `/api/analyze` should not know provider request shapes. If an OpenAI-compatible service needs a meaningfully different body or response parser, add a new adapter or a provider profile instead of spreading conditional payload logic across the app.

## Dataset And Feedback Boundary

The current service does not use scanned messages to build a dataset. This includes anonymous scans and any future free or paid account scans.

- Standard scan content is processed for the current assessment only.
- Product-improvement participation must be separate, optional, and never preselected.
- The first feedback implementation should accept non-content labels and high-level pattern categories only.
- Email text, sender, subject, links, files, and prompts must not enter analytics or evaluation storage.
- Maintainers should create synthetic fixtures from aggregate patterns rather than copy production messages.

A future system that accepts real or auto-redacted messages requires its own legal basis, third-party-data review, access controls, withdrawal and deletion behavior, retention schedule, and security review. It is not approved by this review.

### Feedback Implementation

- `/api/feedback` rejects unknown fields and payloads over 4 KB.
- The payload has no free-text field and contains labels, version data, score band, language, input mode, and high-level categories only.
- The server uses an ephemeral hashed abuse key that is never written to feedback storage.
- Supabase access uses a server-only service-role key. Client components cannot reference it.
- Row Level Security has no browser-facing policy for the feedback table.
- Records expire after 89 days and an hourly database job removes expired rows before the 90-day limit.
- The feedback route and Supabase request use `Cache-Control: no-store` and no source file logs payloads.
