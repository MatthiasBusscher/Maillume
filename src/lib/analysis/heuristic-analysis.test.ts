import assert from "node:assert/strict";

import {
  analyzeEmailHeuristic,
  collectHeuristicEvidence,
} from "./heuristic-analysis";
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

const ipLiteralCredentialDestination = analyzeEmailHeuristic({
  senderEmail: "preferences@workspace-review.invalid",
  body: "Enter your work password to keep the forwarding preference.",
  links: ["http://203.0.113.42/preferences"],
});
assert.ok(
  ipLiteralCredentialDestination.score_factors.some(
    (factor) => factor.id === "ip_literal_url",
  ),
);
assert.notEqual(ipLiteralCredentialDestination.risk_level, "low");

const nestedBrandRedirect = analyzeEmailHeuristic({
  senderEmail: "sharing@document-notice.invalid",
  body: "Verify your Microsoft account to open the document.",
  links: [
    "https://redirector.example/out?next=https%253A%252F%252Fmicros0ft-login.invalid%252Fsession",
  ],
});
assert.ok(
  collectHeuristicEvidence({
    senderEmail: "sharing@document-notice.invalid",
    body: "Verify your Microsoft account to open the document.",
    links: [
      "https://redirector.example/out?next=https%253A%252F%252Fmicros0ft-login.invalid%252Fsession",
    ],
  }).evidence.includes("nested_url"),
);
assert.ok(
  nestedBrandRedirect.score_factors.some(
    (factor) => factor.id === "brand_lookalike_destination",
  ),
);

const internationalizedDomainCaution = analyzeEmailHeuristic({
  senderEmail: "events@munich-club.example",
  body: "The international chapter schedule is available at https://münich.example/events.",
});
assert.ok(
  internationalizedDomainCaution.score_factors.some(
    (factor) => factor.id === "punycode_hostname",
  ),
);
assert.equal(internationalizedDomainCaution.risk_level, "low");

const atSignPathRegression = analyzeEmailHeuristic({
  senderEmail: "files@vendor.example",
  body: "The requested file is at https://files.vendor.example/team/alex@example/report.",
});
assert.ok(
  !atSignPathRegression.score_factors.some((factor) => factor.id === "url_userinfo"),
);

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

const unquotedHrefMismatch = analyzeEmailHeuristic({
  senderEmail: "security@vendor.example",
  body: '<a href=https://credential-capture.example/login>vendor.example/security</a>',
});
assert.ok(
  unquotedHrefMismatch.score_factors.some((factor) => factor.id === "link_mismatch"),
  "Valid unquoted href attributes must preserve displayed-link mismatch evidence",
);

const mfaNegationBypass = analyzeEmailHeuristic({
  senderEmail: "security@account-notice.example",
  body: "Never approve an MFA login you did not request. Approve the MFA login request immediately to prevent suspension.",
});
assert.ok(
  mfaNegationBypass.score_factors.some((factor) => factor.id === "mfa_or_oauth_request"),
  "A warning sentence must not suppress an actionable MFA request elsewhere",
);

const contextHardNegatives = [
  {
    id: "requested-password-reset",
    absentFactor: "credential_request",
    result: analyzeEmailHeuristic({
      subject: "Your requested password reset",
      senderEmail: "security@service.example",
      body: "You requested a password reset from your signed-in account. No action is needed and your password is unchanged.",
    }),
  },
  {
    id: "completed-wire-transfer",
    absentFactor: "payment_request",
    result: analyzeEmailHeuristic({
      senderEmail: "receipts@bank.example",
      body: "Your wire transfer was received and completed. This receipt confirms it was already processed.",
    }),
  },
  {
    id: "unchanged-bank-details",
    absentFactor: "changed_payment_details",
    result: analyzeEmailHeuristic({
      senderEmail: "billing@supplier.example",
      body: "Our unchanged bank details are already recorded in your supplier account.",
    }),
  },
  {
    id: "ordinary-subscription-renewal",
    absentFactor: "account_threat",
    result: analyzeEmailHeuristic({
      senderEmail: "accounts@service.example",
      body: "Your subscription renews next month under the current agreement. No action is required and the price is unchanged.",
    }),
  },
  {
    id: "subscribed-newsletter-promotion",
    absentFactor: "prize_promotion",
    result: analyzeEmailHeuristic({
      senderEmail: "newsletter@shop.example",
      body: "Thanks for subscribing to our weekly newsletter. Existing subscribers receive 10% discount; manage subscription preferences at any time.",
    }),
  },
  {
    id: "previously-discussed-attachment",
    absentFactor: "attachment_lure",
    result: analyzeEmailHeuristic({
      senderEmail: "colleague@company.example",
      body: "Open the attachment containing the report we discussed and approved during yesterday's meeting.",
    }),
  },
  {
    id: "in-person-identity-check",
    absentFactor: "identity_reverification",
    result: analyzeEmailHeuristic({
      senderEmail: "appointments@municipality.example",
      body: "At your appointment, bring your identity document so we can verify your identity in person at the office.",
    }),
  },
  {
    id: "published-support-number",
    absentFactor: "callback_lure",
    result: analyzeEmailHeuristic({
      senderEmail: "support@bank.example",
      body: "Call support at 020 123 4567 using the published number in the company directory or official website.",
    }),
  },
] as const;

for (const fixture of contextHardNegatives) {
  assert.ok(
    !fixture.result.score_factors.some(
      (factor) => factor.id === fixture.absentFactor,
    ),
    `${fixture.id}: routine context must suppress ${fixture.absentFactor}`,
  );
  assert.notEqual(
    fixture.result.risk_level,
    "high",
    `${fixture.id}: a routine message must not become high risk`,
  );
}

const mixedCredentialMessage = analyzeEmailHeuristic({
  senderEmail: "notice@account-review.invalid",
  body: "Never share a password with an unexpected caller. Enter your password in the attached account form now to avoid suspension.",
});
assert.ok(
  mixedCredentialMessage.score_factors.some(
    (factor) => factor.id === "credential_request",
  ),
  "Credential safety advice must not suppress a malicious instruction in another sentence",
);

const mixedPaymentMessage = analyzeEmailHeuristic({
  senderEmail: "billing@supplier-change.invalid",
  body: "Your previous wire transfer was received and completed. Transfer the outstanding invoice to our new bank account today.",
});
assert.ok(
  mixedPaymentMessage.score_factors.some(
    (factor) => factor.id === "payment_request",
  ),
  "A completed-payment notice must not suppress a new payment request elsewhere",
);
assert.ok(
  mixedPaymentMessage.score_factors.some(
    (factor) => factor.id === "changed_payment_details",
  ),
  "A completed-payment notice must not suppress changed bank details elsewhere",
);

const mixedCallbackMessage = analyzeEmailHeuristic({
  senderEmail: "alerts@payment-review.invalid",
  body: "For ordinary questions, use the number on our official website. Call this number now at 010 000 0000 to stop the payment.",
});
assert.ok(
  mixedCallbackMessage.score_factors.some(
    (factor) => factor.id === "callback_lure",
  ),
  "Official-directory advice must not suppress an unverified callback instruction elsewhere",
);

const contextPositiveRegressions = [
  {
    id: "Dutch identity-verification demand",
    factorIds: ["identity_reverification"],
    result: analyzeEmailHeuristic({
      locale: "nl",
      body: "Uw aangifte kan niet worden verwerkt totdat u uw BSN, geboortedatum en bankrekening bevestigt in het verificatievenster.",
      evidenceTruncated: true,
    }),
  },
  {
    id: "Dutch MFA-fatigue instruction",
    factorIds: ["mfa_or_oauth_request"],
    result: analyzeEmailHeuristic({
      locale: "nl",
      body: "U ontvangt enkele verificatiemeldingen door onze migratietest. Kies telkens Goedkeuren zodat de servicedesk uw account kan overzetten.",
    }),
  },
  {
    id: "Payroll attachment credential lure",
    factorIds: ["attachment_lure", "credential_request"],
    result: analyzeEmailHeuristic({
      body: "The payroll portal rejected your tax form. Open the attached form, enter your employee login and resubmit it today.",
      evidenceTruncated: true,
    }),
  },
] as const;

for (const fixture of contextPositiveRegressions) {
  for (const factorId of fixture.factorIds) {
    assert.ok(
      fixture.result.score_factors.some((factor) => factor.id === factorId),
      `${fixture.id}: expected ${factorId} evidence`,
    );
  }
  assert.ok(
    fixture.result.risk_score > 0,
    `${fixture.id}: an actionable attack instruction must retain visible evidence`,
  );
}

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

const quietSensitiveActionLures = [
  {
    id: "quiet work-account access confirmation",
    factorId: "credential_request",
    input: {
      body: "The committee archive is ready. Sign in with your work account to confirm that your access should remain enabled.",
      evidenceTruncated: true,
    },
  },
  {
    id: "broad reader consent",
    factorId: "mfa_or_oauth_request",
    input: {
      body: "Continue with your work account and allow the archive reader to view your files and mailbox before folders can be restored.",
      evidenceTruncated: true,
    },
  },
  {
    id: "Dutch sensitive-record refresh",
    factorId: "identity_reverification",
    input: {
      locale: "nl" as const,
      body: "Voor het jaarlijkse overzicht vragen wij u uw BSN, rekeningnummer en burgerlijke staat in het formulier bij te werken.",
      evidenceTruncated: true,
    },
  },
] as const;
for (const fixture of quietSensitiveActionLures) {
  const result = analyzeEmailHeuristic(fixture.input);
  assert.ok(
    result.score_factors.some((factor) => factor.id === fixture.factorId),
    `${fixture.id}: sensitive action must remain visible`,
  );
  assert.equal(result.classification, "likely_phishing", `${fixture.id}: must not be treated as benign`);
  assert.notEqual(result.risk_level, "low", `${fixture.id}: must not be low risk`);
}

const requestedResetConfirmation = analyzeEmailHeuristic({
  senderEmail: "accounts@volunteer-portal.example",
  body: "We received the password reset request you made from the volunteer portal. Finish only from the portal you already use; otherwise ignore this confirmation.",
});
assert.ok(
  !requestedResetConfirmation.score_factors.some((factor) => factor.id === "credential_request"),
  "A requested reset confirmation that directs the user to an established portal is not a credential request",
);
assert.equal(requestedResetConfirmation.risk_level, "low");

const specificCommercialSpam = [
  "We can sell a verified list of procurement managers for your next campaign. Ask for this month's pricing.",
  "Our remote bookkeepers will close your books for half the usual rate and include a free reconciliation.",
  "Start with profitable mining and receive a stable monthly crypto stream with installation help.",
  "Word lid van onze prijzenclub en maak kans op een vakantie of geldprijs. Schrijf u in voor het welkomstpakket.",
];
for (const body of specificCommercialSpam) {
  const result = analyzeEmailHeuristic({ body });
  assert.equal(result.classification, "likely_spam", "Specific unsolicited commercial offers must be identified as spam");
  assert.equal(result.risk_level, "medium", "Specific unsolicited commercial offers must be medium risk");
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

const credentialMentionHardNegatives = [
  analyzeEmailHeuristic({
    locale: "en",
    senderEmail: "security@service.example",
    body: "Your password was changed successfully. No action is needed. Review recent activity at https://security.service.example/activity.",
  }),
  analyzeEmailHeuristic({
    locale: "en",
    senderEmail: "training@company.example",
    body: "Never share your password or credentials with anyone. Read the security policy at https://intranet.company.example/security.",
  }),
  analyzeEmailHeuristic({
    locale: "nl",
    senderEmail: "beveiliging@dienst.example",
    body: "Uw wachtwoord is succesvol gewijzigd. U hoeft niets te doen. Bekijk recente activiteit via https://beveiliging.dienst.example/activiteit.",
  }),
  analyzeEmailHeuristic({
    locale: "nl",
    senderEmail: "training@bedrijf.example",
    body: "Deel uw wachtwoord of inloggegevens nooit met anderen. Lees het beveiligingsbeleid via https://intranet.bedrijf.example/beveiliging.",
  }),
];
for (const result of credentialMentionHardNegatives) {
  assert.ok(
    !result.score_factors.some((factor) => factor.id === "credential_request"),
    "A credential mention, confirmation, or safety warning is not a credential request",
  );
  assert.equal(result.risk_level, "low", "Routine credential notices with first-party links should stay low risk");
}

const uwvConfirmationWithoutButton = analyzeEmailHeuristic({
  locale: "nl",
  body: "Beste relatie, namens UWV vragen wij u vriendelijk om uw gegevens te controleren en te bevestigen om uw account veilig te houden.",
});
assert.notEqual(
  uwvConfirmationWithoutButton.risk_level,
  "low",
  "The core UWV verification wording must remain detectable when screenshot OCR misses the button",
);

const digitSubstitutionLookalikes = [
  analyzeEmailHeuristic({
    senderEmail: "security@paypa1-alert.example",
    body: "Verify your PayPal account immediately to keep access.",
  }),
  analyzeEmailHeuristic({
    senderEmail: "security@micros0ft-login.example",
    body: "Sign in here now to restore your Microsoft mailbox.",
  }),
];
for (const result of digitSubstitutionLookalikes) {
  assert.ok(
    result.score_factors.some((factor) => factor.id === "brand_lookalike_sender"),
    "Common digit substitutions in brand sender domains must be detected",
  );
  assert.notEqual(result.risk_level, "low");
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

const dangerousAttachment = analyzeEmailHeuristic({
  body: "Open the attachment immediately to review the document.",
  attachmentRiskTypes: ["executable", "double_extension"],
});
assert.equal(dangerousAttachment.classification, "likely_phishing");
assert.notEqual(dangerousAttachment.risk_level, "low");
assert.ok(dangerousAttachment.score_factors.some((factor) => factor.id === "dangerous_attachment"));

const macroOnlyAttachment = analyzeEmailHeuristic({
  senderEmail: "colleague@example.test",
  body: "Here are the quarterly notes we discussed during today's meeting.",
  attachmentRiskTypes: ["macro_enabled"],
});
assert.equal(macroOnlyAttachment.risk_level, "low");
assert.equal(macroOnlyAttachment.classification, "uncertain");

const maillumeFirstPartyMessages = [
  analyzeEmailHeuristic({
    senderEmail: "accounts@maillume.example",
    body: "Welcome to Maillume. Confirm this email address to activate your account and use protected account features. This link expires in 60 minutes. If you did not create an account, ignore this email.",
    links: ["https://app.maillume.example/auth/confirm"],
  }),
  analyzeEmailHeuristic({
    senderEmail: "accounts@maillume.example",
    body: "Use the button below to sign in to Maillume. No password required. This one-time link and code expire in 60 minutes. If you did not request this, ignore this email.",
    links: ["https://app.maillume.example/auth/magic"],
  }),
  analyzeEmailHeuristic({
    senderEmail: "accounts@maillume.example",
    body: "Someone requested a password reset for your Maillume account. Choose a new password using the button below. If you did not request a reset, your password is unchanged.",
    links: ["https://app.maillume.example/auth/recovery"],
  }),
];
for (const result of maillumeFirstPartyMessages) {
  assert.equal(result.risk_level, "low", "Maillume account mail must be scannable without being labelled spam");
  assert.notEqual(result.classification, "likely_spam");
  assert.notEqual(result.classification, "likely_phishing");
  assert.ok(!result.score_factors.some((factor) => factor.id === "external_link"));
}

for (const result of [dutchResult, dutchRenewalFraud, strongSingleFamilySpam, sameFamilyAttackChain, weakSignalsRemainLow, supportTicketBackscatter, hostedStorageLure, structuralUrlRegression, ipLiteralCredentialDestination, nestedBrandRedirect, internationalizedDomainCaution, atSignPathRegression, brandSubstringRegression, redirectRegression, bareDomainMismatch, unquotedHrefMismatch, mfaNegationBypass, ...contextHardNegatives.map((fixture) => fixture.result), mixedCredentialMessage, mixedPaymentMessage, mixedCallbackMessage, ...contextPositiveRegressions.map((fixture) => fixture.result), changedPaymentDetails, ...deliveryFeeLures, legitimateDeliveryUpdate, ...oauthConsentLures, ...hiddenUnicodeCredentialLures, ...credentialMentionHardNegatives, uwvConfirmationWithoutButton, ...digitSubstitutionLookalikes, insufficientContext, noWarningSignals, dangerousAttachment, macroOnlyAttachment, ...maillumeFirstPartyMessages]) {
  assert.equal(
    result.score_factors.reduce((total, factor) => total + factor.contribution, 0),
    result.risk_score,
  );
}

const authenticationBaseInput = {
  source: "eml" as const,
  senderEmail: "alerts@bank.test",
  subject: "Synthetic statement notice",
  body: "Your monthly statement is ready. Sign in to the bank portal when convenient to review it. This is synthetic test data used for regression checks.",
};

function authenticationFactorIds(emailAuthentication: Record<string, unknown>) {
  return analyzeEmailHeuristic({ ...authenticationBaseInput, emailAuthentication })
    .score_factors.map((factor) => factor.id);
}

// A passing result is never scored as reassurance, and never lowers the score.
const passingAuthentication = analyzeEmailHeuristic({
  ...authenticationBaseInput,
  emailAuthentication: { spf: "pass", dkim: "pass", dmarc: "pass" },
});
const withoutAuthentication = analyzeEmailHeuristic(authenticationBaseInput);
assert.equal(passingAuthentication.risk_score, withoutAuthentication.risk_score);
assert.ok(
  !passingAuthentication.score_factors.some((factor) => factor.id.startsWith("sender_authentication")),
  "a passing authentication result must not appear as evidence",
);

assert.ok(authenticationFactorIds({ dmarc: "fail" }).includes("sender_authentication_failed"));
assert.ok(authenticationFactorIds({ spf: "fail" }).includes("sender_authentication_failed"));

// Forwarded and mailing-list mail routinely fails SPF while DMARC still passes.
assert.deepEqual(
  authenticationFactorIds({ spf: "fail", dkim: "pass", dmarc: "pass" })
    .filter((id) => id.startsWith("sender_authentication")),
  [],
  "a DMARC pass explains a failed SPF check on forwarded mail",
);

assert.ok(authenticationFactorIds({ dkim: "fail" }).includes("sender_authentication_weak"));
assert.ok(authenticationFactorIds({ spf: "softfail" }).includes("sender_authentication_weak"));
assert.ok(
  !authenticationFactorIds({ dkim: "fail", dmarc: "pass" }).includes("sender_authentication_weak"),
);

// Business email compromise is usually sent from a domain that passes its own checks,
// so reply routing is reported independently of the authentication verdicts.
assert.ok(
  authenticationFactorIds({ dmarc: "pass", replyToMismatch: true }).includes("reply_to_mismatch"),
);
assert.ok(!authenticationFactorIds({ replyToMismatch: false }).includes("reply_to_mismatch"));

assert.ok(authenticationFactorIds({ returnPathMismatch: true }).includes("return_path_mismatch"));
assert.ok(
  !authenticationFactorIds({ returnPathMismatch: true, dmarc: "pass" }).includes("return_path_mismatch"),
);

// The strongest identity evidence survives the family cap.
const cappedIdentity = analyzeEmailHeuristic({
  ...authenticationBaseInput,
  emailAuthentication: { dmarc: "fail", replyToMismatch: true, returnPathMismatch: true },
});
assert.ok(cappedIdentity.score_factors.some((factor) => factor.id === "sender_authentication_failed"));
assert.equal(
  cappedIdentity.score_factors.reduce((total, factor) => total + factor.contribution, 0),
  cappedIdentity.risk_score,
);

// An authentication failure alone stays short of a phishing verdict.
assert.notEqual(
  analyzeEmailHeuristic({
    ...authenticationBaseInput,
    emailAuthentication: { dmarc: "fail" },
  }).classification,
  "likely_phishing",
);

console.log(`Checked ${heuristicCalibrationFixtures.length} heuristic calibration fixtures.`);
