# Maillume

Maillume is an open-source, privacy-first app for checking whether email content appears likely to be phishing, spam, or legitimate.

Use the official scanner without an account or run the same core yourself. The hosted service is designed to sell managed convenience later, not access to the core safety workflow.

The current implementation is a privacy-first Next.js product with a public marketing site, an anonymous scanner workspace, optional Google authentication, and paste, screenshot OCR, and `.eml` inputs backed by local heuristic analysis.

The launch goal is to support pasted text, screenshots, and `.eml` files without storing scan content after scoring.

## Current Status

The repository is a v1 launch candidate. Implemented today:

- Maillume marketing, platform, pricing, self-hosted, privacy, terms, and security pages
- Scanner workspace at `/app` with production support for `app.maillume.io`
- Optional Google sign-in through Supabase without making accounts a scanner requirement
- Paste-based email scan form
- Screenshot OCR input mode
- `.eml` parsing input mode
- No-storage `/api/analyze` route using calibrated local heuristic structured analysis
- English and Dutch UI foundation with manual language switching and browser-language initialization
- Risk score, risk level, suspicious signals, detected links, explanation, recommended action, and required disclaimer
- Synthetic English/Dutch heuristic calibration fixtures
- Server-side analysis provider abstraction for heuristic mode and self-hosted AI mode
- Abuse controls, security/privacy guardrails, and browser smoke tests
- Optional non-content result feedback with a strict allowlist and Supabase retention schema
- Authenticated hosted API keys with atomic monthly quotas and aggregate-only usage metadata
- Source-available Manifest V3 browser extension, Gmail Workspace add-on, and Outlook read-mode add-in
- Portable Docker, Hostinger VPS, Cloudflare Tunnel, and local self-hosting documentation
- Launch metadata, generated favicon/social image, and accessibility basics

The technical scanner roadmap and optional Google identity foundation are implemented. The next product phase keeps anonymous heuristic scanning free while account features, hosted AI allowances, and billing remain behind explicit go/no-go gates.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase authentication and optional privacy-safe feedback storage
- Optional OpenAI, Anthropic, or OpenAI-compatible API for self-hosted structured analysis
- Hostinger VPS with Cloudflare-protected container deployment

## Analysis Modes

Maillume should not ship with the maintainer's paid AI API key in the public hosted version.

- Public demo mode: local heuristic analysis only, no AI provider key, no stored scan data.
- Self-hosted AI mode: installers deploy their own copy and configure their own server-side provider key. In this mode, normalized scan text is sent to their selected AI provider for structured analysis.

Provider keys must live only in environment variables on the server. They should never be committed to GitHub and never sent to the browser.

Example public/demo configuration:

```bash
ANALYSIS_MODE=heuristic
```

Example self-hosted OpenAI configuration:

```bash
ANALYSIS_MODE=ai
AI_PROVIDER=openai
OPENAI_API_KEY=your-own-server-side-key
OPENAI_MODEL=your-provider-model-id
```

Example self-hosted OpenAI-compatible configuration:

```bash
ANALYSIS_MODE=ai
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=your-own-provider-key
AI_MODEL=your-provider-model-id
```

Optional AI mode has built-in best-effort rate limiting:

```bash
AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_MAX_REQUESTS=10
AI_RATE_LIMIT_WINDOW_SECONDS=60
```

Self-hosters should also configure provider budgets, usage alerts, and deployment-level rate limits before exposing AI mode publicly.

See `.env.example` for the full environment shape.

## Privacy Direction

- Raw email content should be processed only for the current score.
- The current paste flow sends scan content to `/api/analyze` for the current request only.
- Pasted email text, screenshots, `.eml` files, OCR text, and scan results should not be stored by default.
- Normal free or paid scans must not be reused as training data or evaluation fixtures.
- Future improvement feedback must be optional, separate from scanning, and exclude message content, senders, subjects, and links.
- Screenshot OCR and `.eml` parsing run in the browser before normalized text is sent for analysis.
- Contributors should only share synthetic or fully sanitized examples in issues and tests.

The hosted product boundaries, cost model, retention targets, privacy disclosures, and launch gates are in `docs/hosted-service.md`. Google sign-in and quota-limited integration API keys exist; hosted AI allowances, account preferences, and payments remain unimplemented.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the marketing site or `http://localhost:3000/app` for the scanner.

Google sign-in is optional. Configure the public Supabase URL and publishable key from `.env.example`, enable Google in the Supabase Auth dashboard, and allow `http://localhost:3000/auth/callback` as a development redirect URL.

Recommended checks:

```bash
npm run typecheck
npm run lint
npm run test:analysis
npm run test:security
npm run test:smoke
npm run build
```

## Project Docs

- Architecture: `docs/architecture.md`
- AI cost controls: `docs/cost-controls.md`
- Deployment and self-hosting: `docs/deployment.md`
- Production operations: `docs/operations.md`
- Private beta checklist: `docs/launch-checklist.md`
- Integrations and hosted API: `docs/integrations.md`
- Integration marketplace publication: `docs/integration-publication.md`
- Evaluation fixtures: `docs/evaluation.md`
- Privacy-safe feedback: `docs/feedback.md`
- Hosted service architecture: `docs/hosted-service.md`
- Product positioning: `docs/product-positioning.md`
- Direct dependency license review: `docs/dependency-licenses.md`
- Roadmap: `docs/roadmap.md`
- Security and privacy review: `docs/security-privacy-review.md`

## Contributing

Read `CONTRIBUTING.md` before opening an issue or pull request.

Please do not submit real private email content, raw `.eml` files, private inbox screenshots, API keys, or unsanitized headers. Use synthetic or fully sanitized examples only.

## Security

Read `SECURITY.md` for vulnerability reporting and sensitive data rules.

## License

GNU AGPL-3.0-only. See `LICENSE` and `NOTICE`.

If you offer a modified version over a network, review the AGPL source-availability obligations that apply to your deployment. This is a plain-language reminder, not legal advice.
