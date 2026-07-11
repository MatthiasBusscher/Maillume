# Maillume Architecture

## Product Shape

Maillume helps non-technical users assess email content before they click links, reply, or send sensitive information. The app must be clear about uncertainty and always show this disclaimer:

> This is an automated risk assessment and should not be considered a guarantee.

The launch MVP is privacy-first: pasted text, screenshots, and `.eml` files can be analyzed, but raw scan content is not stored after scoring. The public hosted version should not use the project owner's paid AI key. AI analysis is an optional self-hosted feature for people who deploy the app with their own provider key.

## Deployment Modes

1. Public Demo Mode
   - Uses local heuristic analysis only.
   - Requires no AI provider key.
   - Does not store pasted email content, screenshots, `.eml` files, or scan results.
   - Safe to host publicly without risking an unexpected AI bill.

2. Self-Hosted AI Mode
   - Enabled by the installer with server-side environment variables.
   - The self-hoster provides their own OpenAI, Anthropic, or OpenAI-compatible provider key.
   - API keys are never committed to GitHub and never exposed to the browser.
   - AI requests pass through a best-effort in-app rate limit before provider calls.
   - Deployment-level rate limiting and provider budgets are still recommended so the self-hoster can control cost.

## Application Layers

1. Web UI
   - Next.js App Router marketing pages at `/`, `/pricing`, `/platform`, and `/self-hosted`.
   - The scanner workspace lives at `/app` and is rewritten from `/` on an `app.*` hostname.
   - Tailwind CSS for styling.
   - Client components for interactive form state and result display.

2. Optional Authentication
   - Supabase Auth provides Google OAuth when public project configuration is present.
   - `/auth/callback` exchanges the OAuth code for a cookie-backed session.
   - Accounts are optional and the scanner remains usable while signed out.
   - Account identity does not create scan history or assessment storage.

3. API Layer
   - `POST /api/analyze` accepts normalized scan input from pasted text, OCR, or `.eml` parsing.
   - Uses the server-side `analyzeEmail` provider interface.
   - Uses local heuristics in public demo mode.
   - Selects AI mode only when self-hosted environment variables are set.
   - Validates and normalizes the model response before returning it.
   - Does not persist raw scan content or scan results.

4. Input Processing Layer
   - Paste mode uses subject, sender email, and body text.
   - Screenshot mode extracts visible text with client-side OCR, then discards the uploaded image.
   - `.eml` mode parses headers, sender, subject, text/html bodies, detected links, and attachment metadata in the browser, then discards the uploaded file.
   - Upload type and size limits are centralized in `src/lib/scan-limits.ts`.
   - Processing should happen in memory or temporary runtime storage only.

5. Data Layer
   - No database is required for scanning.
   - Ordinary scans never become training or evaluation data.
   - Optional feedback uses a separate strict schema containing labels and high-level categories only.
   - Production feedback storage uses a server-only Supabase service-role key, Row Level Security, and automatic expiry. The scanner remains available when feedback is disabled.
   - Optional Google accounts store provider identity and session data in Supabase Auth. Future preferences, quota counters, entitlements, and billing references may be added, but not scan history or assessment content.

6. Deployment
   - A standalone Next.js container runs on the Hostinger VPS behind Cloudflare Tunnel.
   - The production shape uses `maillume.io` for marketing and `app.maillume.io` for the scanner, with `maillume.nl` redirecting to the canonical `.io` domain.
   - No web port or origin IP is exposed publicly; Cloudflare provides protected ingress and edge abuse controls.
   - Public deployment uses `ANALYSIS_MODE=heuristic` and no AI provider key.
   - Self-hosters can use `ANALYSIS_MODE=ai`, `AI_PROVIDER=openai|anthropic|openai-compatible`, and their own server-side provider key.

## Recommended Folder Structure

```text
src/
  app/
    api/
      analyze/
        route.ts
      feedback/
        route.ts
    app/
      page.tsx
    auth/
      callback/
      sign-in/
      sign-out/
    account/
    platform/
    pricing/
    privacy/
    security/
    self-hosted/
    terms/
    layout.tsx
    page.tsx
    globals.css
  components/
    brand-mark.tsx
    email-scan-form.tsx
    home-page.tsx
    risk-meter.tsx
    site-footer.tsx
    site-header.tsx
    language-switcher.tsx
  lib/
    analysis/
      analyze-email.ts
      ai-prompt.ts
      ai-schema.ts
      config.ts
      heuristic-analysis.ts
      heuristic-analysis.test.ts
      heuristic-fixtures.ts
      provider-config.test.ts
      providers.ts
    rate-limit.ts
      concurrency.ts
      validate-input.ts
    evaluation/
      email-fixtures.ts
      email-fixtures.test.ts
    eml/
      parse-eml.ts
    feedback/
      config.ts
      rate-limit.ts
      storage.ts
      types.ts
      validation.ts
    ocr/
      extract-text.ts
    supabase/
      client.ts
      config.ts
      server.ts
    scan-limits.ts
    i18n/
      dictionary.ts
    types.ts
docs/
  architecture.md
  cost-controls.md
  deployment.md
  feedback.md
  hosted-service.md
  roadmap.md
  security-privacy-review.md
supabase/
  migrations/
    20260710150000_create_detection_feedback.sql
```

The implementation includes the Maillume marketing and trust pages, `/app` scanner workspace, optional Supabase Google authentication, scan form, risk meter, no-storage analysis route, English/Dutch UI foundation, screenshot OCR input, `.eml` parsing input, shared synthetic evaluation fixtures, and optional self-hosted AI provider calls behind server environment variables.

## Evaluation And Calibration

The public demo uses local heuristic analysis so it can run without the maintainer's paid AI key. Shared evaluation fixtures live in `src/lib/evaluation/email-fixtures.ts` and must use synthetic or fully sanitized examples only. The heuristic analyzer consumes those fixtures today, and AI prompt/validation checks can reuse them as provider support grows.

Run `npm run test:analysis` after changing scoring rules, parser output, prompt copy, response validation, or suspicious-signal copy.

## Provider Selection

`src/lib/analysis/analyze-email.ts` is the server-side entrypoint for analysis. It reads `ANALYSIS_MODE`, `AI_PROVIDER`, provider keys, an explicit model ID, and `AI_MAX_OUTPUT_TOKENS` through `getAnalysisConfig`, then creates the selected provider.

- `ANALYSIS_MODE=heuristic` uses the local heuristic provider and does not require AI keys.
- `ANALYSIS_MODE=ai` requires `AI_PROVIDER=openai|anthropic|openai-compatible`, the matching server-side key, and an explicit model ID.
- `AI_PROVIDER=openai-compatible` requires `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`, then sends requests to `{AI_BASE_URL}/chat/completions`.
- AI mode sends normalized scan text to the selected provider and asks for strict structured JSON.
- AI provider keys are held only in server-side config objects and are never returned from `/api/analyze`.
- AI mode uses `AI_RATE_LIMIT_ENABLED`, `AI_RATE_LIMIT_MAX_REQUESTS`, and `AI_RATE_LIMIT_WINDOW_SECONDS` to block excess requests before provider calls.
- Provider-specific request bodies and response extraction live behind provider adapters. The UI and `/api/analyze` should use the shared `EmailAnalysisInput` and `EmailAnalysisResult` contracts instead of hardcoding provider payload shapes.
- Provider failures or malformed AI responses return controlled no-store API errors.

Run `npm run test:analysis` after changing provider selection or scoring logic.

## AI Result Contract

```ts
type EmailAnalysisResult = {
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  suspicious_signals: string[];
  detected_links: string[];
  recommended_action: string;
  short_explanation: string;
};
```

Server-side validation should enforce:

- `risk_score` is an integer from 0 to 100.
- `risk_level` matches the score band after normalization.
- Arrays are present even when empty.
- The response does not claim certainty.
- The required disclaimer is displayed in the UI, not delegated to the model.

## Environment Strategy

```text
ANALYSIS_MODE=heuristic
AI_PROVIDER=
AI_API_KEY=
AI_BASE_URL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AI_MODEL=
OPENAI_MODEL=
ANTHROPIC_MODEL=
AI_MAX_OUTPUT_TOKENS=800
AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_MAX_REQUESTS=10
AI_RATE_LIMIT_WINDOW_SECONDS=60
AI_MAX_CONCURRENT_REQUESTS=2
ANALYSIS_REQUEST_LIMIT=20
ANALYSIS_REQUEST_WINDOW_SECONDS=60
ANALYSIS_MAX_REQUEST_BYTES=32768
NEXT_PUBLIC_MARKETING_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The public hosted version should keep `ANALYSIS_MODE=heuristic` and leave provider keys unset. Self-hosters can set `ANALYSIS_MODE=ai`, choose a provider, add their own server-side key and model ID, and tune the AI rate and concurrency limits.

OpenAI-compatible examples:

```text
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=your-own-provider-key
AI_MODEL=your-provider-model-id
```

Do not support a public shared AI endpoint backed by the project owner's API key unless the product later adds strong authentication, rate limits, quotas, billing controls, and abuse monitoring.

See `docs/deployment.md` and `docs/cost-controls.md` for deployment and cost-control guidance.

## No-Storage API Contract

`POST /api/analyze` accepts normalized scan input and returns a structured analysis envelope:

```ts
type AnalyzeResponse = {
  result: EmailAnalysisResult;
  analysis_mode: "heuristic" | "ai";
  analysis_provider: "heuristic" | "openai" | "anthropic" | "openai-compatible";
  disclaimer: string;
  privacy: {
    stored: false;
    retention: "not_stored";
    message: string;
  };
};
```

The route must not write raw scan content, OCR text, `.eml` data, prompts, or results to a database or logs. Responses use `Cache-Control: no-store`.

## Privacy Rules

- Do not write raw email bodies, screenshots, `.eml` files, OCR text, or AI prompts to logs.
- Do not save scan content or scan results in a database by default.
- Do not reuse ordinary anonymous, free-account, paid-account, or self-hosted scans as a training dataset.
- Uploaded files must be parsed for the current request and discarded.
- Public issue templates must tell contributors to submit synthetic or fully sanitized examples only.
- Improvement reports should contain user-selected labels and high-level signal categories only. Maintainers should turn those patterns into synthetic fixtures.
- `/api/feedback` must reject unknown fields, use server-only storage credentials, and keep feedback unavailable when storage is not configured.
- Any future real-message research program or scan history feature requires a separate privacy, legal, security, and retention review.

## Future-Ready Boundaries

The design leaves room for forwarded email ingestion, account preferences, team accounts, and paid hosted plans. Google authentication, hashed API keys, atomic quotas, and explicit-action Chrome/Gmail/Outlook integrations are implemented. Hosted AI, billing, scan history, and teams remain unimplemented. See `docs/hosted-service.md` for the approved launch gates.
