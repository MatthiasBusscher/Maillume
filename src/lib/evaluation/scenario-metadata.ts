import {
  type EvaluationDataset,
  type EvaluationScenarioCategory,
} from "./types";

type ScenarioMetadata = Record<string, EvaluationScenarioCategory>;

const CALIBRATION: ScenarioMetadata = {
  nl_uwv_identity_reverification_phish: "identity-verification",
  en_microsoft_credential_phish: "account-access",
  nl_antivirus_subscription_phish: "subscription-security",
  eml_hidden_link_phish: "link-deception",
  nl_delivery_fee_phish: "delivery",
  en_unsolicited_sales_spam: "sales-outreach",
  nl_unsolicited_seo_spam: "sales-outreach",
  en_crypto_investment_spam: "investment",
  en_legitimate_project_update: "business-routine",
  en_legitimate_invoice_notice: "invoice-payment",
  nl_legitimate_meeting_notes: "business-routine",
  nl_legitimate_invoice_notice: "invoice-payment",
};

const PUBLIC_ADVISORY_HOLDOUT: ScenarioMetadata = {
  "uwv-routine-reidentification": "identity-verification",
  "uwv-privacy-policy-cover": "identity-verification",
  "digid-expiry-threat": "account-access",
  "digid-extra-security-step": "mfa-oauth",
  "ics-reference-identification": "identity-verification",
  "ics-unread-secure-message": "link-deception",
  "digid-account-created-confirmation": "account-notification",
  "digid-app-activation-notice": "account-notification",
  "ics-monthly-statement-notice": "invoice-payment",
  "uwv-appointment-confirmation": "business-routine",
  "maillume-confirmation-hard-negative": "account-notification",
  "maillume-recovery-hard-negative": "account-access",
};

const SYNTHETIC: ScenarioMetadata = {
  "credential-lockout": "account-access",
  "bec-bank-change": "payment-change",
  "invoice-link-mismatch": "link-deception",
  "delivery-fee": "delivery",
  "mfa-approval": "mfa-oauth",
  "oauth-consent": "mfa-oauth",
  "qr-bank-login": "qr-lure",
  "attachment-lure": "attachment-document",
  "security-callback": "security-callback",
  "tax-portal": "identity-verification",
  "seo-outreach": "sales-outreach",
  "prize-promotion": "promotion",
  "investment-pitch": "investment",
  "casino-offer": "high-risk-spam",
  "weight-loss-offer": "high-risk-spam",
  "project-update": "business-routine",
  "invoice-portal": "invoice-payment",
  "microsoft-account": "account-notification",
  "zip-path": "attachment-document",
  "brand-substring": "business-routine",
  "payment-receipt": "invoice-payment",
  "renewal-reminder": "subscription-security",
  "report-attachment": "attachment-document",
  "transfer-receipt": "payment-change",
  "tax-appointment": "business-routine",
  "delivery-tracking": "order-tracking",
  "mfa-training": "security-guidance",
  "password-reset": "account-access",
  "opted-in-newsletter": "promotion",
  "published-support": "support",
};

const CROSS_INPUT: ScenarioMetadata = {
  "en-credentials": "account-access",
  "en-payment-change": "payment-change",
  "en-delivery": "delivery",
  "en-mfa-link-mismatch": "mfa-oauth",
  "en-bec-bank-change": "payment-change",
  "en-security-callback": "security-callback",
  "en-malformed-eml": "account-access",
  "en-promotion": "promotion",
  "en-legitimate-invoice": "invoice-payment",
  "nl-inloggegevens": "account-access",
  "nl-betaalwijziging": "payment-change",
  "nl-bezorging": "delivery",
  "nl-oauth-link-mismatch": "mfa-oauth",
  "nl-bec-bankwijziging": "payment-change",
  "nl-beveiligingscallback": "security-callback",
  "nl-beschadigde-eml": "account-access",
  "nl-aanbieding": "promotion",
  "nl-legitieme-factuur": "invoice-payment",
};

const DATASET_METADATA: Record<EvaluationDataset, ScenarioMetadata> = {
  calibration: CALIBRATION,
  "public-advisory-holdout": PUBLIC_ADVISORY_HOLDOUT,
  "synthetic-development": SYNTHETIC,
  "synthetic-locked": SYNTHETIC,
  "cross-input": CROSS_INPUT,
};

export function getScenarioCategory(
  dataset: EvaluationDataset,
  scenarioId: string,
): EvaluationScenarioCategory {
  const category = DATASET_METADATA[dataset][scenarioId];
  if (!category) {
    throw new Error(`Missing scenario category for ${dataset}/${scenarioId}.`);
  }
  return category;
}

export function getScenarioMetadataIds(dataset: EvaluationDataset): string[] {
  return Object.keys(DATASET_METADATA[dataset]).sort();
}
