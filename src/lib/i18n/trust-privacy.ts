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
    updatedDate: "July 31, 2026",
    sections: {
      assessments: {
        title: "Email assessments",
        intro: "The official scanner processes the subject, sender address, and normalized message text only to produce the requested assessment.",
        items: [
          "Maillume does not save email text, sender details, screenshots, .eml files, detected links, or completed results to scan history or application storage.",
          "Screenshot OCR and .eml parsing run in the browser before normalized text is submitted.",
          "For .eml scans the browser also reads the sender-authentication headers your mail provider added and sends only their outcomes, such as whether SPF, DKIM, or DMARC passed and whether replies would go to a different domain. The header text itself is never sent.",
          "Analysis and feedback routes send Cache-Control: no-store responses, and application code does not log request bodies.",
          "The public beta uses Maillume's built-in heuristic checks and does not send scan text to an AI model provider. Normalized scan text is sent to Maillume only for the requested assessment.",
          "Hosting, network, and security infrastructure still process request data transiently to deliver and protect the service. Their operational processing is separate from Maillume saving scan content or results in application storage.",
        ],
      },
      legalBases: {
        title: "Purposes and legal bases",
        paragraphs: [
          "Where the GDPR applies, Maillume processes ordinary scan content to take the assessment you request and, where applicable, to perform the service relationship. It processes account, credential, and connection metadata to provide the optional account and browser-connection features.",
          "We rely on legitimate interests for service security, abuse prevention, troubleshooting without payloads, and the non-identifying daily usage counts, after considering the privacy impact. We process optional feedback only when you choose to submit it; where consent is required, we rely on that consent and you may withdraw it by contacting us. We may also process limited data where needed to meet a legal obligation. The precise basis depends on the context and applicable law.",
        ],
      },
      dataCategories: {
        title: "Data categories and recipients",
        paragraphs: [
          "The categories described in this notice are: the scan fields you submit (subject, sender, normalized text, detected links, and limited technical indicators); optional feedback labels; account and authentication data; browser or developer credential metadata; contact messages; and limited operational or security metadata. The original screenshot and .eml file stay in the browser and are not uploaded as source files.",
          "Recipients are limited to the service providers named below when their role is enabled, and to authorities or advisers where law requires it. Maillume does not sell scan data, use it for advertising or credit decisions, or disclose it for unrelated purposes.",
        ],
      },
      usageCounts: {
        title: "Usage counts",
        paragraphs: [
          "Maillume counts how many assessments are completed each day, split only by input mode: pasted text, screenshot, .eml file, or Chrome extension. This is how the project can tell whether the scanner is used at all.",
          "A count is a single number for one day and one input mode. It records nothing about the message, the assessment, or you. No account, session, IP address, request identifier, score, result, or time of day is stored, so a count cannot be traced back to a person or to a specific scan. Maillume uses no third-party analytics, advertising, or tracking service.",
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
          "Email-and-password sign-in and Google sign-in are optional and are provided through Supabase when enabled. The account may include your email address, display name, provider identifier, session cookies, and basic authentication metadata.",
          "If you enable authenticator-app two-factor authentication, Supabase processes the enrollment and verification data needed for TOTP. Maillume does not receive or store the authenticator app's private data outside the authentication service.",
          "Signing in does not create scan history. Authentication cookies maintain the signed-in session. When production authentication is enabled, the account page provides confirmation-gated deletion of the Supabase identity.",
          "For developer API keys and browser connections, Maillume stores the owner, name, short prefix, credential SHA-256 hash, type, quota, timestamps, UTC billing month, and aggregate request count. Browser connections also store only the SHA-256 hash of a random installation identifier and a rolling inactivity deadline. Plaintext credentials are returned once. API usage records exclude message content, results, links, IP addresses, and message identifiers.",
        ],
      },
      integrations: {
        title: "Chrome browser extension",
        paragraphs: [
          "The Chrome extension captures text you explicitly select or, when supported and unambiguous, the visibly open webmail message after you start the action. For that assessment it sends the subject, sender, message text, and detected HTTP(S) link destinations (including displayed-link and destination pairs when available) to the Maillume deployment displayed in the extension.",
          "The extension does not perform background mailbox scanning and does not persist message content or results. Its endpoint, dedicated browser credential, expiry metadata, and random installation identifier are stored in trusted extension-local storage across restarts and updates. The server receives only a hash of the installation identifier. Advanced manual setup can keep a developer API key locally or only for the browser session.",
          "Chrome extension data is used only to provide and secure the email-risk assessment you request. Maillume does not sell extension data, use it for advertising or credit decisions, transfer it for unrelated purposes, or allow people to read message content except when you give specific support consent or when access is required for security or legal obligations.",
        ],
      },
      providers: {
        title: "Service providers and infrastructure",
        paragraphs: [
          "The official deployment uses Hostinger for application hosting, Cloudflare for DNS, protected ingress, and abuse prevention, Supabase for authentication and non-content feedback, Resend for transactional authentication email, Google Workspace for monitored contact mailboxes, GitHub for source development and releases, and UptimeRobot for content-free availability monitoring. These providers may process technical request, account, email-delivery, or operational data according to their role; that does not mean Maillume stores scan content or results in scan history or application storage.",
          "If the hosted service enables an external AI provider in the future, normalized message text will be sent to that configured provider for the requested assessment. The provider and its processing terms must be disclosed before that mode is enabled.",
          "Production monitoring must exclude scan and feedback payloads. A provider is active only when it has been configured for the deployed service.",
        ],
      },
      retention: {
        title: "Retention",
        paragraphs: [
          "Ordinary scan content and completed assessments are processed for the current request and response, then discarded. Maillume does not create application scan history. This does not prevent hosting, network, or security infrastructure from handling request data transiently while delivering or protecting the request.",
          "Optional feedback expires within 90 days. Account data is kept while an account is active and removed through the deletion workflow, unless a lawful obligation requires a narrower record to be retained. Credential metadata is kept until expiry, revocation, or account deletion; aggregate monthly quota records are kept for up to 13 months. A browser connection has a one-year hard expiry and a rolling 90-day inactivity deadline.",
          "Daily scan counts are non-identifying aggregates kept only while needed for product operations and erased or further aggregated when no longer needed. Official operational security records must exclude scan payloads; the service target for permitted request metadata is a maximum of 14 days. Contact correspondence is retained only as long as needed to handle the request, maintain required records, or resolve a dispute. Actual provider, log, and backup retention settings must be verified before launch and before production changes.",
        ],
      },
      international: {
        title: "International transfers",
        paragraphs: [
          "The official service is operated from the Netherlands and is intended to use an EU-region authentication project. Some listed providers may process relevant personal data outside the European Economic Area, depending on their service configuration and support operations.",
          "Before the official operator makes a restricted transfer, it must use an applicable transfer mechanism, such as an adequacy decision or Standard Contractual Clauses with any needed supplementary measures. Contact the privacy address for the current provider, country, and safeguard information relevant to your request.",
        ],
      },
      selfHosting: {
        title: "Open source and self-hosting",
        paragraph: "Anyone can run a separate Maillume deployment. Those operators choose their own infrastructure, analytics, authentication, AI providers, and retention settings. Their privacy practices may differ from the official service.",
      },
      contact: {
        title: "Contact and your rights",
        intro: "You may ask to access, correct, erase, restrict, or receive portable copies of applicable personal data, object to processing based on legitimate interests, and withdraw consent where it is the basis. We may need to verify your identity and may explain any lawful limit on a request.",
        complaintPrefix: "You may also complain to the Dutch supervisory authority, the",
        complaintLinkText: "Autoriteit Persoonsgegevens",
        complaintSuffix: ". Contact Maillume to exercise rights or request clarification about this public beta. This notice explains the service design and is not legal advice or legal certification.",
        controllerPrefix: "For the official public beta, the controller is",
        controllerSuffix: ".",
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
    description: "Maillume is ontworpen om telkens één e-mail te beoordelen zonder scangeschiedenis aan te maken of het bericht of resultaat in de applicatieopslag te bewaren. Deze verklaring beschrijft de gegevensstroom van de officiële publieke bèta; beheerders van zelfgehoste omgevingen zijn verantwoordelijk voor hun eigen verklaringen.",
    updatedLabel: "Laatst bijgewerkt",
    updatedDate: "31 juli 2026",
    sections: {
      assessments: {
        title: "E-mailbeoordelingen",
        intro: "De officiële scanner verwerkt het onderwerp, het afzenderadres en de genormaliseerde berichttekst uitsluitend om de gevraagde beoordeling te maken.",
        items: [
          "Maillume bewaart e-mailtekst, afzendergegevens, screenshots, .eml-bestanden, gevonden links en voltooide resultaten niet in scangeschiedenis of applicatieopslag.",
          "OCR van screenshots en verwerking van .eml-bestanden vinden in de browser plaats voordat genormaliseerde tekst wordt verstuurd.",
          "Bij .eml-scans leest de browser ook de afzenderverificatiekoppen die je mailprovider heeft toegevoegd en stuurt alleen de uitkomsten daarvan, zoals of SPF, DKIM of DMARC is geslaagd en of antwoorden naar een ander domein zouden gaan. De koptekst zelf wordt nooit verstuurd.",
          "Analyse- en feedbackroutes sturen antwoorden met Cache-Control: no-store; de applicatiecode logt geen aanvraaginhoud.",
          "De publieke beta gebruikt de ingebouwde heuristische controles van Maillume en stuurt scantekst niet naar een aanbieder van AI-modellen. Genormaliseerde scantekst wordt alleen voor de gevraagde beoordeling naar Maillume verstuurd.",
          "Hosting-, netwerk- en beveiligingsinfrastructuur verwerkt aanvraaggegevens wel tijdelijk om de dienst te leveren en beveiligen. Die operationele verwerking staat los van het bewaren van scaninhoud of resultaten door Maillume in applicatieopslag.",
        ],
      },
      legalBases: {
        title: "Doeleinden en grondslagen",
        paragraphs: [
          "Waar de AVG van toepassing is, verwerkt Maillume gewone scaninhoud om de door jou gevraagde beoordeling uit te voeren en, waar van toepassing, om de dienstrelatie uit te voeren. Account-, sleutel- en verbindingsmetadata worden verwerkt om de optionele account- en browserverbindingsfuncties te leveren.",
          "Voor beveiliging van de dienst, misbruikpreventie, foutoplossing zonder inhoud en de niet-herleidbare dagelijkse gebruikstellingen beroepen we ons op gerechtvaardigde belangen, na afweging van de privacygevolgen. Optionele feedback verwerken we alleen wanneer je die zelf instuurt; waar toestemming vereist is, baseren we ons op die toestemming en kun je die intrekken door contact op te nemen. We kunnen ook beperkte gegevens verwerken wanneer dat nodig is voor een wettelijke verplichting. De precieze grondslag hangt af van de context en het toepasselijke recht.",
        ],
      },
      dataCategories: {
        title: "Gegevenscategorieën en ontvangers",
        paragraphs: [
          "De categorieën in deze verklaring zijn: de scanvelden die je instuurt (onderwerp, afzender, genormaliseerde tekst, gevonden links en beperkte technische indicatoren); optionele feedbacklabels; account- en authenticatiegegevens; metadata van browser- of ontwikkelaarssleutels; contactberichten; en beperkte operationele of beveiligingsmetadata. Het oorspronkelijke screenshot en .eml-bestand blijven in de browser en worden niet als bronbestand geüpload.",
          "Ontvangers zijn beperkt tot de hieronder genoemde dienstverleners wanneer hun rol is ingeschakeld, en tot autoriteiten of adviseurs wanneer de wet dit vereist. Maillume verkoopt scangegevens niet, gebruikt ze niet voor advertenties of kredietbeslissingen en verstrekt ze niet voor ongerelateerde doeleinden.",
        ],
      },
      usageCounts: {
        title: "Gebruikstellingen",
        paragraphs: [
          "Maillume telt hoeveel beoordelingen er per dag worden afgerond, alleen uitgesplitst naar invoermethode: geplakte tekst, screenshot, .eml-bestand of Chrome-extensie. Zo kan het project zien of de scanner überhaupt wordt gebruikt.",
          "Een telling is één getal voor één dag en één invoermethode. Er wordt niets vastgelegd over het bericht, de beoordeling of jou. Er wordt geen account, sessie, IP-adres, aanvraagkenmerk, score, resultaat of tijdstip opgeslagen, waardoor een telling niet te herleiden is naar een persoon of naar een specifieke scan. Maillume gebruikt geen analytics-, advertentie- of trackingdiensten van derden.",
        ],
      },
      feedback: {
        title: "Optionele feedback",
        paragraphs: [
          "Als feedback is ingeschakeld en je deze vrijwillig verstuurt, ontvangt Maillume alleen het gekozen nauwkeurigheidslabel, de verwachte classificatie, algemene signaalcategorieën, taal, invoermethode, analyseversie en scorecategorie.",
          "Feedback bevat geen e-mailtekst, afzender, onderwerp, links, bijlagen, screenshots of .eml-bestanden. Gedetailleerde feedbackrecords zijn ingesteld om na maximaal 90 dagen te verlopen.",
        ],
      },
      accounts: {
        title: "Optionele accounts",
        paragraphs: [
          "Inloggen met e-mailadres en wachtwoord en inloggen met Google zijn optioneel en verlopen via Supabase. Je account kan je e-mailadres, weergavenaam, provider-ID, sessiecookies en algemene authenticatiemetadata bevatten.",
          "Als je tweestapsverificatie met een authenticatie-app inschakelt, verwerkt Supabase de inschrijf- en verificatiegegevens die nodig zijn voor TOTP. Maillume ontvangt of bewaart de privégegevens van de authenticatie-app niet buiten de authenticatiedienst.",
          "Inloggen maakt geen scangeschiedenis aan. Authenticatiecookies houden de ingelogde sessie in stand. Wanneer productie-authenticatie is ingeschakeld, biedt de accountpagina verwijdering van de Supabase-identiteit na bevestiging.",
          "Voor API-sleutels voor ontwikkelaars en browserverbindingen bewaart Maillume de eigenaar, naam, korte prefix, SHA-256-hash van de sleutel, het type, quota, tijdstippen, UTC-gebruiksmaand en het totale aantal aanvragen. Voor browserverbindingen bewaart Maillume ook alleen de SHA-256-hash van een willekeurig installatiekenmerk en een verschuivende inactiviteitsdatum. Leesbare sleutels worden één keer teruggestuurd. API-gebruiksrecords bevatten geen berichtinhoud, resultaten, links, IP-adressen of bericht-ID's.",
        ],
      },
      integrations: {
        title: "Chrome-browserextensie",
        paragraphs: [
          "De Chrome-extensie legt tekst vast die je uitdrukkelijk selecteert of, wanneer dit wordt ondersteund en ondubbelzinnig is, het zichtbaar geopende webmailbericht nadat je de actie start. Voor die beoordeling verstuurt de extensie het onderwerp, de afzender, de berichttekst en gevonden HTTP(S)-linkbestemmingen (inclusief paren van zichtbare link en bestemming wanneer beschikbaar) naar de Maillume-omgeving die in de extensie wordt getoond.",
          "De extensie scant postvakken niet op de achtergrond en bewaart geen berichtinhoud of resultaten. Het endpoint, de eigen browsersleutel, verloopmetadata en een willekeurig installatiekenmerk worden in vertrouwde lokale extensieopslag bewaard voor herstarts en updates. De server ontvangt alleen een hash van het installatiekenmerk. Geavanceerde handmatige configuratie kan een ontwikkelaars-API-sleutel lokaal of alleen voor de browsersessie bewaren.",
          "Gegevens uit de Chrome-extensie worden alleen gebruikt om de door jou gevraagde e-mailrisicobeoordeling te leveren en beveiligen. Maillume verkoopt extensiegegevens niet, gebruikt ze niet voor advertenties of kredietbeslissingen, draagt ze niet over voor ongerelateerde doeleinden en laat mensen geen berichtinhoud lezen, behalve wanneer je daarvoor uitdrukkelijk toestemming geeft bij ondersteuning of wanneer toegang nodig is voor beveiligings- of wettelijke verplichtingen.",
        ],
      },
      providers: {
        title: "Dienstverleners en infrastructuur",
        paragraphs: [
          "De officiële omgeving gebruikt Hostinger voor applicatiehosting, Cloudflare voor DNS, beveiligde toegang en misbruikpreventie, Supabase voor authenticatie en feedback zonder berichtinhoud, Resend voor transactionele authenticatie-e-mail, Google Workspace voor bewaakte contactmailboxen, GitHub voor broncodeontwikkeling en releases, en UptimeRobot voor beschikbaarheidsmonitoring zonder scaninhoud. Deze partijen kunnen technische aanvraag-, account-, e-mailbezorgings- of operationele gegevens verwerken voor hun rol; dat betekent niet dat Maillume scaninhoud of resultaten in scangeschiedenis of applicatieopslag bewaart.",
          "Als de gehoste dienst in de toekomst een externe AI-aanbieder inschakelt, wordt genormaliseerde berichttekst voor de gevraagde beoordeling naar die ingestelde aanbieder gestuurd. De aanbieder en diens verwerkingsvoorwaarden moeten bekend worden gemaakt voordat deze modus wordt ingeschakeld.",
          "Productiemonitoring moet scan- en feedbackinhoud uitsluiten. Een aanbieder is alleen actief wanneer die voor de betreffende omgeving is ingesteld.",
        ],
      },
      retention: {
        title: "Bewaartermijnen",
        paragraphs: [
          "Gewone scaninhoud en voltooide beoordelingen worden voor het huidige verzoek en antwoord verwerkt en daarna verwijderd. Maillume maakt geen scanhistorie in de applicatie. Dit verhindert niet dat hosting-, netwerk- of beveiligingsinfrastructuur aanvraaggegevens tijdelijk verwerkt tijdens het leveren of beschermen van het verzoek.",
          "Optionele feedback verloopt binnen 90 dagen. Accountgegevens blijven bewaard zolang een account actief is en worden via de verwijderingsprocedure verwijderd, tenzij een wettelijke verplichting een beperktere bewaartermijn vereist. Sleutelmetadata blijft bewaard tot verloop, intrekking of accountverwijdering; samengevoegde maandelijkse quotagegevens maximaal 13 maanden. Een browserverbinding heeft een harde verloopdatum van één jaar en een verschuivende inactiviteitsdatum van 90 dagen.",
          "Dagelijkse scantellingen zijn niet-herleidbare totalen die alleen worden bewaard zolang ze nodig zijn voor productbeheer en daarna worden verwijderd of verder samengevoegd. Operationele beveiligingsrecords van de officiële dienst moeten scaninhoud uitsluiten; de beoogde maximumtermijn voor toegestane aanvraagmetadata is 14 dagen. Contactcorrespondentie bewaren we alleen zo lang als nodig is om het verzoek te behandelen, verplichte administratie bij te houden of een geschil af te handelen. Werkelijke bewaarinstellingen van dienstverleners, logs en back-ups moeten vóór lancering en vóór productieaanpassingen worden geverifieerd.",
        ],
      },
      international: {
        title: "Internationale doorgiften",
        paragraphs: [
          "De officiële dienst wordt vanuit Nederland beheerd en is bedoeld om een authenticatieproject in een EU-regio te gebruiken. Sommige genoemde dienstverleners kunnen relevante persoonsgegevens buiten de Europese Economische Ruimte verwerken, afhankelijk van hun dienstconfiguratie en ondersteuningsactiviteiten.",
          "Voordat de officiële beheerder een beperkte doorgifte doet, moet die een toepasselijk doorgiftemechanisme gebruiken, zoals een adequaatheidsbesluit of standaardcontractbepalingen met eventuele noodzakelijke aanvullende maatregelen. Neem contact op via het privacyadres voor actuele informatie over aanbieder, land en waarborg die bij je verzoek hoort.",
        ],
      },
      selfHosting: {
        title: "Open source en zelf hosten",
        paragraph: "Iedereen kan een afzonderlijke Maillume-omgeving beheren. Deze beheerders kiezen hun eigen infrastructuur, analytics, authenticatie, AI-aanbieders en bewaartermijnen. Hun privacypraktijken kunnen afwijken van de officiële dienst.",
      },
      contact: {
        title: "Contact en je rechten",
        intro: "Je kunt vragen om inzage, correctie, verwijdering, beperking of een overdraagbare kopie van toepasselijke persoonsgegevens, bezwaar maken tegen verwerking op grond van gerechtvaardigd belang en toestemming intrekken wanneer die de grondslag is. Mogelijk moeten we je identiteit verifiëren en een wettelijke beperking van een verzoek toelichten.",
        complaintPrefix: "Je kunt ook een klacht indienen bij de Nederlandse toezichthouder, de",
        complaintLinkText: "Autoriteit Persoonsgegevens",
        complaintSuffix: ". Neem contact op met Maillume om rechten uit te oefenen of verduidelijking over deze publieke bèta te vragen. Deze verklaring beschrijft het ontwerp van de dienst en is geen juridisch advies of juridische certificering.",
        controllerPrefix: "Voor de officiële publieke bèta is de verwerkingsverantwoordelijke",
        controllerSuffix: ".",
        linkPrefix: "Meld beveiligingsproblemen via de procedure op de",
        linkText: "beveiligingspagina",
        linkSuffix: "nooit via een openbaar issue met privégegevens uit e-mail.",
      },
    },
  },
} as const satisfies Record<SiteLocale, object>;
