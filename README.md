# Inbox Risk Scanner

Inbox Risk Scanner is an open-source, privacy-first app for checking whether email content appears likely to be phishing, spam, or legitimate.

The current implementation covers Issue #1: a Next.js App Router project with a landing page, email input form, and mocked structured analysis results.

The launch goal is to support pasted text, screenshots, and `.eml` files without storing scan content after scoring.

## Current Status

Built today:

- Landing page
- Paste-based email scan form
- No-storage `/api/analyze` route using local heuristic structured analysis
- English and Dutch UI foundation with manual language switching and browser-language initialization
- Risk score, risk level, suspicious signals, detected links, explanation, recommended action, and required disclaimer

Planned before v1:

- Screenshot OCR upload
- `.eml` parsing
- Optional self-hosted AI mode
- Evaluation fixtures for safer detection calibration

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Optional OpenAI or Anthropic API for self-hosted structured analysis
- Vercel deployment

## Analysis Modes

Inbox Risk Scanner should not ship with the maintainer's paid AI API key in the public hosted version.

- Public demo mode: local heuristic analysis only, no AI provider key, no stored scan data.
- Self-hosted AI mode: installers deploy their own copy and configure their own server-side provider key.

Provider keys must live only in environment variables on the server. They should never be committed to GitHub and never sent to the browser.

Example public/demo configuration:

```bash
ANALYSIS_MODE=heuristic
```

Example future self-hosted AI configuration:

```bash
ANALYSIS_MODE=ai
AI_PROVIDER=openai
OPENAI_API_KEY=your-own-server-side-key
```

See `.env.example` for the full environment shape.

## Privacy Direction

- Raw email content should be processed only for the current score.
- The current paste flow sends scan content to `/api/analyze` for the current request only.
- Pasted email text, screenshots, `.eml` files, OCR text, and scan results should not be stored by default.
- Contributors should only share synthetic or fully sanitized examples in issues and tests.

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
npm run build
```

## Project Docs

- Architecture: `docs/architecture.md`
- Roadmap: `docs/roadmap.md`

## Contributing

Read `CONTRIBUTING.md` before opening an issue or pull request.

Please do not submit real private email content, raw `.eml` files, private inbox screenshots, API keys, or unsanitized headers. Use synthetic or fully sanitized examples only.

## Security

Read `SECURITY.md` for vulnerability reporting and sensitive data rules.

## License

MIT. See `LICENSE`.
