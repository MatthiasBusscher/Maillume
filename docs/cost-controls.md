# AI Cost Controls

Inbox Risk Scanner is designed so the public hosted demo can run without a maintainer-owned AI API key.

## Recommended Public Demo Setup

Use local heuristic analysis for the public hosted app:

```text
ANALYSIS_MODE=heuristic
```

Do not set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `AI_API_KEY` on the public demo unless the product later adds authentication, account-level quotas, billing controls, and abuse monitoring.

## Self-Hosted AI Setup

Self-hosters can enable AI mode with their own provider key:

```text
ANALYSIS_MODE=ai
AI_PROVIDER=openai
OPENAI_API_KEY=your-own-server-side-key
OPENAI_MODEL=your-provider-model-id
```

Provider keys must be configured only as server-side environment variables. Do not commit keys, expose them through `NEXT_PUBLIC_` variables, or send them to browser code.

AI mode sends normalized scan text to the selected provider. Each analysis may create provider costs based on request count, input tokens, output tokens, and provider pricing. Check your provider dashboard before enabling AI mode for other people.

## Built-In Rate Limit

AI mode has a best-effort in-memory rate limit before provider requests are sent:

```text
AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_MAX_REQUESTS=10
AI_RATE_LIMIT_WINDOW_SECONDS=60
```

When the limit is exceeded, `/api/analyze` returns `429` with a `Retry-After` header and a clear message.

This protects simple deployments and local installs, but it is not a complete abuse-control system. In serverless, multi-region, or multi-instance deployments, memory is not shared across every runtime instance.

## Production Protections

For any public AI-enabled deployment, also configure controls outside this app:

- Provider usage limits, budgets, and alerts.
- Vercel, Cloudflare, or reverse-proxy rate limits for `POST /api/analyze`.
- Optional authentication before AI mode is exposed publicly.
- Provider-side API key restrictions where supported.
- Short output token limits with `AI_MAX_OUTPUT_TOKENS`.

The safest open-source default remains heuristic mode for the hosted demo and bring-your-own-key AI mode for self-hosters.

## Future Official Hosted AI

An official hosted AI option is still on hold. Before enabling a maintainer-funded provider key, the service needs persistent per-account quotas, idempotent reservations, a global monthly budget and kill switch, provider retention review, clear user disclosure, and measured cost tests.

The current planning hypothesis is a 5-scan monthly free allowance, a 100-scan capped Plus allowance, a target typical provider cost of no more than EUR 0.005 per scan, and a hard planning ceiling of EUR 0.02 per scan. These are validation inputs rather than public commitments.

See `docs/hosted-service.md` for the complete product boundary, cost formula, failure behavior, and go/no-go checklist.
