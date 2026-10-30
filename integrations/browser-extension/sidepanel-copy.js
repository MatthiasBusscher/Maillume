// All panel copy, including dynamic status text, lives here. Static labels remain
// in sidepanel.html so Chrome can render the panel before script execution.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
const dynamicCopy = {
  en: {
    noTab: "No active browser tab is available. Open an email and click the Maillume toolbar action again.",
    capturing: "Capturing selected text or the open message...",
    captured: "Selected text captured. Review it before analysis.",
    openMessageCaptured: "Open message captured. Review the subject, sender, and text before analysis.",
    messageChanged: "The webmail page changed. Use the current message before analyzing.",
    captureErrors: {"no_active_tab":"No active browser tab is available.","no_selection":"No selection or open Gmail/Outlook message was found. Open a message, optionally select text, and click the Maillume toolbar action again.","multiple_messages":"More than one message is expanded. Select the text you want to check, then click the Maillume toolbar action again.","restricted_page":"Chrome does not allow extensions to read selections on this page. Open the message in a regular webmail tab.","capture_failed":"Chrome could not read the selection from this tab. Reload the message and try the toolbar action again.","handoff_missing":"The one-time capture is no longer available. Open the message and click the Maillume toolbar action again.","handoff_expired":"The one-time capture expired. Open the message and click the Maillume toolbar action again.","panel_unavailable":"Chrome could not open the side panel for this tab. Close other side panels and try again."},
    invalidEndpoint: "Enter an HTTPS deployment URL, or an HTTP localhost URL for local testing.",
    permissionDenied: "Chrome did not grant access to the Maillume deployment, so the message was not sent.",
    permissionError: "Chrome could not update the deployment permission.",
    saveFailed: "The connection settings could not be saved.",
    updateRequired: "This Maillume extension must be updated before it can connect to this deployment.",
    bodyRequired: "Capture or enter the email text first.",
    sending: (origin) => `Sending the reviewed text to ${origin}...`,
    invalidResult: "The deployment returned an invalid analysis response.",
    resultTooLarge: "The deployment returned an analysis response that is too large to display safely.",
    incompatibleResult: "The extension and deployment use different analysis versions. Update the extension from the official source, then reload it in chrome://extensions.",
    requestFailed: (status) => `The deployment returned HTTP ${status}.`,
    unreachable: "The deployment could not be reached. Check the URL and connection permission.",
    complete: "Assessment complete. Message content and results were not saved by the extension.",
    destination: (endpoint) => `Destination: ${endpoint}`,
    unsavedDestination: (endpoint) => `Unsaved destination: ${endpoint}`,
    configureDestination: "Destination: configure a Maillume deployment",
    initializationFailed: "The side panel could not initialize. Close it and use the toolbar action again.",
    levels: {"low":"Low","medium":"Medium","high":"High"},
    classifications: {"likely_phishing":"Likely phishing or fraud","likely_spam":"Likely spam","likely_legitimate":"Likely legitimate","uncertain":"Uncertain"},
    coverageComplete: "Maillume received the main message evidence needed for this assessment.",
    coverageLimited: "Some message evidence was unavailable. Missing details can change the assessment.",
    coveragePartial: "This assessment uses selected or incomplete text. Content outside the captured text can change the result.",
    coverageOcr: "This assessment uses OCR-extracted text. Missed text and hidden link destinations can change the result.",
    coverageLabels: {"subject":"Subject","sender":"Sender","fullContent":"Full content","linkDestinations":"Link destinations","authentication":"Authentication results","attachments":"Attachment evidence","extraction":"Text extraction"},
    coverageStates: {"available":"Available","unavailable":"Unavailable"},
    extractionTypes: {"direct":"Direct text","ocr":"OCR","parsed":"Parsed .eml"},
    points: "points",
    hideInstructions: "Hide instructions",
    showInstructions: "Show instructions",
    savedEndpoint: (endpoint)=>`Deployment saved: ${endpoint}`,
    resetEndpoint: "Restored the default deployment, app.maillume.io.",
    rateLimited: "Too many analyses in a short time. Wait a minute and try again.",
  },
  nl: {
    noTab: "Er is geen actief browsertabblad beschikbaar. Open een e-mail en klik opnieuw op de Maillume-knop in de werkbalk.",
    capturing: "Geselecteerde tekst of het geopende bericht wordt vastgelegd...",
    captured: "Geselecteerde tekst vastgelegd. Controleer deze voor de analyse.",
    openMessageCaptured: "Geopend bericht vastgelegd. Controleer onderwerp, afzender en tekst voor de analyse.",
    messageChanged: "De webmailpagina is gewijzigd. Gebruik het huidige bericht voordat je analyseert.",
    captureErrors: {"no_active_tab":"Er is geen actief browsertabblad beschikbaar.","no_selection":"Er is geen geselecteerde tekst gevonden en er kon geen geopend Gmail-/Outlook-bericht worden vastgelegd. Open een bericht, selecteer eventueel tekst en klik opnieuw op de Maillume-knop in de werkbalk.","multiple_messages":"Er zijn meerdere berichten uitgeklapt. Selecteer de tekst die je wilt controleren en klik opnieuw op de Maillume-knop in de werkbalk.","restricted_page":"Chrome staat extensies niet toe selecties op deze pagina te lezen. Open het bericht in een normaal webmailtabblad.","capture_failed":"Chrome kon de selectie uit dit tabblad niet lezen. Laad het bericht opnieuw en probeer de werkbalkknop nogmaals.","handoff_missing":"De eenmalige vastlegging is niet meer beschikbaar. Open het bericht en klik opnieuw op de Maillume-knop in de werkbalk.","handoff_expired":"De eenmalige vastlegging is verlopen. Open het bericht en klik opnieuw op de Maillume-knop in de werkbalk.","panel_unavailable":"Chrome kon het zijpaneel voor dit tabblad niet openen. Sluit andere zijpanelen en probeer het opnieuw."},
    invalidEndpoint: "Voer de HTTPS-URL van een Maillume-omgeving in, of een HTTP-localhost-URL voor lokale tests.",
    permissionDenied: "Chrome heeft geen toegang tot de Maillume-omgeving verleend; het bericht is niet verzonden.",
    permissionError: "Chrome kon de toestemming voor deze omgeving niet bijwerken.",
    saveFailed: "De verbindingsinstellingen konden niet worden opgeslagen.",
    updateRequired: "Deze Maillume-extensie moet worden bijgewerkt voordat ze met deze omgeving kan verbinden.",
    bodyRequired: "Leg eerst de e-mailtekst vast of voer die in.",
    sending: (origin) => `De gecontroleerde tekst wordt naar ${origin} verzonden...`,
    invalidResult: "De Maillume-omgeving gaf een ongeldig analyseresultaat terug.",
    resultTooLarge: "De Maillume-omgeving gaf een analyseresultaat terug dat te groot is om veilig weer te geven.",
    incompatibleResult: "De extensie en Maillume-omgeving gebruiken verschillende analyseversies. Werk de extensie bij vanuit de officiële broncode en laad haar daarna opnieuw via chrome://extensions.",
    requestFailed: (status) => `De Maillume-omgeving gaf HTTP ${status} terug.`,
    unreachable: "De Maillume-omgeving is niet bereikbaar. Controleer de URL en toestemming.",
    complete: "Beoordeling voltooid. De extensie heeft berichtinhoud en resultaten niet opgeslagen.",
    destination: (endpoint) => `Bestemming: ${endpoint}`,
    unsavedDestination: (endpoint) => `Niet-opgeslagen bestemming: ${endpoint}`,
    configureDestination: "Bestemming: configureer een Maillume-omgeving",
    initializationFailed: "Het zijpaneel kon niet worden gestart. Sluit het en gebruik de werkbalkknop opnieuw.",
    levels: {"low":"Laag","medium":"Middel","high":"Hoog"},
    classifications: {"likely_phishing":"Waarschijnlijk phishing of fraude","likely_spam":"Waarschijnlijk spam","likely_legitimate":"Waarschijnlijk legitiem","uncertain":"Onzeker"},
    coverageComplete: "Maillume ontving de belangrijkste berichtgegevens voor deze beoordeling.",
    coverageLimited: "Sommige berichtgegevens waren niet beschikbaar. Ontbrekende details kunnen de beoordeling veranderen.",
    coveragePartial: "Deze beoordeling gebruikt geselecteerde of onvolledige tekst. Inhoud buiten de vastgelegde tekst kan de beoordeling veranderen.",
    coverageOcr: "Deze beoordeling gebruikt tekst uit OCR. Gemiste tekst en verborgen linkbestemmingen kunnen de beoordeling veranderen.",
    coverageLabels: {"subject":"Onderwerp","sender":"Afzender","fullContent":"Volledige inhoud","linkDestinations":"Linkbestemmingen","authentication":"Authenticatieresultaten","attachments":"Bijlagegegevens","extraction":"Tekstextractie"},
    coverageStates: {"available":"Beschikbaar","unavailable":"Niet beschikbaar"},
    extractionTypes: {"direct":"Directe tekst","ocr":"OCR","parsed":"Verwerkt .eml-bestand"},
    points: "punten",
    hideInstructions: "Uitleg verbergen",
    showInstructions: "Uitleg tonen",
    savedEndpoint: (endpoint)=>`Omgeving opgeslagen: ${endpoint}`,
    resetEndpoint: "De standaardomgeving app.maillume.io is hersteld.",
    rateLimited: "Te veel analyses in korte tijd. Wacht een minuut en probeer het opnieuw.",
  },
};

function getLocale() {
  return chrome.i18n.getUILanguage().toLowerCase().startsWith("nl") ? "nl" : "en";
}

function getDynamicCopy() {
  return dynamicCopy[getLocale()];
}

function localizeUi() {
  const locale = getLocale();
  document.documentElement.lang = locale;
  if (locale === "nl") {
    document.querySelectorAll("[data-nl]").forEach((node) => { node.textContent = node.dataset.nl; });
    document.querySelectorAll("[data-nl-aria-label]").forEach((node) => { node.setAttribute("aria-label", node.dataset.nlAriaLabel); });
  }
}
