# Deployment and Self-Hosting

Inbox Risk Scanner supports two deployment shapes:

- A public heuristic demo with no paid AI key.
- A self-hosted AI deployment where the installer supplies and pays for their own provider key.

Vercel provides zero-configuration support for Next.js projects. Environment variables can be scoped to Development, Preview, and Production, and changes apply only to new deployments. See the official [Next.js on Vercel](https://vercel.com/frameworks/nextjs) and [Vercel environment variable](https://vercel.com/docs/environment-variables) documentation.

## Public Demo on Vercel

1. Import the GitHub repository into a new Vercel project.
2. Keep the detected framework preset as Next.js and the repository root as the project root.
3. In Project Settings > Environment Variables, add this variable for Production and Preview:

   ```text
   ANALYSIS_MODE=heuristic
   ```

4. Confirm that `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `AI_API_KEY` are not defined.
5. Deploy the project. Future pushes to the production branch create production deployments; other branches can create preview deployments.

The public demo must not use a maintainer-owned paid AI key. Heuristic mode performs analysis locally in the server runtime and creates no provider usage bill.

## Self-Hosted AI on Vercel

Fork or clone the repository into an account you control, import it into Vercel, and configure one provider entirely through server-side environment variables.

OpenAI:

```text
ANALYSIS_MODE=ai
AI_PROVIDER=openai
OPENAI_API_KEY=your-own-provider-key
OPENAI_MODEL=your-provider-model-id
```

Anthropic:

```text
ANALYSIS_MODE=ai
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-own-provider-key
ANTHROPIC_MODEL=your-provider-model-id
```

OpenAI-compatible provider:

```text
ANALYSIS_MODE=ai
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=your-own-provider-key
AI_MODEL=your-provider-model-id
```

Do not prefix secrets with `NEXT_PUBLIC_`. Next.js exposes `NEXT_PUBLIC_` variables to browser code. Add provider keys only in Vercel Project Settings > Environment Variables and only to the environments that need AI mode.

After adding or changing Vercel environment variables, create a new deployment or redeploy the latest deployment. Existing deployments do not receive changed environment variables.

## AI Cost Controls

AI providers charge according to their own request and token pricing. Before exposing AI mode publicly:

```text
AI_MAX_OUTPUT_TOKENS=800
AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_MAX_REQUESTS=10
AI_RATE_LIMIT_WINDOW_SECONDS=60
```

Also configure provider-side budgets and alerts. The built-in rate limit is an in-memory safeguard and is not shared across every serverless instance. Public AI deployments should add a deployment-level rate limit or authentication layer.

See `docs/cost-controls.md` for the full cost-control guidance.

## Local Self-Hosting

Install dependencies, create `.env.local` from the documented variables in `.env.example`, and start the app:

```bash
npm install
npm run dev
```

Use `ANALYSIS_MODE=heuristic` when no provider key is configured. Provider keys must stay in `.env.local`; environment files are ignored by Git.

## Automated Verification

Install the Playwright Chromium browser once, then run the smoke suite:

```bash
npx playwright install chromium
npm run test:smoke
```

The automated suite covers:

- Paste analysis and structured result rendering.
- English/Dutch language switching.
- `.eml` parsing and analysis.
- Screenshot mode and upload validation.
- User-facing rate-limit messaging.

GitHub Actions runs type checking, linting, analysis tests, security tests, a heuristic production build, and the browser smoke suite for pull requests and pushes to `main`.

## Post-Deploy Checklist

Use synthetic data only.

- Paste a synthetic suspicious email and confirm a structured result appears.
- Switch between English and Dutch and confirm labels and the disclaimer update.
- Upload a synthetic `.eml` file and confirm it is parsed before analysis.
- Upload a small PNG or JPEG containing visible email text and confirm OCR completes.
- Confirm the result includes score, level, explanation, signals, links, recommendation, and disclaimer.
- Confirm browser network responses from `/api/analyze` include `Cache-Control: no-store`.
- Inspect the `/api/analyze` response and confirm `analysis_mode` is `heuristic`; also confirm the Vercel project has no provider keys configured.
- If AI mode is enabled, confirm the selected provider works and rate-limit errors are understandable.

Raw emails, real inbox screenshots, real `.eml` files, and provider keys must never be used in public test reports or GitHub issues.
