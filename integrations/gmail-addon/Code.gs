var MAILLUME_ENDPOINT = "https://app.maillume.io";
var MAILLUME_API_KEY_CACHE_KEY = "MAILLUME_API_KEY";
var MAILLUME_API_KEY_CACHE_SECONDS = 21600;

function buildHomeCard(e) {
  var apiKey = getCachedApiKey();
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
            .setHint(apiKey ? (nl ? "Sleutel tijdelijk ingesteld; voer alleen een nieuwe sleutel in om deze te vervangen" : "Key temporarily configured; enter a new key only to replace it") : "mlm_..."),
        )
        .addWidget(
          CardService.newTextButton()
            .setText(nl ? "Sleutel maximaal 6 uur onthouden" : "Remember key for up to 6 hours")
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(CardService.newAction().setFunctionName("saveApiKey")),
        )
        .addWidget(
          CardService.newTextButton()
            .setText(nl ? "Tijdelijke sleutel verwijderen" : "Remove temporary key")
            .setOnClickAction(CardService.newAction().setFunctionName("removeApiKey")),
        ),
    )
    .build();
}

function buildMessageCard(e) {
  var nl = getLocale(e) === "nl";
  var configured = Boolean(getCachedApiKey());
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
    section.addWidget(CardService.newTextParagraph().setText(nl ? "Open eerst het startscherm van de Maillume-add-on en stel tijdelijk een API-sleutel in." : "Open the Maillume add-on home screen and temporarily configure an API key first."));
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
  CacheService.getUserCache().put(MAILLUME_API_KEY_CACHE_KEY, key, MAILLUME_API_KEY_CACHE_SECONDS);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(nl ? "API-sleutel tijdelijk onthouden, maximaal 6 uur." : "API key remembered temporarily, for up to 6 hours."))
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(e)))
    .build();
}

function removeApiKey(e) {
  CacheService.getUserCache().remove(MAILLUME_API_KEY_CACHE_KEY);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(getLocale(e) === "nl" ? "Tijdelijke API-sleutel verwijderd." : "Temporary API key removed."))
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(e)))
    .build();
}

function analyzeCurrentMessage(e) {
  var locale = getLocale(e);
  var apiKey = getCachedApiKey();
  if (!apiKey) return notification(locale === "nl" ? "Stel eerst tijdelijk een Maillume API-sleutel in." : "Temporarily configure a Maillume API key first.");

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
  var classifications = nl
    ? { likely_phishing: "Waarschijnlijk phishing", likely_spam: "Waarschijnlijk spam", likely_legitimate: "Waarschijnlijk legitiem", uncertain: "Onzeker" }
    : { likely_phishing: "Likely phishing", likely_spam: "Likely spam", likely_legitimate: "Likely legitimate", uncertain: "Uncertain" };
  var signals = result.suspicious_signals.length ? result.suspicious_signals.map(function (signal) { return "• " + escapeHtml(signal); }).join("<br>") : (nl ? "Er zijn geen specifieke verdachte signalen gevonden." : "No specific suspicious signals were detected.");
  var factors = result.score_factors.length ? result.score_factors.map(function (factor) { return "• " + escapeHtml(factor.label) + ": +" + factor.contribution + (nl ? " punten" : " points"); }).join("<br>") : (nl ? "Geen scorefactoren toegepast." : "No score factors applied.");
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle((nl ? "Risicoscore " : "Risk score ") + result.risk_score + " · " + riskLevels[result.risk_level]).setSubtitle(classifications[result.classification]))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(escapeHtml(result.short_explanation)))
        .addWidget(CardService.newDecoratedText().setTopLabel(nl ? "ZO WERKT DEZE SCORE" : "HOW THIS SCORE WORKS").setText((nl ? "De score is een gewogen risico-index, geen waarschijnlijkheid of garantie.<br>" : "The score is a weighted risk index, not a probability or guarantee.<br>") + factors).setWrapText(true))
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

function getCachedApiKey() {
  return CacheService.getUserCache().get(MAILLUME_API_KEY_CACHE_KEY) || "";
}

function isAnalysisResult(result) {
  var classifications = ["likely_phishing", "likely_spam", "likely_legitimate", "uncertain"];
  var families = ["identity", "destination", "intent", "delivery", "style"];
  return Boolean(result)
    && typeof result.risk_score === "number" && isFinite(result.risk_score) && result.risk_score >= 0 && result.risk_score <= 100
    && ["low", "medium", "high"].indexOf(result.risk_level) >= 0
    && classifications.indexOf(result.classification) >= 0
    && Array.isArray(result.score_factors)
    && result.score_factors.every(function (factor) { return factor && typeof factor.id === "string" && families.indexOf(factor.family) >= 0 && typeof factor.contribution === "number" && isFinite(factor.contribution) && factor.contribution > 0 && typeof factor.label === "string"; })
    && result.score_factors.reduce(function (total, factor) { return total + factor.contribution; }, 0) === result.risk_score
    && Array.isArray(result.suspicious_signals) && result.suspicious_signals.every(function (signal) { return typeof signal === "string"; })
    && Array.isArray(result.detected_links) && result.detected_links.every(isHttpUrl)
    && typeof result.short_explanation === "string" && typeof result.recommended_action === "string";
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}
