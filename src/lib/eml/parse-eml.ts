import { MAX_SCAN_BODY_LENGTH, type EmailLinkPair } from "../types";

const HEADER_BODY_SEPARATOR = /\r?\n\r?\n/;
const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;
const HREF_PATTERN = /\bhref\s*=\s*["']([^"']+)["']/gi;
const HTML_LINK_PAIR_PATTERN = /<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
export const MAX_EML_HEADER_CHARACTERS = 64 * 1024;
export const MAX_EML_MULTIPART_SECTIONS = 64;
export const MAX_EML_PART_BODY_CHARACTERS = 64 * 1024;
export const MAX_EML_ATTACHMENT_NAMES = 25;
export const MAX_EML_LINKS = 100;
export const MAX_EML_LINK_LENGTH = 2_048;

export type ParsedEml = {
  subject?: string;
  senderEmail?: string;
  body: string;
  links: string[];
  linkPairs: EmailLinkPair[];
  attachmentNames: string[];
};

export function parseEml(raw: string): ParsedEml {
  const [rawHeaders, ...bodyParts] = raw.split(HEADER_BODY_SEPARATOR);
  const bodySource = bodyParts.join("\n\n");
  const headers = parseHeaders(rawHeaders.slice(0, MAX_EML_HEADER_CHARACTERS));
  const subject = decodeHeader(headers.get("subject"));
  const from = decodeHeader(headers.get("from"));
  const senderEmail = extractEmail(from);
  const contentType = headers.get("content-type") ?? "";
  const boundary = getHeaderParameter(contentType, "boundary");
  const sections = boundary ? splitMultipartSections(bodySource, boundary) : [bodySource];
  const textParts: string[] = [];
  const htmlParts: string[] = [];
  const rawLinks: string[] = [];
  const linkPairs: EmailLinkPair[] = [];
  const attachmentNames: string[] = [];

  for (const section of sections.slice(0, MAX_EML_MULTIPART_SECTIONS)) {
    const sectionHeaders = boundary ? getSectionHeaders(section) : headers;
    const sectionBody = boundary ? getSectionBody(section) : section;
    const sectionContentType = sectionHeaders.get("content-type") ?? "text/plain";
    const disposition = sectionHeaders.get("content-disposition") ?? "";
    const transferEncoding = sectionHeaders.get("content-transfer-encoding") ?? "";
    const filename =
      getHeaderParameter(disposition, "filename") ?? getHeaderParameter(sectionContentType, "name");

    if (/attachment/i.test(disposition) || filename) {
      if (attachmentNames.length < MAX_EML_ATTACHMENT_NAMES) {
        attachmentNames.push(decodeHeader(filename) ?? "Unnamed attachment");
      }
      continue;
    }

    const decodedBody = decodeTransferBody(
      sectionBody.slice(0, MAX_EML_PART_BODY_CHARACTERS),
      transferEncoding,
    );
    appendWithinLimit(rawLinks, extractLinks(decodedBody), MAX_EML_LINKS);

    if (/text\/html/i.test(sectionContentType)) {
      appendWithinLimit(linkPairs, extractDisplayedLinkPairs(decodedBody), MAX_EML_LINKS);
      htmlParts.push(htmlToText(decodedBody));
    } else if (/text\/plain/i.test(sectionContentType) || sections.length === 1) {
      textParts.push(decodedBody.trim());
    }
  }

  const body = [textParts.join("\n\n"), htmlParts.join("\n\n"), attachmentSummary(attachmentNames)]
    .filter(Boolean)
    .join("\n\n")
    .trim()
    .slice(0, MAX_SCAN_BODY_LENGTH);
  const links = Array.from(new Set([...rawLinks, ...extractLinks(body)])).slice(0, MAX_EML_LINKS);

  return {
    subject,
    senderEmail,
    body,
    links,
    linkPairs: deduplicateLinkPairs(linkPairs).slice(0, MAX_EML_LINKS),
    attachmentNames,
  };
}

function extractDisplayedLinkPairs(html: string): EmailLinkPair[] {
  return Array.from(html.matchAll(HTML_LINK_PAIR_PATTERN)).flatMap((match) => {
    const displayedUrl = htmlToText(match[2]).match(LINK_PATTERN)?.[0];
    if (!displayedUrl) return [];
    const normalizedDisplayedUrl = displayedUrl.replace(/[.,!?;:]+$/, "");
    const normalizedDestinationUrl = match[1].replace(/[.,!?;:]+$/, "");

    if (
      normalizedDisplayedUrl.length > MAX_EML_LINK_LENGTH ||
      normalizedDestinationUrl.length > MAX_EML_LINK_LENGTH
    ) {
      return [];
    }

    return [{ displayedUrl: normalizedDisplayedUrl, destinationUrl: normalizedDestinationUrl }];
  });
}

function deduplicateLinkPairs(pairs: EmailLinkPair[]): EmailLinkPair[] {
  return Array.from(
    new Map(pairs.map((pair) => [`${pair.displayedUrl}\n${pair.destinationUrl}`, pair])).values(),
  );
}

function getSectionHeaders(section: string): Map<string, string> {
  const [sectionHeadersRaw] = section.split(HEADER_BODY_SEPARATOR);

  return parseHeaders(sectionHeadersRaw.slice(0, MAX_EML_HEADER_CHARACTERS));
}

function getSectionBody(section: string): string {
  const [, ...sectionBodyParts] = section.split(HEADER_BODY_SEPARATOR);

  return sectionBodyParts.length > 0 ? sectionBodyParts.join("\n\n") : section;
}

function extractLinks(content: string): string[] {
  const visibleLinks = Array.from(content.matchAll(LINK_PATTERN), (match) =>
    match[0].replace(/[.,!?;:]+$/, ""),
  ).filter((link) => link.length <= MAX_EML_LINK_LENGTH);
  const hrefLinks = Array.from(content.matchAll(HREF_PATTERN), (match) => match[1]).filter((link) =>
    /^https?:\/\//i.test(link) && link.length <= MAX_EML_LINK_LENGTH,
  );

  return [...visibleLinks, ...hrefLinks];
}

function parseHeaders(rawHeaders: string): Map<string, string> {
  const headers = new Map<string, string>();
  let currentName = "";

  for (const line of rawHeaders.split(/\r?\n/)) {
    if (/^\s/.test(line) && currentName) {
      headers.set(currentName, `${headers.get(currentName) ?? ""} ${line.trim()}`);
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    currentName = line.slice(0, separatorIndex).trim().toLowerCase();
    headers.set(currentName, line.slice(separatorIndex + 1).trim());
  }

  return headers;
}

function splitMultipartSections(body: string, boundary: string): string[] {
  return body
    .split(`--${boundary}`)
    .map((part) => part.trim())
    .filter((part) => part && part !== "--");
}

function getHeaderParameter(header: string, parameterName: string): string | undefined {
  const match = header.match(new RegExp(`${parameterName}\\*?=(?:"([^"]+)"|([^;]+))`, "i"));
  const value = match?.[1] ?? match?.[2];

  if (!value) {
    return undefined;
  }

  return value.replace(/^utf-8''/i, "").trim();
}

function decodeTransferBody(body: string, encoding: string): string {
  if (/base64/i.test(encoding)) {
    return decodeBase64(body);
  }

  if (/quoted-printable/i.test(encoding)) {
    return decodeQuotedPrintable(body);
  }

  return body.trim();
}

function decodeBase64(value: string): string {
  try {
    return atob(value.replace(/\s/g, ""));
  } catch {
    return value;
  }
}

function decodeQuotedPrintable(value: string): string {
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .trim();
}

function decodeHeader(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (_, _charset, encoding, text) => {
    if (encoding.toUpperCase() === "B") {
      return decodeBase64(text);
    }

    return decodeQuotedPrintable(text.replace(/_/g, " "));
  });
}

function extractEmail(from: string | undefined): string | undefined {
  if (!from) {
    return undefined;
  }

  const angleMatch = from.match(/<([^>]+)>/);
  const candidate = angleMatch?.[1] ?? from;
  const emailMatch = candidate.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/);

  return emailMatch?.[0];
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function attachmentSummary(attachmentNames: string[]): string {
  if (attachmentNames.length === 0) {
    return "";
  }

  return `Attachment metadata:\n${attachmentNames.map((name) => `- ${name}`).join("\n")}`;
}

function appendWithinLimit<T>(target: T[], values: T[], limit: number): void {
  const remaining = limit - target.length;

  if (remaining > 0) {
    target.push(...values.slice(0, remaining));
  }
}
