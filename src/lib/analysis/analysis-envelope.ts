import {
  ANALYSIS_ENVELOPE_VERSION,
  type AnalysisEnvelope,
  type AnalysisLocale,
  type EmailAnalysisInput,
  type EmailLinkPair,
  type ScanSource,
} from "../types";

const HTTP_LINK_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;

export function createAnalysisEnvelope(
  input: EmailAnalysisInput,
  source: ScanSource = "paste",
): AnalysisEnvelope {
  const subject = normalizeOptionalText(input.subject);
  const senderEmail = normalizeOptionalText(input.senderEmail);
  const body = normalizeBody(input.body);
  const links = normalizeLinks([
    ...(input.links ?? []),
    ...extractVisibleLinks(body),
    ...(input.linkPairs ?? []).map((pair) => pair.destinationUrl),
  ]);
  const linkPairs = normalizeLinkPairs(input.linkPairs ?? []);

  return {
    version: ANALYSIS_ENVELOPE_VERSION,
    source,
    locale: normalizeLocale(input.locale),
    ...(subject ? { subject } : {}),
    ...(senderEmail ? { senderEmail } : {}),
    body,
    links,
    linkPairs,
    availability: {
      subject: Boolean(subject),
      sender: Boolean(senderEmail),
      linkDestinations: source !== "screenshot",
      authenticationHeaders: false,
      textExtraction: source === "screenshot" ? "ocr" : source === "eml" ? "parsed" : "direct",
    },
  };
}

export function ensureAnalysisEnvelope(
  input: EmailAnalysisInput | AnalysisEnvelope,
): AnalysisEnvelope {
  if (isAnalysisEnvelope(input)) {
    return input;
  }

  const source = "source" in input && isScanSource(input.source) ? input.source : "paste";
  return createAnalysisEnvelope(input, source);
}

export function isAnalysisEnvelope(value: unknown): value is AnalysisEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AnalysisEnvelope>;
  return candidate.version === ANALYSIS_ENVELOPE_VERSION
    && isScanSource(candidate.source)
    && (candidate.locale === "en" || candidate.locale === "nl")
    && typeof candidate.body === "string"
    && Array.isArray(candidate.links)
    && Array.isArray(candidate.linkPairs)
    && Boolean(candidate.availability);
}

function normalizeLocale(locale: AnalysisLocale | undefined): AnalysisLocale {
  return locale === "nl" ? "nl" : "en";
}

function isScanSource(value: unknown): value is ScanSource {
  return value === "paste" || value === "screenshot" || value === "eml" || value === "chrome";
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = normalizeInlineText(value);
  return normalized || undefined;
}

function normalizeInlineText(value: string): string {
  return normalizeUnicode(value).replace(/\s+/g, " ").trim();
}

function normalizeBody(value: string): string {
  return normalizeUnicode(value)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeUnicode(value: string): string {
  return value.replace(/\0/g, "").normalize("NFKC");
}

function extractVisibleLinks(content: string): string[] {
  return Array.from(content.matchAll(HTTP_LINK_PATTERN), (match) => match[0]);
}

function normalizeLinks(links: string[]): string[] {
  return Array.from(
    new Set(links.map(normalizeHttpUrl).filter((link): link is string => Boolean(link))),
  ).sort();
}

function normalizeLinkPairs(pairs: EmailLinkPair[]): EmailLinkPair[] {
  const normalized = pairs.flatMap((pair) => {
    const displayedUrl = normalizeHttpUrl(pair.displayedUrl);
    const destinationUrl = normalizeHttpUrl(pair.destinationUrl);
    return displayedUrl && destinationUrl ? [{ displayedUrl, destinationUrl }] : [];
  });

  return Array.from(
    new Map(
      normalized.map((pair) => [`${pair.displayedUrl}\n${pair.destinationUrl}`, pair]),
    ).values(),
  ).sort((left, right) =>
    left.destinationUrl.localeCompare(right.destinationUrl)
    || left.displayedUrl.localeCompare(right.displayedUrl),
  );
}

function normalizeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(normalizeInlineText(value).replace(/[.,!?;:]+$/, ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}
