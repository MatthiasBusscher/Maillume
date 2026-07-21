export type ScreenshotEmailFields = {
  body: string;
  senderEmail?: string;
  subject?: string;
};

const HEADER_SCAN_LINE_LIMIT = 30;
const SUBJECT_LABEL = /^(?:subject|onderwerp)$/i;
const SENDER_LABEL = /^(?:from|van|sender|afzender)$/i;
const HEADER_LINE = /^([^:]{1,24})\s*:\s*(.*)$/;
const EMAIL_ADDRESS = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]{0,251}[A-Z0-9])?/i;

export function extractScreenshotEmailFields(value: string): ScreenshotEmailFields {
  const lines = normalizeOcrText(value).split("\n");
  const consumed = new Set<number>();
  let subject: string | undefined;
  let senderEmail: string | undefined;

  for (let index = 0; index < Math.min(lines.length, HEADER_SCAN_LINE_LIMIT); index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const parsedHeader = parseHeaderLine(line);
    if (!parsedHeader) continue;

    const { label } = parsedHeader;
    let headerValue = parsedHeader.value;
    let continuationIndex: number | undefined;

    if (!headerValue) {
      continuationIndex = findNextNonEmptyLine(lines, index + 1);
      if (continuationIndex === undefined || continuationIndex >= HEADER_SCAN_LINE_LIMIT) continue;
      headerValue = lines[continuationIndex].trim();
      if (!headerValue || parseHeaderLine(headerValue)) continue;
    }

    if (SUBJECT_LABEL.test(label)) {
      const normalizedSubject = normalizeInlineValue(headerValue).slice(0, 300);
      if (!normalizedSubject) continue;
      subject ??= normalizedSubject;
    } else if (SENDER_LABEL.test(label)) {
      const address = headerValue.match(EMAIL_ADDRESS)?.[0];
      if (!address || address.length > 320) continue;
      senderEmail ??= address;
    } else {
      continue;
    }

    consumed.add(index);
    if (continuationIndex !== undefined) consumed.add(continuationIndex);
  }

  const body = lines
    .filter((_, index) => !consumed.has(index))
    .join("\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");

  return {
    body,
    ...(subject ? { subject } : {}),
    ...(senderEmail ? { senderEmail } : {}),
  };
}

function parseHeaderLine(line: string): { label: string; value: string } | null {
  const match = line.match(HEADER_LINE);
  if (match) {
    const label = normalizeInlineValue(match[1]);
    if (SUBJECT_LABEL.test(label) || SENDER_LABEL.test(label)) {
      return { label, value: match[2].trim() };
    }
    return null;
  }

  const label = normalizeInlineValue(line);
  return SUBJECT_LABEL.test(label) || SENDER_LABEL.test(label) ? { label, value: "" } : null;
}

function findNextNonEmptyLine(lines: string[], startIndex: number): number | undefined {
  for (let index = startIndex; index < Math.min(lines.length, HEADER_SCAN_LINE_LIMIT); index += 1) {
    if (lines[index].trim()) return index;
  }
  return undefined;
}

function normalizeOcrText(value: string): string {
  return value
    .replace(/[\0\u200B-\u200D\u2060\uFEFF]/g, "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n");
}

function normalizeInlineValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
