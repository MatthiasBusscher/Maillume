import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "./heuristic-analysis";
import { heuristicCalibrationFixtures } from "./heuristic-fixtures";

const CERTAINTY_PATTERN = /\b(100%|always|guaranteed|guarantee|definitely|certainly)\b/i;

for (const fixture of heuristicCalibrationFixtures) {
  const result = analyzeEmailHeuristic(fixture.input);
  const context = `${fixture.id} (${result.risk_score}, ${result.risk_level})`;

  assert.equal(
    result.risk_level,
    fixture.expectedRiskLevel,
    `${context}: expected risk level ${fixture.expectedRiskLevel}`,
  );

  if (fixture.category === "phishing" || fixture.category === "spam") {
    assert.notEqual(result.risk_level, "low", `${context}: suspicious fixture should not be low risk`);
  }

  if (fixture.category === "legitimate") {
    assert.notEqual(result.risk_level, "high", `${context}: legitimate fixture should not be high risk`);
  }

  if (fixture.minScore !== undefined) {
    assert.ok(result.risk_score >= fixture.minScore, `${context}: score below ${fixture.minScore}`);
  }

  if (fixture.maxScore !== undefined) {
    assert.ok(result.risk_score <= fixture.maxScore, `${context}: score above ${fixture.maxScore}`);
  }

  if (fixture.minSignals !== undefined) {
    assert.ok(
      result.suspicious_signals.length >= fixture.minSignals,
      `${context}: expected at least ${fixture.minSignals} suspicious signals`,
    );
  }

  for (const snippet of fixture.requiredSignalSnippets ?? []) {
    assert.ok(
      result.suspicious_signals.some((signal) =>
        signal.toLowerCase().includes(snippet.toLowerCase()),
      ),
      `${context}: missing signal containing "${snippet}"`,
    );
  }

  assert.ok(
    !CERTAINTY_PATTERN.test(`${result.short_explanation} ${result.recommended_action}`),
    `${context}: analyzer copy should avoid certainty claims`,
  );
}

const dutchResult = analyzeEmailHeuristic({
  locale: "nl",
  subject: "Laatste waarschuwing: account geblokkeerd",
  senderEmail: "beveiliging@mcafee-verlenging.click",
  body: "Uw abonnement verloopt vandaag. Klik hier en bevestig uw gegevens: https://mcafee-verlenging.click/login",
});
assert.notEqual(dutchResult.risk_level, "low", "Dutch suspicious sample should not be low risk");
assert.ok(dutchResult.suspicious_signals.some((signal) => /dringende|geblokkeerd|abonnement|afzenderdomein/.test(signal)), "Dutch analysis should localize suspicious signals");
assert.match(dutchResult.recommended_action, /Klik niet|voorzichtig/);
assert.doesNotMatch(dutchResult.short_explanation, /This message/);

const dutchRenewalFraud = analyzeEmailHeuristic({
  locale: "nl",
  subject: "We hebben je account geblokkeerd - laatste waarschuwing",
  senderEmail: "notice@zvcznitmo.example",
  body: [
    "Laatste systeempoging: niet betaald.",
    "Betaalmethode bijwerken.",
    "75% loyaliteitskorting.",
    "Om uw voortdurende beveiliging te garanderen, hebben we deze maand een korting van 75% toegepast.",
    "Voltooi uw verlenging voordat deze aanbieding om middernacht verloopt.",
  ].join(" "),
});
assert.notEqual(dutchRenewalFraud.risk_level, "low", "Coercive Dutch renewal fraud must not be low risk");
assert.ok(dutchRenewalFraud.risk_score >= 40, "Independent renewal-fraud evidence should remain visible in the score");
assert.ok(dutchRenewalFraud.score_factors.some((factor) => factor.family === "identity"));
assert.ok(dutchRenewalFraud.score_factors.some((factor) => factor.family === "intent"));

const strongSingleFamilySpam = analyzeEmailHeuristic({
  locale: "en",
  subject: "Exclusive renewal discount",
  body: "Claim your 75% renewal discount before midnight. This limited-time offer ends tonight.",
});
assert.equal(strongSingleFamilySpam.risk_level, "medium", "Strong promotional spam evidence may reach medium risk alone");
assert.equal(strongSingleFamilySpam.classification, "likely_spam");

const sameFamilyAttackChain = analyzeEmailHeuristic({
  subject: "Final notice: account locked",
  body: "Your account is blocked. Verify your password immediately to keep access. Failure to complete this account verification will prevent normal access.",
});
assert.equal(sameFamilyAttackChain.risk_level, "high", "A decisive attack chain must not depend on crossing family boundaries");
assert.ok(sameFamilyAttackChain.score_factors.every((factor) => factor.family === "intent"));

const weakSignalsRemainLow = analyzeEmailHeuristic({
  senderEmail: "newsletter@vendor.example",
  body: "Read the Microsoft product update at https://vendor.example/news.",
});
assert.equal(weakSignalsRemainLow.risk_level, "low", "A brand mention and ordinary link must remain low risk");

const supportTicketBackscatter = analyzeEmailHeuristic({
  subject: "Your reply has been received",
  senderEmail: "tickets@support-platform.example",
  body: "We received your recent reply to ticket 123. Reduce your heating costs with smarter controls. Visit our website for more details: https://support-platform.example/ticket/123",
});
assert.equal(supportTicketBackscatter.classification, "likely_spam");
assert.notEqual(supportTicketBackscatter.risk_level, "low", "Unexpected-ticket marketing must not be low risk");
assert.ok(supportTicketBackscatter.score_factors.some((factor) => factor.id === "unexpected_conversation"));

const hostedStorageLure = analyzeEmailHeuristic({
  subject: "Storage status update for your company account",
  senderEmail: "notice@random9host.firebaseapp.com",
  body: "Cloud storage is 95% used. Your company storage is nearing capacity. Upgrade now for only $9.99 / year to keep internal files and client data accessible. Offer expires soon. Secure company data: https://unrelated-storage.example/upgrade",
});
assert.equal(hostedStorageLure.risk_level, "high", "Hosted storage upgrade lure must be high risk");
assert.equal(hostedStorageLure.classification, "likely_phishing");
assert.ok(hostedStorageLure.score_factors.some((factor) => factor.id === "hosted_sender_domain"));
assert.ok(hostedStorageLure.score_factors.some((factor) => factor.id === "sender_destination_mismatch"));

const structuralUrlRegression = analyzeEmailHeuristic({
  senderEmail: "account@microsoft.example",
  body: "Review your own account activity at https://account.microsoft.com/security and download the requested archive from https://files.example/archive.zip.",
});
assert.ok(!structuralUrlRegression.score_factors.some((factor) => factor.id === "short_url"));
assert.ok(!structuralUrlRegression.score_factors.some((factor) => factor.id === "risky_link_domain"));

const brandSubstringRegression = analyzeEmailHeuristic({
  senderEmail: "orders@applecart.example",
  body: "Your Applecart order was delivered successfully. No action is required.",
});
assert.ok(!brandSubstringRegression.score_factors.some((factor) => factor.id === "brand_lookalike_sender"));

const redirectRegression = analyzeEmailHeuristic({
  senderEmail: "billing@vendor.example",
  body: '<a href="https://tracking.vendor.example/open">https://portal.vendor.example/invoice</a>',
});
assert.ok(!redirectRegression.score_factors.some((factor) => factor.id === "link_mismatch"));

const bareDomainMismatch = analyzeEmailHeuristic({
  senderEmail: "security@paypal.example",
  body: '<a href="https://credential-capture.example/login">paypal.com/security</a>',
});
assert.ok(
  bareDomainMismatch.score_factors.some((factor) => factor.id === "link_mismatch"),
  "Bare displayed domains must be compared with their link destination",
);

const mfaNegationBypass = analyzeEmailHeuristic({
  senderEmail: "security@account-notice.example",
  body: "Never approve an MFA login you did not request. Approve the MFA login request immediately to prevent suspension.",
});
assert.ok(
  mfaNegationBypass.score_factors.some((factor) => factor.id === "mfa_or_oauth_request"),
  "A warning sentence must not suppress an actionable MFA request elsewhere",
);

const changedPaymentDetails = analyzeEmailHeuristic({
  senderEmail: "director@company-finance.example",
  body: "This is the CEO. Use our new bank account for the urgent supplier transfer today.",
});
assert.notEqual(changedPaymentDetails.risk_level, "low");
assert.equal(changedPaymentDetails.classification, "likely_phishing");

const deliveryFeeLures = [
  analyzeEmailHeuristic({
    locale: "en",
    body: "Your parcel could not be delivered. Pay a 1.99 redelivery fee today to prevent return to sender.",
  }),
  analyzeEmailHeuristic({
    locale: "nl",
    body: "Uw pakket kon niet worden bezorgd. Betaal vandaag 1,99 bezorgkosten om terugzending te voorkomen.",
  }),
];
for (const result of deliveryFeeLures) {
  assert.notEqual(result.risk_level, "low", "A delivery-fee lure must not be low risk");
  assert.equal(result.classification, "likely_phishing");
  assert.ok(result.score_factors.some((factor) => factor.id === "delivery_lure"));
  assert.ok(result.score_factors.some((factor) => factor.id === "payment_request"));
}

const legitimateDeliveryUpdate = analyzeEmailHeuristic({
  senderEmail: "tracking@vendor.example",
  body: "Your confirmed order was delivered at 14:30. Track the receipt in your signed-in account. No payment is required.",
});
assert.ok(!legitimateDeliveryUpdate.score_factors.some((factor) => factor.id === "delivery_lure"));
assert.notEqual(legitimateDeliveryUpdate.risk_level, "high");

const oauthConsentLures = [
  analyzeEmailHeuristic({
    locale: "en",
    body: "Grant the application permission to read your Microsoft 365 files and continue to the shared document.",
  }),
  analyzeEmailHeuristic({
    locale: "nl",
    body: "Geef de applicatie toegang tot uw Microsoft 365-bestanden om het gedeelde document te openen.",
  }),
];
for (const result of oauthConsentLures) {
  assert.ok(result.score_factors.some((factor) => factor.id === "mfa_or_oauth_request"));
  assert.notEqual(result.risk_level, "low", "An unsolicited application-consent lure must not be low risk");
}

const hiddenUnicodeCredentialLures = [
  analyzeEmailHeuristic({
    locale: "en",
    body: "Your account is suspended. Verify your pass\u200bword immediately.",
  }),
  analyzeEmailHeuristic({
    locale: "nl",
    body: "Uw account is geblokkeerd. Bevestig uw wacht\u2060woord direct.",
  }),
];
for (const result of hiddenUnicodeCredentialLures) {
  assert.ok(result.score_factors.some((factor) => factor.id === "credential_request"));
  assert.notEqual(result.risk_level, "low", "Invisible separators must not hide credential requests");
}

const insufficientContext = analyzeEmailHeuristic({ body: "Can you take a look?" });
assert.equal(insufficientContext.risk_level, "low");
assert.equal(insufficientContext.classification, "uncertain");

const noWarningSignals = analyzeEmailHeuristic({
  senderEmail: "colleague@example.test",
  body: "Here are the meeting notes we discussed yesterday. The next project review remains scheduled for Thursday afternoon.",
});
assert.equal(noWarningSignals.risk_score, 0);
assert.equal(noWarningSignals.classification, "likely_legitimate");

for (const result of [dutchResult, dutchRenewalFraud, strongSingleFamilySpam, sameFamilyAttackChain, weakSignalsRemainLow, supportTicketBackscatter, hostedStorageLure, structuralUrlRegression, brandSubstringRegression, redirectRegression, changedPaymentDetails, ...deliveryFeeLures, legitimateDeliveryUpdate, ...oauthConsentLures, ...hiddenUnicodeCredentialLures, insufficientContext, noWarningSignals]) {
  assert.equal(
    result.score_factors.reduce((total, factor) => total + factor.contribution, 0),
    result.risk_score,
  );
}

console.log(`Checked ${heuristicCalibrationFixtures.length} heuristic calibration fixtures.`);
