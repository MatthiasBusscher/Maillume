# Contributing to Maillume

Thanks for helping build Maillume. The project goal is a privacy-first, open-source tool that helps non-technical users assess suspicious emails without storing scan content by default.

## Before You Start

- Do not include real private email content in issues, pull requests, fixtures, screenshots, logs, or commits.
- Use synthetic examples or fully sanitized examples only.
- Do not commit API keys, `.env.local`, screenshots from private inboxes, raw `.eml` files, or copied email headers that identify real people or organizations.
- Keep the required disclaimer visible in user-facing result flows: "This is an automated risk assessment and should not be considered a guarantee."

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For the public/demo mode, no AI key is needed:

```bash
ANALYSIS_MODE=heuristic
```

Self-hosted AI mode is server-configured. Self-hosters provide their own server-side provider key and optional provider base URL, and maintainer-owned keys must not be used in public deployments. Do not expose provider keys or base URLs through client-side code or `NEXT_PUBLIC_` variables.

AI-related changes must preserve cost controls. Keep provider keys server-only, keep the public demo usable without a paid key, and update `docs/cost-controls.md` when changing AI limits, provider calls, or deployment expectations.

## Branches

Use short, descriptive branch names:

```text
feature/multilingual-ui
fix/dutch-risk-calibration
docs/self-hosting
```

## Development Checks

Run these before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run test:analysis
npm run test:security
npm run test:smoke
npm run build
```

## Pull Requests

Good pull requests should:

- Stay focused on one issue or workflow.
- Include screenshots for UI changes when useful, using synthetic data only.
- Explain privacy implications if the change touches scan content, uploads, OCR, `.eml` parsing, logging, or AI prompts.
- Avoid certainty claims. Maillume provides risk assessments, not guarantees.

## Contributor License

Contributions are accepted under the repository's GNU AGPL-3.0-only license. By submitting a contribution, you confirm that you have the right to provide it under that license.

The project does not currently use a contributor license agreement or offer a dual-license program. Do not submit code copied from sources with incompatible or unclear terms. Include required attribution when adding a dependency, asset, fixture, or substantial adapted code.

## Detection Examples

For false positives or false negatives, use a synthetic reproduction. If you start from a real message, remove or replace:

- Names
- Email addresses
- Domains
- Phone numbers
- Addresses
- Account identifiers
- Tracking links
- Screenshots from private inboxes
- Message IDs and routing headers

Reusable scoring examples live in `src/lib/evaluation/email-fixtures.ts`. Read `docs/evaluation.md` before adding fixtures, and run `npm run test:analysis` before opening a pull request.
