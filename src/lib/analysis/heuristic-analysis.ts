import type { EmailAnalysisInput, EmailLinkPair } from "../types";
import {
  buildAnalysisResult,
  getRegistrableDomain,
  type EvidenceId,
} from "./evidence";

const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;
const HTML_LINK_PATTERN = /<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const SHORT_LINK_DOMAINS = new Set(["bit.ly", "tinyurl.com", "t.co", "rebrand.ly", "is.gd", "ow.ly"]);
const RISKY_TLDS = new Set(["zip", "mov", "click", "top", "xyz", "ru"]);
const BRAND_DOMAINS: Record<string, string[]> = {
  amazon: ["amazon.com"],
  apple: ["apple.com"],
  belastingdienst: ["belastingdienst.nl"],
  dhl: ["dhl.com"],
  facebook: ["facebook.com", "meta.com"],
  fedex: ["fedex.com"],
  google: ["google.com"],
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
};

const PATTERN_GROUPS: Array<{ id: EvidenceId; patterns: RegExp[] }> = [
  {
    id: "urgency_pressure",
    patterns: [/\burgent\b/i, /immediately/i, /act now/i, /final notice/i, /today only/i, /laatste waarschuwing/i, /laatste kans/i, /bevestig direct/i, /direct (actie|handelen|bevestigen|annuleren)/i, /binnen \d{1,2} (uur|uren)/i],
  },
  {
    id: "credential_request",
    patterns: [/\bpassword\b/i, /\bcredentials?\b/i, /verify (your )?(?:[a-z-]+ )?(account|identity)/i, /sign in (below|here|now)/i, /wachtwoord/i, /inloggegevens/i, /identiteit bevestigen/i, /bevestig (?:direct )?(uw|je) (?:[a-z-]+)?(?:account|gegevens|identiteit)/i],
  },
  {
    id: "payment_request",
    patterns: [/wire transfer/i, /gift card/i, /payment (required|overdue|failed)/i, /invoice (overdue|unpaid)/i, /betaal(methode|gegevens)/i, /betaling.*(mislukt|vereist|achterstallig)/i, /niet betaald/i, /achterstallige factuur/i, /terugbetaling/i, /overschrijving/i, /incasso/i],
  },
  {
    id: "changed_payment_details",
    patterns: [/new (bank|payment) (account|details)/i, /changed? (our )?(bank|payment) details/i, /updated? (bank|payment) details/i, /nieuw(e)? (bankrekening|rekeningnummer|betaalgegevens)/i, /gewijzigd(e)? (bankrekening|rekeningnummer|betaalgegevens)/i],
  },
  {
    id: "attachment_lure",
    patterns: [/open (the )?attachment/i, /download (the )?(document|invoice|file)/i, /shared document/i, /docusign/i, /open de bijlage/i, /document (openen|downloaden|gedeeld)/i],
  },
  {
    id: "prize_promotion",
    patterns: [/congratulations/i, /\bwinner\b/i, /claim (your )?(prize|reward|gift|bonus)/i, /exclusive offer/i, /limited time/i, /\b\d{1,2}% off\b/i, /winnaar/i, /claim (uw|je) prijs/i, /loyaliteitskorting/i],
  },
  {
    id: "account_threat",
    patterns: [/account (blocked|locked|suspended)/i, /subscription.*(expires|renew|blocked)/i, /account (geblokkeerd|vergrendeld|opgeschort)/i, /abonnement.*(verloopt|verlopen|verleng)/i, /betaalmethode bijwerken/i],
  },
  {
    id: "fake_security",
    patterns: [/antivirus subscription/i, /internet security.*(expired|renew)/i, /virus protection.*expired/i, /antivirusabonnement/i, /virusbescherming.*verlopen/i, /beveiligingssoftware.*verleng/i],
  },
  {
    id: "link_call_to_action",
    patterns: [/click here/i, /open this link/i, /follow the link/i, /use the button/i, /klik hier/i, /open deze link/i, /gebruik de knop/i, /volg de link/i],
  },
  {
    id: "unsolicited_sales",
    patterns: [/rank (higher|on google)/i, /increase (your )?(traffic|sales|leads)/i, /qualified leads/i, /guest post/i, /backlink/i, /marketing service/i, /onze seo-diensten/i, /meer (leads|websiteverkeer)/i],
  },
  {
    id: "investment_pitch",
    patterns: [/investment opportunity/i, /guaranteed returns?/i, /passive income/i, /work from home/i, /make money/i, /\bforex\b/i, /crypto opportunity/i, /beleggingskans/i, /gegarandeerd rendement/i, /passief inkomen/i],
  },
  {
    id: "high_risk_spam",
    patterns: [/\bviagra\b/i, /\bcialis\b/i, /weight loss/i, /\bcbd\b/i, /casino/i, /\bbetting\b/i, /online gokken/i, /gok(beloning|bonus)/i, /snel afvallen/i],
  },
  {
    id: "generic_greeting",
    patterns: [/dear (customer|user|client|member)/i, /hello friend/i, /beste (klant|gebruiker|abonnee|lid)/i, /geachte (klant|gebruiker|abonnee|lid)/i],
  },
  {
    id: "executive_impersonation",
    patterns: [/(i am|this is) (the )?(ceo|cfo|director|owner)/i, /on behalf of (the )?(ceo|cfo|director)/i, /ik ben (de )?(directeur|eigenaar)/i, /namens (de )?(directeur|eigenaar)/i],
  },
  {
    id: "payroll_or_tax_request",
    patterns: [/change (my )?(payroll|direct deposit)/i, /employee tax (form|details)/i, /w-?2 form/i, /wijzig (mijn )?(salaris|loon|bankrekening)/i, /loonheffing/i, /personeelsgegevens bijwerken/i],
  },
  {
    id: "mfa_or_oauth_request",
    patterns: [/approve (the )?(mfa|login|sign-in) (request|prompt)/i, /accept (this )?(app|oauth) (request|permission)/i, /keur (de )?(inlog|mfa).*(goed|verzoek)/i, /accepteer.*(app|oauth).*(toegang|verzoek)/i],
  },
  {
    id: "qr_lure",
    patterns: [/scan (the )?qr( code)?/i, /qr-code scannen/i, /scan de qr/i],
  },
  {
    id: "callback_lure",
    patterns: [/call (us|this number|support) (now|immediately|to cancel)/i, /bel (ons|dit nummer|de helpdesk).*(direct|annuleren)/i],
  },
];

export function analyzeEmailHeuristic(input: EmailAnalysisInput) {
  const { evidence, links } = collectHeuristicEvidence(input);
  return buildAnalysisResult(evidence, links, input.locale ?? "en");
}

export function collectHeuristicEvidence(input: EmailAnalysisInput) {
  const locale = input.locale ?? "en";
  const messageContent = [input.subject, input.body].filter(Boolean).join("\n");
  const evidence = new Set<EvidenceId>();

  for (const group of PATTERN_GROUPS) {
    if (group.patterns.some((pattern) => pattern.test(messageContent))) evidence.add(group.id);
  }

  if (/(?:never|do not|nooit|niet).{0,24}(?:approve|goedkeur|keur).{0,18}(?:mfa|login|inlog)/i.test(messageContent)) {
    evidence.delete("mfa_or_oauth_request");
  }
  if (/(?:you subscribed|opted in|subscription preferences|aangemeld voor|abonnementsvoorkeuren)/i.test(messageContent)) {
    evidence.delete("prize_promotion");
  }

  if (mentionsKnownBrand(messageContent)) evidence.add("brand_mention");
  if (hasExcessiveFormattingPressure(messageContent)) evidence.add("format_pressure");
  if (hasObfuscatedSpamWords(messageContent)) evidence.add("obfuscation");
  if (input.body.trim().length < 80) evidence.add("little_context");

  const links = extractHttpLinks(messageContent);
  if (links.length > 0) evidence.add("external_link");
  if (links.some(isShortUrl)) evidence.add("short_url");
  if (links.some(hasRiskyTld)) evidence.add("risky_link_domain");

  const linkPairs = [...extractHtmlLinkPairs(input.body), ...(input.linkPairs ?? [])];
  if (linkPairs.some(hasMismatchedLinkPair)) evidence.add("link_mismatch");

  if (input.senderEmail) addSenderEvidence(input.senderEmail, evidence);

  return { evidence: Array.from(evidence), links, locale };
}

export function extractHttpLinks(content: string): string[] {
  return Array.from(
    new Set(
      Array.from(content.matchAll(LINK_PATTERN), (match) => cleanLink(match[0])).filter(isValidHttpUrl),
    ),
  );
}

export function extractHtmlLinkPairs(content: string): EmailLinkPair[] {
  return Array.from(content.matchAll(HTML_LINK_PATTERN)).flatMap((match) => {
    const displayedUrl = stripHtml(match[2]).match(LINK_PATTERN)?.[0];
    if (!displayedUrl) return [];
    return [{ displayedUrl: cleanLink(displayedUrl), destinationUrl: cleanLink(match[1]) }];
  });
}

function addSenderEvidence(sender: string, evidence: Set<EvidenceId>) {
  const senderDomain = getSenderDomain(sender);
  if (!senderDomain) {
    evidence.add("invalid_sender");
    return;
  }

  const tld = senderDomain.split(".").at(-1)?.toLowerCase();
  if (tld && RISKY_TLDS.has(tld)) evidence.add("risky_sender_domain");
  if (hasSuspiciousDomainShape(senderDomain)) evidence.add("suspicious_sender_shape");
  if (looksLikeBrandImpersonation(senderDomain)) evidence.add("brand_lookalike_sender");
}

function hasMismatchedLinkPair(pair: EmailLinkPair): boolean {
  const displayed = getRegistrableDomain(pair.displayedUrl);
  const destination = getRegistrableDomain(pair.destinationUrl);
  return Boolean(displayed && destination && displayed !== destination);
}

function isShortUrl(link: string): boolean {
  try {
    const hostname = new URL(link).hostname.toLowerCase();
    return Array.from(SHORT_LINK_DOMAINS).some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

function hasRiskyTld(link: string): boolean {
  try {
    const tld = new URL(link).hostname.split(".").at(-1)?.toLowerCase();
    return Boolean(tld && RISKY_TLDS.has(tld));
  } catch {
    return false;
  }
}

function getSenderDomain(sender: string): string | null {
  const angleAddress = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  const match = angleAddress.trim().toLowerCase().match(/^[^\s@]+@([^\s@]+)$/);
  return match?.[1]?.replace(/\.$/, "") ?? null;
}

function hasSuspiciousDomainShape(domain: string): boolean {
  const digits = domain.match(/\d/g)?.length ?? 0;
  const hyphens = domain.match(/-/g)?.length ?? 0;
  return digits >= 4 || hyphens >= 3;
}

function looksLikeBrandImpersonation(senderDomain: string): boolean {
  const registrable = getRegistrableDomain(senderDomain);
  if (!registrable) return false;
  const tokens = registrable.split(/[^a-z0-9]+/i);

  return Object.entries(BRAND_DOMAINS).some(([brand, officialDomains]) =>
    tokens.includes(brand) && !officialDomains.includes(registrable),
  );
}

function mentionsKnownBrand(content: string): boolean {
  return Object.keys(BRAND_DOMAINS).some((brand) => new RegExp(`\\b${brand}\\b`, "i").test(content));
}

function hasExcessiveFormattingPressure(content: string): boolean {
  const uppercaseWords = content.match(/\b[A-Z]{4,}\b/g)?.length ?? 0;
  return uppercaseWords >= 3 || /[!?]{3,}/.test(content);
}

function hasObfuscatedSpamWords(content: string): boolean {
  return /(?:v1agra|fr3e|cl1ck|w1nner|b1tco1n|l0gin|log1n)/i.test(content);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanLink(link: string): string {
  return link.trim().replace(/[.,!?;:]+$/, "");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/gi, "&").trim();
}
