export const BILLING_PROVIDERS = ["moneybird", "stripe"] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
  "paused",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type PlanEntitlements = {
  integrationRequestsPerMonth: number;
  hostedAiScansPerDay: number;
  hostedAiScansPerMonth: number;
};

export type BillingPlan = {
  key: string;
  providerPrices: ReadonlyArray<{
    provider: BillingProvider;
    priceReference: string;
  }>;
  entitlements: PlanEntitlements;
};

export type VerifiedBillingEvent = {
  provider: BillingProvider;
  eventId: string;
  subscriptionId: string;
};

export type ProviderSubscriptionSnapshot = {
  provider: BillingProvider;
  customerId: string;
  subscriptionId: string;
  priceReference: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  providerUpdatedAt: string;
};

export type StoredSubscriptionState = ProviderSubscriptionSnapshot & {
  planKey: string | null;
  graceEndsAt?: string;
};

export type BillingProviderAdapter = {
  provider: BillingProvider;
  verifyWebhook(input: {
    headers: Readonly<Record<string, string>>;
    rawBody: Uint8Array;
  }): Promise<VerifiedBillingEvent>;
  fetchSubscription(subscriptionId: string): Promise<ProviderSubscriptionSnapshot>;
  cancelAndDetachCustomer(input: {
    customerId: string;
    subscriptionId: string;
  }): Promise<void>;
};

export type ReconciliationResult =
  | { action: "created" | "updated"; state: StoredSubscriptionState }
  | { action: "ignored"; reason: "stale" | "duplicate"; state: StoredSubscriptionState }
  | {
    action: "conflict";
    reason: "provider_identity_changed" | "same_version_divergence";
    state: StoredSubscriptionState;
  };

export type HostedAiAvailability = {
  allowed: boolean;
  reason:
    | "available"
    | "not_entitled"
    | "account_opt_in_required"
    | "runtime_disabled"
    | "global_kill_switch";
};

export type EntitlementDecision = {
  source: "free" | "subscription" | "grace";
  planKey: string | null;
  entitlements: PlanEntitlements;
  hostedAi: HostedAiAvailability;
};

export type EntitlementContext = {
  now: string;
  accountHostedAiOptIn: boolean;
  hostedAiRuntimeEnabled: boolean;
  globalAiKillSwitch: boolean;
};

export type BillingAccountDeletionDirective = {
  revokeLocalEntitlementsImmediately: true;
  provider: BillingProvider;
  customerId: string;
  subscriptionId: string;
};

export const FREE_ACCOUNT_ENTITLEMENTS: Readonly<PlanEntitlements> = Object.freeze({
  integrationRequestsPerMonth: 25,
  hostedAiScansPerDay: 0,
  hostedAiScansPerMonth: 0,
});

const MAX_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1_000;

export function validateBillingPlans(plans: readonly BillingPlan[]): void {
  const planKeys = new Set<string>();
  const providerPrices = new Set<string>();

  for (const plan of plans) {
    if (!/^[a-z][a-z0-9_-]{1,49}$/.test(plan.key)) {
      throw new Error(`Invalid billing plan key: ${plan.key}`);
    }
    if (planKeys.has(plan.key)) {
      throw new Error(`Duplicate billing plan key: ${plan.key}`);
    }
    planKeys.add(plan.key);
    validateEntitlements(plan.entitlements, plan.key);

    for (const providerPrice of plan.providerPrices) {
      if (!BILLING_PROVIDERS.includes(providerPrice.provider)) {
        throw new Error(`Unsupported billing provider: ${providerPrice.provider}`);
      }
      if (!providerPrice.priceReference.trim()) {
        throw new Error(`Empty provider price reference for plan: ${plan.key}`);
      }
      const key = `${providerPrice.provider}:${providerPrice.priceReference}`;
      if (providerPrices.has(key)) {
        throw new Error(`Duplicate provider price reference: ${key}`);
      }
      providerPrices.add(key);
    }
  }
}

export function reconcileProviderSnapshot(
  current: StoredSubscriptionState | null,
  snapshot: ProviderSubscriptionSnapshot,
  plans: readonly BillingPlan[],
): ReconciliationResult {
  validateBillingPlans(plans);
  validateProviderSnapshot(snapshot);
  if (
    current
    && (
      current.provider !== snapshot.provider
      || current.customerId !== snapshot.customerId
      || current.subscriptionId !== snapshot.subscriptionId
    )
  ) {
    return { action: "conflict", reason: "provider_identity_changed", state: current };
  }

  const graceEndsAt = snapshot.status === "past_due"
    ? current?.status === "past_due" && current.graceEndsAt
      ? current.graceEndsAt
      : new Date(
        parseInstant(snapshot.providerUpdatedAt, "providerUpdatedAt") + MAX_GRACE_PERIOD_MS,
      ).toISOString()
    : undefined;
  const candidate: StoredSubscriptionState = {
    ...snapshot,
    planKey: resolvePlanKey(plans, snapshot.provider, snapshot.priceReference),
    ...(graceEndsAt ? { graceEndsAt } : {}),
  };

  if (!current) return { action: "created", state: candidate };

  const currentVersion = parseInstant(current.providerUpdatedAt, "current providerUpdatedAt");
  const candidateVersion = parseInstant(candidate.providerUpdatedAt, "providerUpdatedAt");
  if (candidateVersion < currentVersion) {
    return { action: "ignored", reason: "stale", state: current };
  }
  if (candidateVersion === currentVersion) {
    if (stableSnapshot(current) === stableSnapshot(candidate)) {
      return { action: "ignored", reason: "duplicate", state: current };
    }
    return { action: "conflict", reason: "same_version_divergence", state: current };
  }

  return { action: "updated", state: candidate };
}

export function deriveEntitlements(
  subscription: StoredSubscriptionState | null,
  plans: readonly BillingPlan[],
  context: EntitlementContext,
): EntitlementDecision {
  validateBillingPlans(plans);
  const now = parseInstant(context.now, "now");
  const plan = subscription?.planKey
    ? plans.find((candidate) => candidate.key === subscription.planKey)
    : undefined;

  let source: EntitlementDecision["source"] = "free";
  let selectedEntitlements = FREE_ACCOUNT_ENTITLEMENTS;

  if (subscription && plan) {
    const periodEnd = parseInstant(subscription.currentPeriodEnd, "currentPeriodEnd");
    const inCurrentPeriod = now < periodEnd;
    const active = (subscription.status === "active" || subscription.status === "trialing")
      && inCurrentPeriod;
    const inGrace = subscription.status === "past_due"
      && Boolean(subscription.graceEndsAt)
      && now <= parseInstant(subscription.graceEndsAt as string, "graceEndsAt");

    if (active) {
      source = "subscription";
      selectedEntitlements = plan.entitlements;
    } else if (inGrace) {
      source = "grace";
      selectedEntitlements = plan.entitlements;
    }
  }

  const entitlements = { ...selectedEntitlements };
  return {
    source,
    planKey: source === "free" ? null : plan?.key ?? null,
    entitlements,
    hostedAi: getHostedAiAvailability(entitlements, context),
  };
}

export function planBillingAccountDeletion(
  subscription: StoredSubscriptionState | null,
): BillingAccountDeletionDirective | null {
  if (!subscription) return null;
  return {
    revokeLocalEntitlementsImmediately: true,
    provider: subscription.provider,
    customerId: subscription.customerId,
    subscriptionId: subscription.subscriptionId,
  };
}

function resolvePlanKey(
  plans: readonly BillingPlan[],
  provider: BillingProvider,
  priceReference: string,
): string | null {
  return plans.find((plan) =>
    plan.providerPrices.some((candidate) =>
      candidate.provider === provider && candidate.priceReference === priceReference,
    ),
  )?.key ?? null;
}

function validateProviderSnapshot(snapshot: ProviderSubscriptionSnapshot): void {
  if (!BILLING_PROVIDERS.includes(snapshot.provider)) {
    throw new Error(`Unsupported billing provider: ${snapshot.provider}`);
  }
  if (!SUBSCRIPTION_STATUSES.includes(snapshot.status)) {
    throw new Error(`Unsupported subscription status: ${snapshot.status}`);
  }
  for (const [field, value] of [
    ["customerId", snapshot.customerId],
    ["subscriptionId", snapshot.subscriptionId],
    ["priceReference", snapshot.priceReference],
  ]) {
    if (!value.trim() || value.length > 200) {
      throw new Error(`Invalid ${field}`);
    }
  }

  const periodStart = parseInstant(snapshot.currentPeriodStart, "currentPeriodStart");
  const periodEnd = parseInstant(snapshot.currentPeriodEnd, "currentPeriodEnd");
  parseInstant(snapshot.providerUpdatedAt, "providerUpdatedAt");
  if (periodEnd <= periodStart) {
    throw new Error("currentPeriodEnd must be later than currentPeriodStart");
  }
}

function validateEntitlements(entitlements: PlanEntitlements, planKey: string): void {
  for (const [field, value] of Object.entries(entitlements)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Invalid ${field} entitlement for plan: ${planKey}`);
    }
  }
}

function getHostedAiAvailability(
  entitlements: PlanEntitlements,
  context: EntitlementContext,
): HostedAiAvailability {
  if (entitlements.hostedAiScansPerDay === 0 || entitlements.hostedAiScansPerMonth === 0) {
    return { allowed: false, reason: "not_entitled" };
  }
  if (context.globalAiKillSwitch) {
    return { allowed: false, reason: "global_kill_switch" };
  }
  if (!context.hostedAiRuntimeEnabled) {
    return { allowed: false, reason: "runtime_disabled" };
  }
  if (!context.accountHostedAiOptIn) {
    return { allowed: false, reason: "account_opt_in_required" };
  }
  return { allowed: true, reason: "available" };
}

function parseInstant(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`${field} must be a canonical UTC timestamp`);
  }
  return parsed;
}

function stableSnapshot(state: StoredSubscriptionState): string {
  return JSON.stringify({
    provider: state.provider,
    customerId: state.customerId,
    subscriptionId: state.subscriptionId,
    priceReference: state.priceReference,
    status: state.status,
    currentPeriodStart: state.currentPeriodStart,
    currentPeriodEnd: state.currentPeriodEnd,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    graceEndsAt: state.graceEndsAt ?? null,
    providerUpdatedAt: state.providerUpdatedAt,
    planKey: state.planKey,
  });
}
