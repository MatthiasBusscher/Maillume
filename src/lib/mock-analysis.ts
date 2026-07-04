import type { EmailAnalysisInput, EmailAnalysisResult, RiskLevel } from "./types";

const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;
const HTML_HREF_PATTERN = /\bhref\s*=\s*["']([^"']+)["']/gi;
const SHORT_LINK_DOMAINS = ["bit.ly", "tinyurl.com", "t.co", "rebrand.ly", "is.gd"];
const RISKY_TLDS = [".zip", ".mov", ".click", ".top", ".xyz", ".ru"];
const IMPERSONATED_BRANDS = [
  { name: "Amazon", domains: ["amazon.com"] },
  { name: "Apple", domains: ["apple.com"] },
  { name: "DHL", domains: ["dhl.com"] },
  { name: "Facebook", domains: ["facebook.com", "meta.com"] },
  { name: "FedEx", domains: ["fedex.com"] },
  { name: "Google", domains: ["google.com"] },
  { name: "Instagram", domains: ["instagram.com", "meta.com"] },
  { name: "McAfee", domains: ["mcafee.com"] },
  { name: "Microsoft", domains: ["microsoft.com", "office.com", "outlook.com"] },
  { name: "Netflix", domains: ["netflix.com"] },
  { name: "Norton", domains: ["norton.com"] },
  { name: "PayPal", domains: ["paypal.com"] },
  { name: "UPS", domains: ["ups.com"] },
];

const keywordGroups = [
  {
    score: 20,
    label: "Uses urgent language that pressures the recipient to act quickly.",
    patterns: [
      /urgent/i,
      /immediately/i,
      /act now/i,
      /final notice/i,
      /today only/i,
      /laatste waarschuwing/i,
      /\bvandaag\b/i,
      /voor (middernacht|het einde van de dag)/i,
      /verloopt?/i,
      /laatste kans/i,
    ],
  },
  {
    score: 18,
    label: "Asks for account credentials or identity verification.",
    patterns: [
      /password/i,
      /login/i,
      /verify/i,
      /2fa/i,
      /credential/i,
      /authenticate/i,
      /account (is )?(blocked|locked|suspended)/i,
      /account (geblokkeerd|vergrendeld|opgeschort)/i,
      /account(update| bijwerken|gegevens)/i,
      /inloggen/i,
      /verifi[eë]ren/i,
    ],
  },
  {
    score: 16,
    label: "Mentions payments, invoices, refunds, or financial transfer pressure.",
    patterns: [
      /invoice/i,
      /payment/i,
      /wire transfer/i,
      /gift card/i,
      /refund/i,
      /crypto/i,
      /betaling/i,
      /betaal(methode|gegevens)/i,
      /niet betaald/i,
      /factuur/i,
      /terugbetaling/i,
    ],
  },
  {
    score: 14,
    label: "References an attachment or document that may be used as bait.",
    patterns: [/attachment/i, /attached/i, /shared document/i, /docusign/i, /download/i],
  },
  {
    score: 12,
    label: "Impersonates a familiar service or authority.",
    patterns: [
      /microsoft/i,
      /google/i,
      /apple/i,
      /paypal/i,
      /bank/i,
      /administrator/i,
      /mcafee/i,
      /norton/i,
      /antivirus/i,
      /internet security/i,
    ],
  },
  {
    score: 14,
    label: "Uses prize, giveaway, or promotional spam language.",
    patterns: [
      /congratulations/i,
      /\bwinner\b/i,
      /\bwon\b/i,
      /\bclaim (your )?(prize|reward|gift|bonus)\b/i,
      /\bfree\b/i,
      /exclusive offer/i,
      /limited time/i,
      /\b\d{1,2}% off\b/i,
      /special promotion/i,
      /\b\d{1,2}% (korting|loyaliteitskorting)\b/i,
      /aanbieding/i,
      /loyaliteitskorting/i,
      /korting.*toegepast/i,
    ],
  },
  {
    score: 24,
    label: "Claims an account was blocked or a subscription will expire unless the user acts.",
    patterns: [
      /account (geblokkeerd|vergrendeld|opgeschort)/i,
      /account (blocked|locked|suspended)/i,
      /abonnement.*(verloopt|verlopen|verleng)/i,
      /subscription.*(expires|renew|blocked)/i,
      /voltooi (uw|je) verlenging/i,
      /renew(al)? before/i,
      /beveiliging.*garanderen/i,
    ],
  },
  {
    score: 18,
    label: "Uses fake security or antivirus subscription language.",
    patterns: [
      /mcafee/i,
      /norton/i,
      /antivirus/i,
      /internet security/i,
      /virusbescherming/i,
      /beveiligingssoftware/i,
      /systeem(poging|pogingen)/i,
      /system attempt/i,
    ],
  },
  {
    score: 18,
    label: "Looks like unsolicited sales or lead-generation outreach.",
    patterns: [
      /\bseo\b/i,
      /rank (higher|on google)/i,
      /increase (your )?(traffic|sales|leads)/i,
      /qualified leads/i,
      /web design/i,
      /app development/i,
      /guest post/i,
      /backlink/i,
      /marketing service/i,
    ],
  },
  {
    score: 14,
    label: "Contains financial, loan, investment, or get-rich-quick language.",
    patterns: [
      /\bloan\b/i,
      /\bdebt\b/i,
      /\bcredit\b/i,
      /investment opportunity/i,
      /passive income/i,
      /work from home/i,
      /make money/i,
      /\bforex\b/i,
      /\bbitcoin\b/i,
    ],
  },
  {
    score: 12,
    label: "Contains common medical, adult, gambling, or high-risk spam terms.",
    patterns: [
      /\bviagra\b/i,
      /\bcialis\b/i,
      /weight loss/i,
      /\bcbd\b/i,
      /\bcasino\b/i,
      /\bbetting\b/i,
      /\badult\b/i,
    ],
  },
  {
    score: 7,
    label: "Uses a generic greeting instead of identifying the recipient.",
    patterns: [
      /dear (customer|user|client|member|email user)/i,
      /\bhello friend\b/i,
      /beste (klant|gebruiker|abonnee|lid)/i,
      /geachte (klant|gebruiker|abonnee|lid)/i,
    ],
  },
];

export function analyzeEmailMock(input: EmailAnalysisInput): EmailAnalysisResult {
  const content = [input.subject, input.senderEmail, input.body].filter(Boolean).join("\n");
  const links = extractLinks(content);
  const signals: string[] = [];
  let score = 10;

  for (const group of keywordGroups) {
    if (group.patterns.some((pattern) => pattern.test(content))) {
      score += group.score;
      signals.push(group.label);
    }
  }

  if (links.length > 0) {
    score += Math.min(20, links.length * 8);
    signals.push("Contains external links that should be checked before opening.");
  }

  if (links.some((link) => SHORT_LINK_DOMAINS.some((domain) => link.includes(domain)))) {
    score += 14;
    signals.push("Uses a shortened URL, which can hide the final destination.");
  }

  if (links.some((link) => RISKY_TLDS.some((tld) => link.toLowerCase().includes(tld)))) {
    score += 12;
    signals.push("Includes a link with a domain pattern often abused in suspicious campaigns.");
  }

  if (hasMismatchedDisplayedLink(input.body)) {
    score += 18;
    signals.push("Displays one link destination but points to a different domain.");
  }

  if (hasExcessiveFormattingPressure(content)) {
    score += 9;
    signals.push("Uses excessive capitalization or punctuation to create pressure.");
  }

  if (hasObfuscatedSpamWords(content)) {
    score += 12;
    signals.push("Appears to obfuscate words, a common spam-filter evasion tactic.");
  }

  if (input.senderEmail) {
    const senderDomain = getSenderDomain(input.senderEmail);

    if (!senderDomain) {
      score += 18;
      signals.push("The sender address does not look like a valid email address.");
    } else {
      if (RISKY_TLDS.some((tld) => senderDomain.endsWith(tld))) {
        score += 12;
        signals.push("Sender domain uses a top-level domain often seen in suspicious mail.");
      }

      if (hasSuspiciousDomainShape(senderDomain)) {
        score += 8;
        signals.push("Sender domain has an unusual number of hyphens or digits.");
      }

      if (looksLikeBrandImpersonation(senderDomain)) {
        score += 18;
        signals.push("Sender domain appears to reference a known brand without using its official domain.");
      }
    }
  }

  if (input.body.trim().length < 80) {
    score += 6;
    signals.push("The message has very little context, making it harder to validate.");
  }

  const riskScore = Math.min(96, Math.max(4, score));
  const riskLevel = getRiskLevel(riskScore);

  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    suspicious_signals: signals,
    detected_links: links,
    recommended_action: getRecommendedAction(riskLevel),
    short_explanation: getExplanation(riskLevel, signals.length, links.length),
  };
}

function extractLinks(content: string): string[] {
  const visibleLinks = Array.from(content.matchAll(LINK_PATTERN), (match) =>
    cleanLink(match[0]),
  );
  const hrefLinks = Array.from(content.matchAll(HTML_HREF_PATTERN), (match) => cleanLink(match[1]))
    .filter((link) => /^https?:\/\//i.test(link));

  return Array.from(new Set([...visibleLinks, ...hrefLinks]));
}

function cleanLink(link: string): string {
  return link.trim().replace(/[.,!?;:]+$/, "");
}

function hasMismatchedDisplayedLink(content: string): boolean {
  const linkTags = content.matchAll(
    /<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  );

  for (const tag of linkTags) {
    const hrefDomain = getDomain(tag[1]);
    const displayedLink = tag[2].replace(/<[^>]*>/g, "").match(LINK_PATTERN)?.[0];
    const displayedDomain = displayedLink ? getDomain(displayedLink) : null;

    if (hrefDomain && displayedDomain && hrefDomain !== displayedDomain) {
      return true;
    }
  }

  return false;
}

function hasExcessiveFormattingPressure(content: string): boolean {
  const words = content.match(/\b[A-Z]{5,}\b/g) ?? [];
  const hasRepeatedPunctuation = /[!?]{3,}/.test(content);

  return words.length >= 3 || hasRepeatedPunctuation;
}

function hasObfuscatedSpamWords(content: string): boolean {
  return (
    /\bv[\s._-]+i[\s._-]+a[\s._-]+g[\s._-]+r[\s._-]+a\b/i.test(content) ||
    /\bf[\s._-]+r[\s._-]+e[\s._-]+e\b/i.test(content) ||
    /\bc[\s._-]+a[\s._-]+s[\s._-]+i[\s._-]+n[\s._-]+o\b/i.test(content) ||
    /\b(?:[a-z]\s){4,}[a-z]\b/i.test(content)
  );
}

function getSenderDomain(senderEmail: string): string | null {
  const trimmed = senderEmail.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return null;
  }

  return trimmed.split("@").at(-1) ?? null;
}

function hasSuspiciousDomainShape(domain: string): boolean {
  const digitCount = (domain.match(/\d/g) ?? []).length;
  const hyphenCount = (domain.match(/-/g) ?? []).length;

  return digitCount >= 4 || hyphenCount >= 3;
}

function looksLikeBrandImpersonation(domain: string): boolean {
  return IMPERSONATED_BRANDS.some((brand) => {
    const domainMentionsBrand = domain.includes(brand.name.toLowerCase());
    const isOfficialDomain = brand.domains.some(
      (officialDomain) => domain === officialDomain || domain.endsWith(`.${officialDomain}`),
    );

    return domainMentionsBrand && !isOfficialDomain;
  });
}

function getDomain(link: string): string | null {
  try {
    return new URL(link).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) {
    return "high";
  }

  if (score >= 35) {
    return "medium";
  }

  return "low";
}

function getRecommendedAction(level: RiskLevel): string {
  if (level === "high") {
    return "Do not click links or reply. Verify the request through a trusted channel first.";
  }

  if (level === "medium") {
    return "Proceed carefully. Confirm the sender and open links only after checking the destination.";
  }

  return "No major warning signs were found, but continue using normal caution.";
}

function getExplanation(level: RiskLevel, signalCount: number, linkCount: number): string {
  if (level === "high") {
    return `This message matches several common phishing or spam patterns, including ${signalCount} suspicious signal${signalCount === 1 ? "" : "s"} and ${linkCount} detected link${linkCount === 1 ? "" : "s"}.`;
  }

  if (level === "medium") {
    return `This message has some warning signs worth reviewing before taking action. ${linkCount > 0 ? "Pay special attention to the link destination." : "The text itself carries most of the risk."}`;
  }

  return "This message does not strongly match the basic phishing or spam patterns checked in this prototype.";
}
