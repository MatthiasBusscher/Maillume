export type Locale = "en" | "nl";

export const DEFAULT_LOCALE: Locale = "en";

export const supportedLocales: Array<{ locale: Locale; label: string; shortLabel: string }> = [
  { locale: "en", label: "English", shortLabel: "EN" },
  { locale: "nl", label: "Nederlands", shortLabel: "NL" },
];

export const dictionaries = {
  en: {
    app: {
      name: "Inbox Risk Scanner",
      status: "Prototype",
      startScan: "Scan starten",
      audience: "Built for freelancers and small teams",
      hero:
        "Paste a suspicious email and get a clear, structured risk assessment before clicking, replying, or forwarding sensitive details.",
    },
    language: {
      label: "Language",
    },
    form: {
      eyebrow: "Email analysis",
      title: "Check a suspicious email",
      useSample: "Use sample",
      subject: "Subject",
      subjectPlaceholder: "Action required",
      senderEmail: "Sender email",
      senderPlaceholder: "sender@example.com",
      emailContent: "Email content",
      bodyPlaceholder: "Paste the email body here.",
      privacyNote: "Processed for this score only. Scan content is not stored.",
      analyze: "Analyze email",
      analyzing: "Analyzing",
      analysisFailed: "Analysis failed. Please try again.",
    },
    empty: {
      title: "Assessment appears here",
      description:
        "Results will show risk level, risk score, suspicious signals, detected links, and a recommended next action.",
      privacyTitle: "Privacy-first processing",
      privacyBody:
        "Scan content is sent to the local analysis API for this request only and is not stored.",
    },
    result: {
      riskScore: "Risk score",
      levels: {
        low: "Low",
        medium: "Medium",
        high: "High",
      },
      explanation: "Explanation",
      suspiciousSignals: "Suspicious signals",
      noSignals: "No obvious suspicious signals were found by the prototype checks.",
      detectedLinks: "Detected links",
      noLinks: "No links detected.",
      recommendedAction: "Recommended action",
      disclaimer: "This is an automated risk assessment and should not be considered a guarantee.",
    },
    upload: {
      screenshot: "Screenshot upload",
      eml: ".eml upload",
      planned: "Planned for a later issue.",
    },
  },
  nl: {
    app: {
      name: "Inbox Risk Scanner",
      status: "Prototype",
      startScan: "Start scan",
      audience: "Gebouwd voor freelancers en kleine teams",
      hero:
        "Plak een verdachte e-mail en krijg een duidelijke, gestructureerde risico-inschatting voordat u klikt, antwoordt of gevoelige gegevens deelt.",
    },
    language: {
      label: "Taal",
    },
    form: {
      eyebrow: "E-mailanalyse",
      title: "Controleer een verdachte e-mail",
      useSample: "Voorbeeld",
      subject: "Onderwerp",
      subjectPlaceholder: "Actie vereist",
      senderEmail: "Afzender",
      senderPlaceholder: "afzender@example.com",
      emailContent: "E-mailinhoud",
      bodyPlaceholder: "Plak hier de inhoud van de e-mail.",
      privacyNote: "Alleen verwerkt voor deze score. Scaninhoud wordt niet opgeslagen.",
      analyze: "E-mail analyseren",
      analyzing: "Analyseren",
      analysisFailed: "Analyse mislukt. Probeer het opnieuw.",
    },
    empty: {
      title: "De beoordeling verschijnt hier",
      description:
        "Resultaten tonen risiconiveau, risicoscore, verdachte signalen, gevonden links en een aanbevolen vervolgstap.",
      privacyTitle: "Privacygerichte verwerking",
      privacyBody:
        "Scaninhoud wordt alleen voor deze aanvraag naar de lokale analyse-API gestuurd en wordt niet opgeslagen.",
    },
    result: {
      riskScore: "Risicoscore",
      levels: {
        low: "Laag",
        medium: "Gemiddeld",
        high: "Hoog",
      },
      explanation: "Uitleg",
      suspiciousSignals: "Verdachte signalen",
      noSignals: "De prototypecontroles vonden geen duidelijke verdachte signalen.",
      detectedLinks: "Gevonden links",
      noLinks: "Geen links gevonden.",
      recommendedAction: "Aanbevolen actie",
      disclaimer:
        "Dit is een geautomatiseerde risico-inschatting en mag niet als garantie worden beschouwd.",
    },
    upload: {
      screenshot: "Screenshot uploaden",
      eml: ".eml uploaden",
      planned: "Gepland voor een latere issue.",
    },
  },
} as const;

type WidenStrings<T> = T extends string
  ? string
  : T extends object
    ? { readonly [Key in keyof T]: WidenStrings<T[Key]> }
    : T;

export type Dictionary = WidenStrings<(typeof dictionaries)["en"]>;

export function getBrowserLocale(language: string | undefined): Locale {
  if (!language) {
    return DEFAULT_LOCALE;
  }

  return language.toLowerCase().startsWith("nl") ? "nl" : DEFAULT_LOCALE;
}
