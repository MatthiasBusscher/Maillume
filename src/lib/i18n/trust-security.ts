import type { SiteLocale } from "./site-locale";

export const trustSecurityCopy = {
  en: {
    metadata: { title: "Security", description: "Security reporting and data-handling guidance for Maillume." },
    eyebrow: "Trust center", title: "Security", updatedLabel: "Last updated", updatedDate: "July 10, 2026",
    description: "Maillume handles content people already consider suspicious. Security reports should protect that content, use synthetic reproduction data, and follow coordinated disclosure.",
    sections: {
      report: { title: "Report a vulnerability", warning: "Do not open a public issue with a vulnerability, credential, private email, screenshot, or raw .eml file.", prefix: "Follow the private reporting instructions in the repository's", linkText: "SECURITY.md", suffix: "If private GitHub reporting is unavailable, use the security contact published with the production domain." },
      boundaries: { title: "Security boundaries", items: ["Provider and Supabase secret keys are server-only and must never use a NEXT_PUBLIC_ prefix.", "Uploaded screenshot and .eml files are parsed in the browser rather than uploaded as source files.", "Analysis inputs are size-limited and validated before processing.", "Public traffic reaches the production container through a protected Cloudflare Tunnel rather than an exposed web port.", "Application and edge rate limits reject abusive analysis traffic before provider invocation.", "Analysis and feedback responses use no-store caching behavior.", "Optional feedback uses an allowlist that rejects email-content fields.", "Integration API keys are shown once and stored only as SHA-256 hashes with revocable, atomic quotas.", "Gmail uses temporary current-message scope, Outlook uses ReadItem, and the browser extension uses activeTab selection access.", "Public hosted analysis remains heuristic-only until explicit AI privacy and cost gates pass."] },
      testing: { title: "Safe testing", paragraph: "Use invented identities, reserved domains such as .example or .test, and non-functional links. Do not test with a third party's inbox, account, or infrastructure without authorization." },
      version: { title: "Supported version", paragraph: "Security fixes target the latest version on the main branch and the current public-beta release. Self-hosted operators are responsible for applying updates to their deployments." },
    },
  },
  nl: {
    metadata: { title: "Beveiliging", description: "Richtlijnen voor beveiligingsmeldingen en gegevensverwerking bij Maillume." },
    eyebrow: "Vertrouwenscentrum", title: "Beveiliging", updatedLabel: "Laatst bijgewerkt", updatedDate: "10 juli 2026",
    description: "Maillume verwerkt inhoud die mensen al als verdacht beschouwen. Beveiligingsmeldingen moeten die inhoud beschermen, synthetische reproductiegegevens gebruiken en gecoördineerde openbaarmaking volgen.",
    sections: {
      report: { title: "Een kwetsbaarheid melden", warning: "Open geen openbaar issue met een kwetsbaarheid, toegangsgegeven, privé-e-mail, screenshot of onbewerkt .eml-bestand.", prefix: "Volg de besloten meldinstructies in", linkText: "SECURITY.md", suffix: "Als privé melden via GitHub niet beschikbaar is, gebruikt u het beveiligingscontact dat bij het productiedomein staat vermeld." },
      boundaries: { title: "Beveiligingsgrenzen", items: ["Geheime sleutels van providers en Supabase blijven op de server en mogen nooit een NEXT_PUBLIC_-prefix hebben.", "Geüploade screenshots en .eml-bestanden worden in de browser verwerkt en niet als bronbestand geüpload.", "Analyse-invoer heeft een maximale grootte en wordt vóór verwerking gevalideerd.", "Openbaar verkeer bereikt de productiecontainer via een beveiligde Cloudflare Tunnel en niet via een blootgestelde webpoort.", "Limieten in de applicatie en aan de rand weigeren misbruik van analyseverkeer voordat een provider wordt aangeroepen.", "Analyse- en feedbackantwoorden gebruiken no-store-cachegedrag.", "Optionele feedback gebruikt een toestemmingslijst die velden met e-mailinhoud weigert.", "Integratie-API-sleutels worden één keer getoond en alleen als SHA-256-hash opgeslagen, met intrekbare, atomair toegepaste quota.", "Gmail gebruikt tijdelijk bereik voor het huidige bericht, Outlook gebruikt ReadItem en de browserextensie gebruikt activeTab-toegang tot geselecteerde tekst.", "Openbare gehoste analyse blijft uitsluitend heuristisch totdat expliciete privacy- en kostencontroles voor AI zijn geslaagd."] },
      testing: { title: "Veilig testen", paragraph: "Gebruik verzonnen identiteiten, gereserveerde domeinen zoals .example of .test en niet-werkende links. Test niet zonder toestemming met het postvak, account of de infrastructuur van een derde." },
      version: { title: "Ondersteunde versie", paragraph: "Beveiligingsoplossingen richten zich op de nieuwste versie op de main-branch en de huidige publieke betarelease. Beheerders van zelfgehoste omgevingen zijn zelf verantwoordelijk voor het toepassen van updates." },
    },
  },
} as const satisfies Record<SiteLocale, object>;
