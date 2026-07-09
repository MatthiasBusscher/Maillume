# Security and Privacy Review

Review date: 2026-07-09

## Scope

This review covers the launch data flow for pasted text, screenshot OCR, `.eml` parsing, `/api/analyze`, heuristic analysis, and optional self-hosted AI mode.

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
