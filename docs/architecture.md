# Inbox Risk Scanner Architecture

## Product Shape

Inbox Risk Scanner helps non-technical users assess email content before they click links, reply, or send sensitive information. The app must be clear about uncertainty and always show this disclaimer:

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
   - Rate limiting is still recommended so the self-hoster can control cost.

## Application Layers

1. Web UI
   - Next.js App Router pages and components.
   - Tailwind CSS for styling.
   - Client components for interactive form state and result display.

2. API Layer
   - `POST /api/analyze` accepts normalized scan input from pasted text, OCR, or `.eml` parsing.
   - Uses the server-side `analyzeEmail` provider interface.
   - Uses local heuristics in public demo mode.
   - Selects AI mode only when self-hosted environment variables are set.
   - Validates and normalizes the model response before returning it.
   - Does not persist raw scan content or scan results.

3. Input Processing Layer
   - Paste mode uses subject, sender email, and body text.
   - Screenshot mode extracts visible text with client-side OCR, then discards the uploaded image.
   - `.eml` mode parses headers, sender, subject, text/html bodies, detected links, and attachment metadata in the browser, then discards the uploaded file.
   - Processing should happen in memory or temporary runtime storage only.

4. Data Layer
   - No database is required for the launch MVP.
   - If telemetry or feedback is added later, it must be explicit opt-in and must not include raw email content.
   - If accounts are added later, they should store preferences only unless the user explicitly opts into saving scans.

5. Deployment
   - Vercel hosts the Next.js app.
   - Public deployment uses `ANALYSIS_MODE=heuristic` and no AI provider key.
   - Self-hosters can use `ANALYSIS_MODE=ai`, `AI_PROVIDER=openai|anthropic|openai-compatible`, and their own server-side provider key.

## Recommended Folder Structure

```text
src/
  app/
    api/
      analyze/
        route.ts
    layout.tsx
    page.tsx
    globals.css
  components/
    email-scan-form.tsx
    risk-meter.tsx
    scan-result.tsx
    app-shell.tsx
    file-dropzone.tsx
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
      validate-input.ts
    eml/
      parse-eml.ts
    ocr/
      extract-text.ts
    i18n/
      dictionary.ts
    types.ts
docs/
  architecture.md
  roadmap.md
```

The initial implementation includes the foundation, landing page, scan form, risk meter, no-storage analysis route, English/Dutch UI foundation with browser-language initialization, screenshot OCR input, `.eml` parsing input, synthetic heuristic calibration fixtures, and optional self-hosted AI provider calls behind server environment variables.

## Heuristic Calibration

The public demo uses local heuristic analysis so it can run without the maintainer's paid AI key. Calibration fixtures live in `src/lib/analysis/heuristic-fixtures.ts` and must use synthetic or fully sanitized examples only. Run `npm run test:heuristics` after changing scoring rules, parser output, or suspicious-signal copy.

## Provider Selection

`src/lib/analysis/analyze-email.ts` is the server-side entrypoint for analysis. It reads `ANALYSIS_MODE`, `AI_PROVIDER`, provider keys, optional model overrides, and `AI_MAX_OUTPUT_TOKENS` through `getAnalysisConfig`, then creates the selected provider.

- `ANALYSIS_MODE=heuristic` uses the local heuristic provider and does not require AI keys.
- `ANALYSIS_MODE=ai` requires `AI_PROVIDER=openai|anthropic|openai-compatible` and the matching server-side key.
- `AI_PROVIDER=openai-compatible` requires `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`, then sends requests to `{AI_BASE_URL}/chat/completions`.
- AI mode sends normalized scan text to the selected provider and asks for strict structured JSON.
- AI provider keys are held only in server-side config objects and are never returned from `/api/analyze`.
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
```

The public hosted version should keep `ANALYSIS_MODE=heuristic` and leave provider keys unset. Self-hosters can set `ANALYSIS_MODE=ai`, choose a provider, add their own key to their Vercel environment variables, and optionally pin a provider-specific model.

OpenAI-compatible examples:

```text
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=your-own-deepseek-key
AI_MODEL=deepseek-v4-pro
```

```text
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.perplexity.ai
AI_API_KEY=your-own-perplexity-key
AI_MODEL=sonar-pro
```

Do not support a public shared AI endpoint backed by the project owner's API key unless the product later adds strong authentication, rate limits, quotas, billing controls, and abuse monitoring.

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
- Uploaded files must be parsed for the current request and discarded.
- Public issue templates must tell contributors to submit synthetic or fully sanitized examples only.
- Any future scan history feature must be opt-in and separate from the privacy-first launch MVP.

## Future-Ready Boundaries

The design leaves room for forwarded email ingestion, team accounts, and paid hosted plans, but none of those are implemented in the launch MVP.
