import {
  MAX_SCAN_BODY_LENGTH,
  type AnalysisLocale,
  type EmailLinkPair,
  type NormalizedScanInput,
  type ScanSource,
} from "../types";

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

const SOURCES = new Set<ScanSource>(["paste", "screenshot", "eml"]);
const LOCALES = new Set<AnalysisLocale>(["en", "nl"]);

export function validateAnalyzeRequest(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const data = payload as Record<string, unknown>;
  const unsupportedFields = Object.keys(data).filter(
    (field) => !["source", "subject", "senderEmail", "body", "locale", "linkPairs"].includes(field),
  );
  if (unsupportedFields.length > 0) {
    return { ok: false, error: "Request contains unsupported fields." };
  }
  const source = data.source;
  const subject = normalizeOptionalString(data.subject);
  const senderEmail = normalizeOptionalString(data.senderEmail);
  const body = normalizeRequiredString(data.body);
  const locale = data.locale;
  const linkPairs = normalizeLinkPairs(data.linkPairs);
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

  if (senderEmail && senderEmail.length > 320) {
    fieldErrors.senderEmail = "Sender email is too long.";
  }

  if (subject && subject.length > 300) {
    fieldErrors.subject = "Subject is too long.";
  }

  if (data.linkPairs !== undefined && !linkPairs) {
    fieldErrors.linkPairs = "Displayed link metadata is invalid.";
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
      linkPairs: linkPairs ?? undefined,
    },
  };
}

function normalizeLinkPairs(value: unknown): EmailLinkPair[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) return null;

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
  if (value.length > 2_048) return null;
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
