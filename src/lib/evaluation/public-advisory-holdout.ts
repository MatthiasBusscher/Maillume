import type { EmailAnalysisInput } from "../types";

export type PublicAdvisoryHoldoutCase = {
  id: string;
  expected: "phishing" | "legitimate";
  input: EmailAnalysisInput;
  provenance:
    | { kind: "public_advisory"; url: string; publishedAt: string }
    | { kind: "product_template"; path: string };
};

const UWV_ADVISORY = {
  kind: "public_advisory" as const,
  url: "https://opgelicht.avrotros.nl/alerts/wees-gewaarschuwd-voor-deze-frauduleuze-uwv-mail-over-het-opnieuw-identificeren-van-je-account-20432",
  publishedAt: "2026-07-22",
};
const DIGID_EXPIRY_ADVISORY = {
  kind: "public_advisory" as const,
  url: "https://opgelicht.avrotros.nl/alerts/misleidende-digid-mail-let-op-uw-digid-verloopt-binnenkort-13091",
  publishedAt: "2024-06-13",
};
const DIGID_MFA_ADVISORY = {
  kind: "public_advisory" as const,
  url: "https://opgelicht.avrotros.nl/alerts/misleidende-digid-mail-over-extra-beveiligingsstap-13001",
  publishedAt: "2024-04-30",
};
const ICS_IDENTITY_ADVISORY = {
  kind: "public_advisory" as const,
  url: "https://opgelicht.avrotros.nl/alerts/frauduleuze-ics-mail-over-online-identificeren-met-referentienummer-12958",
  publishedAt: "2024-04-09",
};
const ICS_INBOX_ADVISORY = {
  kind: "public_advisory" as const,
  url: "https://opgelicht.avrotros.nl/alerts/artikel/creditcardhouders-pas-op-voor-deze-phishingmail-namens-ics/",
  publishedAt: "2024-08-27",
};

// Independently written, sanitized cases. This module is evaluation-only and is never imported by scoring code.
export const PUBLIC_ADVISORY_HOLDOUT: PublicAdvisoryHoldoutCase[] = [
  {
    id: "uwv-routine-reidentification",
    expected: "phishing",
    provenance: UWV_ADVISORY,
    input: {
      locale: "nl",
      subject: "Periodieke controle van uw account",
      senderEmail: "service@uwv-accountcontrole.invalid",
      body: "Beste relatie, voor regulier onderhoud moet u uw UWV-account opnieuw identificeren. Controleer en bevestig uw persoonsgegevens om toegang te behouden.",
      links: ["https://uwv-accountcontrole.invalid/identificatie"],
    },
  },
  {
    id: "uwv-privacy-policy-cover",
    expected: "phishing",
    provenance: UWV_ADVISORY,
    input: {
      locale: "nl",
      subject: "Wijziging privacyvoorwaarden",
      senderEmail: "privacy@uwv-gegevens.invalid",
      body: "UWV heeft het privacybeleid aangepast. Als onderdeel hiervan vragen wij u vriendelijk uw identiteit opnieuw te verifiëren via het accountformulier.",
      links: ["https://uwv-gegevens.invalid/formulier"],
    },
  },
  {
    id: "digid-expiry-threat",
    expected: "phishing",
    provenance: DIGID_EXPIRY_ADVISORY,
    input: {
      locale: "nl",
      subject: "Uw DigiD verloopt binnenkort",
      senderEmail: "melding@digid-vernieuwen.invalid",
      body: "Werk uw persoonlijke gegevens binnen 24 uur bij. Anders wordt uw DigiD-account definitief geblokkeerd. Klik hier om verder te gaan.",
      links: ["https://digid-vernieuwen.invalid/gegevens"],
    },
  },
  {
    id: "digid-extra-security-step",
    expected: "phishing",
    provenance: DIGID_MFA_ADVISORY,
    input: {
      locale: "nl",
      subject: "Verplichte extra beveiliging activeren",
      senderEmail: "beveiliging@digid-smscontrole.invalid",
      body: "Activeer zo snel mogelijk de verplichte extra sms-beveiliging voor uw DigiD. Gebruik de knop om de applicatie toegang te geven en de activatie af te ronden.",
      links: ["https://digid-smscontrole.invalid/activeren"],
    },
  },
  {
    id: "ics-reference-identification",
    expected: "phishing",
    provenance: ICS_IDENTITY_ADVISORY,
    input: {
      locale: "nl",
      subject: "Online identificatie nog niet afgerond",
      senderEmail: "identificatie@ics-kaartcontrole.invalid",
      body: "Beste ICS klant, identificeer uzelf online binnen 48 uur met referentie R4X29. Zonder identificatie kunt u onze creditcarddiensten niet langer gebruiken.",
      links: ["https://ics-kaartcontrole.invalid/online"],
    },
  },
  {
    id: "ics-unread-secure-message",
    expected: "phishing",
    provenance: ICS_INBOX_ADVISORY,
    input: {
      locale: "nl",
      subject: "Actie vereist voor ongelezen ICS-bericht",
      senderEmail: "berichtenbox@ics-onlinebericht.invalid",
      body: "Er staat een persoonlijk bericht voor u klaar in de beveiligde ICS-omgeving. Open direct het bericht in uw browser via de onderstaande link.",
      links: ["https://ics-onlinebericht.invalid/bericht"],
    },
  },
  {
    id: "digid-account-created-confirmation",
    expected: "legitimate",
    provenance: DIGID_MFA_ADVISORY,
    input: {
      locale: "nl",
      senderEmail: "noreply@digid.example",
      body: "Uw DigiD-account is aangevraagd. Dit automatische bericht bevestigt de wijziging. Open zelf digid.nl als u de aanvraag niet herkent; deze e-mail bevat geen link.",
    },
  },
  {
    id: "digid-app-activation-notice",
    expected: "legitimate",
    provenance: DIGID_MFA_ADVISORY,
    input: {
      locale: "nl",
      senderEmail: "noreply@digid.example",
      body: "De DigiD-app is succesvol geactiveerd. U hoeft niets te doen. Neem via de officiële website contact op als u deze wijziging niet zelf hebt uitgevoerd.",
    },
  },
  {
    id: "ics-monthly-statement-notice",
    expected: "legitimate",
    provenance: ICS_INBOX_ADVISORY,
    input: {
      locale: "nl",
      senderEmail: "statements@ics.example",
      body: "Uw maandelijkse kaartoverzicht staat klaar. Open de ICS-app of typ zelf het bekende webadres in uw browser. Wij vragen nooit om uw pincode of toegangscode.",
    },
  },
  {
    id: "uwv-appointment-confirmation",
    expected: "legitimate",
    provenance: UWV_ADVISORY,
    input: {
      locale: "nl",
      senderEmail: "afspraken@uwv.example",
      body: "Uw afspraak op dinsdag om 10:30 is bevestigd. Neem uw identiteitsbewijs mee naar de locatie. Er is online geen actie nodig.",
    },
  },
  {
    id: "maillume-confirmation-hard-negative",
    expected: "legitimate",
    provenance: { kind: "product_template", path: "supabase/templates/confirmation.html" },
    input: {
      locale: "en",
      senderEmail: "accounts@maillume.example",
      body: "Welcome to Maillume. Confirm this email address to activate the account you just created. If that was not you, ignore this message.",
      links: ["https://app.maillume.example/auth/confirm"],
    },
  },
  {
    id: "maillume-recovery-hard-negative",
    expected: "legitimate",
    provenance: { kind: "product_template", path: "supabase/templates/recovery.html" },
    input: {
      locale: "en",
      senderEmail: "accounts@maillume.example",
      body: "Someone requested a password reset for your Maillume account. Choose a new password with the button below. If you did not request a reset, your password is unchanged.",
      links: ["https://app.maillume.example/auth/recovery"],
    },
  },
];
