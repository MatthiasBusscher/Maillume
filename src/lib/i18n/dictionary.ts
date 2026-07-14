export type Locale = "en" | "nl";

export const DEFAULT_LOCALE: Locale = "en";

export const supportedLocales: Array<{ locale: Locale; label: string; shortLabel: string }> = [
  { locale: "en", label: "English", shortLabel: "EN" },
  { locale: "nl", label: "Nederlands", shortLabel: "NL" },
];

export const dictionaries = {
  en: {
    app: {
      name: "Maillume",
      status: "Privacy-first beta",
      startScan: "New scan",
      skipToScanner: "Skip to scanner",
      privacyStatus: "Scans stored",
      assessmentStatus: "Assessment",
      assessmentValue: "On demand",
      audience: "Email risk workspace",
      workspaceTitle: "Inspect a suspicious email",
      website: "Website",
      signIn: "Sign in",
      account: "Account",
      hero:
        "Paste a message, scan a screenshot, or open an .eml file for a clear, structured second opinion.",
    },
    language: {
      label: "Language",
    },
    legal: {
      source: "Source code",
      license: "License",
      notice:
        "AGPL-3.0 free software. You may share and modify it under the license. Provided without warranty.",
      copyright: "Copyright 2026 Maillume contributors.",
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
      privacyNote:
        "Processed for this score only. Files are parsed in your browser; scan content is not stored.",
      analyze: "Analyze email",
      analyzing: "Analyzing",
      analysisFailed: "Analysis failed. Please try again.",
      rateLimited: "Too many analyses were requested. Please wait and try again.",
      serviceUnavailable:
        "Analysis is temporarily unavailable. Check the server configuration and try again.",
      screenshotPrompt: "Upload a screenshot of the suspicious email.",
      screenshotHelp:
        "OCR runs in your browser. The image file is not stored after text is extracted.",
      chooseScreenshot: "Choose screenshot",
      emlPrompt: "Upload a .eml file exported from your mail app.",
      emlHelp:
        "Headers, body text, links, and attachment metadata are parsed in your browser. The raw file is not uploaded.",
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
      status: "Waiting for input",
      title: "Assessment appears here",
      description:
        "Results will show risk level, risk score, suspicious signals, detected links, and a recommended next action.",
      privacyTitle: "Privacy-first processing",
      privacyBody:
        "Pasted text and extracted file text are sent to the analysis API for this request only. Screenshot and .eml files are parsed in your browser and are not uploaded as files.",
    },
    result: {
      title: "Assessment report",
      summaryTitle: "Analysis complete",
      riskScore: "Risk score",
      levels: {
        low: "Low",
        medium: "Medium",
        high: "High",
      },
      explanation: "Explanation",
      suspiciousSignals: "Suspicious signals",
      noSignals: "No obvious suspicious signals were found by the automated checks.",
      detectedLinks: "Detected links",
      noLinks: "No links detected.",
      recommendedAction: "Recommended action",
      disclaimer: "This is an automated risk assessment and should not be considered a guarantee.",
    },
    feedback: {
      eyebrow: "Optional feedback",
      title: "Help improve detection",
      question: "Was this assessment helpful?",
      helpful: "Yes",
      notHelpful: "No",
      expectedLabel: "What did you expect?",
      classifications: {
        phishing: "Phishing",
        spam: "Spam",
        legitimate: "Legitimate",
        unsure: "Not sure",
      },
      kindLabel: "What was wrong with the result?",
      kinds: {
        accurate: "Accurate",
        false_positive: "Safe email marked risky",
        false_negative: "Risky email marked safe",
        unsure: "Something else",
      },
      signalsLabel: "Patterns you noticed (optional)",
      categories: {
        urgency: "Urgency or pressure",
        impersonation: "Impersonation",
        credential_request: "Credential request",
        payment_request: "Payment request",
        suspicious_link: "Suspicious link",
      },
      disclosureTitle: "Only labels are shared",
      disclosure:
        "We send these choices, language, input mode, analyzer version, and score band. We never send the email text, sender, subject, links, attachments, screenshot, or .eml file.",
      submit: "Send feedback",
      submitting: "Sending",
      successTitle: "Feedback received",
      successBody:
        "Thank you. This can guide new synthetic test cases; your email was not shared.",
      error: "Feedback could not be sent. Please try again later.",
    },
    upload: {
      screenshot: "Screenshot upload",
      eml: ".eml upload",
      planned: "Processed locally before analysis.",
    },
  },
  nl: {
    app: {
      name: "Maillume",
      status: "Privacygerichte beta",
      startScan: "Nieuwe scan",
      skipToScanner: "Ga naar de scanner",
      privacyStatus: "Scans opgeslagen",
      assessmentStatus: "Beoordeling",
      assessmentValue: "Op aanvraag",
      audience: "Werkruimte voor e-mailrisico",
      workspaceTitle: "Onderzoek een verdachte e-mail",
      website: "Website",
      signIn: "Inloggen",
      account: "Account",
      hero:
        "Plak een bericht, scan een screenshot of open een .eml-bestand voor een duidelijke, gestructureerde extra controle.",
    },
    language: {
      label: "Taal",
    },
    legal: {
      source: "Broncode",
      license: "Licentie",
      notice:
        "Vrije software onder AGPL-3.0. U mag deze delen en aanpassen volgens de licentie. Zonder garantie geleverd.",
      copyright: "Copyright 2026 bijdragers aan Maillume.",
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
      privacyNote:
        "Alleen verwerkt voor deze score. Bestanden worden in uw browser verwerkt; scaninhoud wordt niet opgeslagen.",
      analyze: "E-mail analyseren",
      analyzing: "Analyseren",
      analysisFailed: "Analyse mislukt. Probeer het opnieuw.",
      rateLimited: "Er zijn te veel analyses aangevraagd. Wacht even en probeer het opnieuw.",
      serviceUnavailable:
        "De analyse is tijdelijk niet beschikbaar. Controleer de serverconfiguratie en probeer het opnieuw.",
      screenshotPrompt: "Upload een screenshot van de verdachte e-mail.",
      screenshotHelp:
        "OCR draait in uw browser. Het afbeeldingsbestand wordt niet opgeslagen nadat tekst is geëxtraheerd.",
      chooseScreenshot: "Screenshot kiezen",
      emlPrompt: "Upload een .eml-bestand dat uit uw mailapp is geëxporteerd.",
      emlHelp:
        "Headers, berichttekst, links en bijlagemetadata worden in uw browser verwerkt. Het ruwe bestand wordt niet geüpload.",
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
      status: "Wachten op invoer",
      title: "De beoordeling verschijnt hier",
      description:
        "Resultaten tonen risiconiveau, risicoscore, verdachte signalen, gevonden links en een aanbevolen vervolgstap.",
      privacyTitle: "Privacygerichte verwerking",
      privacyBody:
        "Geplakte tekst en geëxtraheerde bestandstekst worden alleen voor deze aanvraag naar de analyse-API gestuurd. Screenshots en .eml-bestanden worden in uw browser verwerkt en niet als bestand geüpload.",
    },
    result: {
      title: "Beoordelingsrapport",
      summaryTitle: "Analyse voltooid",
      riskScore: "Risicoscore",
      levels: {
        low: "Laag",
        medium: "Gemiddeld",
        high: "Hoog",
      },
      explanation: "Uitleg",
      suspiciousSignals: "Verdachte signalen",
      noSignals: "De geautomatiseerde controles vonden geen duidelijke verdachte signalen.",
      detectedLinks: "Gevonden links",
      noLinks: "Geen links gevonden.",
      recommendedAction: "Aanbevolen actie",
      disclaimer:
        "Dit is een geautomatiseerde risico-inschatting en mag niet als garantie worden beschouwd.",
    },
    feedback: {
      eyebrow: "Optionele feedback",
      title: "Help de detectie verbeteren",
      question: "Was deze beoordeling nuttig?",
      helpful: "Ja",
      notHelpful: "Nee",
      expectedLabel: "Wat had u verwacht?",
      classifications: {
        phishing: "Phishing",
        spam: "Spam",
        legitimate: "Legitiem",
        unsure: "Niet zeker",
      },
      kindLabel: "Wat klopte er niet aan het resultaat?",
      kinds: {
        accurate: "Correct",
        false_positive: "Veilige e-mail als riskant gemarkeerd",
        false_negative: "Riskante e-mail als veilig gemarkeerd",
        unsure: "Iets anders",
      },
      signalsLabel: "Opgevallen patronen (optioneel)",
      categories: {
        urgency: "Urgentie of druk",
        impersonation: "Imitatie van een afzender",
        credential_request: "Verzoek om inloggegevens",
        payment_request: "Betaalverzoek",
        suspicious_link: "Verdachte link",
      },
      disclosureTitle: "Alleen labels worden gedeeld",
      disclosure:
        "We versturen deze keuzes, taal, invoermethode, analyseversie en scorecategorie. We versturen nooit de e-mailtekst, afzender, onderwerp, links, bijlagen, screenshot of het .eml-bestand.",
      submit: "Feedback versturen",
      submitting: "Versturen",
      successTitle: "Feedback ontvangen",
      successBody:
        "Bedankt. Hiermee kunnen nieuwe synthetische testcases worden gemaakt; uw e-mail is niet gedeeld.",
      error: "Feedback kon niet worden verstuurd. Probeer het later opnieuw.",
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
