type OperatorProfile = {
  address: string;
  jurisdiction: string;
  kvkNumber: string;
  legalName: string;
  privacyEmail: string;
  securityEmail: string;
  supportEmail: string;
  vatId: string;
};

const LOCAL_PROFILE: OperatorProfile = {
  address: "Local development only",
  jurisdiction: "The Netherlands",
  kvkNumber: "Not configured",
  legalName: "Maillume local development",
  privacyEmail: "privacy@maillume.io",
  securityEmail: "security@maillume.io",
  supportEmail: "support@maillume.io",
  vatId: "Not configured",
};

export function getOperatorProfile(
  env: Partial<NodeJS.ProcessEnv> = process.env,
  options: { requireConfigured?: boolean } = {},
): OperatorProfile {
  const profile: OperatorProfile = {
    address: env.MAILLUME_OPERATOR_REGISTERED_ADDRESS?.trim() ?? "",
    jurisdiction: env.MAILLUME_OPERATOR_JURISDICTION?.trim() || "The Netherlands",
    kvkNumber: env.MAILLUME_OPERATOR_KVK?.trim() ?? "",
    legalName: env.MAILLUME_OPERATOR_LEGAL_NAME?.trim() ?? "",
    privacyEmail: env.MAILLUME_PRIVACY_EMAIL?.trim() || "privacy@maillume.io",
    securityEmail: env.MAILLUME_SECURITY_EMAIL?.trim() || "security@maillume.io",
    supportEmail: env.MAILLUME_SUPPORT_EMAIL?.trim() || "support@maillume.io",
    vatId: env.MAILLUME_OPERATOR_VAT_ID?.trim() ?? "",
  };

  if (isConfigured(profile)) return profile;
  if (options.requireConfigured) {
    throw new Error("Public-beta operator configuration is incomplete.");
  }
  return LOCAL_PROFILE;
}

export function getPublicBetaOperatorProfile(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): OperatorProfile {
  return getOperatorProfile(env, { requireConfigured: true });
}

function isConfigured(profile: OperatorProfile) {
  return [profile.legalName, profile.kvkNumber, profile.vatId]
    .every((value) => value.length >= 2)
    && [profile.supportEmail, profile.privacyEmail, profile.securityEmail].every(isSafeMaillumeAddress);
}

function isSafeMaillumeAddress(value: string) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@maillume\.io$/i.test(value);
}
