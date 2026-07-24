import { getDomain } from "tldts";

import {
  isEmailAuthenticationVerdict,
  type EmailAuthenticationSummary,
  type EmailAuthenticationVerdict,
} from "../types";

type AuthenticationMethod = "spf" | "dkim" | "dmarc";

const AUTHENTICATION_RESULT_HEADERS = ["authentication-results", "arc-authentication-results"];
const METHOD_PATTERN = /\b(spf|dkim|dmarc)\s*=\s*([a-z]+)/gi;
const RECEIVED_SPF_PATTERN = /^\s*([a-z]+)/i;

const MAX_SCANNED_HEADERS = 20;
const MAX_HEADER_VALUE_CHARACTERS = 4 * 1024;

/**
 * Reduces the receiving provider's authentication headers to verdict enums and two
 * domain-comparison booleans. No header text leaves the browser.
 *
 * Returns `undefined` when the message carries nothing determinable, so callers can
 * report authentication evidence as unavailable rather than as a silent pass.
 */
export function summarizeEmailAuthentication(input: {
  rawHeaders: string;
  senderEmail?: string;
  replyTo?: string;
  returnPath?: string;
}): EmailAuthenticationSummary | undefined {
  const summary: EmailAuthenticationSummary = {};

  for (const value of collectHeaderValues(input.rawHeaders, AUTHENTICATION_RESULT_HEADERS)) {
    for (const [method, verdict] of readMethodVerdicts(value)) {
      // The topmost header is written by the final receiving MTA, so the first
      // determination for a method wins over anything an earlier hop recorded.
      if (summary[method] === undefined) summary[method] = verdict;
    }
  }

  if (summary.spf === undefined) {
    const receivedSpf = collectHeaderValues(input.rawHeaders, ["received-spf"])[0];
    const verdict = receivedSpf && RECEIVED_SPF_PATTERN.exec(receivedSpf)?.[1]?.toLowerCase();
    if (isEmailAuthenticationVerdict(verdict)) summary.spf = verdict;
  }

  const senderDomain = getEmailDomain(input.senderEmail);
  if (senderDomain) {
    const replyToDomain = getEmailDomain(input.replyTo);
    const returnPathDomain = getEmailDomain(input.returnPath);
    if (replyToDomain) summary.replyToMismatch = replyToDomain !== senderDomain;
    if (returnPathDomain) summary.returnPathMismatch = returnPathDomain !== senderDomain;
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
}

function readMethodVerdicts(headerValue: string): Array<[AuthenticationMethod, EmailAuthenticationVerdict]> {
  const found = new Map<AuthenticationMethod, EmailAuthenticationVerdict>();

  for (const match of headerValue.matchAll(METHOD_PATTERN)) {
    const method = match[1].toLowerCase() as AuthenticationMethod;
    const verdict = match[2].toLowerCase();
    if (!isEmailAuthenticationVerdict(verdict)) continue;

    // A message may carry several DKIM signatures. One passing signature is a pass,
    // so a later `pass` replaces an earlier failure within the same header.
    const existing = found.get(method);
    if (existing === undefined || (existing !== "pass" && verdict === "pass")) {
      found.set(method, verdict);
    }
  }

  return Array.from(found);
}

function collectHeaderValues(rawHeaders: string, names: string[]): string[] {
  const wanted = new Set(names);
  const values: string[] = [];
  let current: string[] | undefined;

  const commit = () => {
    if (!current) return;
    values.push(current.join(" ").slice(0, MAX_HEADER_VALUE_CHARACTERS));
    current = undefined;
  };

  for (const line of rawHeaders.split(/\r?\n/)) {
    if (values.length >= MAX_SCANNED_HEADERS) break;

    if (/^[ \t]/.test(line)) {
      current?.push(line.trim());
      continue;
    }

    commit();

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const name = line.slice(0, separatorIndex).trim().toLowerCase();
    if (wanted.has(name)) current = [line.slice(separatorIndex + 1).trim()];
  }

  commit();
  return values;
}

function getEmailDomain(address: string | undefined): string | undefined {
  const hostname = address?.split("@").at(-1)?.trim().toLowerCase();
  if (!hostname) return undefined;
  return getDomain(hostname, { allowPrivateDomains: true }) ?? hostname;
}
