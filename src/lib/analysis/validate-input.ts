import {
  MAX_SCAN_BODY_LENGTH,
  isEmailAuthenticationVerdict,
  type AttachmentRiskType,
  type AnalysisLocale,
  type EmailAuthenticationSummary,
  type EmailLinkPair,
  type NormalizedScanInput,
  type ScanSource,
} from "../types";
import { PUBLIC_CONTRACT } from "../contracts/public-contract";

type ValidationResult =
  | {
      ok: true;
      input: NormalizedScanInput;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof NormalizedScanInput, string>>;
    };

const SOURCES = new Set<ScanSource>(PUBLIC_CONTRACT.analysis.sources);
const LOCALES = new Set<AnalysisLocale>(PUBLIC_CONTRACT.analysis.locales);
const ATTACHMENT_RISK_TYPES = new Set<AttachmentRiskType>(PUBLIC_CONTRACT.analysis.attachmentRiskTypes);

export function validateAnalyzeRequest(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const data = payload as Record<string, unknown>;
  const unsupportedFields = Object.keys(data).filter(
    (field) => !["source", "subject", "senderEmail", "body", "locale", "links", "linkPairs", "attachmentRiskTypes", "emailAuthentication", "evidenceTruncated"].includes(field),
  );
  if (unsupportedFields.length > 0) {
    return { ok: false, error: "Request contains unsupported fields." };
  }
  const source = data.source;
  const subject = normalizeOptionalString(data.subject);
  const senderEmail = normalizeOptionalString(data.senderEmail);
  const body = normalizeRequiredString(data.body);
  const locale = data.locale;
  const links = normalizeLinks(data.links);
  const linkPairs = normalizeLinkPairs(data.linkPairs);
  const attachmentRiskTypes = normalizeAttachmentRiskTypes(data.attachmentRiskTypes);
  const emailAuthentication = normalizeEmailAuthentication(data.emailAuthentication);
  const evidenceTruncated = data.evidenceTruncated;
  const fieldErrors: Partial<Record<keyof NormalizedScanInput, string>> = {};

  if (source !== undefined && (typeof source !== "string" || !SOURCES.has(source as ScanSource))) {
    fieldErrors.source = "Unsupported scan source.";
  }

  if (locale !== undefined && (typeof locale !== "string" || !LOCALES.has(locale as AnalysisLocale))) {
    fieldErrors.locale = "Unsupported analysis language.";
  }

  if (!body) {
    fieldErrors.body = "Email content is required.";
  } else if (body.length > MAX_SCAN_BODY_LENGTH) {
    fieldErrors.body = `Email content must be ${MAX_SCAN_BODY_LENGTH} characters or less.`;
  }

  if (senderEmail && senderEmail.length > PUBLIC_CONTRACT.limits.senderEmailCharacters) {
    fieldErrors.senderEmail = "Sender email is too long.";
  }

  if (subject && subject.length > PUBLIC_CONTRACT.limits.subjectCharacters) {
    fieldErrors.subject = "Subject is too long.";
  }

  if (data.linkPairs !== undefined && !linkPairs) {
    fieldErrors.linkPairs = "Displayed link metadata is invalid.";
  }

  if (data.links !== undefined && !links) {
    fieldErrors.links = "Link metadata is invalid.";
  }

  if (data.attachmentRiskTypes !== undefined && !attachmentRiskTypes) {
    fieldErrors.attachmentRiskTypes = "Attachment risk metadata is invalid.";
  }

  if (data.emailAuthentication !== undefined && !emailAuthentication) {
    fieldErrors.emailAuthentication = "Authentication metadata is invalid.";
  } else if (emailAuthentication && source !== "eml") {
    // Only an exported message carries provider authentication headers. Pasted text,
    // screenshots, and the extension cannot produce them.
    fieldErrors.emailAuthentication = "Authentication metadata requires an .eml scan.";
  }

  if (evidenceTruncated !== undefined && typeof evidenceTruncated !== "boolean") {
    fieldErrors.evidenceTruncated = "Evidence completeness metadata is invalid.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Please check the scan input and try again.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    input: {
      source: (typeof source === "string" ? source : "paste") as ScanSource,
      locale: (typeof locale === "string" ? locale : "en") as AnalysisLocale,
      subject,
      senderEmail,
      body,
      links: links ?? undefined,
      linkPairs: linkPairs ?? undefined,
      attachmentRiskTypes: attachmentRiskTypes ?? undefined,
      emailAuthentication: emailAuthentication ?? undefined,
      evidenceTruncated: evidenceTruncated === true,
    },
  };
}

function normalizeEmailAuthentication(
  value: unknown,
): EmailAuthenticationSummary | null | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const verdictFields = ["spf", "dkim", "dmarc"] as const;
  const booleanFields = ["replyToMismatch", "returnPathMismatch"] as const;
  const allowed = new Set<string>([...verdictFields, ...booleanFields]);
  if (Object.keys(record).some((key) => !allowed.has(key))) return null;

  const summary: EmailAuthenticationSummary = {};

  for (const field of verdictFields) {
    const verdict = record[field];
    if (verdict === undefined) continue;
    if (!isEmailAuthenticationVerdict(verdict)) return null;
    summary[field] = verdict;
  }

  for (const field of booleanFields) {
    const flag = record[field];
    if (flag === undefined) continue;
    if (typeof flag !== "boolean") return null;
    summary[field] = flag;
  }

  return summary;
}

function normalizeAttachmentRiskTypes(value: unknown): AttachmentRiskType[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > ATTACHMENT_RISK_TYPES.size) return null;

  const types: AttachmentRiskType[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !ATTACHMENT_RISK_TYPES.has(item as AttachmentRiskType)) return null;
    types.push(item as AttachmentRiskType);
  }
  return Array.from(new Set(types)).sort();
}

function normalizeLinks(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > PUBLIC_CONTRACT.limits.linkItems) return null;

  const links: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const link = normalizeHttpUrl(item);
    if (!link) return null;
    links.push(link);
  }

  return Array.from(new Set(links));
}

function normalizeLinkPairs(value: unknown): EmailLinkPair[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > PUBLIC_CONTRACT.limits.linkItems) return null;

  const pairs: EmailLinkPair[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if (Object.keys(record).some((key) => !["displayedUrl", "destinationUrl"].includes(key))) return null;
    if (typeof record.displayedUrl !== "string" || typeof record.destinationUrl !== "string") return null;
    const displayedUrl = normalizeHttpUrl(record.displayedUrl);
    const destinationUrl = normalizeHttpUrl(record.destinationUrl);
    if (!displayedUrl || !destinationUrl) return null;
    pairs.push({ displayedUrl, destinationUrl });
  }

  return pairs;
}

function normalizeHttpUrl(value: string): string | null {
  if (value.length > PUBLIC_CONTRACT.limits.linkCharacters) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
