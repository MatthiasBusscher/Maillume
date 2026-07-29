import type { EvidenceId } from "./evidence";

export const ATTACK_CHAIN_IDS = [
  "account_credential_pressure",
  "changed_payment_instruction",
  "mfa_pressure",
  "mfa_repeated_approval",
  "executive_secret_payment",
  "security_payment_threat",
  "promotion_payment_pressure",
  "security_callback",
  "oauth_shared_content",
  "qr_identity_threat",
  "delivery_fee_return",
] as const;

export type AttackChainId = (typeof ATTACK_CHAIN_IDS)[number];

type EvidenceRequirement = EvidenceId | readonly EvidenceId[];

type AttackChainDefinition = {
  id: AttackChainId;
  minimumScore: number;
  requirements: readonly EvidenceRequirement[];
};

const ATTACK_CHAINS: readonly AttackChainDefinition[] = [
  {
    id: "account_credential_pressure",
    minimumScore: 50,
    requirements: [
      "account_threat",
      "credential_request",
      "urgency_pressure",
    ],
  },
  {
    id: "changed_payment_instruction",
    minimumScore: 50,
    requirements: ["changed_payment_details", "payment_request"],
  },
  {
    id: "mfa_pressure",
    minimumScore: 50,
    requirements: ["mfa_or_oauth_request", "urgency_pressure"],
  },
  {
    id: "mfa_repeated_approval",
    minimumScore: 30,
    requirements: ["mfa_or_oauth_request", "repeated_approval_pressure"],
  },
  {
    id: "executive_secret_payment",
    minimumScore: 50,
    requirements: [
      "executive_impersonation",
      "payment_request",
      ["secrecy_pressure", "urgency_pressure"],
    ],
  },
  {
    id: "security_payment_threat",
    minimumScore: 50,
    requirements: ["fake_security", "account_threat", "payment_request"],
  },
  {
    id: "promotion_payment_pressure",
    minimumScore: 50,
    requirements: ["prize_promotion", "payment_request", "urgency_pressure"],
  },
  {
    id: "security_callback",
    minimumScore: 40,
    requirements: ["fake_security", "callback_lure"],
  },
  {
    id: "oauth_shared_content",
    minimumScore: 30,
    requirements: ["mfa_or_oauth_request", "shared_document_lure"],
  },
  {
    id: "qr_identity_threat",
    minimumScore: 60,
    requirements: ["qr_lure", "identity_reverification", "account_threat"],
  },
  {
    id: "delivery_fee_return",
    minimumScore: 40,
    requirements: ["delivery_lure", "payment_request"],
  },
];

export function getMatchedAttackChains(
  ids: Iterable<EvidenceId>,
): AttackChainId[] {
  const found = new Set(ids);
  return ATTACK_CHAINS
    .filter((chain) =>
      chain.requirements.every((requirement) =>
        Array.isArray(requirement)
          ? requirement.some((id) => found.has(id))
          : found.has(requirement as EvidenceId)
      )
    )
    .map((chain) => chain.id);
}

export function hasDecisiveAttackChain(
  ids: Iterable<EvidenceId>,
  score: number,
): boolean {
  const matched = new Set(getMatchedAttackChains(ids));
  return ATTACK_CHAINS.some(
    (chain) => matched.has(chain.id) && score >= chain.minimumScore,
  );
}
