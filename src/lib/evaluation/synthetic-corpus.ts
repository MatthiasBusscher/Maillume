import type { AnalysisLocale, EmailAnalysisInput } from "../types";

export type CorpusClassification = "phishing" | "spam" | "legitimate";
export type CorpusSplit = "development" | "locked";

export type SyntheticCorpusCase = {
  id: string;
  scenarioId: string;
  split: CorpusSplit;
  classification: CorpusClassification;
  locale: AnalysisLocale;
  input: EmailAnalysisInput;
};

type Scenario = {
  id: string;
  split: CorpusSplit;
  classification: CorpusClassification;
  en: Omit<EmailAnalysisInput, "locale">;
  nl: Omit<EmailAnalysisInput, "locale">;
};

const phishingScenarios: Scenario[] = [
  phishing("credential-lockout", "development",
    "Final notice: mailbox access", "security-alert@microsoft-login-support.invalid", "Dear customer, your Microsoft account is blocked. Verify your password immediately. Click here: https://bit.ly/mailbox-verify",
    "Laatste waarschuwing: mailboxtoegang", "security-alert@microsoft-login-support.invalid", "Geachte klant, uw Microsoft-account is geblokkeerd. Bevestig uw wachtwoord direct. Klik hier: https://bit.ly/mailbox-controleren"),
  phishing("bec-bank-change", "development",
    "Confidential transfer update", "director@company-finance.example", "This is the CEO. Use our new bank account for the urgent transfer today. Keep this confidential and confirm when sent.",
    "Vertrouwelijke wijziging overschrijving", "directeur@bedrijfs-finance.example", "Ik ben de directeur. Gebruik vandaag onze nieuwe bankrekening voor de dringende overschrijving. Houd dit vertrouwelijk en bevestig na verzending."),
  phishing("invoice-link-mismatch", "development",
    "Overdue PayPal invoice", "billing@paypal-account-review.invalid", "Dear customer, your invoice is overdue. Pay immediately at <a href=\"https://paypal-review.invalid/pay\">https://www.paypal.com/invoice</a>.",
    "Achterstallige PayPal-factuur", "facturatie@paypal-account-review.invalid", "Geachte klant, uw factuur is achterstallig. Betaal direct via <a href=\"https://paypal-review.invalid/betalen\">https://www.paypal.com/invoice</a>."),
  phishing("delivery-fee", "development",
    "PostNL delivery fee required", "parcel@postnl-tracking.invalid", "Your package is held. Payment is required today. Click here: https://bit.ly/postnl-fee",
    "PostNL bezorgkosten vereist", "pakket@postnl-tracking.invalid", "Uw pakket wordt vastgehouden. Betaling is vandaag vereist. Klik hier: https://bit.ly/postnl-kosten"),
  phishing("mfa-approval", "development",
    "Approve sign-in now", "admin@google-auth-support.invalid", "The IT administrator needs you to approve the MFA login request immediately. Click here to keep access: https://google-auth-support.invalid/approve",
    "Keur aanmelding direct goed", "beheer@google-auth-support.invalid", "De IT-beheerder vraagt u de MFA-inlogaanvraag direct goed te keuren. Klik hier om toegang te houden: https://google-auth-support.invalid/goedkeuren"),
  phishing("oauth-consent", "development",
    "Microsoft document access", "share@microsoft-document.invalid", "Accept this OAuth app permission immediately to open the shared document. Click here: https://microsoft-document.invalid/consent",
    "Toegang tot Microsoft-document", "delen@microsoft-document.invalid", "Accepteer direct de OAuth-app-toegang om het gedeelde document te openen. Klik hier: https://microsoft-document.invalid/toestemming"),
  phishing("qr-bank-login", "development",
    "Rabobank identity check", "security@rabobank-verify.invalid", "Your account is suspended. Scan the QR code, then verify your identity immediately at https://rabobank-verify.invalid/qr",
    "Rabobank identiteitscontrole", "beveiliging@rabobank-verify.invalid", "Uw account is opgeschort. Scan de QR-code en bevestig daarna direct uw identiteit via https://rabobank-verify.invalid/qr"),
  phishing("attachment-lure", "locked",
    "Shared payroll document", "hr@microsoft-files.invalid", "Open the attachment and verify your account immediately to view the payroll document. Click here: https://microsoft-files.invalid/document",
    "Gedeeld salarisdocument", "hr@microsoft-files.invalid", "Open de bijlage en bevestig direct uw account om het salarisdocument te bekijken. Klik hier: https://microsoft-files.invalid/document"),
  phishing("security-callback", "locked",
    "McAfee renewal charge", "renewal@mcafee-billing.invalid", "Dear customer, your antivirus subscription payment failed. Call this number immediately to cancel, or click here: https://mcafee-billing.invalid/cancel",
    "Afschrijving McAfee-verlenging", "verlenging@mcafee-billing.invalid", "Geachte klant, de betaling voor uw antivirusabonnement is mislukt. Bel dit nummer direct om te annuleren of klik hier: https://mcafee-billing.invalid/annuleren"),
  phishing("tax-portal", "locked",
    "Belastingdienst account action", "notice@belastingdienst-login.invalid", "Final notice: verify your tax account immediately. Click here: <a href=\"https://belastingdienst-login.invalid/verify\">https://belastingdienst.nl/inloggen</a>",
    "Actie vereist voor Belastingdienst-account", "melding@belastingdienst-login.invalid", "Laatste waarschuwing: bevestig direct uw belastingaccount. Klik hier: <a href=\"https://belastingdienst-login.invalid/controleren\">https://belastingdienst.nl/inloggen</a>"),
];

const spamScenarios: Scenario[] = [
  spam("seo-outreach", "development",
    "Increase your Google traffic", "sales@seo-growth.example", "Dear customer, our marketing service can increase your traffic with qualified leads and backlinks. See https://seo-growth.example/offer",
    "Meer verkeer via Google", "sales@seo-groei.example", "Geachte klant, onze SEO-diensten zorgen voor meer websiteverkeer, leads en backlinks. Bekijk https://seo-groei.example/aanbod"),
  spam("prize-promotion", "development",
    "You are our winner", "offers@rewards.example", "Dear customer, congratulations. Claim your prize in this limited time offer at https://rewards.example/claim",
    "U bent onze winnaar", "aanbiedingen@beloningen.example", "Geachte klant, gefeliciteerd. Claim uw prijs tijdens deze tijdelijke aanbieding via https://beloningen.example/claim"),
  spam("investment-pitch", "development",
    "Guaranteed crypto returns", "advisor@wealth.example", "Hello friend, this investment opportunity offers guaranteed returns and passive income. Visit https://wealth.example/start",
    "Gegarandeerd cryptorendement", "adviseur@vermogen.example", "Beste klant, deze beleggingskans biedt gegarandeerd rendement en passief inkomen. Bekijk https://vermogen.example/start"),
  spam("casino-offer", "locked",
    "Exclusive casino bonus", "bonus@games.example", "Dear customer, claim your casino bonus and betting reward at https://games.example/bonus",
    "Exclusieve casinobonus", "bonus@spellen.example", "Geachte klant, claim uw casinobonus en gokbeloning via https://spellen.example/bonus"),
  spam("weight-loss-offer", "locked",
    "Limited weight loss offer", "promo@wellness.example", "Dear customer, our limited time weight loss and CBD offer is available at https://wellness.example/deal",
    "Tijdelijke afslankaanbieding", "promo@welzijn.example", "Geachte klant, onze tijdelijke aanbieding voor snel afvallen en CBD staat op https://welzijn.example/deal"),
];

const legitimateScenarios: Scenario[] = [
  legitimate("project-update", "development", "Weekly project update", "alex@studio.example", "Hi team, the design review is complete. I added the agreed comments to our project board. We will discuss them in Thursday's meeting.", "Wekelijkse projectupdate", "alex@studio.example", "Hallo team, de ontwerpbeoordeling is afgerond. Ik heb de afgesproken opmerkingen op ons projectbord gezet. Donderdag bespreken we ze in de vergadering."),
  legitimate("invoice-portal", "development", "Invoice 1042 is available", "billing@vendor.example", "Your monthly invoice is available in the customer portal: https://portal.vendor.example/invoices/1042. Payment remains due under our normal contract terms.", "Factuur 1042 is beschikbaar", "facturatie@leverancier.example", "Uw maandelijkse factuur staat in het klantportaal: https://portaal.leverancier.example/facturen/1042. De normale contractuele betaaltermijn blijft gelden."),
  legitimate("microsoft-account", "development", "Security information reviewed", "account-security-noreply@microsoft.example", "You reviewed the security information for your Microsoft account. You can inspect recent activity at https://account.microsoft.com/security.", "Beveiligingsgegevens gecontroleerd", "account-security-noreply@microsoft.example", "U hebt de beveiligingsgegevens voor uw Microsoft-account gecontroleerd. Bekijk recente activiteit via https://account.microsoft.com/security."),
  legitimate("zip-path", "development", "Project archive ready", "files@studio.example", "The approved project archive is ready at https://files.studio.example/archive.zip. The hostname remains our normal company file portal.", "Projectarchief gereed", "bestanden@studio.example", "Het goedgekeurde projectarchief staat op https://files.studio.example/archive.zip. De hostnaam is ons gebruikelijke bedrijfsportaal."),
  legitimate("brand-substring", "development", "Applecart order summary", "orders@applecart.example", "Thanks for your Applecart order. The delivery summary is attached to your existing customer record and no action is required.", "Overzicht Applecart-bestelling", "bestellingen@applecart.example", "Bedankt voor uw Applecart-bestelling. Het bezorgoverzicht staat bij uw bestaande klantrecord en u hoeft niets te doen."),
  legitimate("payment-receipt", "development", "Payment receipt", "receipts@vendor.example", "We received your scheduled payment. This receipt confirms the amount already agreed in contract 204. No reply or further action is needed.", "Betalingsbewijs", "bewijzen@leverancier.example", "Wij hebben uw geplande betaling ontvangen. Dit bewijs bevestigt het bedrag uit contract 204. U hoeft niet te reageren of verder te handelen."),
  legitimate("renewal-reminder", "development", "Annual plan renewal", "accounts@service.example", "Your annual service plan renews next month under the price in your current agreement. Manage preferences in the signed-in customer portal.", "Verlenging jaarabonnement", "accounts@dienst.example", "Uw jaarlijkse serviceabonnement wordt volgende maand verlengd tegen de prijs in uw huidige overeenkomst. Beheer voorkeuren in het ingelogde klantportaal."),
  legitimate("report-attachment", "development", "Quarterly report attached", "finance@company.example", "The quarterly report is attached for the board meeting. It contains the figures discussed yesterday and does not require an account login.", "Kwartaalrapport bijgevoegd", "financien@bedrijf.example", "Het kwartaalrapport is bijgevoegd voor de bestuursvergadering. Het bevat de cijfers van gisteren en vereist geen accountlogin."),
  legitimate("transfer-receipt", "development", "Transfer receipt from treasury", "treasury@company.example", "Treasury confirms that the scheduled supplier transfer was completed using the bank details already recorded in our approved vendor system.", "Bewijs overschrijving treasury", "treasury@bedrijf.example", "Treasury bevestigt dat de geplande leveranciersbetaling is uitgevoerd met de bankgegevens die al in ons goedgekeurde leverancierssysteem stonden."),
  legitimate("tax-appointment", "development", "Tax adviser appointment notes", "adviser@accounting.example", "Attached are the notes for our tax planning appointment. We will review the figures together at the office next Tuesday.", "Notities afspraak belastingadviseur", "adviseur@accountancy.example", "Bijgevoegd staan de notities voor onze afspraak over belastingplanning. Volgende dinsdag nemen we de cijfers samen op kantoor door."),
  legitimate("delivery-tracking", "locked", "Your confirmed order shipped", "tracking@vendor.example", "The order you placed yesterday has shipped. Track it in your signed-in account at https://vendor.example/orders/204/tracking.", "Uw bevestigde bestelling is verzonden", "tracking@leverancier.example", "De bestelling die u gisteren plaatste is verzonden. Volg deze in uw ingelogde account via https://leverancier.example/bestellingen/204/volgen."),
  legitimate("mfa-training", "locked", "Security training reminder", "security@company.example", "Never approve an MFA request you did not initiate. Report unexpected prompts to the internal security desk using the number in the company directory.", "Herinnering beveiligingstraining", "beveiliging@bedrijf.example", "Keur nooit een MFA-verzoek goed dat u niet zelf hebt gestart. Meld onverwachte verzoeken bij de interne beveiligingsdesk via het nummer in de bedrijfsgids."),
  legitimate("password-reset", "locked", "Password reset you requested", "account@service.example", "The password reset requested from your signed-in account is ready. Return to the service using your bookmark if you still want to complete it.", "Aangevraagde wachtwoordreset", "account@dienst.example", "De wachtwoordreset die u vanuit uw ingelogde account hebt aangevraagd staat klaar. Ga via uw bladwijzer naar de dienst als u deze nog wilt afronden."),
  legitimate("opted-in-newsletter", "locked", "Subscriber discount this month", "newsletter@vendor.example", "You subscribed to product updates. This month's newsletter includes a 20% discount for existing customers. Manage subscription preferences in your account.", "Korting voor abonnees deze maand", "nieuwsbrief@leverancier.example", "U hebt zich aangemeld voor productupdates. Deze nieuwsbrief bevat 20% korting voor bestaande klanten. Beheer abonnementsvoorkeuren in uw account."),
  legitimate("published-support", "locked", "Support appointment confirmation", "support@vendor.example", "Your requested support appointment is confirmed. If you need to reschedule, call the published support number shown in your signed-in customer account.", "Bevestiging supportafspraak", "support@leverancier.example", "Uw aangevraagde supportafspraak is bevestigd. Wilt u deze verzetten, bel dan het gepubliceerde supportnummer in uw ingelogde klantaccount."),
];

export const syntheticCorpus: SyntheticCorpusCase[] = [
  ...phishingScenarios,
  ...spamScenarios,
  ...legitimateScenarios,
].flatMap((scenario) => (["en", "nl"] as const).flatMap((locale) =>
  Array.from({ length: 5 }, (_, index) => ({
    id: `${scenario.id}-${locale}-${index + 1}`,
    scenarioId: scenario.id,
    split: scenario.split,
    classification: scenario.classification,
    locale,
    input: varyInput(scenario[locale], locale, index),
  })),
));

function phishing(
  id: string, split: CorpusSplit,
  enSubject: string, enSender: string, enBody: string,
  nlSubject: string, nlSender: string, nlBody: string,
): Scenario {
  return scenario(id, split, "phishing", enSubject, enSender, enBody, nlSubject, nlSender, nlBody);
}

function spam(
  id: string, split: CorpusSplit,
  enSubject: string, enSender: string, enBody: string,
  nlSubject: string, nlSender: string, nlBody: string,
): Scenario {
  return scenario(id, split, "spam", enSubject, enSender, enBody, nlSubject, nlSender, nlBody);
}

function legitimate(
  id: string, split: CorpusSplit,
  enSubject: string, enSender: string, enBody: string,
  nlSubject: string, nlSender: string, nlBody: string,
): Scenario {
  return scenario(id, split, "legitimate", enSubject, enSender, enBody, nlSubject, nlSender, nlBody);
}

function scenario(
  id: string, split: CorpusSplit, classification: CorpusClassification,
  enSubject: string, enSender: string, enBody: string,
  nlSubject: string, nlSender: string, nlBody: string,
): Scenario {
  return {
    id,
    split,
    classification,
    en: { subject: enSubject, senderEmail: enSender, body: enBody },
    nl: { subject: nlSubject, senderEmail: nlSender, body: nlBody },
  };
}

function varyInput(
  input: Omit<EmailAnalysisInput, "locale">,
  locale: AnalysisLocale,
  index: number,
): EmailAnalysisInput {
  const references = locale === "nl"
    ? ["Referentie", "Dossier", "Bericht", "Controle", "Zaak"]
    : ["Reference", "Case", "Message", "Review", "Record"];
  return {
    ...input,
    subject: `${input.subject} · ${index + 1}`,
    body: `${input.body}\n\n${references[index]}: SYN-${String(index + 1).padStart(3, "0")}`,
    locale,
  };
}
