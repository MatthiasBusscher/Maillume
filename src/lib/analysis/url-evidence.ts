import type { EmailLinkPair } from "../types";
import {
  getRegistrableDomain,
  type EvidenceId,
} from "./evidence";

const MAX_INSPECTED_URL_LENGTH = 4_096;
const MAX_NESTED_VALUE_LENGTH = 2_048;
const MAX_NESTED_DECODING_DEPTH = 2;
const MAX_QUERY_VALUES = 24;

const SHORT_LINK_DOMAINS = new Set([
  "bit.ly",
  "is.gd",
  "ow.ly",
  "rebrand.ly",
  "t.co",
  "tinyurl.com",
]);
const RISKY_TLDS = new Set(["click", "mov", "ru", "top", "xyz", "zip"]);
const HOSTED_PAGE_DOMAINS = new Set([
  "firebaseapp.com",
  "netlify.app",
  "pages.dev",
  "vercel.app",
  "web.app",
]);

export const BRAND_DOMAINS: Record<string, string[]> = {
  amazon: ["amazon.com"],
  apple: ["apple.com"],
  belastingdienst: ["belastingdienst.nl"],
  dhl: ["dhl.com"],
  facebook: ["facebook.com", "meta.com"],
  fedex: ["fedex.com"],
  google: ["google.com"],
  ics: ["icsbusiness.nl", "icscards.nl"],
  ing: ["ing.nl"],
  instagram: ["instagram.com", "meta.com"],
  mcafee: ["mcafee.com"],
  microsoft: ["microsoft.com", "office.com", "outlook.com"],
  netflix: ["netflix.com"],
  norton: ["norton.com"],
  paypal: ["paypal.com"],
  postnl: ["postnl.nl"],
  rabobank: ["rabobank.nl"],
  ups: ["ups.com"],
  uwv: ["uwv.nl"],
};

export type UrlEvidenceInput = {
  links: string[];
  linkPairs: EmailLinkPair[];
  messageContent: string;
  senderEmail?: string;
  sensitiveRequest: boolean;
};

export type UrlInspection = {
  evidence: EvidenceId[];
  nestedUrls: string[];
};

export function collectUrlEvidence(input: UrlEvidenceInput): EvidenceId[] {
  const evidence = new Set<EvidenceId>();
  const inspected = input.links.flatMap((link) => {
    const inspection = inspectUrl(link);
    for (const id of inspection.evidence) evidence.add(id);
    return [link, ...inspection.nestedUrls];
  });

  if (input.linkPairs.some(hasMismatchedLinkPair)) evidence.add("link_mismatch");

  const senderDomain = input.senderEmail
    ? getRegistrableDomain(extractSenderDomain(input.senderEmail) ?? "")
    : null;
  const destinationDomains = inspected
    .map((link) => getRegistrableDomain(link))
    .filter((domain): domain is string => Boolean(domain));
  const claimedBrands = getClaimedBrands(input.messageContent);

  if (
    input.sensitiveRequest
    && destinationDomains.some((domain) =>
      isHostedDomain(domain)
      || isHostedHostname(parseHttpUrl(domain)?.hostname ?? domain)
    )
  ) {
    evidence.add("hosted_destination");
  }

  if (
    input.sensitiveRequest
    && senderDomain
    && destinationDomains.some((domain) =>
      domain !== senderDomain
      && !domain.endsWith(`.${senderDomain}`)
      && !senderDomain.endsWith(`.${domain}`)
    )
  ) {
    evidence.add("sender_destination_mismatch");
  }

  if (input.sensitiveRequest && claimedBrands.length > 0) {
    const disagreesWithClaimedBrand = claimedBrands.some((brand) => {
      const officialDomains = BRAND_DOMAINS[brand] ?? [];
      const senderIsOfficial = Boolean(
        senderDomain && officialDomains.includes(senderDomain),
      );
      return !senderIsOfficial
        && destinationDomains.some((domain) => !officialDomains.includes(domain));
    });
    if (disagreesWithClaimedBrand) evidence.add("brand_destination_mismatch");
  }

  return Array.from(evidence);
}

export function inspectUrl(value: string): UrlInspection {
  const url = parseHttpUrl(value);
  if (!url) return { evidence: [], nestedUrls: [] };

  const evidence = new Set<EvidenceId>();
  const hostname = url.hostname.toLowerCase();

  if (isIpLiteral(hostname)) evidence.add("ip_literal_url");
  if (url.port) evidence.add("non_standard_port_url");
  if (url.username || url.password) evidence.add("url_userinfo");
  if (hostname.split(".").some((label) => label.startsWith("xn--"))) {
    evidence.add("punycode_hostname");
  }
  if (isShortHostname(hostname)) evidence.add("short_url");
  if (hasRiskyHostnameTld(hostname)) evidence.add("risky_link_domain");

  const registrableDomain = getRegistrableDomain(hostname);
  if (
    registrableDomain
    && looksLikeBrandDomainImpersonation(registrableDomain)
  ) {
    evidence.add("brand_lookalike_destination");
  }

  const nestedUrls = extractNestedHttpUrls(url);
  if (nestedUrls.length > 0) evidence.add("nested_url");

  for (const nestedUrl of nestedUrls) {
    const nested = parseHttpUrl(nestedUrl);
    if (!nested) continue;
    if (isIpLiteral(nested.hostname)) evidence.add("ip_literal_url");
    if (nested.port) evidence.add("non_standard_port_url");
    if (nested.username || nested.password) evidence.add("url_userinfo");
    if (nested.hostname.split(".").some((label) => label.startsWith("xn--"))) {
      evidence.add("punycode_hostname");
    }
    const nestedDomain = getRegistrableDomain(nested.hostname);
    if (nestedDomain && looksLikeBrandDomainImpersonation(nestedDomain)) {
      evidence.add("brand_lookalike_destination");
    }
  }

  return {
    evidence: Array.from(evidence),
    nestedUrls,
  };
}

export function getClaimedBrands(content: string): string[] {
  return Object.keys(BRAND_DOMAINS).filter((brand) =>
    new RegExp(`\\b${escapeRegExp(brand)}\\b`, "i").test(content),
  );
}

export function looksLikeBrandDomainImpersonation(domain: string): boolean {
  const registrable = getRegistrableDomain(domain);
  if (!registrable) return false;
  const tokens = registrable.split(/[^a-z0-9]+/i);

  return Object.entries(BRAND_DOMAINS).some(([brand, officialDomains]) =>
    tokens.some((token) => isBrandTokenLookalike(token, brand))
    && !officialDomains.includes(registrable),
  );
}

function extractNestedHttpUrls(url: URL): string[] {
  const found = new Set<string>();
  const values = Array.from(url.searchParams.values()).slice(0, MAX_QUERY_VALUES);

  for (const rawValue of values) {
    let value = rawValue.slice(0, MAX_NESTED_VALUE_LENGTH);
    for (let depth = 0; depth <= MAX_NESTED_DECODING_DEPTH; depth += 1) {
      const nested = parseHttpUrl(value);
      if (nested) found.add(nested.toString());

      if (depth === MAX_NESTED_DECODING_DEPTH) break;
      let decoded: string;
      try {
        decoded = decodeURIComponent(value).slice(0, MAX_NESTED_VALUE_LENGTH);
      } catch {
        break;
      }
      if (decoded === value) break;
      value = decoded;
    }
  }

  return Array.from(found).slice(0, MAX_QUERY_VALUES);
}

function parseHttpUrl(value: string): URL | null {
  if (!value || value.length > MAX_INSPECTED_URL_LENGTH) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function hasMismatchedLinkPair(pair: EmailLinkPair): boolean {
  const displayed = getRegistrableDomain(pair.displayedUrl);
  const destination = getRegistrableDomain(pair.destinationUrl);
  return Boolean(displayed && destination && displayed !== destination);
}

function isShortHostname(hostname: string): boolean {
  return Array.from(SHORT_LINK_DOMAINS).some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

function hasRiskyHostnameTld(hostname: string): boolean {
  if (isIpLiteral(hostname)) return false;
  const tld = hostname.split(".").at(-1)?.toLowerCase();
  return Boolean(tld && RISKY_TLDS.has(tld));
}

function isIpLiteral(hostname: string): boolean {
  const unwrapped = hostname.replace(/^\[|\]$/g, "");
  if (unwrapped.includes(":")) {
    return /^[0-9a-f:.]+$/i.test(unwrapped);
  }
  const parts = unwrapped.split(".");
  return parts.length === 4
    && parts.every((part) =>
      /^\d{1,3}$/.test(part)
      && Number(part) >= 0
      && Number(part) <= 255
    );
}

function isHostedDomain(domain: string): boolean {
  return Array.from(HOSTED_PAGE_DOMAINS).some(
    (base) => domain === base || domain.endsWith(`.${base}`),
  );
}

function isHostedHostname(hostname: string): boolean {
  return isHostedDomain(hostname.toLowerCase());
}

function extractSenderDomain(sender: string): string | null {
  const angleAddress = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  return angleAddress.trim().toLowerCase().match(/^[^\s@]+@([^\s@]+)$/)?.[1]
    ?.replace(/\.$/, "") ?? null;
}

function isBrandTokenLookalike(token: string, brand: string): boolean {
  if (token === brand) return true;
  if (brand.length < 5) return false;

  return token
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t") === brand;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
