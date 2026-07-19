import { MAX_SCAN_BODY_LENGTH, type EmailLinkPair } from "../types";

const HEADER_BODY_SEPARATOR = /\r?\n\r?\n/;
const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;
const HREF_PATTERN = /\bhref\s*=\s*["']([^"']+)["']/gi;
const HTML_LINK_PAIR_PATTERN = /<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const DISPLAYED_DOMAIN_PATTERN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:\/[^\s<>"']*)?/i;
const ENCODED_WORD_PATTERN = /=\?([^?\s]+)\?([BQ])\?([^?]*)\?=/gi;

export const MAX_EML_HEADER_CHARACTERS = 64 * 1024;
export const MAX_EML_MULTIPART_SECTIONS = 64;
export const MAX_EML_PART_BODY_CHARACTERS = 64 * 1024;
export const MAX_EML_MIME_DEPTH = 10;
export const MAX_EML_ATTACHMENT_NAMES = 25;
export const MAX_EML_LINKS = 20;
export const MAX_EML_LINK_LENGTH = 2_048;

const WINDOWS_1252_CODE_POINTS = [
  0x20ac,
  0xfffd,
  0x201a,
  0x192,
  0x201e,
  0x2026,
  0x2020,
  0x2021,
  0x2c6,
  0x2030,
  0x160,
  0x2039,
  0x152,
  0xfffd,
  0x17d,
  0xfffd,
  0xfffd,
  0x2018,
  0x2019,
  0x201c,
  0x201d,
  0x2022,
  0x2013,
  0x2014,
  0x2dc,
  0x2122,
  0x161,
  0x203a,
  0x153,
  0xfffd,
  0x17e,
  0x178,
];

export type ParsedEml = {
  subject?: string;
  senderEmail?: string;
  body: string;
  links: string[];
  linkPairs: EmailLinkPair[];
  attachmentNames: string[];
};

type MimePart = {
  headers: Map<string, string>;
  body: string;
};

type ParseState = {
  textParts: string[];
  htmlParts: string[];
  rawLinks: string[];
  linkPairs: EmailLinkPair[];
  attachmentNames: string[];
  sectionsProcessed: number;
};

export function parseEml(raw: string): ParsedEml {
  const root = splitMimePart(raw);
  const subject = decodeHeader(root.headers.get("subject"));
  const from = decodeHeader(root.headers.get("from"));
  const state: ParseState = {
    textParts: [],
    htmlParts: [],
    rawLinks: [],
    linkPairs: [],
    attachmentNames: [],
    sectionsProcessed: 0,
  };

  parseMimePart(root, 0, state, true);

  const body = [
    state.textParts.join("\n\n"),
    state.htmlParts.join("\n\n"),
    attachmentSummary(state.attachmentNames),
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim()
    .slice(0, MAX_SCAN_BODY_LENGTH);
  const links = Array.from(new Set([...state.rawLinks, ...extractLinks(body)])).slice(
    0,
    MAX_EML_LINKS,
  );

  return {
    subject,
    senderEmail: extractEmail(from),
    body,
    links,
    linkPairs: deduplicateLinkPairs(state.linkPairs).slice(0, MAX_EML_LINKS),
    attachmentNames: state.attachmentNames,
  };
}

function parseMimePart(part: MimePart, depth: number, state: ParseState, isRootPart: boolean): void {
  const contentType = part.headers.get("content-type") ?? "text/plain";
  const disposition = part.headers.get("content-disposition") ?? "";
  const rawFilename =
    getHeaderParameter(disposition, "filename") ?? getHeaderParameter(contentType, "name");
  const isAttachment = /(?:^|;)\s*attachment\b/i.test(disposition) || rawFilename !== undefined;

  if (isAttachment) {
    if (state.attachmentNames.length < MAX_EML_ATTACHMENT_NAMES) {
      const filename = rawFilename === undefined ? undefined : decodeHeader(rawFilename);
      state.attachmentNames.push(filename?.trim() || "Unnamed attachment");
    }
    return;
  }

  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();

  if (mediaType.startsWith("multipart/")) {
    if (depth >= MAX_EML_MIME_DEPTH) {
      return;
    }

    const boundary = getHeaderParameter(contentType, "boundary");
    if (!boundary) {
      return;
    }

    for (const section of splitMultipartSections(part.body, boundary)) {
      if (state.sectionsProcessed >= MAX_EML_MULTIPART_SECTIONS) {
        break;
      }

      state.sectionsProcessed += 1;
      parseMimePart(splitMimePart(section), depth + 1, state, false);
    }
    return;
  }

  const transferEncoding = part.headers.get("content-transfer-encoding") ?? "";
  const charset = getHeaderParameter(contentType, "charset") ?? "utf-8";
  const decodedBody = decodeTransferBody(
    part.body.slice(0, MAX_EML_PART_BODY_CHARACTERS),
    transferEncoding,
    charset,
  );

  appendWithinLimit(state.rawLinks, extractLinks(decodedBody), MAX_EML_LINKS);

  if (mediaType === "text/html") {
    appendWithinLimit(state.linkPairs, extractDisplayedLinkPairs(decodedBody), MAX_EML_LINKS);
    state.htmlParts.push(htmlToText(decodedBody));
  } else if (mediaType === "text/plain" || isRootPart) {
    state.textParts.push(decodedBody);
  }
}

function extractDisplayedLinkPairs(html: string): EmailLinkPair[] {
  return Array.from(html.matchAll(HTML_LINK_PAIR_PATTERN)).flatMap((match) => {
    const displayedText = htmlToText(match[2]);
    const fullUrl = displayedText.match(LINK_PATTERN)?.[0];
    const bareDomain = displayedText.match(DISPLAYED_DOMAIN_PATTERN)?.[0];
    const displayedUrl = fullUrl ?? (bareDomain ? `https://${bareDomain}` : undefined);
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

function splitMimePart(source: string): MimePart {
  const separator = HEADER_BODY_SEPARATOR.exec(source);

  if (!separator || separator.index === undefined) {
    return {
      headers: parseHeaders(source.slice(0, MAX_EML_HEADER_CHARACTERS)),
      body: "",
    };
  }

  return {
    headers: parseHeaders(source.slice(0, separator.index).slice(0, MAX_EML_HEADER_CHARACTERS)),
    body: source.slice(separator.index + separator[0].length),
  };
}

function extractLinks(content: string): string[] {
  const visibleLinks = Array.from(content.matchAll(LINK_PATTERN), (match) =>
    match[0].replace(/[.,!?;:]+$/, ""),
  ).filter((link) => link.length <= MAX_EML_LINK_LENGTH);
  const hrefLinks = Array.from(content.matchAll(HREF_PATTERN), (match) => match[1]).filter(
    (link) => /^https?:\/\//i.test(link) && link.length <= MAX_EML_LINK_LENGTH,
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
  const boundaryPattern = new RegExp(`^--${escapeRegExp(boundary)}(--)?[ \\t]*$`);
  const sections: string[] = [];
  const currentLines: string[] = [];
  let started = false;

  for (const line of body.split(/\r?\n/)) {
    const boundaryMatch = boundaryPattern.exec(line);

    if (boundaryMatch) {
      if (started) {
        const section = currentLines.join("\n").trim();
        if (section) {
          sections.push(section);
        }
        currentLines.length = 0;
      }

      if (boundaryMatch[1] === "--" || sections.length >= MAX_EML_MULTIPART_SECTIONS) {
        break;
      }

      started = true;
      continue;
    }

    if (started) {
      currentLines.push(line);
    }
  }

  if (started && sections.length < MAX_EML_MULTIPART_SECTIONS) {
    const section = currentLines.join("\n").trim();
    if (section) {
      sections.push(section);
    }
  }

  return sections;
}

function getHeaderParameter(header: string, parameterName: string): string | undefined {
  const normalizedParameterName = parameterName.toLowerCase();
  let plainValue: string | undefined;
  let extendedValue: string | undefined;

  for (const { name, value } of parseMimeParameters(header)) {
    const normalizedName = name.toLowerCase();

    if (normalizedName === `${normalizedParameterName}*`) {
      extendedValue = decodeExtendedParameter(value);
    } else if (normalizedName === normalizedParameterName) {
      plainValue = value;
    }
  }

  return extendedValue ?? plainValue;
}

type MimeParameter = {
  name: string;
  value: string;
};

/**
 * Reads MIME parameters without a regex that can backtrack over attacker-controlled
 * quoted values. Header values are already capped before this function is reached.
 */
function parseMimeParameters(header: string): MimeParameter[] {
  const parameters: MimeParameter[] = [];
  const source = header.slice(0, MAX_EML_HEADER_CHARACTERS);
  let index = source.indexOf(";");

  while (index !== -1 && index < source.length) {
    index += 1;
    index = skipMimeWhitespace(source, index);

    const nameStart = index;
    while (index < source.length && !isMimeParameterSeparator(source[index])) {
      index += 1;
    }

    const name = source.slice(nameStart, index);
    index = skipMimeWhitespace(source, index);

    if (!name || source[index] !== "=") {
      index = findNextMimeParameter(source, index);
      continue;
    }

    index += 1;
    index = skipMimeWhitespace(source, index);
    const parsedValue = source[index] === '"'
      ? readQuotedMimeParameter(source, index + 1)
      : readUnquotedMimeParameter(source, index);

    parameters.push({ name, value: parsedValue.value.trim() });
    index = parsedValue.nextIndex;
  }

  return parameters;
}

function isMimeParameterSeparator(character: string | undefined): boolean {
  return character === undefined || character === ";" || character === "=" || /\s/.test(character);
}

function skipMimeWhitespace(source: string, index: number): number {
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
}

function findNextMimeParameter(source: string, index: number): number {
  while (index < source.length && source[index] !== ";") {
    index += 1;
  }
  return index;
}

function readQuotedMimeParameter(source: string, index: number): { value: string; nextIndex: number } {
  let value = "";

  while (index < source.length) {
    const character = source[index];

    if (character === '"') {
      return { value, nextIndex: findNextMimeParameter(source, index + 1) };
    }

    if (character === "\\" && index + 1 < source.length) {
      const escaped = source[index + 1];
      value += escaped === '"' || escaped === "\\" ? escaped : character + escaped;
      index += 2;
      continue;
    }

    value += character;
    index += 1;
  }

  return { value, nextIndex: source.length };
}

function readUnquotedMimeParameter(source: string, index: number): { value: string; nextIndex: number } {
  const valueStart = index;
  const nextIndex = findNextMimeParameter(source, index);
  return { value: source.slice(valueStart, nextIndex), nextIndex };
}

function decodeExtendedParameter(value: string): string {
  const match = value.match(/^([^']*)'[^']*'(.*)$/);
  if (!match) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return decodeBytes(decodePercentEncodedBytes(match[2]), match[1] || "utf-8");
}

function decodePercentEncodedBytes(value: string): Uint8Array {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "%" && /^[0-9a-f]{2}$/i.test(value.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(value.slice(index + 1, index + 3), 16));
      index += 2;
      continue;
    }

    const codePoint = value.codePointAt(index) ?? 0;
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
    } else {
      bytes.push(...new TextEncoder().encode(String.fromCodePoint(codePoint)));
    }
    if (codePoint > 0xffff) {
      index += 1;
    }
  }

  return Uint8Array.from(bytes);
}

function decodeTransferBody(body: string, encoding: string, charset: string): string {
  if (/base64/i.test(encoding)) {
    const bytes = decodeBase64Bytes(body);
    return bytes ? decodeBytes(bytes, charset).trim() : body.trim();
  }

  if (/quoted-printable/i.test(encoding)) {
    return decodeBytes(decodeQuotedPrintableBytes(body), charset).trim();
  }

  return decodeBytes(stringToBytes(body), charset).trim();
}

function stringToBytes(value: string): Uint8Array {
  const bytes: number[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0xff) bytes.push(codePoint);
    else bytes.push(...new TextEncoder().encode(character));
  }
  return Uint8Array.from(bytes);
}

function decodeBase64Bytes(value: string): Uint8Array | undefined {
  const compact = value.replace(/\s/g, "");

  if (!compact || !/^[a-z\d+/]*={0,2}$/i.test(compact) || compact.length % 4 === 1) {
    return undefined;
  }

  try {
    const binary = atob(compact);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return undefined;
  }
}

function decodeQuotedPrintableBytes(value: string): Uint8Array {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "=") {
      if (value[index + 1] === "\n") {
        index += 1;
        continue;
      }
      if (value[index + 1] === "\r" && value[index + 2] === "\n") {
        index += 2;
        continue;
      }

      const hex = value.slice(index + 1, index + 3);
      if (/^[0-9a-f]{2}$/i.test(hex)) {
        bytes.push(Number.parseInt(hex, 16));
        index += 2;
        continue;
      }
    }

    const codePoint = value.codePointAt(index) ?? 0;
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
    } else {
      bytes.push(...new TextEncoder().encode(String.fromCodePoint(codePoint)));
    }
    if (codePoint > 0xffff) {
      index += 1;
    }
  }

  return Uint8Array.from(bytes);
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  const normalizedCharset = charset.trim().replace(/^["']|["']$/g, "").toLowerCase();

  if (/^(?:windows-1252|cp1252|ms-ansi)$/.test(normalizedCharset)) {
    return decodeSingleByte(bytes, WINDOWS_1252_CODE_POINTS);
  }

  if (/^(?:iso-8859-1|iso_ir_100|latin1|latin-1|l1)$/.test(normalizedCharset)) {
    return decodeSingleByte(bytes);
  }

  if (/^(?:us-ascii|ascii)$/.test(normalizedCharset)) {
    return Array.from(bytes, (byte) => (byte < 0x80 ? String.fromCharCode(byte) : "\ufffd")).join("");
  }

  try {
    return new TextDecoder(normalizedCharset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function decodeSingleByte(bytes: Uint8Array, extensionCodePoints?: number[]): string {
  return Array.from(bytes, (byte) => {
    if (extensionCodePoints && byte >= 0x80 && byte <= 0x9f) {
      return String.fromCodePoint(extensionCodePoints[byte - 0x80]);
    }
    return String.fromCodePoint(byte);
  }).join("");
}

function decodeHeader(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.replace(/(=\?[^?\s]+\?[BQ]\?[^?]*\?=)[ \t]+(?==\?)/gi, "$1");
  return normalizedValue.replace(
    ENCODED_WORD_PATTERN,
    (match, charset: string, encoding: string, encodedText: string) => {
      const bytes = encoding.toUpperCase() === "B"
        ? decodeBase64Bytes(encodedText)
        : decodeQuotedPrintableBytes(encodedText.replace(/_/g, " "));
      return bytes ? decodeBytes(bytes, charset) : match;
    },
  );
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
  const text: string[] = [];
  let ignoredElement: "script" | "style" | undefined;
  let index = 0;

  while (index < html.length) {
    const tagStart = html.indexOf("<", index);

    if (tagStart === -1) {
      if (!ignoredElement) text.push(decodeHtmlEntities(html.slice(index)));
      break;
    }

    if (!ignoredElement && tagStart > index) {
      text.push(decodeHtmlEntities(html.slice(index, tagStart)));
    }

    const tag = readHtmlTag(html, tagStart);
    if (!tag) {
      if (!ignoredElement) text.push(decodeHtmlEntities(html.slice(tagStart)));
      break;
    }

    if (ignoredElement) {
      if (tag.closing && tag.name === ignoredElement) {
        ignoredElement = undefined;
      }
    } else if (!tag.closing && (tag.name === "script" || tag.name === "style")) {
      ignoredElement = tag.name;
    } else if (!tag.closing && tag.name === "br") {
      text.push("\n");
    } else if (tag.closing && tag.name === "p") {
      text.push("\n");
    } else {
      text.push(" ");
    }

    index = tag.nextIndex;
  }

  return text.join("")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

type HtmlTag = {
  closing: boolean;
  name: string;
  nextIndex: number;
};

function readHtmlTag(source: string, startIndex: number): HtmlTag | undefined {
  let index = startIndex + 1;
  let quote: '"' | "'" | undefined;

  while (index < source.length) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      break;
    }
    index += 1;
  }

  if (index === source.length) return undefined;

  let contentIndex = startIndex + 1;
  while (contentIndex < index && /\s/.test(source[contentIndex])) contentIndex += 1;
  const closing = source[contentIndex] === "/";
  if (closing) contentIndex += 1;
  while (contentIndex < index && /\s/.test(source[contentIndex])) contentIndex += 1;

  const nameStart = contentIndex;
  while (contentIndex < index && /[a-z0-9:-]/i.test(source[contentIndex])) contentIndex += 1;

  return {
    closing,
    name: source.slice(nameStart, contentIndex).toLowerCase(),
    nextIndex: index + 1,
  };
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, (entity) => {
    switch (entity.toLowerCase()) {
      case "&nbsp;": return " ";
      case "&amp;": return "&";
      case "&lt;": return "<";
      case "&gt;": return ">";
      case "&quot;": return '"';
      case "&#39;": return "'";
      default: return entity;
    }
  });
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
