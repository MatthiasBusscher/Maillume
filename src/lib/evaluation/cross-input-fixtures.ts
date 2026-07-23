import type { AnalysisLocale, EmailAnalysisInput, EmailLinkPair } from "../types";

export type CrossInputFixture = {
  id: string;
  expected: "phishing" | "legitimate";
  locale: AnalysisLocale;
  subject: string;
  senderEmail: string;
  body: string;
  linkPair?: EmailLinkPair;
  emlVariant?: "unterminated_multipart";
};

export const CROSS_INPUT_FIXTURES: CrossInputFixture[] = [
  {
    id: "en-credentials",
    expected: "phishing",
    locale: "en",
    subject: "Final account warning",
    senderEmail: "security@notice.example.test",
    body: "Your mailbox has been suspended. Verify your password immediately to restore access before midnight.",
  },
  {
    id: "en-payment-change",
    expected: "phishing",
    locale: "en",
    subject: "Updated invoice payment details",
    senderEmail: "billing@vendor.example.test",
    body: "Use our new bank account for the overdue invoice. Ignore the account shown on the original invoice and transfer today.",
  },
  {
    id: "en-delivery",
    expected: "phishing",
    locale: "en",
    subject: "Parcel delivery failed",
    senderEmail: "tracking@parcel.example.test",
    body: "Your parcel could not be delivered. Pay the redelivery fee immediately to prevent the shipment from being returned.",
  },
  {
    id: "en-mfa-link-mismatch",
    expected: "phishing",
    locale: "en",
    subject: "Approve your sign-in",
    senderEmail: "identity@notice.example.test",
    body: "Approve the MFA request now or your account will be blocked. Open https://portal.example.test/security",
    linkPair: {
      displayedUrl: "https://portal.example.test/security",
      destinationUrl: "https://identity-review.invalid/approve",
    },
  },
  {
    id: "en-bec-bank-change",
    expected: "phishing",
    locale: "en",
    subject: "Confidential transfer update",
    senderEmail: "director@company-finance.example",
    body: "This is the CEO. Use our new bank account for the urgent transfer today. Keep this confidential and confirm when sent.",
  },
  {
    id: "en-security-callback",
    expected: "phishing",
    locale: "en",
    subject: "Antivirus renewal charge",
    senderEmail: "renewal@security-billing.invalid",
    body: "Your antivirus subscription payment failed. Call this number immediately to cancel the charge.",
  },
  {
    id: "en-malformed-eml",
    expected: "phishing",
    locale: "en",
    subject: "Mailbox verification required",
    senderEmail: "security@notice.example.test",
    body: "Your mailbox is blocked. Verify your password immediately to restore access.",
    emlVariant: "unterminated_multipart",
  },
  {
    id: "en-promotion",
    expected: "legitimate",
    locale: "en",
    subject: "Subscriber renewal offer",
    senderEmail: "offers@newsletter.example.test",
    body: "You subscribed to these offers. Claim a 75% renewal discount before midnight and manage subscription preferences at any time.",
  },
  {
    id: "en-legitimate-invoice",
    expected: "legitimate",
    locale: "en",
    subject: "Invoice review meeting",
    senderEmail: "finance@partner.example.test",
    body: "The invoice review remains scheduled for Thursday. No payment details changed and no action is required before the meeting.",
  },
  {
    id: "nl-inloggegevens",
    expected: "phishing",
    locale: "nl",
    subject: "Laatste accountwaarschuwing",
    senderEmail: "beveiliging@melding.example.test",
    body: "Uw mailbox is geblokkeerd. Bevestig direct uw wachtwoord om voor middernacht weer toegang te krijgen.",
  },
  {
    id: "nl-betaalwijziging",
    expected: "phishing",
    locale: "nl",
    subject: "Gewijzigde betaalgegevens factuur",
    senderEmail: "facturen@leverancier.example.test",
    body: "Gebruik onze nieuwe bankrekening voor de openstaande factuur. Negeer de rekening op de originele factuur en maak vandaag over.",
  },
  {
    id: "nl-bezorging",
    expected: "phishing",
    locale: "nl",
    subject: "Pakket kon niet worden bezorgd",
    senderEmail: "bezorging@pakket.example.test",
    body: "Uw pakket kon niet worden bezorgd. Betaal direct de kosten voor een nieuwe bezorgpoging om terugzending te voorkomen.",
  },
  {
    id: "nl-oauth-link-mismatch",
    expected: "phishing",
    locale: "nl",
    subject: "Koppel uw account opnieuw",
    senderEmail: "identiteit@melding.example.test",
    body: "Geef direct OAuth-toegang of uw account wordt geblokkeerd. Open https://portaal.example.test/beveiliging",
    linkPair: {
      displayedUrl: "https://portaal.example.test/beveiliging",
      destinationUrl: "https://account-controle.invalid/toegang",
    },
  },
  {
    id: "nl-bec-bankwijziging",
    expected: "phishing",
    locale: "nl",
    subject: "Vertrouwelijke wijziging overschrijving",
    senderEmail: "directeur@bedrijfs-finance.example",
    body: "Ik ben de directeur. Gebruik vandaag onze nieuwe bankrekening voor de dringende overschrijving. Houd dit vertrouwelijk en bevestig na verzending.",
  },
  {
    id: "nl-beveiligingscallback",
    expected: "phishing",
    locale: "nl",
    subject: "Afschrijving antivirusverlenging",
    senderEmail: "verlenging@security-billing.invalid",
    body: "De betaling voor uw antivirusabonnement is mislukt. Bel dit nummer direct om de afschrijving te annuleren.",
  },
  {
    id: "nl-beschadigde-eml",
    expected: "phishing",
    locale: "nl",
    subject: "Mailboxbevestiging vereist",
    senderEmail: "beveiliging@melding.example.test",
    body: "Uw mailbox is geblokkeerd. Bevestig direct uw wachtwoord om de toegang te herstellen.",
    emlVariant: "unterminated_multipart",
  },
  {
    id: "nl-aanbieding",
    expected: "legitimate",
    locale: "nl",
    subject: "Aanbieding voor abonnees",
    senderEmail: "aanbiedingen@nieuwsbrief.example.test",
    body: "U bent aangemeld voor deze aanbiedingen. Ontvang voor middernacht 75% verlengingskorting en beheer altijd uw abonnementsvoorkeuren.",
  },
  {
    id: "nl-legitieme-factuur",
    expected: "legitimate",
    locale: "nl",
    subject: "Bespreking van de factuur",
    senderEmail: "financien@partner.example.test",
    body: "De factuurbespreking blijft donderdag staan. Er zijn geen betaalgegevens gewijzigd en voor de bespreking is geen actie nodig.",
  },
];

export function toDirectInput(fixture: CrossInputFixture): EmailAnalysisInput {
  return {
    locale: fixture.locale,
    subject: fixture.subject,
    senderEmail: fixture.senderEmail,
    body: fixture.body,
  };
}

export function toOcrInput(fixture: CrossInputFixture): EmailAnalysisInput {
  return {
    locale: fixture.locale,
    body: fixture.body.replace(/\. /g, ".\r\n").replace(/ /g, "  "),
  };
}

export function toChromeInput(fixture: CrossInputFixture): EmailAnalysisInput {
  return {
    ...toDirectInput(fixture),
    ...(fixture.linkPair ? {
      links: [fixture.linkPair.destinationUrl],
      linkPairs: [fixture.linkPair],
    } : {}),
  };
}

export function toRawEml(fixture: CrossInputFixture): string {
  if (fixture.emlVariant === "unterminated_multipart") {
    return [
      `From: Synthetic sender <${fixture.senderEmail}>`,
      `Subject: ${fixture.subject}`,
      'Content-Type: multipart/alternative; boundary="synthetic-boundary"',
      "",
      "--synthetic-boundary",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      fixture.body,
    ].join("\n");
  }

  if (fixture.linkPair) {
    const bodyWithoutDisplayedUrl = fixture.body.replace(fixture.linkPair.displayedUrl, "").trim();
    return [
      `From: Synthetic sender <${fixture.senderEmail}>`,
      `Subject: ${fixture.subject}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      `<p>${bodyWithoutDisplayedUrl}</p>`,
      `<a href="${fixture.linkPair.destinationUrl}">${fixture.linkPair.displayedUrl}</a>`,
    ].join("\n");
  }

  return [
    `From: Synthetic sender <${fixture.senderEmail}>`,
    `Subject: ${fixture.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    fixture.body,
  ].join("\n");
}
