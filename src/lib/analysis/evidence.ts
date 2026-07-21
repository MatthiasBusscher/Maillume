import { getDomain } from "tldts";

import type {
  AnalysisLocale,
  AssessmentClassification,
  EmailAnalysisResult,
  EvidenceFamily,
  RiskLevel,
} from "../types";

export const EVIDENCE_IDS = [
  "urgency_pressure",
  "credential_request",
  "payment_request",
  "changed_payment_details",
  "attachment_lure",
  "brand_mention",
  "prize_promotion",
  "account_threat",
  "fake_security",
  "link_call_to_action",
  "unsolicited_sales",
  "investment_pitch",
  "high_risk_spam",
  "generic_greeting",
  "external_link",
  "short_url",
  "risky_link_domain",
  "link_mismatch",
  "format_pressure",
  "obfuscation",
  "invalid_sender",
  "risky_sender_domain",
  "suspicious_sender_shape",
  "hosted_sender_domain",
  "sender_destination_mismatch",
  "unexpected_conversation",
  "brand_lookalike_sender",
  "little_context",
  "executive_impersonation",
  "payroll_or_tax_request",
  "mfa_or_oauth_request",
  "qr_lure",
  "callback_lure",
  "delivery_lure",
] as const;

export type EvidenceId = (typeof EVIDENCE_IDS)[number];

type EvidenceDefinition = {
  family: EvidenceFamily;
  contribution: 4 | 5 | 10 | 20 | 25 | 30;
  label: Record<AnalysisLocale, string>;
  spam?: boolean;
  phishing?: boolean;
};

const EVIDENCE: Record<EvidenceId, EvidenceDefinition> = {
  urgency_pressure: evidence("intent", 10, "Creates pressure to act quickly.", "Zet aan om snel te handelen.", true),
  credential_request: evidence("intent", 20, "Requests credentials or identity verification.", "Vraagt om inloggegevens of identiteitsverificatie.", true),
  payment_request: evidence("intent", 20, "Requests or pressures a payment or transfer.", "Vraagt om of dringt aan op een betaling of overschrijving.", true),
  changed_payment_details: evidence("intent", 30, "Changes trusted payment or bank details.", "Wijzigt vertrouwde betaal- of bankgegevens.", true),
  attachment_lure: evidence("delivery", 10, "Uses an attachment or document as a lure.", "Gebruikt een bijlage of document als lokaas.", true),
  brand_mention: evidence("identity", 4, "References a familiar brand or authority.", "Verwijst naar een bekend merk of een bekende instantie."),
  prize_promotion: spamEvidence("intent", 30, "Uses prize, giveaway, or promotional language.", "Gebruikt taal over prijzen, winacties of aanbiedingen."),
  account_threat: evidence("intent", 20, "Threatens account blocking or subscription expiry.", "Dreigt met accountblokkering of het verlopen van een abonnement.", true),
  fake_security: evidence("identity", 20, "Uses suspicious security or antivirus subscription claims.", "Gebruikt verdachte claims over beveiliging of antivirusabonnementen.", true),
  link_call_to_action: evidence("destination", 10, "Pushes the recipient toward a link or button.", "Stuurt de ontvanger naar een link of knop.", true),
  unsolicited_sales: spamEvidence("intent", 30, "Looks like unsolicited sales or lead-generation outreach.", "Lijkt op ongevraagde verkoop- of acquisitiemail."),
  investment_pitch: spamEvidence("intent", 30, "Contains a high-return investment or loan pitch.", "Bevat een aanbod voor hoge beleggingsopbrengsten of een lening."),
  high_risk_spam: spamEvidence("intent", 30, "Contains common high-risk spam topics.", "Bevat onderwerpen die vaak in risicovolle spam voorkomen."),
  generic_greeting: evidence("style", 4, "Uses a generic greeting.", "Gebruikt een algemene aanhef."),
  external_link: evidence("destination", 5, "Contains an external link.", "Bevat een externe link."),
  short_url: evidence("destination", 10, "Uses a shortened URL that hides the destination.", "Gebruikt een verkorte URL die de bestemming verbergt.", true),
  risky_link_domain: evidence("destination", 10, "Uses a link domain pattern often abused in campaigns.", "Gebruikt een linkdomein dat vaak in campagnes wordt misbruikt.", true),
  link_mismatch: evidence("destination", 30, "Displays one domain but links to another.", "Toont één domein maar linkt naar een ander domein.", true),
  format_pressure: evidence("style", 4, "Uses excessive capitalization or punctuation.", "Gebruikt overmatig hoofdletters of leestekens."),
  obfuscation: evidence("style", 10, "Obfuscates words to evade filtering.", "Verhult woorden om filtering te ontwijken.", true),
  invalid_sender: evidence("identity", 20, "The sender address is invalid or incomplete.", "Het afzenderadres is ongeldig of onvolledig.", true),
  risky_sender_domain: evidence("identity", 10, "The sender uses a frequently abused top-level domain.", "De afzender gebruikt een vaak misbruikt topleveldomein.", true),
  suspicious_sender_shape: evidence("identity", 4, "The sender domain has an unusual shape.", "Het afzenderdomein heeft een ongebruikelijke vorm."),
  hosted_sender_domain: evidence("identity", 10, "The sender uses an unusual app-hosting subdomain.", "De afzender gebruikt een ongebruikelijk subdomein van een apphostingdienst.", true),
  sender_destination_mismatch: evidence("destination", 10, "A hosted sender points to an unrelated destination domain.", "Een gehost afzenderdomein verwijst naar een niet-gerelateerd bestemmingsdomein.", true),
  unexpected_conversation: evidence("identity", 10, "Claims you replied to or joined an existing support conversation.", "Beweert dat u hebt gereageerd op of bent toegevoegd aan een bestaand supportgesprek."),
  brand_lookalike_sender: evidence("identity", 25, "The sender appears to imitate a known brand domain.", "De afzender lijkt een bekend merkdomein na te bootsen.", true),
  little_context: evidence("style", 4, "The message provides very little context.", "Het bericht bevat erg weinig context."),
  executive_impersonation: evidence("identity", 20, "Claims to be an executive or internal authority.", "Doet zich voor als leidinggevende of interne autoriteit.", true),
  payroll_or_tax_request: evidence("intent", 20, "Requests payroll, tax, or employee-account changes.", "Vraagt om wijzigingen in salaris-, belasting- of personeelsgegevens.", true),
  mfa_or_oauth_request: evidence("intent", 20, "Requests an unexpected MFA or application approval.", "Vraagt om een onverwachte MFA- of applicatiegoedkeuring.", true),
  qr_lure: evidence("delivery", 10, "Directs the recipient to scan a QR code.", "Stuurt de ontvanger naar een QR-code.", true),
  callback_lure: evidence("delivery", 10, "Pushes the recipient to call an unverified number.", "Stuurt de ontvanger naar een onbevestigd telefoonnummer.", true),
  delivery_lure: evidence("delivery", 20, "Combines a delivery problem with a fee and return pressure.", "Combineert een bezorgprobleem met kosten en druk rond terugzending.", true),
};

const FAMILY_CAPS: Record<EvidenceFamily, number> = {
  identity: 25,
  destination: 30,
  intent: 50,
  delivery: 20,
  style: 10,
};

export function buildAnalysisResult(
  evidenceIds: Iterable<EvidenceId>,
  detectedLinks: string[],
  locale: AnalysisLocale,
  options: { incompleteEvidence?: boolean } = {},
): EmailAnalysisResult {
  const unique = Array.from(new Set(evidenceIds));
  const familyScores: Record<EvidenceFamily, number> = {
    identity: 0,
    destination: 0,
    intent: 0,
    delivery: 0,
    style: 0,
  };
  let remainingTotal = 100;

  const scoreFactors = unique
    .sort((left, right) => {
      const spamPriority: Partial<Record<EvidenceId, number>> = {
        high_risk_spam: 3,
        investment_pitch: 2,
        unsolicited_sales: 2,
        prize_promotion: 1,
      };
      const priority = (id: EvidenceId) => EVIDENCE[id].phishing
        ? 200
        : EVIDENCE[id].spam
          ? 100 + (spamPriority[id] ?? 0)
          : 0;
      return priority(right) - priority(left)
        || EVIDENCE[right].contribution - EVIDENCE[left].contribution;
    })
    .flatMap((id) => {
      const definition = EVIDENCE[id];
      const familyRemaining = FAMILY_CAPS[definition.family] - familyScores[definition.family];
      const contribution = Math.min(definition.contribution, familyRemaining, remainingTotal);

      if (contribution <= 0) return [];

      familyScores[definition.family] += contribution;
      remainingTotal -= contribution;
      return [{ id, family: definition.family, contribution, label: definition.label[locale] }];
    });

  const riskScore = scoreFactors.reduce((total, factor) => total + factor.contribution, 0);
  const riskLevel = getRiskLevel(unique, riskScore, familyScores);
  const classification = getClassification(
    unique,
    riskLevel,
    riskScore,
    options.incompleteEvidence ?? false,
  );

  return {
    classification,
    risk_level: riskLevel,
    risk_score: riskScore,
    score_factors: scoreFactors,
    suspicious_signals: scoreFactors.map((factor) => factor.label),
    detected_links: normalizeLinks(detectedLinks),
    recommended_action: getRecommendedAction(classification, riskLevel, locale),
    short_explanation: getExplanation(classification, riskLevel, scoreFactors.length, locale),
  };
}

export function isEvidenceId(value: unknown): value is EvidenceId {
  return typeof value === "string" && (EVIDENCE_IDS as readonly string[]).includes(value);
}

export function getRegistrableDomain(value: string): string | null {
  try {
    const hostname = value.includes("://") ? new URL(value).hostname : value;
    return getDomain(hostname, { allowPrivateDomains: true }) ?? hostname.toLowerCase();
  } catch {
    return null;
  }
}

function evidence(
  family: EvidenceFamily,
  contribution: EvidenceDefinition["contribution"],
  en: string,
  nl: string,
  phishing = false,
): EvidenceDefinition {
  return { family, contribution, label: { en, nl }, phishing };
}

function spamEvidence(
  family: EvidenceFamily,
  contribution: EvidenceDefinition["contribution"],
  en: string,
  nl: string,
): EvidenceDefinition {
  return { family, contribution, label: { en, nl }, spam: true };
}

function getRiskLevel(
  ids: EvidenceId[],
  score: number,
  familyScores: Record<EvidenceFamily, number>,
): RiskLevel {
  const representedFamilies = Object.values(familyScores).filter((value) => value > 0).length;
  const strongFamilies = Object.values(familyScores).filter((value) => value >= 15).length;
  const hasStrongEvidence = ids.some((id) => EVIDENCE[id].contribution >= 20);

  if (score >= 50 && hasDecisiveEvidenceChain(ids)) return "high";
  if (score >= 70 && strongFamilies >= 2) return "high";
  if (hasStrongEvidence && score >= 30) return "medium";
  if (hasStrongEvidence && representedFamilies >= 2 && score >= 25) return "medium";
  if (score >= 35) return "medium";
  return "low";
}

function hasDecisiveEvidenceChain(ids: EvidenceId[]): boolean {
  const found = new Set(ids);
  const has = (...required: EvidenceId[]) => required.every((id) => found.has(id));

  return has("account_threat", "credential_request", "urgency_pressure")
    || has("changed_payment_details", "payment_request")
    || has("mfa_or_oauth_request", "urgency_pressure")
    || has("executive_impersonation", "payment_request")
    || has("fake_security", "account_threat", "payment_request")
    || has("prize_promotion", "payment_request", "urgency_pressure");
}

function getClassification(
  ids: EvidenceId[],
  level: RiskLevel,
  score: number,
  incompleteEvidence: boolean,
): AssessmentClassification {
  const definitions = ids.map((id) => EVIDENCE[id]);
  const phishingEvidence = definitions.some((definition) => definition.phishing);
  const spamEvidenceFound = definitions.some((definition) => definition.spam);
  const phishingSpecificEvidence = ids.some((id) => PHISHING_SPECIFIC_EVIDENCE.has(id));

  if (spamEvidenceFound && !phishingSpecificEvidence) return "likely_spam";
  if (level === "high" || (phishingEvidence && score >= 35) || (phishingSpecificEvidence && score >= 30)) return "likely_phishing";
  if (level === "low" && score === 0 && !incompleteEvidence) return "likely_legitimate";
  return "uncertain";
}

const PHISHING_SPECIFIC_EVIDENCE = new Set<EvidenceId>([
  "credential_request",
  "payment_request",
  "changed_payment_details",
  "account_threat",
  "fake_security",
  "link_mismatch",
  "brand_lookalike_sender",
  "executive_impersonation",
  "payroll_or_tax_request",
  "mfa_or_oauth_request",
  "qr_lure",
  "callback_lure",
  "delivery_lure",
]);

function getRecommendedAction(
  classification: AssessmentClassification,
  level: RiskLevel,
  locale: AnalysisLocale,
): string {
  if (locale === "nl") {
    if (classification === "likely_spam") return "Reageer niet en meld of verwijder het bericht als ongewenste e-mail.";
    if (level === "high") return "Klik niet, antwoord niet en controleer de afzender via een bekend, onafhankelijk kanaal.";
    if (level === "medium") return "Controleer de afzender en bestemming via bekende contactgegevens voordat u handelt.";
    if (classification === "uncertain") return "Er ontbreekt informatie voor een sterke conclusie. Controleer onverwachte verzoeken via een bekend, onafhankelijk kanaal.";
    return "Er zijn weinig waarschuwingstekens gevonden. Controleer onverwachte verzoeken nog steeds via een bekend kanaal.";
  }

  if (classification === "likely_spam") return "Do not reply; report or delete the message as unwanted email.";
  if (level === "high") return "Do not click or reply. Verify the sender through a known, independent channel.";
  if (level === "medium") return "Verify the sender and destination using trusted contact details before acting.";
  if (classification === "uncertain") return "Some evidence is unavailable, so no strong conclusion is possible. Verify unexpected requests through a known, independent channel.";
  return "Few warning signs were found. Still verify unexpected requests through a trusted channel.";
}

function getExplanation(
  classification: AssessmentClassification,
  level: RiskLevel,
  factorCount: number,
  locale: AnalysisLocale,
): string {
  const classLabels: Record<AnalysisLocale, Record<AssessmentClassification, string>> = {
    en: {
      likely_phishing: "likely phishing or fraud",
      likely_spam: "likely spam",
      likely_legitimate: "likely legitimate",
      uncertain: "uncertain",
    },
    nl: {
      likely_phishing: "waarschijnlijk phishing of fraude",
      likely_spam: "waarschijnlijk spam",
      likely_legitimate: "waarschijnlijk legitiem",
      uncertain: "onzeker",
    },
  };

  if (locale === "nl") {
    return `De risicoscore is een index op basis van ${factorCount} gewogen ${factorCount === 1 ? "signaal" : "signalen"}. De uitkomst is ${classLabels.nl[classification]} met risiconiveau ${level === "low" ? "laag" : level === "medium" ? "gemiddeld" : "hoog"}; het is geen waarschijnlijkheid.`;
  }

  return `The risk score is an index based on ${factorCount} weighted signal${factorCount === 1 ? "" : "s"}. The result is ${classLabels.en[classification]} with ${level} risk; it is not a probability.`;
}

function normalizeLinks(links: string[]): string[] {
  return Array.from(new Set(links.filter((link) => /^https?:\/\//i.test(link)))).slice(0, 20);
}
