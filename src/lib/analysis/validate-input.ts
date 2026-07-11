import { MAX_SCAN_BODY_LENGTH, type AnalysisLocale, type NormalizedScanInput, type ScanSource } from "../types";

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
    (field) => !["source", "subject", "senderEmail", "body", "locale"].includes(field),
  );
  if (unsupportedFields.length > 0) {
    return { ok: false, error: "Request contains unsupported fields." };
  }
  const source = data.source;
  const subject = normalizeOptionalString(data.subject);
  const senderEmail = normalizeOptionalString(data.senderEmail);
  const body = normalizeRequiredString(data.body);
  const locale = data.locale;
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
    },
  };
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
