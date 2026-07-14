var MAILLUME_ENDPOINT = "https://app.maillume.io";

function buildHomeCard(e) {
  var properties = PropertiesService.getUserProperties();
  var apiKey = properties.getProperty("MAILLUME_API_KEY") || "";
  var nl = getLocale(e) === "nl";

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Maillume").setSubtitle(nl ? "Risicobeoordeling van huidig bericht" : "Current-message risk assessment"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(nl ? "Maillume leest een bericht pas nadat u Dit bericht analyseren kiest. De add-on slaat berichtinhoud en resultaten niet op." : "Maillume reads a message only after you explicitly choose Analyze this message. Message content and results are not stored by the add-on."))
        .addWidget(
          CardService.newTextInput()
            .setFieldName("apiKey")
            .setTitle(nl ? "Maillume API-sleutel" : "Maillume API key")
            .setHint(apiKey ? (nl ? "Sleutel ingesteld; voer alleen een nieuwe sleutel in om deze te vervangen" : "Key configured; enter a new key only to replace it") : "mlm_..."),
        )
        .addWidget(
          CardService.newTextButton()
            .setText(nl ? "API-sleutel opslaan" : "Save API key")
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(CardService.newAction().setFunctionName("saveApiKey")),
        )
        .addWidget(
          CardService.newTextButton()
            .setText(nl ? "Opgeslagen sleutel verwijderen" : "Remove saved key")
            .setOnClickAction(CardService.newAction().setFunctionName("removeApiKey")),
        ),
    )
    .build();
}

function buildMessageCard(e) {
  var nl = getLocale(e) === "nl";
  var configured = Boolean(PropertiesService.getUserProperties().getProperty("MAILLUME_API_KEY"));
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(nl ? "Er is niets verzonden. Druk op de knop om alleen het bericht te analyseren dat nu in Gmail is geopend." : "Nothing has been sent. Press the button to analyze only the message currently open in Gmail."));

  if (configured) {
    section.addWidget(
      CardService.newTextButton()
        .setText(nl ? "Dit bericht analyseren" : "Analyze this message")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName("analyzeCurrentMessage")),
    );
  } else {
    section.addWidget(CardService.newTextParagraph().setText(nl ? "Open eerst het startscherm van de Maillume-add-on en sla een API-sleutel op." : "Open the Maillume add-on home screen and save an API key first."));
  }

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Maillume").setSubtitle(nl ? "Klaar wanneer u dat bent" : "Ready when you are"))
    .addSection(section)
    .build();
}

function saveApiKey(e) {
  var nl = getLocale(e) === "nl";
  var key = String(e.commonEventObject.formInputs.apiKey.stringInputs.value[0] || "").trim();
  if (!/^mlm_[A-Za-z0-9_-]{43}$/.test(key)) return notification(nl ? "Voer een geldige Maillume API-sleutel in." : "Enter a valid Maillume API key.");
  PropertiesService.getUserProperties().setProperty("MAILLUME_API_KEY", key);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(nl ? "API-sleutel opgeslagen voor je Google-account." : "API key saved for your Google account."))
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(e)))
    .build();
}

function removeApiKey(e) {
  PropertiesService.getUserProperties().deleteProperty("MAILLUME_API_KEY");
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(getLocale(e) === "nl" ? "Opgeslagen API-sleutel verwijderd." : "Saved API key removed."))
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(e)))
    .build();
}

function analyzeCurrentMessage(e) {
  var locale = getLocale(e);
  var apiKey = PropertiesService.getUserProperties().getProperty("MAILLUME_API_KEY");
  if (!apiKey) return notification(locale === "nl" ? "Sla eerst een Maillume API-sleutel op." : "Save a Maillume API key first.");

  var message;
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    message = GmailApp.getMessageById(e.gmail.messageId);
  } catch (error) {
    return notification(locale === "nl" ? "Gmail kon het geopende bericht niet lezen." : "Gmail could not read the open message.");
  }
  var payload = {
    source: "paste",
    subject: message.getSubject().slice(0, 300),
    senderEmail: message.getFrom().slice(0, 320),
    body: message.getPlainBody().slice(0, 20000),
    locale: locale
  };

  var response;
  try {
    response = UrlFetchApp.fetch(MAILLUME_ENDPOINT + "/api/v1/analyze", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    return notification(locale === "nl" ? "De Maillume-service is tijdelijk niet bereikbaar." : "The Maillume service is temporarily unreachable.");
  }
  var status = response.getResponseCode();
  var parsed;
  try { parsed = JSON.parse(response.getContentText()); } catch (error) { parsed = {}; }
  if (status < 200 || status >= 300) return notification(locale === "nl" ? "De Maillume-analyse is mislukt." : "Maillume analysis failed.");
  if (!isAnalysisResult(parsed.result)) return notification(locale === "nl" ? "De service gaf een ongeldig analyseresultaat terug." : "The service returned an invalid analysis result.");

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildResultCard(parsed.result, locale)))
    .build();
}

function buildResultCard(result, locale) {
  var nl = locale === "nl";
  var riskLevels = nl ? { low: "LAAG", medium: "GEMIDDELD", high: "HOOG" } : { low: "LOW", medium: "MEDIUM", high: "HIGH" };
  var signals = result.suspicious_signals.length ? result.suspicious_signals.map(function (signal) { return "• " + escapeHtml(signal); }).join("<br>") : (nl ? "Er zijn geen specifieke verdachte signalen gevonden." : "No specific suspicious signals were detected.");
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle((nl ? "Risicoscore " : "Risk score ") + result.risk_score + " · " + riskLevels[result.risk_level]).setSubtitle(nl ? "Geautomatiseerde beoordeling, geen garantie" : "Automated assessment, never a guarantee"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(escapeHtml(result.short_explanation)))
        .addWidget(CardService.newDecoratedText().setTopLabel(nl ? "VERDACHTE SIGNALEN" : "SUSPICIOUS SIGNALS").setText(signals).setWrapText(true))
        .addWidget(CardService.newDecoratedText().setTopLabel(nl ? "AANBEVOLEN VERVOLGSTAP" : "RECOMMENDED ACTION").setText(escapeHtml(result.recommended_action)).setWrapText(true))
        .addWidget(CardService.newTextParagraph().setText(nl ? "Dit is een geautomatiseerde risicobeoordeling en biedt geen garantie." : "This is an automated risk assessment and should not be considered a guarantee.")),
    )
    .build();
}

function notification(message) {
  return CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(message)).build();
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getLocale(e) {
  var locale = e && e.commonEventObject && e.commonEventObject.userLocale;
  return String(locale || "en").toLowerCase().indexOf("nl") === 0 ? "nl" : "en";
}

function isAnalysisResult(result) {
  return result && typeof result.risk_score === "number" && ["low", "medium", "high"].indexOf(result.risk_level) >= 0 && Array.isArray(result.suspicious_signals) && Array.isArray(result.detected_links) && typeof result.short_explanation === "string" && typeof result.recommended_action === "string";
}
