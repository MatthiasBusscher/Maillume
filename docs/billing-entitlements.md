# Billing And Entitlement Foundation

Status: implemented as an inactive, provider-neutral domain model. There is no checkout, webhook route, billing migration, paid plan, or hosted AI access in production.

## Boundary

`src/lib/billing/entitlements.ts` defines the contract between a future billing-provider adapter and Maillume-owned entitlement logic:

1. A provider adapter verifies the raw webhook signature and returns only an event identifier and subscription identifier.
2. A unique provider/event constraint must reject replays before reconciliation.
3. The adapter fetches the current subscription from the provider instead of trusting plan or entitlement fields in the webhook payload.
4. Maillume maps the provider's price reference to a server-owned plan catalog.
5. A transaction locks the account subscription row and ignores stale or duplicate provider snapshots.
6. Unknown price references, canceled or unpaid subscriptions, expired periods, and reconciliation conflicts fail closed to the free-account allowance.

The model supports Moneybird first and a later Stripe adapter without putting provider-specific fields into plan or quota logic. Neither adapter exists yet.

## Entitlement Rules

- Free accounts retain the existing beta allowance of 25 heuristic integration requests per UTC month.
- Paid allowances come only from a server-owned plan definition, never browser input, webhook metadata, or a provider-created plan name.
- A scheduled cancellation keeps entitlements only while the provider still reports an active/trialing subscription and the current period has not ended.
- A failed payment may retain entitlements for no more than three days. Maillume derives that deadline from the first reconciled past-due snapshot; later provider updates cannot extend it.
- Hosted AI additionally requires a paid AI allowance, explicit account opt-in, an enabled hosted-AI runtime, and an open global kill switch.
- Unknown, incomplete, unpaid, paused, canceled, or expired state falls back to free heuristic access.
- Account deletion immediately revokes local entitlements and produces only the provider/customer/subscription references required for a later cancel-and-detach operation.

## Required Persistence Before Provider Integration

A future migration must add content-free records with:

- one billing customer mapping per account and provider;
- one canonical subscription state per provider subscription;
- a unique provider/event identifier for webhook replay protection;
- provider price reference, resolved local plan key, normalized status, billing-period timestamps, grace deadline, cancellation state, and provider update time;
- no message content, sender, subject, link, result, prompt, payment-card data, or free-text provider payload.

Reconciliation must run transactionally. Raw webhook bodies should be retained only if a reviewed incident/legal requirement establishes a bounded need; the default design stores normalized non-content metadata instead.

## Still Blocked

Do not add checkout or connect Moneybird until signature verification, replay handling, reconciliation, cancellation/refund, account deletion, and provider sandbox behavior are covered end to end. Hosted AI remains separately blocked on provider privacy review, measured cost, persistent quota reservations, budget controls, disclosures, and production approval.
