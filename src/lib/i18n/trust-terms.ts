import type { SiteLocale } from "./site-locale";

export const trustTermsCopy = {
  en: {
    metadata: { title: "Terms", description: "Public-beta terms for the Maillume hosted email risk scanner." },
    eyebrow: "Trust center", title: "Public-beta terms", updatedLabel: "Last updated", updatedDate: "July 16, 2026",
    description: "These plain-language terms describe the current free Maillume public beta.",
    sections: {
      assessment: { title: "Automated assessment", paragraphs: ["Maillume provides an automated risk assessment based on available message text and technical patterns. It does not guarantee that an email is safe, malicious, authentic, or fraudulent.", "You remain responsible for deciding whether to click, reply, pay, disclose information, report a message, or contact the apparent sender through a trusted channel."] },
      use: { title: "Acceptable use", items: ["Do not use Maillume to facilitate phishing, spam, fraud, harassment, malware delivery, or unauthorized access.", "Do not submit content you are not permitted to process.", "Do not attempt to bypass rate limits, overload the service, or probe other users' sessions.", "Use synthetic or fully sanitized examples in public issues and contributions."] },
      accounts: { title: "Optional accounts", paragraphs: ["The public beta scanner remains available without an account. When account features are enabled, sign-in and integration API keys are optional and are subject to the authentication, security, quota, and deletion controls described in the privacy notice."] },
      availability: { title: "Availability and changes", paragraph: "The beta may change, experience interruptions, enforce reasonable usage limits, or remove unfinished features. Maillume does not currently offer a service-level agreement." },
      openSource: { title: "Open-source software", paragraph: "The source code is provided under GNU AGPL-3.0-only and without warranty under the terms of that license. Self-hosted use is governed by the license and by the operator's own terms." },
      completion: { title: "Operator and governing law", paragraph: "This public beta is operated from the Netherlands. Dutch law governs these terms, except where mandatory consumer law provides otherwise. No paid plan, subscription, or service-level agreement is offered in this beta." },
    },
  },
  nl: {
    metadata: { title: "Voorwaarden", description: "Voorwaarden voor de publieke beta van de gehoste Maillume-e-mailrisicoscanner." },
    eyebrow: "Vertrouwenscentrum", title: "Voorwaarden publieke beta", updatedLabel: "Laatst bijgewerkt", updatedDate: "16 juli 2026",
    description: "Deze voorwaarden in gewone taal beschrijven de huidige gratis publieke beta van Maillume.",
    sections: {
      assessment: { title: "Geautomatiseerde beoordeling", paragraphs: ["Maillume geeft een geautomatiseerde risico-inschatting op basis van beschikbare berichttekst en technische patronen. De dienst garandeert niet dat een e-mail veilig, kwaadaardig, authentiek of frauduleus is.", "U blijft zelf verantwoordelijk voor de beslissing om te klikken, antwoorden, betalen, informatie te delen, een bericht te melden of via een vertrouwd kanaal contact op te nemen met de vermeende afzender."] },
      use: { title: "Toegestaan gebruik", items: ["Gebruik Maillume niet voor phishing, spam, fraude, intimidatie, verspreiding van malware of ongeautoriseerde toegang.", "Dien geen inhoud in die u niet mag verwerken.", "Probeer geen limieten te omzeilen, de dienst te overbelasten of sessies van andere gebruikers te onderzoeken.", "Gebruik synthetische of volledig opgeschoonde voorbeelden in openbare issues en bijdragen."] },
      accounts: { title: "Optionele accounts", paragraphs: ["De publieke betascanner blijft zonder account beschikbaar. Wanneer accountfuncties zijn ingeschakeld, zijn inloggen en integratie-API-sleutels optioneel en gelden de authenticatie-, beveiligings-, quota- en verwijderingsmaatregelen uit de privacyverklaring."] },
      availability: { title: "Beschikbaarheid en wijzigingen", paragraph: "De beta kan veranderen, tijdelijk onderbroken zijn, redelijke gebruikslimieten toepassen of onvoltooide functies verwijderen. Maillume biedt momenteel geen serviceniveau-overeenkomst." },
      openSource: { title: "Opensourcesoftware", paragraph: "De broncode wordt onder GNU AGPL-3.0-only en zonder garantie beschikbaar gesteld volgens die licentie. Voor zelfgehost gebruik gelden de licentie en de eigen voorwaarden van de beheerder." },
      completion: { title: "Beheerder en toepasselijk recht", paragraph: "Deze publieke beta wordt vanuit Nederland beheerd. Op deze voorwaarden is Nederlands recht van toepassing, behalve wanneer dwingend consumentenrecht anders bepaalt. In deze beta zijn geen betaald abonnement, dienstverleningsniveau of service-level agreement beschikbaar." },
    },
  },
} as const satisfies Record<SiteLocale, object>;
