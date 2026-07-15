import type { SiteLocale } from "./site-locale";

export const trustPrivacyCopy = {
  en: {
    metadata: {
      title: "Privacy",
      description: "How the Maillume public beta processes email scans, feedback, and account data.",
    },
    eyebrow: "Trust center",
    title: "Privacy notice",
    description: "Maillume is designed to assess one email at a time without creating a scan history or saving the message or result in application storage. This notice describes the official public-beta data flow; self-hosted operators are responsible for their own deployment notices.",
    updatedLabel: "Last updated",
    updatedDate: "July 10, 2026",
    sections: {
      assessments: {
        title: "Email assessments",
        intro: "The official scanner processes the subject, sender address, and normalized message text only to produce the requested assessment.",
        items: [
          "Maillume does not save email text, sender details, screenshots, .eml files, detected links, or completed results to scan history or application storage.",
          "Screenshot OCR and .eml parsing run in the browser before normalized text is submitted.",
          "Analysis and feedback routes send Cache-Control: no-store responses, and application code does not log request bodies.",
          "The public beta uses local heuristic analysis and does not send scan text to an AI model provider.",
          "Hosting, network, and security infrastructure still process request data transiently to deliver and protect the service. Their operational processing is separate from Maillume saving scan content or results in application storage.",
        ],
      },
      feedback: {
        title: "Optional feedback",
        paragraphs: [
          "If feedback is enabled and you choose to submit it, Maillume receives only your selected accuracy label, expected classification, high-level signal categories, language, input mode, analyzer version, and score band.",
          "Feedback excludes email text, sender, subject, links, attachments, screenshots, and .eml files. Detailed feedback records are configured to expire after no more than 90 days.",
        ],
      },
      accounts: {
        title: "Optional accounts",
        paragraphs: [
          "Google sign-in is optional and is provided through Supabase when enabled. The account may include your email address, display name, provider identifier, session cookies, and basic authentication metadata.",
          "Signing in does not create scan history. Authentication cookies maintain the signed-in session. When production authentication is enabled, the account page provides confirmation-gated deletion of the Supabase identity.",
          "When you create an integration API key, Maillume stores its owner, name, short prefix, SHA-256 hash, quota, timestamps, UTC billing month, and aggregate request count. The plaintext key is shown once. API usage records exclude message content, results, links, IP addresses, and message identifiers.",
        ],
      },
      integrations: {
        title: "Chrome browser extension",
        paragraphs: [
          "The Chrome extension captures text you explicitly select or, when supported and unambiguous, the visibly open webmail message after you start the action. It sends those fields to the Maillume deployment displayed in the extension for that assessment.",
          "The extension does not perform background mailbox scanning and does not persist message content or results. Its endpoint preference is stored locally and its API key is kept in browser session storage.",
          "Earlier Gmail and Outlook add-on experiments are retired and are not shipped as part of the Maillume service. Their source remains in the repository for historical and security review.",
        ],
      },
      providers: {
        title: "Service providers and infrastructure",
        paragraphs: [
          "The official deployment may use Hostinger for application hosting, Cloudflare for DNS, protected ingress, and abuse prevention, Supabase for authentication and non-content feedback, GitHub for source development and releases, and a privacy-configured monitoring service for operational errors. These providers may process technical request, account, or operational data according to their role; that does not mean Maillume stores scan content or results in scan history or application storage.",
          "If the hosted service enables an external AI provider in the future, normalized message text will be sent to that configured provider for the requested assessment. The provider and its processing terms must be disclosed before that mode is enabled.",
          "Production monitoring must exclude scan and feedback payloads. A provider is active only when it has been configured for the deployed service.",
        ],
      },
      selfHosting: {
        title: "Open source and self-hosting",
        paragraph: "Anyone can run a separate Maillume deployment. Those operators choose their own infrastructure, analytics, authentication, AI providers, and retention settings. Their privacy practices may differ from the official service.",
      },
      contact: {
        title: "Contact and launch status",
        intro: "This is a public-beta technical notice. The final production notice must add the operator's legal identity, privacy contact, jurisdiction, and verified processor retention terms before launch.",
        linkPrefix: "Security issues should be reported through the process on the",
        linkText: "security page",
        linkSuffix: "never through a public issue containing private email data.",
      },
    },
  },
  nl: {
    metadata: {
      title: "Privacy",
      description: "Hoe de publieke beta van Maillume e-mailscans, feedback en accountgegevens verwerkt.",
    },
    eyebrow: "Vertrouwenscentrum",
    title: "Privacyverklaring",
    description: "Maillume is ontworpen om telkens één e-mail te beoordelen zonder scangeschiedenis aan te maken of het bericht of resultaat in de applicatieopslag te bewaren. Deze verklaring beschrijft de gegevensstroom van de officiële publieke beta; beheerders van zelfgehoste omgevingen zijn verantwoordelijk voor hun eigen verklaringen.",
    updatedLabel: "Laatst bijgewerkt",
    updatedDate: "10 juli 2026",
    sections: {
      assessments: {
        title: "E-mailbeoordelingen",
        intro: "De officiële scanner verwerkt het onderwerp, het afzenderadres en de genormaliseerde berichttekst uitsluitend om de gevraagde beoordeling te maken.",
        items: [
          "Maillume bewaart e-mailtekst, afzendergegevens, screenshots, .eml-bestanden, gevonden links en voltooide resultaten niet in scangeschiedenis of applicatieopslag.",
          "OCR van screenshots en verwerking van .eml-bestanden vinden in de browser plaats voordat genormaliseerde tekst wordt verstuurd.",
          "Analyse- en feedbackroutes sturen antwoorden met Cache-Control: no-store; de applicatiecode logt geen aanvraaginhoud.",
          "De publieke beta gebruikt lokale heuristische analyse en stuurt scantekst niet naar een aanbieder van AI-modellen.",
          "Hosting-, netwerk- en beveiligingsinfrastructuur verwerkt aanvraaggegevens wel tijdelijk om de dienst te leveren en beveiligen. Die operationele verwerking staat los van het bewaren van scaninhoud of resultaten door Maillume in applicatieopslag.",
        ],
      },
      feedback: {
        title: "Optionele feedback",
        paragraphs: [
          "Als feedback is ingeschakeld en u deze vrijwillig verstuurt, ontvangt Maillume alleen het gekozen nauwkeurigheidslabel, de verwachte classificatie, algemene signaalcategorieën, taal, invoermethode, analyseversie en scorecategorie.",
          "Feedback bevat geen e-mailtekst, afzender, onderwerp, links, bijlagen, screenshots of .eml-bestanden. Gedetailleerde feedbackrecords zijn ingesteld om na maximaal 90 dagen te verlopen.",
        ],
      },
      accounts: {
        title: "Optionele accounts",
        paragraphs: [
          "Inloggen met Google is optioneel en wordt, indien ingeschakeld, via Supabase aangeboden. Het account kan uw e-mailadres, weergavenaam, provider-ID, sessiecookies en algemene authenticatiemetadata bevatten.",
          "Inloggen maakt geen scangeschiedenis aan. Authenticatiecookies houden de ingelogde sessie in stand. Wanneer productie-authenticatie is ingeschakeld, biedt de accountpagina verwijdering van de Supabase-identiteit na bevestiging.",
          "Wanneer u een integratie-API-sleutel maakt, bewaart Maillume de eigenaar, naam, korte prefix, SHA-256-hash, quota, tijdstippen, UTC-factuurmaand en het totale aantal aanvragen. De leesbare sleutel wordt één keer getoond. API-gebruiksrecords bevatten geen berichtinhoud, resultaten, links, IP-adressen of bericht-ID's.",
        ],
      },
      integrations: {
        title: "Chrome-browserextensie",
        paragraphs: [
          "De Chrome-extensie legt tekst vast die u uitdrukkelijk selecteert of, wanneer dit wordt ondersteund en ondubbelzinnig is, het zichtbaar geopende webmailbericht nadat u de actie start. De extensie stuurt die velden voor de beoordeling naar de Maillume-omgeving die in de extensie wordt getoond.",
          "De extensie scant postvakken niet op de achtergrond en bewaart geen berichtinhoud of resultaten. De voorkeur voor het endpoint wordt lokaal opgeslagen en de API-sleutel blijft in de sessieopslag van de browser.",
          "Eerdere experimenten met Gmail- en Outlook-add-ons zijn beëindigd en worden niet als onderdeel van de Maillume-dienst uitgebracht. De broncode blijft in de repository staan voor historische en beveiligingscontrole.",
        ],
      },
      providers: {
        title: "Dienstverleners en infrastructuur",
        paragraphs: [
          "De officiële omgeving kan Hostinger gebruiken voor applicatiehosting, Cloudflare voor DNS, beveiligde toegang en misbruikpreventie, Supabase voor authenticatie en feedback zonder berichtinhoud, GitHub voor broncodeontwikkeling en releases, en een privacygericht ingestelde monitoringdienst voor operationele fouten. Deze partijen kunnen technische aanvraag-, account- of operationele gegevens verwerken voor hun rol; dat betekent niet dat Maillume scaninhoud of resultaten in scangeschiedenis of applicatieopslag bewaart.",
          "Als de gehoste dienst in de toekomst een externe AI-aanbieder inschakelt, wordt genormaliseerde berichttekst voor de gevraagde beoordeling naar die ingestelde aanbieder gestuurd. De aanbieder en diens verwerkingsvoorwaarden moeten bekend worden gemaakt voordat deze modus wordt ingeschakeld.",
          "Productiemonitoring moet scan- en feedbackinhoud uitsluiten. Een aanbieder is alleen actief wanneer die voor de betreffende omgeving is ingesteld.",
        ],
      },
      selfHosting: {
        title: "Open source en zelf hosten",
        paragraph: "Iedereen kan een afzonderlijke Maillume-omgeving beheren. Deze beheerders kiezen hun eigen infrastructuur, analytics, authenticatie, AI-aanbieders en bewaartermijnen. Hun privacypraktijken kunnen afwijken van de officiële dienst.",
      },
      contact: {
        title: "Contact en lanceringstatus",
        intro: "Dit is een technische verklaring voor de publieke beta. Voor een productielancering moet de definitieve verklaring worden aangevuld met de juridische identiteit van de beheerder, een privacycontact, rechtsgebied en geverifieerde bewaartermijnen van verwerkers.",
        linkPrefix: "Meld beveiligingsproblemen via de procedure op de",
        linkText: "beveiligingspagina",
        linkSuffix: "nooit via een openbaar issue met privégegevens uit e-mail.",
      },
    },
  },
} as const satisfies Record<SiteLocale, object>;
