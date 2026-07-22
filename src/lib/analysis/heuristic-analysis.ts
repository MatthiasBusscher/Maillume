import type { AnalysisEnvelope, EmailAnalysisInput, EmailLinkPair } from "../types";
import { ensureAnalysisEnvelope } from "./analysis-envelope";
import {
  buildAnalysisResult,
  getRegistrableDomain,
  type EvidenceId,
} from "./evidence";

const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;
const HTML_LINK_PATTERN = /<a\b[^>]*\bhref\s*=\s*(?:"(https?:\/\/[^"\s>]+)"|'(https?:\/\/[^'\s>]+)'|(https?:\/\/[^\s"'=<>`]+))[^>]*>([\s\S]*?)<\/a>/gi;
const DISPLAYED_DOMAIN_PATTERN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:\/[^\s<>"']*)?/i;
const CREDENTIAL_REQUEST_PATTERNS = [
  /\b(?:enter|provide|submit|send|share|confirm|verify|update|re-?enter|type|reset|change)\b.{0,32}\b(?:password|credentials?|login details?|sign-in details?)\b/i,
  /\b(?:password|credentials?|login details?|sign-in details?)\b.{0,24}\b(?:required|needed|enter|provide|submit|confirm|verify|update|reset|change)\b/i,
  /verify (your )?(?:[a-z-]+ )?(account|identity)/i,
  /sign in (below|here|now)/i,
  /\b(?:voer|vul|verstrek|deel|stuur|bevestig|verifieer|controleer|wijzig|reset)\b.{0,32}\b(?:wachtwoord|inloggegevens)\b/i,
  /\b(?:wachtwoord|inloggegevens)\b.{0,24}\b(?:invoeren|invullen|verstrekken|delen|sturen|bevestigen|verifiëren|controleren|wijzigen|resetten|vereist|nodig)\b/i,
  /\b(?:gegevens|identiteit)\b.{0,48}\b(?:controleren.{0,24})?(?:bevestigen|verifiëren)\b/i,
  /identiteit bevestigen/i,
  /bevestig (?:direct )?(uw|je) (?:[a-z-]+)?(?:account|gegevens|identiteit)/i,
  /\bidentificeer (?:uzelf|jezelf)\b/i,
  /\bidentify yourself\b/i,
];
const CREDENTIAL_NEGATION_PATTERNS = [
  /\b(?:never|do not|don't|must not|should not)\b.{0,48}\b(?:enter|provide|submit|send|share|confirm|verify|update|re-?enter|type)\b.{0,32}\b(?:password|credentials?|login details?|sign-in details?)\b/i,
  /\b(?:enter|provide|submit|send|share|confirm|verify|update|re-?enter|type)\b.{0,32}\b(?:password|credentials?|login details?|sign-in details?)\b.{0,16}\b(?:never|not)\b/i,
  /\bno\b.{0,16}\b(?:password|credentials?|login details?|sign-in details?)\b.{0,16}\b(?:required|needed)\b/i,
  /\b(?:nooit|niet|mag niet)\b.{0,48}\b(?:voer|vul|verstrek|deel|stuur|bevestig|verifieer|controleer)\b.{0,32}\b(?:wachtwoord|inloggegevens)\b/i,
  /\b(?:voer|vul|verstrek|deel|stuur|bevestig|verifieer|controleer)\b.{0,32}\b(?:wachtwoord|inloggegevens)\b.{0,16}\b(?:nooit|niet)\b/i,
  /\bgeen\b.{0,16}\b(?:wachtwoord|inloggegevens)\b.{0,16}\b(?:vereist|nodig)\b/i,
];
const MFA_REQUEST_PATTERNS = [
  /approve (?:the )?(?:mfa|login|sign-in)(?: login)? (?:request|prompt)/i,
  /accept (this )?(app|oauth) (request|permission)/i,
  /keur (de )?(inlog|mfa).*(goed|verzoek)/i,
  /accepteer.*(app|oauth).*(toegang|verzoek)/i,
  /(?:grant|allow|authorize).{0,24}(?:app|application|oauth).{0,24}(?:access|permission)/i,
  /(?:app|application|oauth).{0,24}(?:access|permission).{0,24}(?:grant|allow|authorize|approve)/i,
  /(?:geef|verleen|sta toe|machtig).{0,24}(?:app|applicatie|oauth).{0,24}(?:toegang|machtiging|rechten)/i,
  /(?:app|applicatie|oauth).{0,24}(?:toegang|machtiging|rechten).{0,24}(?:geven|verlenen|toestaan|machtigen|goedkeuren)/i,
];
const MFA_NEGATION_PATTERN = /(?:never|do not|nooit|niet).{0,24}(?:approve|goedkeur|keur).{0,18}(?:mfa|login|inlog)/i;
const SHORT_LINK_DOMAINS = new Set(["bit.ly", "tinyurl.com", "t.co", "rebrand.ly", "is.gd", "ow.ly"]);
const RISKY_TLDS = new Set(["zip", "mov", "click", "top", "xyz", "ru"]);
const HOSTED_SENDER_DOMAINS = new Set(["firebaseapp.com", "web.app", "pages.dev", "netlify.app", "vercel.app"]);
const BRAND_DOMAINS: Record<string, string[]> = {
  amazon: ["amazon.com"],
  apple: ["apple.com"],
  belastingdienst: ["belastingdienst.nl"],
  dhl: ["dhl.com"],
  facebook: ["facebook.com", "meta.com"],
  fedex: ["fedex.com"],
  google: ["google.com"],
  ing: ["ing.nl"],
  ics: ["icsbusiness.nl", "icscards.nl"],
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

const PATTERN_GROUPS: Array<{ id: EvidenceId; patterns: RegExp[] }> = [
  {
    id: "urgency_pressure",
    patterns: [
      /\burgent\b/i, /immediately/i, /act now/i, /final notice/i, /today only/i,
      /(?:expires?|ends?) (?:today|tonight|at midnight)/i, /before midnight/i, /within \d{1,2} hours?/i,
      /laatste waarschuwing/i, /laatste kans/i, /bevestig direct/i,
      /direct (actie|handelen|bevestigen|annuleren)/i, /binnen \d{1,2} (uur|uren)/i,
      /(?:verloopt|eindigt) (?:vandaag|vanavond|om middernacht)/i, /voor middernacht/i,
      /offer expires soon/i, /upgrade now/i,
    ],
  },
  {
    id: "credential_request",
    patterns: CREDENTIAL_REQUEST_PATTERNS,
  },
  {
    id: "identity_reverification",
    patterns: [
      /\b(?:re-?identify|re-?identification|re-?verify|re-?verification)\b.{0,32}\b(?:your )?(?:account|identity|personal (?:details|information))\b/i,
      /\b(?:account|identity|personal (?:details|information))\b.{0,32}\b(?:re-?identify|re-?identification|re-?verify|re-?verification)\b/i,
      /\b(?:opnieuw\s+|her)(?:identificeren|identificatie|verifiëren|verificatie)\b/i,
      /\b(?:account|identiteit|persoonsgegevens)\b.{0,32}\b(?:opnieuw\s+|her)(?:identificeren|identificatie|verifiëren|verificatie)\b/i,
    ],
  },
  {
    id: "payment_request",
    patterns: [/wire transfer/i, /gift card/i, /payment (required|overdue|failed)/i, /invoice (overdue|unpaid)/i, /pay.{0,32}(?:redelivery|delivery|shipping) (?:fee|charge|cost)/i, /betaal(methode|gegevens)/i, /betaling.*(mislukt|vereist|achterstallig)/i, /betaal.{0,40}(?:kosten|toeslag).{0,24}(?:bezorg|lever)/i, /betaal.{0,40}(?:bezorg|lever|herbezorg).{0,20}(?:kosten|toeslag|tarief)/i, /niet betaald/i, /achterstallige factuur/i, /terugbetaling/i, /overschrijving/i, /incasso/i],
  },
  {
    id: "changed_payment_details",
    patterns: [/new (bank|payment) (account|details)/i, /changed? (our )?(bank|payment) details/i, /updated? (bank|payment) details/i, /nieuw(e)? (bankrekening|rekeningnummer|betaalgegevens)/i, /gewijzigd(e)? (bankrekening|rekeningnummer|betaalgegevens)/i],
  },
  {
    id: "attachment_lure",
    patterns: [/open (the )?attachment/i, /download (the )?(document|invoice|file)/i, /shared document/i, /docusign/i, /open de bijlage/i, /document (openen|downloaden|gedeeld)/i, /gedeeld(?:e)? document.{0,12}(?:openen|bekijken)/i],
  },
  {
    id: "prize_promotion",
    patterns: [
      /congratulations/i, /\bwinner\b/i, /claim (your )?(prize|reward|gift|bonus)/i,
      /exclusive offer/i, /limited[ -]time (?:offer|discount|deal)/i,
      /\b\d{1,2}% (?:off|discount|saving)s?\b/i, /loyalty discount/i, /renewal discount/i,
      /winnaar/i, /claim (uw|je) prijs/i, /loyaliteitskorting/i,
      /\b\d{1,2}% (?:korting|besparing)\b/i, /korting van \d{1,2}%/i,
      /(?:tijdelijke|speciale) aanbieding/i, /verlengingskorting/i,
      /offer expires soon/i, /only \$?\d+(?:[.,]\d{2})?\s*\/\s*(?:year|month)/i,
    ],
  },
  {
    id: "account_threat",
    patterns: [
      /account (?:is )?(blocked|locked|suspended|restricted|closed)/i,
      /account (?:will be|is going to be) (?:blocked|locked|suspended|restricted|closed)/i,
      /account.{0,24}(?:blocked|locked|suspended|restricted|closed|deleted)/i,
      /subscription.*(expires|expired|renew|blocked)/i, /complete (?:your )?renewal/i,
      /update (?:your )?payment method/i, /last (?:system|payment) attempt/i,
      /account (?:is )?(geblokkeerd|vergrendeld|opgeschort|beperkt|gesloten)/i,
      /account (?:wordt|zal worden) (?:geblokkeerd|vergrendeld|opgeschort|beperkt|gesloten)/i,
      /account.{0,24}(?:geblokkeerd|vergrendeld|opgeschort|beperkt|gesloten|verwijderd)/i,
      /(?:cannot|can no longer).{0,36}(?:use|access).{0,24}(?:services?|account)/i,
      /(?:niet langer|geen).{0,36}gebruik.{0,24}(?:diensten|account)/i,
      /abonnement.*(verloopt|verlopen|verleng)/i, /voltooi (?:uw|je) verlenging/i,
      /betaalmethode bijwerken/i, /laatste (?:systeem|betaal)poging/i,
      /(?:cloud )?storage.*(?:nearing|near|at) capacity/i, /storage.*\b(?:9[0-9]|100)% used\b/i,
      /opslag.*(?:bijna vol|capaciteit|9[0-9]% gebruikt)/i,
    ],
  },
  {
    id: "fake_security",
    patterns: [
      /antivirus subscription/i, /security (?:plan|subscription|protection).*(?:expired|renew|payment)/i,
      /internet security.*(expired|renew)/i, /virus protection.*expired/i,
      /antivirusabonnement/i, /beveiligingsabonnement/i, /voortdurende beveiliging/i,
      /virusbescherming.*verlopen/i, /beveiligingssoftware.*verleng/i,
    ],
  },
  {
    id: "link_call_to_action",
    patterns: [/click here/i, /open this link/i, /follow the link/i, /use the button/i, /upgrade now/i, /secure company data/i, /visit (?:our|the) website/i, /open.{0,32}message.{0,24}link/i, /klik hier/i, /open deze link/i, /gebruik de knop/i, /volg de link/i, /bezoek (?:onze|de) website/i, /open.{0,32}bericht.{0,24}link/i],
  },
  {
    id: "unsolicited_sales",
    patterns: [/rank (higher|on google)/i, /increase (your )?(traffic|sales|leads)/i, /reduce your .{0,30}(?:energy|heating) costs/i, /qualified leads/i, /guest post/i, /backlink/i, /marketing service/i, /onze seo-diensten/i, /meer (leads|websiteverkeer)/i, /(?:verlaag|bespaar).{0,35}(?:stook|energie)kosten/i],
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
    patterns: [/dear (customer|user|client|member|partner)/i, /hello friend/i, /beste (klant|gebruiker|abonnee|lid|relatie)/i, /geachte (klant|gebruiker|abonnee|lid|relatie)/i],
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
    patterns: MFA_REQUEST_PATTERNS,
  },
  {
    id: "qr_lure",
    patterns: [/scan (the )?qr( code)?/i, /qr-code scannen/i, /scan de qr/i],
  },
  {
    id: "callback_lure",
    patterns: [/call (us|this number|support) (now|immediately|to cancel)/i, /bel (ons|dit nummer|de helpdesk).*(direct|annuleren)/i],
  },
  {
    id: "unexpected_conversation",
    patterns: [/your reply has been received/i, /received your recent reply/i, /ticket that you have .* as (?:a )?cc/i, /uw reactie is ontvangen/i, /uw recente antwoord ontvangen/i],
  },
];

export function analyzeEmailHeuristic(input: EmailAnalysisInput | AnalysisEnvelope) {
  const envelope = ensureAnalysisEnvelope(input);
  const { evidence, links } = collectHeuristicEvidence(envelope);
  return buildAnalysisResult(evidence, links, envelope.locale, {
    incompleteEvidence: !envelope.availability.sender
      || !envelope.availability.linkDestinations
      || !envelope.availability.contentComplete,
  });
}

export function collectHeuristicEvidence(input: EmailAnalysisInput | AnalysisEnvelope) {
  const envelope = ensureAnalysisEnvelope(input);
  const locale = envelope.locale;
  const messageContent = [envelope.subject, envelope.body].filter(Boolean).join("\n");
  const evidence = new Set<EvidenceId>();

  for (const group of PATTERN_GROUPS) {
    const matches = group.id === "mfa_or_oauth_request"
      ? hasActionableMfaRequest(messageContent)
      : group.id === "credential_request"
        ? hasActionableCredentialRequest(messageContent)
        : group.patterns.some((pattern) => pattern.test(messageContent));
    if (matches) evidence.add(group.id);
  }
  if (evidence.has("identity_reverification")) evidence.delete("credential_request");
  if (hasDeliveryFeeLure(messageContent)) evidence.add("delivery_lure");
  if (/(?:you subscribed|opted in|subscription preferences|aangemeld voor|abonnementsvoorkeuren)/i.test(messageContent)) {
    evidence.delete("prize_promotion");
  }

  if (mentionsKnownBrand(messageContent)) evidence.add("brand_mention");
  if (hasExcessiveFormattingPressure(messageContent)) evidence.add("format_pressure");
  if (hasObfuscatedSpamWords(messageContent)) evidence.add("obfuscation");
  if (envelope.body.trim().length < 80) evidence.add("little_context");
  if (
    envelope.attachmentRiskTypes.includes("executable")
    || envelope.attachmentRiskTypes.includes("double_extension")
  ) evidence.add("dangerous_attachment");
  if (envelope.attachmentRiskTypes.includes("macro_enabled")) {
    evidence.add("macro_enabled_attachment");
  }

  const links = mergeHttpLinks(envelope.links, extractHttpLinks(messageContent));
  if (links.some(isShortUrl)) evidence.add("short_url");
  if (links.some(hasRiskyTld)) evidence.add("risky_link_domain");

  const linkPairs = [...extractHtmlLinkPairs(envelope.body), ...envelope.linkPairs];
  if (linkPairs.some(hasMismatchedLinkPair)) evidence.add("link_mismatch");

  if (envelope.senderEmail) addSenderEvidence(envelope.senderEmail, links, evidence);

  return { evidence: Array.from(evidence), links, locale };
}

export function extractHttpLinks(content: string): string[] {
  return Array.from(
    new Set(
      Array.from(content.matchAll(LINK_PATTERN), (match) => cleanLink(match[0])).filter(isValidHttpUrl),
    ),
  );
}

function mergeHttpLinks(...groups: string[][]): string[] {
  return Array.from(
    new Set(groups.flat().map(cleanLink).filter(isValidHttpUrl)),
  ).sort();
}

export function extractHtmlLinkPairs(content: string): EmailLinkPair[] {
  return Array.from(content.matchAll(HTML_LINK_PATTERN)).flatMap((match) => {
    const destinationUrl = match[1] ?? match[2] ?? match[3];
    const displayedText = stripHtml(match[4]);
    const fullUrl = displayedText.match(LINK_PATTERN)?.[0];
    const bareDomain = displayedText.match(DISPLAYED_DOMAIN_PATTERN)?.[0];
    const displayedUrl = fullUrl ?? (bareDomain ? `https://${bareDomain}` : undefined);
    if (!displayedUrl || !destinationUrl) return [];
    return [{ displayedUrl: cleanLink(displayedUrl), destinationUrl: cleanLink(destinationUrl) }];
  });
}

function hasActionableCredentialRequest(content: string): boolean {
  return content
    .split(/(?:[.!?]+\s+|\n+)/)
    .some((segment) =>
      CREDENTIAL_REQUEST_PATTERNS.some((pattern) => pattern.test(segment))
      && !CREDENTIAL_NEGATION_PATTERNS.some((pattern) => pattern.test(segment)),
    );
}

function hasActionableMfaRequest(content: string): boolean {
  return content
    .split(/(?:[.!?]+\s+|\n+)/)
    .some((segment) =>
      MFA_REQUEST_PATTERNS.some((pattern) => pattern.test(segment))
      && !MFA_NEGATION_PATTERN.test(segment),
    );
}

function hasDeliveryFeeLure(content: string): boolean {
  const deliveryProblem = /(?:parcel|package|shipment|delivery)[\s\S]{0,60}(?:could not be delivered|failed|held|on hold|returned|return to sender)|(?:could not be delivered|delivery failed)[\s\S]{0,60}(?:parcel|package|shipment)|(?:pakket|zending|bezorging|levering)[\s\S]{0,60}(?:niet bezorgd|kon niet worden bezorgd|mislukt|vastgehouden|teruggestuurd|retour)|(?:niet bezorgd|kon niet worden bezorgd)[\s\S]{0,60}(?:pakket|zending)/i.test(content);
  const feeRequest = /(?:pay|payment|fee|charge|cost|€|\$)|(?:betaal|betaling|kosten|toeslag|tarief)/i.test(content);
  const pressure = /(?:today|immediately|prevent|return(?:ed)? to sender|within \d{1,2} hours?)|(?:vandaag|direct|voorkom|terugzending|retour|binnen \d{1,2} (?:uur|uren))/i.test(content);
  return deliveryProblem && feeRequest && pressure;
}

function addSenderEvidence(sender: string, links: string[], evidence: Set<EvidenceId>) {
  const senderDomain = getSenderDomain(sender);
  if (!senderDomain) {
    evidence.add("invalid_sender");
    return;
  }

  const tld = senderDomain.split(".").at(-1)?.toLowerCase();
  if (tld && RISKY_TLDS.has(tld)) evidence.add("risky_sender_domain");
  if (hasSuspiciousDomainShape(senderDomain)) evidence.add("suspicious_sender_shape");
  if (looksLikeBrandImpersonation(senderDomain)) evidence.add("brand_lookalike_sender");

  const hostedBaseDomain = Array.from(HOSTED_SENDER_DOMAINS).find(
    (baseDomain) => senderDomain.endsWith(`.${baseDomain}`),
  );
  if (hostedBaseDomain) {
    evidence.add("hosted_sender_domain");
    if (links.some((link) => {
      const destination = getRegistrableDomain(link);
      return Boolean(destination && destination !== hostedBaseDomain && !destination.endsWith(`.${hostedBaseDomain}`));
    })) {
      evidence.add("sender_destination_mismatch");
    }
  }
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
  const registrableLabel = (getRegistrableDomain(domain) ?? domain).split(".")[0] ?? "";
  const hasConsonantRun = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(registrableLabel);
  return digits >= 4 || hyphens >= 3 || hasConsonantRun;
}

function looksLikeBrandImpersonation(senderDomain: string): boolean {
  const registrable = getRegistrableDomain(senderDomain);
  if (!registrable) return false;
  const tokens = registrable.split(/[^a-z0-9]+/i);

  return Object.entries(BRAND_DOMAINS).some(([brand, officialDomains]) =>
    tokens.some((token) => isBrandTokenLookalike(token, brand))
    && !officialDomains.includes(registrable),
  );
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
