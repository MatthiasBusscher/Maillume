import assert from "node:assert/strict";

import {
  FREE_ACCOUNT_ENTITLEMENTS,
  deriveEntitlements,
  planBillingAccountDeletion,
  reconcileProviderSnapshot,
  validateBillingPlans,
  type BillingPlan,
  type EntitlementContext,
  type ProviderSubscriptionSnapshot,
  type StoredSubscriptionState,
} from "./entitlements";

const plans: BillingPlan[] = [{
  key: "plus",
  providerPrices: [
    { provider: "moneybird", priceReference: "moneybird-plus-monthly" },
    { provider: "stripe", priceReference: "price_plus_monthly" },
  ],
  entitlements: {
    integrationRequestsPerMonth: 250,
    hostedAiScansPerDay: 20,
    hostedAiScansPerMonth: 100,
  },
}];

const activeSnapshot: ProviderSubscriptionSnapshot = {
  provider: "moneybird",
  customerId: "customer-1",
  subscriptionId: "subscription-1",
  priceReference: "moneybird-plus-monthly",
  status: "active",
  currentPeriodStart: "2026-07-01T00:00:00.000Z",
  currentPeriodEnd: "2026-08-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  providerUpdatedAt: "2026-07-10T12:00:00.000Z",
};

const enabledContext: EntitlementContext = {
  now: "2026-07-20T12:00:00.000Z",
  accountHostedAiOptIn: true,
  hostedAiRuntimeEnabled: true,
  globalAiKillSwitch: false,
};

validateBillingPlans(plans);
assert.throws(
  () => validateBillingPlans([...plans, { ...plans[0], key: "plus-copy" }]),
  /Duplicate provider price reference/,
);
assert.throws(
  () => validateBillingPlans([{ ...plans[0], entitlements: { ...plans[0].entitlements, hostedAiScansPerDay: -1 } }]),
  /Invalid hostedAiScansPerDay entitlement/,
);

const created = reconcileProviderSnapshot(null, activeSnapshot, plans);
assert.equal(created.action, "created");
if (created.action !== "created") throw new Error("Expected a created subscription");
assert.equal(created.state.planKey, "plus");

const activeDecision = deriveEntitlements(created.state, plans, enabledContext);
assert.equal(activeDecision.source, "subscription");
assert.equal(activeDecision.planKey, "plus");
assert.equal(activeDecision.entitlements.integrationRequestsPerMonth, 250);
assert.deepEqual(activeDecision.hostedAi, { allowed: true, reason: "available" });

assert.deepEqual(
  deriveEntitlements(created.state, plans, { ...enabledContext, accountHostedAiOptIn: false }).hostedAi,
  { allowed: false, reason: "account_opt_in_required" },
);
assert.deepEqual(
  deriveEntitlements(created.state, plans, { ...enabledContext, hostedAiRuntimeEnabled: false }).hostedAi,
  { allowed: false, reason: "runtime_disabled" },
);
assert.deepEqual(
  deriveEntitlements(created.state, plans, { ...enabledContext, globalAiKillSwitch: true }).hostedAi,
  { allowed: false, reason: "global_kill_switch" },
);

const unknownPrice = reconcileProviderSnapshot(null, {
  ...activeSnapshot,
  priceReference: "provider-controlled-plan-name",
}, plans);
assert.equal(unknownPrice.action, "created");
if (unknownPrice.action !== "created") throw new Error("Expected an unknown-price state");
assert.equal(unknownPrice.state.planKey, null);
assert.deepEqual(
  deriveEntitlements(unknownPrice.state, plans, enabledContext),
  {
    source: "free",
    planKey: null,
    entitlements: FREE_ACCOUNT_ENTITLEMENTS,
    hostedAi: { allowed: false, reason: "not_entitled" },
  },
  "unknown provider price references must fail closed to server-owned free entitlements",
);

const duplicate = reconcileProviderSnapshot(created.state, activeSnapshot, plans);
assert.deepEqual(duplicate, { action: "ignored", reason: "duplicate", state: created.state });

const stale = reconcileProviderSnapshot(created.state, {
  ...activeSnapshot,
  status: "canceled",
  providerUpdatedAt: "2026-07-09T12:00:00.000Z",
}, plans);
assert.deepEqual(stale, { action: "ignored", reason: "stale", state: created.state });

const divergent = reconcileProviderSnapshot(created.state, {
  ...activeSnapshot,
  status: "canceled",
}, plans);
assert.deepEqual(divergent, {
  action: "conflict",
  reason: "same_version_divergence",
  state: created.state,
});

const differentIdentity = reconcileProviderSnapshot(created.state, {
  ...activeSnapshot,
  subscriptionId: "subscription-2",
  providerUpdatedAt: "2026-07-11T12:00:00.000Z",
}, plans);
assert.deepEqual(differentIdentity, {
  action: "conflict",
  reason: "provider_identity_changed",
  state: created.state,
});

const graceState = state({
  ...activeSnapshot,
  status: "past_due",
  providerUpdatedAt: "2026-07-10T12:00:00.000Z",
});
assert.equal(graceState.graceEndsAt, "2026-07-13T12:00:00.000Z");
assert.equal(
  deriveEntitlements(graceState, plans, { ...enabledContext, now: "2026-07-13T12:00:00.000Z" }).source,
  "grace",
);
assert.equal(
  deriveEntitlements(graceState, plans, { ...enabledContext, now: "2026-07-13T12:00:00.001Z" }).source,
  "free",
);
const repeatedPastDue = reconcileProviderSnapshot(graceState, {
  ...activeSnapshot,
  status: "past_due",
  providerUpdatedAt: "2026-07-11T12:00:00.000Z",
}, plans);
assert.equal(repeatedPastDue.action, "updated");
assert.equal(repeatedPastDue.state.graceEndsAt, graceState.graceEndsAt, "provider updates must not extend grace");

const scheduledCancellation = state({ ...activeSnapshot, cancelAtPeriodEnd: true });
assert.equal(deriveEntitlements(scheduledCancellation, plans, enabledContext).source, "subscription");
assert.equal(
  deriveEntitlements(scheduledCancellation, plans, { ...enabledContext, now: activeSnapshot.currentPeriodEnd }).source,
  "free",
);
assert.equal(
  deriveEntitlements(state({ ...activeSnapshot, status: "canceled" }), plans, enabledContext).source,
  "free",
);

assert.deepEqual(planBillingAccountDeletion(created.state), {
  revokeLocalEntitlementsImmediately: true,
  provider: "moneybird",
  customerId: "customer-1",
  subscriptionId: "subscription-1",
});
assert.equal(planBillingAccountDeletion(null), null);

console.log("Checked provider-neutral billing reconciliation and fail-closed entitlements.");

function state(snapshot: ProviderSubscriptionSnapshot): StoredSubscriptionState {
  const result = reconcileProviderSnapshot(null, snapshot, plans);
  if (result.action !== "created") throw new Error("Expected a created subscription");
  return result.state;
}
