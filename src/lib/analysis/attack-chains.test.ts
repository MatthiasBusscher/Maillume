import assert from "node:assert/strict";

import {
  getMatchedAttackChains,
  type AttackChainId,
} from "./attack-chains";
import {
  analyzeEmailHeuristic,
  collectHeuristicEvidence,
} from "./heuristic-analysis";

type ChainRegression = {
  id: AttackChainId;
  positive: string;
  requiredFactors: string[];
  incomplete: string;
  negated: string;
  legitimate: string;
};

const regressions: ChainRegression[] = [
  {
    id: "executive_secret_payment",
    positive: "I am already in the board meeting. Buy six digital gift cards and send me the codes privately before anyone else is copied.",
    requiredFactors: [
      "executive_impersonation",
      "payment_request",
      "secrecy_pressure",
    ],
    incomplete: "I am already in the board meeting. Buy six digital gift cards for next month's planned client awards.",
    negated: "I am the CEO. Do not buy gift cards and do not keep any request secret; report it to Finance.",
    legitimate: "The board meeting is next week. The published client-awards budget will be reviewed with Finance.",
  },
  {
    id: "changed_payment_instruction",
    positive: "Gebruik voor de overnamekosten voortaan onze nieuwe bankrekening. Verwerk de betaling vandaag.",
    requiredFactors: ["changed_payment_details", "payment_request"],
    incomplete: "Onze bankmigratie introduceert een nieuwe bankrekening. Er is geen betaling of overschrijving nodig.",
    negated: "De bankrekening voor de factuur is ongewijzigd. Gebruik de bestaande leveranciersgegevens.",
    legitimate: "De gebruikelijke factuur is ontvangen en de betaling naar de bestaande rekening is afgerond.",
  },
  {
    id: "security_callback",
    positive: "Your cloud backup renewal for $629 has been processed. To dispute it before settlement, call 1-202-555-0100 now.",
    requiredFactors: ["fake_security", "callback_lure"],
    incomplete: "Your cloud backup renewal for $629 has been processed. Review the receipt in your signed-in account.",
    negated: "A fake cloud backup renewal may ask you to call a number. Do not call; use the official website.",
    legitimate: "Your requested backup plan renews next month under the current agreement. No action is required.",
  },
  {
    id: "oauth_shared_content",
    positive: "A photo album was shared with you. Grant Mail Viewer permission to read your profile and files before the album can open.",
    requiredFactors: ["mfa_or_oauth_request", "shared_document_lure"],
    incomplete: "Grant Mail Viewer permission to read your profile and files for the scheduled application test.",
    negated: "Never grant OAuth permission from a shared document. Open the expected folder through the official portal.",
    legitimate: "The shared project folder you requested is ready. Access was approved by the administrator and no action is required.",
  },
  {
    id: "mfa_repeated_approval",
    positive: "U ontvangt meerdere verificatiemeldingen. Kies telkens Goedkeuren zodat de servicedesk uw account kan overzetten.",
    requiredFactors: ["mfa_or_oauth_request", "repeated_approval_pressure"],
    incomplete: "Kies Goedkeuren voor de ene aanmelding die u zojuist zelf hebt gestart.",
    negated: "Keur meerdere onverwachte verificatiemeldingen nooit goed; meld ze bij de servicedesk.",
    legitimate: "De training legt uit dat meerdere onverwachte inlogmeldingen niet mogen worden goedgekeurd.",
  },
  {
    id: "qr_identity_threat",
    positive: "Scan the QR code to connect your payroll identity and keep your health benefits active.",
    requiredFactors: [
      "qr_lure",
      "identity_reverification",
      "account_threat",
    ],
    incomplete: "Scan the QR code to view the health-benefits guide for this year.",
    negated: "Do not scan the QR code to connect your identity. Your benefits remain active and no action is required.",
    legitimate: "The optional QR code on the office poster opens the benefits guide. No identity verification is required.",
  },
  {
    id: "delivery_fee_return",
    positive: "Uw zending blijft maximaal twee werkdagen in opslag. Voldoe € 1,84 om retourzending te voorkomen.",
    requiredFactors: ["delivery_lure", "payment_request"],
    incomplete: "Your parcel is held in storage. A fee applies and it will be returned in two days.",
    negated: "Your parcel was delivered. No payment or extra fee is required and it will not be returned.",
    legitimate: "Your order shipped today and is expected on Thursday. No payment or extra fee is required.",
  },
];

for (const regression of regressions) {
  const positiveEvidence = collectHeuristicEvidence({
    senderEmail: "notice@service.example",
    body: regression.positive,
  }).evidence;
  const positiveChains = getMatchedAttackChains(positiveEvidence);
  const positiveResult = analyzeEmailHeuristic({
    senderEmail: "notice@service.example",
    body: regression.positive,
  });

  assert.ok(
    positiveChains.includes(regression.id),
    `${regression.id}: positive case must match the chain; found ${positiveEvidence.join(", ")}`,
  );
  assert.equal(
    positiveResult.risk_level,
    "high",
    `${regression.id}: supported complete chain must be high risk`,
  );
  for (const factorId of regression.requiredFactors) {
    assert.ok(
      positiveResult.score_factors.some((factor) => factor.id === factorId),
      `${regression.id}: contributing factor ${factorId} must remain visible`,
    );
  }

  for (const [kind, body] of [
    ["incomplete", regression.incomplete],
    ["negated", regression.negated],
    ["legitimate", regression.legitimate],
  ] as const) {
    const evidence = collectHeuristicEvidence({
      senderEmail: "notice@service.example",
      body,
    }).evidence;
    const result = analyzeEmailHeuristic({
      senderEmail: "notice@service.example",
      body,
    });
    assert.equal(
      getMatchedAttackChains(evidence).includes(regression.id),
      false,
      `${regression.id}: ${kind} case must not match the chain`,
    );
    assert.notEqual(
      result.risk_level,
      "high",
      `${regression.id}: ${kind} case must not become high risk`,
    );
  }
}

console.log("Checked supported attack chains and incomplete, negated, and legitimate boundaries.");
