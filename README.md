# Inbox Risk Scanner

Inbox Risk Scanner is an open-source, privacy-first app for checking whether email content appears likely to be phishing, spam, or legitimate.

The current implementation is a privacy-first Next.js app with paste, screenshot OCR, and `.eml` input modes backed by local heuristic analysis.

The launch goal is to support pasted text, screenshots, and `.eml` files without storing scan content after scoring.

## Current Status

The repository is a v1 launch candidate. Implemented today:

- Landing page
- Paste-based email scan form
- Screenshot OCR input mode
- `.eml` parsing input mode
- No-storage `/api/analyze` route using calibrated local heuristic structured analysis
- English and Dutch UI foundation with manual language switching and browser-language initialization
- Risk score, risk level, suspicious signals, detected links, explanation, recommended action, and required disclaimer
- Synthetic English/Dutch heuristic calibration fixtures
- Server-side analysis provider abstraction for heuristic mode and self-hosted AI mode
- Abuse controls, security/privacy guardrails, and browser smoke tests
- Vercel and local self-hosting documentation
- Launch metadata, generated favicon/social image, and accessibility basics

The technical launch roadmap is implemented. The next product phase is documented separately and keeps anonymous heuristic scanning free while hosted accounts, AI allowances, and billing remain behind explicit go/no-go gates.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Optional OpenAI, Anthropic, or OpenAI-compatible API for self-hosted structured analysis
- Vercel deployment

## Analysis Modes

Inbox Risk Scanner should not ship with the maintainer's paid AI API key in the public hosted version.

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

The proposed hosted product boundaries, cost model, retention targets, privacy disclosures, and launch gates are in `docs/hosted-service.md`. They are architecture decisions, not implemented account or payment features.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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
- Evaluation fixtures: `docs/evaluation.md`
- Hosted service architecture: `docs/hosted-service.md`
- Roadmap: `docs/roadmap.md`
- Security and privacy review: `docs/security-privacy-review.md`

## Contributing

Read `CONTRIBUTING.md` before opening an issue or pull request.

Please do not submit real private email content, raw `.eml` files, private inbox screenshots, API keys, or unsanitized headers. Use synthetic or fully sanitized examples only.

## Security

Read `SECURITY.md` for vulnerability reporting and sensitive data rules.

## License

MIT. See `LICENSE`.
