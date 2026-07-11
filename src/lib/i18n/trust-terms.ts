import type { SiteLocale } from "./site-locale";

export const trustTermsCopy = {
  en: {
    metadata: { title: "Terms", description: "Public-beta terms for the Maillume hosted email risk scanner." },
    eyebrow: "Trust center", title: "Public-beta terms", updatedLabel: "Last updated", updatedDate: "July 10, 2026",
    description: "These plain-language terms describe the current Maillume beta. They are not a substitute for the completed operator-specific terms required before a commercial launch.",
    sections: {
      assessment: { title: "Automated assessment", paragraphs: ["Maillume provides an automated risk assessment based on available message text and technical patterns. It does not guarantee that an email is safe, malicious, authentic, or fraudulent.", "You remain responsible for deciding whether to click, reply, pay, disclose information, report a message, or contact the apparent sender through a trusted channel."] },
      use: { title: "Acceptable use", items: ["Do not use Maillume to facilitate phishing, spam, fraud, harassment, malware delivery, or unauthorized access.", "Do not submit content you are not permitted to process.", "Do not attempt to bypass rate limits, overload the service, or probe other users' sessions.", "Use synthetic or fully sanitized examples in public issues and contributions."] },
      accounts: { title: "Accounts", paragraphs: ["An account is not required for the free scanner. If you use Google sign-in, you are responsible for maintaining control of that Google account and for activity performed through your session. Production deployments must provide self-service deletion of the authentication identity.", "Integration API keys are credentials. Keep them private, revoke keys you no longer use or suspect are exposed, and do not attempt to evade monthly or abuse limits. Beta quotas may change before commercial launch."] },
      availability: { title: "Availability and changes", paragraph: "The beta may change, experience interruptions, enforce reasonable usage limits, or remove unfinished features. Maillume does not currently offer a service-level agreement." },
      openSource: { title: "Open-source software", paragraph: "The source code is provided under GNU AGPL-3.0-only and without warranty under the terms of that license. Self-hosted use is governed by the license and by the operator's own terms." },
      completion: { title: "Production completion", paragraph: "Before public commercial launch, these terms must be completed with the operator's legal identity, governing law, liability terms, contact details, paid-plan terms, cancellation rights, and any consumer disclosures that apply." },
    },
  },
  nl: {
    metadata: { title: "Voorwaarden", description: "Voorwaarden voor de publieke beta van de gehoste Maillume-e-mailrisicoscanner." },
    eyebrow: "Vertrouwenscentrum", title: "Voorwaarden publieke beta", updatedLabel: "Laatst bijgewerkt", updatedDate: "10 juli 2026",
    description: "Deze voorwaarden in gewone taal beschrijven de huidige beta van Maillume. Ze vervangen niet de volledige, beheerderspecifieke voorwaarden die vóór een commerciële lancering nodig zijn.",
    sections: {
      assessment: { title: "Geautomatiseerde beoordeling", paragraphs: ["Maillume geeft een geautomatiseerde risico-inschatting op basis van beschikbare berichttekst en technische patronen. De dienst garandeert niet dat een e-mail veilig, kwaadaardig, authentiek of frauduleus is.", "U blijft zelf verantwoordelijk voor de beslissing om te klikken, antwoorden, betalen, informatie te delen, een bericht te melden of via een vertrouwd kanaal contact op te nemen met de vermeende afzender."] },
      use: { title: "Toegestaan gebruik", items: ["Gebruik Maillume niet voor phishing, spam, fraude, intimidatie, verspreiding van malware of ongeautoriseerde toegang.", "Dien geen inhoud in die u niet mag verwerken.", "Probeer geen limieten te omzeilen, de dienst te overbelasten of sessies van andere gebruikers te onderzoeken.", "Gebruik synthetische of volledig opgeschoonde voorbeelden in openbare issues en bijdragen."] },
      accounts: { title: "Accounts", paragraphs: ["Voor de gratis scanner is geen account nodig. Als u met Google inlogt, bent u verantwoordelijk voor het beheer van dat Google-account en voor activiteit binnen uw sessie. Productieomgevingen moeten zelfstandige verwijdering van de authenticatie-identiteit bieden.", "Integratie-API-sleutels zijn toegangsgegevens. Houd ze privé, trek ongebruikte of mogelijk gelekte sleutels in en probeer maandelijkse of misbruiklimieten niet te omzeilen. Betaquota kunnen vóór de commerciële lancering veranderen."] },
      availability: { title: "Beschikbaarheid en wijzigingen", paragraph: "De beta kan veranderen, tijdelijk onderbroken zijn, redelijke gebruikslimieten toepassen of onvoltooide functies verwijderen. Maillume biedt momenteel geen serviceniveau-overeenkomst." },
      openSource: { title: "Opensourcesoftware", paragraph: "De broncode wordt onder GNU AGPL-3.0-only en zonder garantie beschikbaar gesteld volgens die licentie. Voor zelfgehost gebruik gelden de licentie en de eigen voorwaarden van de beheerder." },
      completion: { title: "Aanvulling voor productie", paragraph: "Vóór een openbare commerciële lancering moeten deze voorwaarden worden aangevuld met de juridische identiteit van de beheerder, toepasselijk recht, aansprakelijkheidsvoorwaarden, contactgegevens, voorwaarden voor betaalde abonnementen, annuleringsrechten en toepasselijke consumenteninformatie." },
    },
  },
} as const satisfies Record<SiteLocale, object>;
