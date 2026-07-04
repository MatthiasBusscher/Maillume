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
      startScan: "Start scan",
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
      inputModeLabel: "Input mode",
      modes: {
        paste: "Paste",
        screenshot: "Screenshot",
        eml: ".eml file",
      },
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
      screenshotPrompt: "Upload a screenshot of the suspicious email.",
      screenshotHelp:
        "OCR runs in your browser. The image file is not stored after text is extracted.",
      chooseScreenshot: "Choose screenshot",
      emlPrompt: "Upload a .eml file exported from your mail app.",
      emlHelp:
        "Headers, body text, links, and attachment metadata are parsed locally before analysis.",
      chooseEml: "Choose .eml file",
      extracting: "Extracting text",
      parsing: "Parsing email file",
      extractedTextReady: "Extracted text is ready to analyze.",
      parsedEmlReady: "Email file parsed and ready to analyze.",
      unsupportedFile: "This file type is not supported.",
      fileTooLarge: "This file is too large.",
      extractionFailed: "Could not extract text from this file.",
      noTextFound: "No readable email text was found.",
      selectedFile: "Selected file",
      fileLimits: "Limits: screenshots up to 5 MB, .eml files up to 2 MB.",
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
      planned: "Processed locally before analysis.",
    },
  },
  nl: {
    app: {
      name: "Inbox Risk Scanner",
      status: "Prototype",
      startScan: "Scan starten",
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
      inputModeLabel: "Invoermethode",
      modes: {
        paste: "Plakken",
        screenshot: "Screenshot",
        eml: ".eml-bestand",
      },
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
      screenshotPrompt: "Upload een screenshot van de verdachte e-mail.",
      screenshotHelp:
        "OCR draait in uw browser. Het afbeeldingsbestand wordt niet opgeslagen nadat tekst is geëxtraheerd.",
      chooseScreenshot: "Screenshot kiezen",
      emlPrompt: "Upload een .eml-bestand dat uit uw mailapp is geëxporteerd.",
      emlHelp:
        "Headers, berichttekst, links en bijlagemetadata worden lokaal verwerkt voor analyse.",
      chooseEml: ".eml-bestand kiezen",
      extracting: "Tekst extraheren",
      parsing: "E-mailbestand verwerken",
      extractedTextReady: "Geëxtraheerde tekst is klaar voor analyse.",
      parsedEmlReady: "E-mailbestand verwerkt en klaar voor analyse.",
      unsupportedFile: "Dit bestandstype wordt niet ondersteund.",
      fileTooLarge: "Dit bestand is te groot.",
      extractionFailed: "Kon geen tekst uit dit bestand halen.",
      noTextFound: "Er is geen leesbare e-mailtekst gevonden.",
      selectedFile: "Geselecteerd bestand",
      fileLimits: "Limieten: screenshots tot 5 MB, .eml-bestanden tot 2 MB.",
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
      planned: "Lokaal verwerkt voor analyse.",
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
